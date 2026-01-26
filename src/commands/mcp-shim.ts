/**
 * MCP Stdio Shim
 *
 * Proxies MCP protocol over stdio to daemon for workspace-singleton coordination.
 * This enables multiple AI clients (Claude, Qoder, Cursor, etc.) to connect to the
 * same workspace without spawning duplicate MCP server processes.
 *
 * Flow:
 * 1. AI Client spawns: `snapback mcp shim --workspace /path/to/project`
 * 2. Shim reads MCP messages from stdin
 * 3. Shim forwards to daemon via Unix socket
 * 4. Daemon routes to appropriate workspace MCP handler
 * 5. Response flows back: daemon → shim → stdout → AI client
 *
 * @module commands/mcp-shim
 */

import { createConnection, type Socket } from "node:net";
import { getSocketPath } from "../daemon/platform.js";
import type { MCPInitializeResult, MCPToolsCallResult, MCPToolsListResult } from "../daemon/protocol.js";

// =============================================================================
// MCP PROTOCOL TYPES (JSON-RPC 2.0 over stdio)
// =============================================================================

interface MCPRequest {
	jsonrpc: "2.0";
	id: string | number;
	method: string;
	params?: unknown;
}

interface MCPResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

// =============================================================================
// DAEMON CONNECTION
// =============================================================================

class DaemonConnection {
	private socket: Socket | null = null;
	private requestId = 0;
	private pendingRequests = new Map<
		number,
		{
			resolve: (value: unknown) => void;
			reject: (error: Error) => void;
			timeout: NodeJS.Timeout;
		}
	>();
	private buffer = "";
	private readonly REQUEST_TIMEOUT_MS = 30000; // 30s for MCP tools

	constructor(private socketPath: string) {}

	async connect(): Promise<void> {
		if (this.socket?.writable) {
			return; // Already connected
		}

		return new Promise((resolve, reject) => {
			const socket = createConnection(this.socketPath);

			socket.on("connect", () => {
				this.socket = socket;
				resolve();
			});

			socket.on("error", (err) => {
				reject(err);
			});

			socket.on("data", (data) => {
				this.handleData(data.toString());
			});

			socket.on("close", () => {
				this.socket = null;
				// Reject all pending requests
				for (const [id, pending] of this.pendingRequests) {
					clearTimeout(pending.timeout);
					pending.reject(new Error("Daemon connection closed"));
					this.pendingRequests.delete(id);
				}
			});

			// Connection timeout
			setTimeout(() => {
				if (!this.socket) {
					socket.destroy();
					reject(new Error("Daemon connection timeout"));
				}
			}, 5000);
		});
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.destroy();
			this.socket = null;
		}
	}

	async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
		if (!this.socket?.writable) {
			throw new Error("Not connected to daemon");
		}

		const id = ++this.requestId;
		const request = {
			jsonrpc: "2.0" as const,
			id,
			method,
			params,
		};

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Daemon request timeout: ${method}`));
			}, this.REQUEST_TIMEOUT_MS);

			this.pendingRequests.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timeout,
			});

			this.socket?.write(`${JSON.stringify(request)}\n`);
		});
	}

	private handleData(data: string): void {
		this.buffer += data;

		// Process complete messages (newline-delimited JSON)
		const lines = this.buffer.split("\n");
		this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			try {
				const response: {
					jsonrpc: "2.0";
					id: number;
					result?: unknown;
					error?: { code: number; message: string };
				} = JSON.parse(line);
				const pending = this.pendingRequests.get(response.id);

				if (pending) {
					clearTimeout(pending.timeout);
					this.pendingRequests.delete(response.id);

					if (response.error) {
						pending.reject(new Error(response.error.message));
					} else {
						pending.resolve(response.result);
					}
				}
			} catch (err) {
				console.error("[MCP Shim] Failed to parse daemon response:", err);
			}
		}
	}
}

// =============================================================================
// STDIO MCP SHIM
// =============================================================================

export class MCPStdioShim {
	private daemon: DaemonConnection;
	private buffer = "";
	private workspace: string;

	constructor(workspace: string) {
		this.workspace = workspace;
		this.daemon = new DaemonConnection(getSocketPath());
	}

	async start(): Promise<void> {
		// Connect to daemon
		try {
			await this.daemon.connect();
		} catch (error) {
			this.sendError(
				0,
				-32000,
				`Failed to connect to SnapBack daemon: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(1);
		}

		// Set up stdin/stdout communication
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (data: string) => this.handleStdinData(data));
		process.stdin.on("end", () => this.shutdown());
		process.stdin.on("error", (err) => {
			console.error("[MCP Shim] stdin error:", err);
			this.shutdown();
		});

		// Keep process alive
		process.stdin.resume();
	}

	private handleStdinData(data: string): void {
		this.buffer += data;

		// Parse newline-delimited JSON-RPC
		const lines = this.buffer.split("\n");
		this.buffer = lines.pop() || "";

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			try {
				const request: MCPRequest = JSON.parse(line);
				this.handleMCPRequest(request).catch((error) => {
					this.sendError(
						request.id,
						-32603,
						`Internal error: ${error instanceof Error ? error.message : String(error)}`,
					);
				});
			} catch {
				this.sendError(null, -32700, "Parse error: Invalid JSON");
			}
		}
	}

	private async handleMCPRequest(request: MCPRequest): Promise<void> {
		const { method, id, params } = request;

		try {
			switch (method) {
				case "initialize": {
					const initParams = {
						workspace: this.workspace,
						clientInfo: (params as { clientInfo: { name: string; version: string } }).clientInfo,
					} as const satisfies Record<string, unknown>;
					const result = await this.daemon.request<MCPInitializeResult>(
						"mcp.initialize",
						initParams as Record<string, unknown>,
					);
					this.sendSuccess(id, result);
					break;
				}

				case "tools/list": {
					const listParams = {
						workspace: this.workspace,
					} as Record<string, unknown>;
					const result = await this.daemon.request<MCPToolsListResult>("mcp.tools/list", listParams);
					this.sendSuccess(id, result);
					break;
				}

				case "tools/call": {
					const callRequest = params as { name: string; arguments?: Record<string, unknown> };
					const callParams = {
						workspace: this.workspace,
						name: callRequest.name,
						arguments: callRequest.arguments || {},
					} as Record<string, unknown>;
					const result = await this.daemon.request<MCPToolsCallResult>("mcp.tools/call", callParams);
					this.sendSuccess(id, result);
					break;
				}

				case "ping": {
					// Simple ping response
					this.sendSuccess(id, {});
					break;
				}

				default:
					this.sendError(id, -32601, `Method not found: ${method}`);
			}
		} catch (error) {
			this.sendError(id, -32603, `Request failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private sendSuccess(id: string | number, result: unknown): void {
		const response: MCPResponse = {
			jsonrpc: "2.0",
			id,
			result,
		};
		process.stdout.write(`${JSON.stringify(response)}\n`);
	}

	private sendError(id: string | number | null, code: number, message: string): void {
		const response: MCPResponse = {
			jsonrpc: "2.0",
			id: id ?? "null",
			error: {
				code,
				message,
			},
		};
		process.stdout.write(`${JSON.stringify(response)}\n`);
	}

	private shutdown(): void {
		this.daemon.disconnect();
		process.exit(0);
	}
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

export interface MCPShimOptions {
	workspace: string;
}

export async function runMCPShim(options: MCPShimOptions): Promise<void> {
	const shim = new MCPStdioShim(options.workspace);
	await shim.start();
}
