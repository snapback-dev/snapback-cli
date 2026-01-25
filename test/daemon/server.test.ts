/**
 * Daemon Server Tests
 *
 * TDD RED phase: Tests for the daemon server implementation
 */

import { mkdir, rm, unlink } from "node:fs/promises";
import { connect, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DaemonRequest, DaemonResponse } from "../../src/daemon/protocol";

// Test helpers
const TEST_DIR = join(homedir(), ".snapback-test-daemon-server");
const TEST_SOCKET = join(TEST_DIR, "test.sock");
const TEST_LOCK = join(TEST_DIR, "daemon.lock");

/**
 * Send a JSON-RPC request and get response
 */
async function sendRequest(socket: Socket, request: DaemonRequest): Promise<DaemonResponse> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("Request timeout")), 5000);

		let buffer = "";
		const onData = (data: Buffer) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			for (const line of lines) {
				if (line.trim()) {
					try {
						const response = JSON.parse(line) as DaemonResponse;
						clearTimeout(timeout);
						socket.off("data", onData);
						resolve(response);
						return;
					} catch {
						// Not complete JSON yet
					}
				}
			}
		};

		socket.on("data", onData);
		socket.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});

		socket.write(`${JSON.stringify(request)}\n`);
	});
}

describe("daemon/server", () => {
	beforeEach(async () => {
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		vi.restoreAllMocks();

		// Clean up lock file first to prevent race conditions
		try {
			await unlink(TEST_LOCK);
		} catch {
			// Ignore if doesn't exist
		}

		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("SnapBackDaemon class", () => {
		it("should export SnapBackDaemon class", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			expect(SnapBackDaemon).toBeDefined();
			expect(typeof SnapBackDaemon).toBe("function");
		});

		it("should create instance with config", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			expect(daemon).toBeDefined();
		});
	});

	describe("lifecycle methods", () => {
		it("should have start method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			expect(typeof daemon.start).toBe("function");
		});

		it("should have shutdown method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			expect(typeof daemon.shutdown).toBe("function");
		});

		it("should have isRunning method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			expect(typeof daemon.isRunning).toBe("function");
		});
	});

	describe("daemon.ping method", () => {
		it("should respond to ping with pong", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				// Connect and send ping
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				const response = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "1",
					method: "daemon.ping",
					params: {},
				});

				expect(response.result).toMatchObject({
					pong: true,
				});
				expect((response.result as { uptime: number }).uptime).toBeGreaterThanOrEqual(0);

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});

	describe("daemon.status method", () => {
		it("should return daemon status", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				const response = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "2",
					method: "daemon.status",
					params: {},
				});

				expect(response.result).toMatchObject({
					pid: expect.any(Number),
					version: "1.0.0-test",
					uptime: expect.any(Number),
					workspaces: expect.any(Number),
					connections: expect.any(Number),
				});

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});

	describe("error handling", () => {
		it("should return error for unknown method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				const response = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "3",
					method: "unknown.method" as any,
					params: {},
				});

				expect(response.error).toBeDefined();
				expect(response.error?.message).toContain("Unknown method");

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});

		it("should handle malformed JSON gracefully", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// Send malformed JSON
				socket.write("not valid json\n");

				// Wait a bit for response
				const response = await new Promise<DaemonResponse>((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error("Timeout")), 2000);
					socket.on("data", (data) => {
						clearTimeout(timeout);
						const parsed = JSON.parse(data.toString().trim());
						resolve(parsed);
					});
				});

				expect(response.error).toBeDefined();
				expect(response.error?.code).toBe(-32700); // Parse error

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});

	describe("idle timeout", () => {
		it("should track last activity time", async () => {
			// Clean up lock file before test to prevent conflicts
			try {
				await unlink(TEST_LOCK);
			} catch {
				// Ignore if doesn't exist
			}

			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 1000, // 1 second for testing
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// Send ping to update activity
				await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "4",
					method: "daemon.ping",
					params: {},
				});

				// Get status to check lastActivity
				const response = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "5",
					method: "daemon.status",
					params: {},
				});

				const result = response.result as { lastActivity: number };
				expect(result.lastActivity).toBeGreaterThan(Date.now() - 1000);

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});

	describe("connection management", () => {
		it("should track connection count", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				// Connect first socket
				const socket1 = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket1.on("connect", resolve));

				let response = await sendRequest(socket1, {
					jsonrpc: "2.0",
					id: "6",
					method: "daemon.status",
					params: {},
				});

				expect((response.result as { connections: number }).connections).toBe(1);

				// Connect second socket
				const socket2 = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket2.on("connect", resolve));

				response = await sendRequest(socket2, {
					jsonrpc: "2.0",
					id: "7",
					method: "daemon.status",
					params: {},
				});

				expect((response.result as { connections: number }).connections).toBe(2);

				socket1.end();
				socket2.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});
});
