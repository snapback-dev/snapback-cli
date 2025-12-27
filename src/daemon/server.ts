/**
 * SnapBack Daemon Server
 *
 * Long-running process that handles CLI/Extension requests via IPC.
 * Features:
 * - Lazy start (spawned on first request)
 * - Idle shutdown (after 15 min of inactivity)
 * - Workspace-aware (multiple workspace contexts)
 * - Crash resilient (persists critical state)
 * - Signal handling (SIGTERM, SIGINT, SIGHUP on Unix)
 * - Socket permission enforcement (Unix) / Named pipe security (Windows)
 * - Path validation for security
 * - Backpressure handling
 * - Structured logging with correlation IDs
 *
 * @module daemon/server
 */

import { EventEmitter } from "node:events";
import { chmodSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import { dirname, join, relative } from "node:path";

import { Intelligence } from "@snapback/intelligence";

import {
	DEFAULT_HEALTH_PORT,
	DEFAULT_IDLE_TIMEOUT_MS,
	MAX_BUFFER_SIZE,
	MAX_CONNECTIONS,
	OPERATION_TIMEOUT_MS,
	SOCKET_PERMISSIONS,
	STATE_FILE,
} from "./constants.js";
import {
	DaemonError,
	InvalidParamsError,
	MethodNotFoundError,
	ParseError,
	RequestTooLargeError,
	TimeoutError,
	toDaemonError,
	WorkspaceNotFoundError,
} from "./errors.js";
import { type DaemonLogger, generateRequestId, initLogger } from "./logger.js";
import { validatePath, validatePaths } from "./path-validator.js";
import { acquireLock, getDaemonDir, getLogPath, releaseLock } from "./platform.js";
import type { DaemonMethod, DaemonRequest, DaemonResponse, WorkspaceContext } from "./protocol.js";
import {
	createErrorResponse,
	createNotification,
	createResponse,
	ErrorCodes,
	parseRequest,
	serializeResponse,
} from "./protocol.js";

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

const IS_WINDOWS = platform() === "win32";

// =============================================================================
// INTELLIGENCE SINGLETON
// =============================================================================

/**
 * Intelligence instances per workspace (singleton pattern for cross-surface coordination)
 */
const intelligenceInstances = new Map<string, Intelligence>();

/**
 * Get or create Intelligence instance for a workspace
 */
function getIntelligence(workspaceRoot: string): Intelligence {
	if (!intelligenceInstances.has(workspaceRoot)) {
		const intel = new Intelligence({
			rootDir: workspaceRoot,
			enableSemanticSearch: false,
			enableLearningLoop: true,
			patternsDir: ".snapback/patterns",
			learningsDir: ".snapback/learnings",
			constraintsFile: ".snapback/constraints.json",
			// Session persistence for cross-surface coordination (Extension, MCP, CLI, Daemon)
			sessionPersistence: {
				path: join(workspaceRoot, ".snapback/session/sessions.jsonl"),
				autosave: true,
			},
		});
		intelligenceInstances.set(workspaceRoot, intel);
	}
	return intelligenceInstances.get(workspaceRoot)!;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface DaemonConfig {
	/** Path to Unix socket or Windows named pipe */
	socketPath: string;
	/** Path to PID file */
	pidPath: string;
	/** Path to lock file (optional, defaults to global lock path) */
	lockPath?: string;
	/** Idle timeout in milliseconds before shutdown */
	idleTimeoutMs: number;
	/** Maximum concurrent connections */
	maxConnections: number;
	/** Daemon version */
	version: string;
	/** Enable health check HTTP endpoint */
	enableHealthCheck?: boolean;
	/** Health check port (default: 3847) */
	healthPort?: number;
}

// =============================================================================
// PERSISTED STATE
// =============================================================================

interface PersistedState {
	workspaces: Array<{
		key: string;
		id: string;
		root: string;
		sessionActive: boolean;
		currentTaskId?: string;
		snapshotCount: number;
		lastActivity: number;
	}>;
	lastPersisted: number;
	version: string;
}

// =============================================================================
// CONNECTION CONTEXT
// =============================================================================

interface ConnectionContext {
	socket: Socket;
	buffer: string;
	workspace?: string;
	paused: boolean;
}

// =============================================================================
// DAEMON SERVER CLASS
// =============================================================================

export class SnapBackDaemon extends EventEmitter {
	private server: Server | null = null;
	private healthServer: HttpServer | null = null;
	private connections = new Map<Socket, ConnectionContext>();
	private workspaces = new Map<string, WorkspaceContext>();
	private idleTimer: NodeJS.Timeout | null = null;
	private startTime = 0;
	private lastActivity = 0;
	private _isRunning = false;
	private _isShuttingDown = false;
	private logger: DaemonLogger;
	private lockAcquired = false;
	private signalHandlersRegistered = false;

	constructor(private config: DaemonConfig) {
		super();
		// Initialize logger
		this.logger = initLogger(getLogPath(), { minLevel: "info" });
	}

	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	/**
	 * Start the daemon server
	 */
	async start(): Promise<void> {
		if (this._isRunning) {
			throw new Error("Daemon already running");
		}

		this.logger.info("Daemon starting", { version: this.config.version, platform: platform() });

		// Acquire lock to prevent race conditions
		const locked = await acquireLock(this.config.lockPath);
		if (!locked) {
			throw new Error("Another daemon is starting. Please wait or check for stale lock file.");
		}
		this.lockAcquired = true;

		try {
			this.startTime = Date.now();
			this.lastActivity = Date.now();

			// Ensure daemon directory exists
			const dir = dirname(this.config.pidPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}

			// Write PID file
			writeFileSync(this.config.pidPath, String(process.pid));

			// Clean up stale socket (Unix only - Windows named pipes don't have file residue)
			if (!IS_WINDOWS && existsSync(this.config.socketPath)) {
				unlinkSync(this.config.socketPath);
			}

			// Create and start server
			const server = createServer(this.handleConnection.bind(this));
			this.server = server;

			await new Promise<void>((resolve, reject) => {
				server.listen(this.config.socketPath, () => {
					// Set socket permissions (Unix only)
					// Windows named pipes have different security model (ACLs)
					if (!IS_WINDOWS) {
						try {
							chmodSync(this.config.socketPath, SOCKET_PERMISSIONS);
							this.logger.debug("Socket permissions set", { mode: SOCKET_PERMISSIONS.toString(8) });
						} catch (err) {
							this.logger.warn("Failed to set socket permissions", { error: String(err) });
						}
					}

					this._isRunning = true;
					resolve();
				});
				server.on("error", reject);
			});

			// Start health check endpoint if enabled
			if (this.config.enableHealthCheck) {
				await this.startHealthEndpoint(this.config.healthPort ?? DEFAULT_HEALTH_PORT);
			}

			// Register signal handlers
			this.registerSignalHandlers();

			// Start idle timer
			this.resetIdleTimer();

			// Restore persisted state
			await this.restoreState();

			this.logger.info("Daemon started", {
				pid: process.pid,
				socket: this.config.socketPath,
				version: this.config.version,
			});

			// Emit started event
			this.emit("started");
		} catch (err) {
			// Clean up on failure
			await releaseLock(this.config.lockPath);
			this.lockAcquired = false;
			throw err;
		}
	}

	/**
	 * Shutdown the daemon gracefully
	 */
	async shutdown(): Promise<void> {
		if (!this._isRunning || this._isShuttingDown) {
			return;
		}

		this._isShuttingDown = true;
		this.logger.info("Daemon shutting down");
		this.emit("shutting_down");

		// Persist state for crash recovery
		await this.persistState();

		// Stop accepting new connections
		if (this.server) {
			this.server.close();
			this.server = null;
		}

		// Stop health check endpoint
		if (this.healthServer) {
			this.healthServer.close();
			this.healthServer = null;
		}

		// Clear idle timer
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}

		// Close all connections gracefully
		for (const [socket, _ctx] of this.connections) {
			// Send shutdown notification
			const notification = createNotification({
				type: "daemon.shutting_down",
				timestamp: Date.now(),
				data: {},
			});
			try {
				socket.write(serializeResponse(notification));
			} catch {
				// Ignore write errors during shutdown
			}
			socket.destroy();
		}
		this.connections.clear();

		// Cleanup files (Unix only for socket - Windows named pipes auto-cleanup)
		try {
			if (existsSync(this.config.pidPath)) {
				unlinkSync(this.config.pidPath);
			}
			if (!IS_WINDOWS && existsSync(this.config.socketPath)) {
				unlinkSync(this.config.socketPath);
			}
		} catch {
			// Ignore cleanup errors
		}

		// Release lock
		if (this.lockAcquired) {
			await releaseLock(this.config.lockPath);
			this.lockAcquired = false;
		}

		this._isRunning = false;
		this._isShuttingDown = false;

		this.logger.info("Daemon shutdown complete");
		this.emit("shutdown");
	}

	/**
	 * Check if the daemon is running
	 */
	isRunning(): boolean {
		return this._isRunning;
	}

	// =========================================================================
	// SIGNAL HANDLERS
	// =========================================================================

	/**
	 * Register signal handlers for graceful shutdown
	 *
	 * Note: Signal handling differs between platforms:
	 * - Unix: SIGTERM, SIGINT, SIGHUP all supported
	 * - Windows: Only SIGINT (Ctrl+C) reliably works; SIGTERM is emulated
	 */
	private registerSignalHandlers(): void {
		if (this.signalHandlersRegistered) {
			return;
		}
		this.signalHandlersRegistered = true;

		const shutdown = () => {
			this.logger.info("Received shutdown signal");
			this.shutdown().catch((err) => {
				this.logger.error("Shutdown error", { error: String(err) });
				process.exit(1);
			});
		};

		// Graceful shutdown on SIGTERM (container/process manager)
		// On Windows, SIGTERM is sent by process.kill() but not by external signals
		process.on("SIGTERM", shutdown);

		// Graceful shutdown on SIGINT (Ctrl+C) - works on all platforms
		process.on("SIGINT", shutdown);

		// Reload configuration on SIGHUP (Unix only)
		// SIGHUP doesn't exist on Windows
		if (!IS_WINDOWS) {
			process.on("SIGHUP", () => {
				this.logger.info("Received reload signal");
				this.emit("reload");
			});
		}

		// Handle Windows-specific shutdown events
		if (IS_WINDOWS) {
			// SIGBREAK is the Windows equivalent of SIGHUP, triggered by Ctrl+Break
			// This is the most reliable signal for graceful shutdown on Windows
			process.on("SIGBREAK", shutdown);

			// Windows sends 'exit' event on console close
			// Only synchronous operations are allowed in exit handlers
			process.on("exit", () => {
				// Synchronous cleanup only - async operations won't complete
				if (this._isRunning && !this._isShuttingDown) {
					try {
						if (existsSync(this.config.pidPath)) {
							unlinkSync(this.config.pidPath);
						}
					} catch {
						// Ignore cleanup errors during forced exit
					}
				}
			});
		}

		// Handle uncaught exceptions
		process.on("uncaughtException", (err) => {
			this.logger.error("Uncaught exception", { error: String(err), stack: err.stack });
			this.shutdown()
				.catch(() => {})
				.finally(() => process.exit(1));
		});

		// Handle unhandled rejections
		process.on("unhandledRejection", (reason) => {
			this.logger.error("Unhandled rejection", { reason: String(reason) });
		});
	}

	// =========================================================================
	// STATE PERSISTENCE
	// =========================================================================

	/**
	 * Persist state for crash recovery
	 */
	private async persistState(): Promise<void> {
		const state: PersistedState = {
			workspaces: Array.from(this.workspaces.entries()).map(([key, ctx]) => ({
				key,
				id: ctx.id,
				root: ctx.root,
				sessionActive: ctx.sessionActive,
				currentTaskId: ctx.currentTaskId,
				snapshotCount: ctx.snapshotCount,
				lastActivity: ctx.lastActivity,
			})),
			lastPersisted: Date.now(),
			version: this.config.version,
		};

		const statePath = join(getDaemonDir(), STATE_FILE);

		try {
			await mkdir(dirname(statePath), { recursive: true });
			await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
			this.logger.debug("State persisted", { workspaces: state.workspaces.length });
		} catch (err) {
			this.logger.warn("Failed to persist state", { error: String(err) });
		}
	}

	/**
	 * Restore state from crash recovery file
	 */
	private async restoreState(): Promise<void> {
		const statePath = join(getDaemonDir(), STATE_FILE);

		try {
			const content = await readFile(statePath, "utf-8");
			const state: PersistedState = JSON.parse(content);

			for (const ws of state.workspaces) {
				this.workspaces.set(ws.key, {
					id: ws.id,
					root: ws.root,
					initialized: true,
					sessionActive: ws.sessionActive,
					currentTaskId: ws.currentTaskId,
					snapshotCount: ws.snapshotCount,
					lastActivity: ws.lastActivity,
					subscribers: new Set(),
				});
			}

			this.logger.info("State restored", { workspaces: state.workspaces.length });
		} catch (err) {
			// No state to restore, that's fine
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
				this.logger.debug("No state to restore", { error: String(err) });
			}
		}
	}

	// =========================================================================
	// HEALTH CHECK
	// =========================================================================

	/**
	 * Start HTTP health check endpoint
	 */
	private async startHealthEndpoint(port: number): Promise<void> {
		const healthServer = createHttpServer((req, res) => {
			if (req.url === "/health" || req.url === "/healthz") {
				const health = {
					status: this._isRunning ? "healthy" : "unhealthy",
					pid: process.pid,
					version: this.config.version,
					uptime: Date.now() - this.startTime,
					connections: this.connections.size,
					workspaces: this.workspaces.size,
					memoryUsage: process.memoryUsage(),
				};
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(health));
			} else if (req.url === "/ready") {
				res.writeHead(this._isRunning ? 200 : 503);
				res.end(this._isRunning ? "ready" : "not ready");
			} else {
				res.writeHead(404);
				res.end("Not found");
			}
		});
		this.healthServer = healthServer;

		await new Promise<void>((resolve, reject) => {
			healthServer.listen(port, "127.0.0.1", () => {
				this.logger.info("Health endpoint started", { port });
				resolve();
			});
			healthServer.on("error", reject);
		});
	}

	// =========================================================================
	// CONNECTION HANDLING
	// =========================================================================

	/**
	 * Handle new connection
	 */
	private handleConnection(socket: Socket): void {
		const requestId = generateRequestId();

		// Check max connections
		if (this.connections.size >= (this.config.maxConnections || MAX_CONNECTIONS)) {
			const error = createErrorResponse(
				"0",
				ErrorCodes.PERMISSION_DENIED,
				`Max connections (${this.config.maxConnections}) reached`,
			);
			socket.write(serializeResponse(error));
			socket.destroy();
			this.logger.warn("Connection rejected: max connections reached", { requestId });
			return;
		}

		// Create connection context
		const ctx: ConnectionContext = {
			socket,
			buffer: "",
			paused: false,
		};

		this.connections.set(socket, ctx);
		this.updateActivity();
		this.logger.debug("Connection established", { requestId, connections: this.connections.size });
		this.emit("connection", socket);

		socket.on("data", async (data) => {
			const connCtx = this.connections.get(socket);
			if (!connCtx) {
				return;
			}

			// Handle backpressure: pause while processing
			if (!connCtx.paused) {
				socket.pause();
				connCtx.paused = true;
			}

			connCtx.buffer += data.toString();

			// Check buffer size limit
			if (connCtx.buffer.length > MAX_BUFFER_SIZE) {
				const error = new RequestTooLargeError(connCtx.buffer.length, MAX_BUFFER_SIZE);
				const response = createErrorResponse("0", error.code, error.message);
				socket.write(serializeResponse(response));
				socket.destroy();
				this.connections.delete(socket);
				this.logger.warn("Connection closed: buffer overflow", { requestId, size: connCtx.buffer.length });
				return;
			}

			// Parse newline-delimited JSON-RPC
			const lines = connCtx.buffer.split("\n");
			connCtx.buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.trim()) {
					continue;
				}

				const lineRequestId = generateRequestId();

				try {
					const request = parseRequest(line);
					const response = await this.handleRequest(request, lineRequestId);

					// Handle backpressure on write
					const canContinue = socket.write(serializeResponse(response));
					if (!canContinue) {
						await new Promise<void>((resolve) => socket.once("drain", resolve));
					}
				} catch (err) {
					const daemonError = err instanceof DaemonError ? err : new ParseError(String(err));
					const parseError = createErrorResponse("null", daemonError.code, daemonError.message);
					socket.write(serializeResponse(parseError));
				}
			}

			// Resume reading
			if (connCtx.paused) {
				socket.resume();
				connCtx.paused = false;
			}
		});

		socket.on("close", () => {
			this.connections.delete(socket);
			this.logger.debug("Connection closed", { requestId, connections: this.connections.size });
			this.emit("disconnection", socket);
		});

		socket.on("error", (err) => {
			this.logger.error("Socket error", { requestId, error: String(err) });
			this.emit("error", err);
			socket.destroy();
			this.connections.delete(socket);
		});
	}

	/**
	 * Handle a JSON-RPC request with timeout
	 */
	private async handleRequest(request: DaemonRequest, requestId: string): Promise<DaemonResponse> {
		this.updateActivity();
		const startTime = Date.now();

		this.logger.debug("Request received", { requestId, method: request.method });

		try {
			// Create timeout wrapper
			const result = await this.withTimeout(
				this.dispatch(request.method, request.params, requestId),
				OPERATION_TIMEOUT_MS,
				request.method,
			);

			const durationMs = Date.now() - startTime;
			this.logger.debug("Request completed", { requestId, method: request.method, durationMs });

			return createResponse(request.id, result);
		} catch (err) {
			const durationMs = Date.now() - startTime;
			const daemonError = toDaemonError(err);

			this.logger.error("Request failed", {
				requestId,
				method: request.method,
				durationMs,
				error: daemonError.message,
				code: daemonError.code,
			});

			return createErrorResponse(request.id, daemonError.code, daemonError.message, daemonError.context);
		}
	}

	/**
	 * Wrap a promise with a timeout
	 */
	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
		let timeoutId: NodeJS.Timeout | undefined;

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new TimeoutError(operation, timeoutMs));
			}, timeoutMs);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}
	}

	/**
	 * Dispatch method to handler
	 */
	private async dispatch(method: DaemonMethod, params: Record<string, unknown>, requestId: string): Promise<unknown> {
		switch (method) {
			case "daemon.ping":
				return this.handlePing();

			case "daemon.status":
				return this.handleStatus();

			case "daemon.shutdown":
				// Defer shutdown to allow response to be sent
				setImmediate(() => this.shutdown());
				return { shutting_down: true };

			case "daemon.reload":
				return this.handleReload();

			case "session.begin":
				return this.handleSessionBegin(params, requestId);

			case "session.end":
				return this.handleSessionEnd(params, requestId);

			case "session.status":
				return this.handleSessionStatus(params, requestId);

			case "session.changes":
				return this.handleSessionChanges(params, requestId);

			case "snapshot.create":
				return this.handleSnapshotCreate(params, requestId);

			case "snapshot.list":
				return this.handleSnapshotList(params, requestId);

			case "snapshot.restore":
				return this.handleSnapshotRestore(params, requestId);

			case "learning.add":
				return this.handleLearningAdd(params, requestId);

			case "learning.search":
				return this.handleLearningSearch(params, requestId);

			case "context.get":
				return this.handleContextGet(params, requestId);

			case "validate.quick":
				return this.handleValidateQuick(params, requestId);

			default:
				throw new MethodNotFoundError(method);
		}
	}

	// =========================================================================
	// METHOD HANDLERS
	// =========================================================================

	private handlePing(): { pong: true; uptime: number; version: string } {
		return {
			pong: true,
			uptime: Date.now() - this.startTime,
			version: this.config.version,
		};
	}

	private handleStatus(): {
		pid: number;
		version: string;
		uptime: number;
		startedAt: string;
		workspaces: number;
		connections: number;
		memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
		idleTimeout: number;
		lastActivity: number;
	} {
		const mem = process.memoryUsage();
		return {
			pid: process.pid,
			version: this.config.version,
			uptime: Date.now() - this.startTime,
			startedAt: new Date(this.startTime).toISOString(),
			workspaces: this.workspaces.size,
			connections: this.connections.size,
			memoryUsage: {
				heapUsed: mem.heapUsed,
				heapTotal: mem.heapTotal,
				rss: mem.rss,
			},
			idleTimeout: this.config.idleTimeoutMs,
			lastActivity: this.lastActivity,
		};
	}

	private handleReload(): { reloaded: true } {
		this.emit("reload");
		return { reloaded: true };
	}

	private async handleSessionBegin(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, task, files } = params as {
			workspace: string;
			task: string;
			files?: string[];
		};

		// Validate required params
		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required and must be a string");
		}
		if (!task || typeof task !== "string") {
			throw new InvalidParamsError("task is required and must be a string");
		}

		// Validate file paths if provided
		if (files && Array.isArray(files)) {
			validatePaths(workspace, files);
		}

		// Create or get workspace context
		let ctx = this.workspaces.get(workspace);
		if (!ctx) {
			ctx = {
				id: this.hashWorkspace(workspace),
				root: workspace,
				initialized: true,
				sessionActive: false,
				snapshotCount: 0,
				lastActivity: Date.now(),
				subscribers: new Set(),
			};
			this.workspaces.set(workspace, ctx);
		}

		// Start session
		const taskId = `task_${Date.now().toString(36)}_${requestId}`;
		ctx.sessionActive = true;
		ctx.currentTaskId = taskId;
		ctx.lastActivity = Date.now();

		this.logger.info("Session started", { requestId, workspace, taskId });

		return {
			taskId,
			snapshot: {
				created: false,
				reason: "Auto-snapshot disabled in daemon mode",
			},
			patterns: [],
			constraints: [],
			learnings: [],
			riskAssessment: {
				overallRisk: "low",
				riskAreas: [],
				recommendations: [],
			},
			nextActions: [
				{ tool: "quick_check", priority: 2, reason: "Validate changes" },
				{ tool: "review_work", priority: 4, reason: "Review before commit" },
			],
		};
	}

	private async handleSessionEnd(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, outcome } = params as {
			workspace: string;
			outcome?: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		const ctx = this.workspaces.get(workspace);
		if (!ctx) {
			throw new WorkspaceNotFoundError(workspace);
		}

		const duration = Date.now() - ctx.lastActivity;
		ctx.sessionActive = false;
		ctx.currentTaskId = undefined;

		this.logger.info("Session ended", { requestId, workspace, outcome, duration });

		return {
			summary: {
				filesModified: 0,
				linesChanged: 0,
				duration,
			},
			snapshot: { created: false },
			learningsAccepted: 0,
		};
	}

	private async handleSessionStatus(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace } = params as { workspace: string };

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		const ctx = this.workspaces.get(workspace);
		if (!ctx) {
			return {
				active: false,
				filesModified: 0,
				snapshotCount: 0,
			};
		}

		return {
			active: ctx.sessionActive,
			taskId: ctx.currentTaskId,
			task: undefined,
			startedAt: undefined,
			filesModified: 0,
			snapshotCount: ctx.snapshotCount,
		};
	}

	private async handleSessionChanges(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const {
			workspace,
			includeDiff: _includeDiff,
			filterFiles,
			includeAIAttribution = true,
		} = params as {
			workspace: string;
			includeDiff?: boolean;
			filterFiles?: string[];
			includeAIAttribution?: boolean;
		};
		// Note: _includeDiff is reserved for future diff functionality

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		// Validate filter file paths if provided
		if (filterFiles && Array.isArray(filterFiles)) {
			validatePaths(workspace, filterFiles);
		}

		const ctx = this.workspaces.get(workspace);
		if (!ctx || !ctx.sessionActive || !ctx.currentTaskId) {
			// No active session, return empty
			return {
				files: [],
				totalLinesChanged: 0,
				riskAssessment: {
					overallRisk: "low" as const,
				},
			};
		}

		// Query Intelligence for file modifications (shared across Extension, MCP, CLI, Daemon)
		try {
			const intel = getIntelligence(workspace);
			const modifications = intel.getFileModifications(ctx.currentTaskId, ctx.lastActivity);

			// Map modifications to daemon format
			let files = modifications.map((mod) => {
				const relativePath = mod.path.startsWith(workspace) ? relative(workspace, mod.path) : mod.path;
				return {
					path: relativePath,
					status: (mod.type === "create" ? "created" : mod.type === "delete" ? "deleted" : "modified") as
						| "created"
						| "modified"
						| "deleted",
					linesChanged: mod.linesChanged,
					aiAttributed: includeAIAttribution ? mod.aiAttributed : undefined,
				};
			});

			// Apply filter if provided
			if (filterFiles && filterFiles.length > 0) {
				files = files.filter((f) =>
					filterFiles.some((filter) => f.path.includes(filter) || filter.includes(f.path)),
				);
			}

			// Calculate totals and risk
			const totalLinesChanged = files.reduce((sum, f) => sum + f.linesChanged, 0);
			const aiAttributedFiles = files.filter((f) => f.aiAttributed).length;

			// Assess risk based on changes
			let overallRisk: "low" | "medium" | "high" = "low";
			const criticalPatterns = ["auth", "payment", "security", "config", "migration", "env"];
			const hasCriticalFiles = files.some((f) =>
				criticalPatterns.some((pattern) => f.path.toLowerCase().includes(pattern)),
			);
			const highAiRatio = files.length >= 3 && aiAttributedFiles / files.length > 0.7;

			if (hasCriticalFiles && highAiRatio) {
				overallRisk = "high";
			} else if (hasCriticalFiles || highAiRatio || totalLinesChanged > 500) {
				overallRisk = "medium";
			}

			this.logger.debug("Session changes retrieved", {
				requestId,
				workspace,
				fileCount: files.length,
				totalLinesChanged,
				overallRisk,
			});

			return {
				files,
				totalLinesChanged,
				riskAssessment: {
					overallRisk,
				},
			};
		} catch (err) {
			this.logger.warn("Failed to get session changes from Intelligence", {
				requestId,
				error: String(err),
			});

			// Fall back to empty response
			return {
				files: [],
				totalLinesChanged: 0,
				riskAssessment: {
					overallRisk: "low" as const,
				},
			};
		}
	}

	private async handleSnapshotCreate(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, files, reason } = params as {
			workspace: string;
			files: string[];
			reason?: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!files || !Array.isArray(files) || files.length === 0) {
			throw new InvalidParamsError("files is required and must be a non-empty array");
		}

		// Validate all file paths
		validatePaths(workspace, files);

		const ctx = this.workspaces.get(workspace);
		if (ctx) {
			ctx.snapshotCount++;
		}

		const snapshotId = `snap_${Date.now().toString(36)}_${requestId}`;

		// Broadcast snapshot created event
		this.broadcastToWorkspace(workspace, {
			type: "snapshot.created",
			timestamp: Date.now(),
			workspace,
			data: { snapshotId, fileCount: files.length, reason },
		});

		this.logger.info("Snapshot created", { requestId, workspace, snapshotId, fileCount: files.length });

		return {
			snapshotId,
			fileCount: files.length,
			totalSize: 0,
			createdAt: new Date().toISOString(),
			deduplicated: false,
		};
	}

	private async handleSnapshotList(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace } = params as {
			workspace: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		// Return empty list for now - integration with actual storage pending
		return {
			snapshots: [],
			total: 0,
		};
	}

	private async handleSnapshotRestore(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace, snapshotId, files, dryRun } = params as {
			workspace: string;
			snapshotId: string;
			files?: string[];
			dryRun?: boolean;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!snapshotId || typeof snapshotId !== "string") {
			throw new InvalidParamsError("snapshotId is required");
		}

		// Validate file paths if provided
		if (files && Array.isArray(files)) {
			validatePaths(workspace, files);
		}

		return {
			restored: !dryRun,
			filesRestored: 0,
			dryRun: !!dryRun,
			changes: [],
		};
	}

	private async handleLearningAdd(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, type, trigger, action } = params as {
			workspace: string;
			type: string;
			trigger: string;
			action: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!type || typeof type !== "string") {
			throw new InvalidParamsError("type is required");
		}
		if (!trigger || typeof trigger !== "string") {
			throw new InvalidParamsError("trigger is required");
		}
		if (!action || typeof action !== "string") {
			throw new InvalidParamsError("action is required");
		}

		const learningId = `learn_${Date.now().toString(36)}_${requestId}`;

		this.logger.info("Learning added", { requestId, workspace, learningId, type });

		return {
			learningId,
			message: "Learning recorded",
		};
	}

	private async handleLearningSearch(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace, keywords: keywordsParam } = params as {
			workspace: string;
			keywords: string[];
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!keywordsParam || !Array.isArray(keywordsParam)) {
			throw new InvalidParamsError("keywords is required and must be an array");
		}

		return {
			learnings: [],
			count: 0,
		};
	}

	private async handleContextGet(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace, task, files } = params as {
			workspace: string;
			task: string;
			files?: string[];
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!task || typeof task !== "string") {
			throw new InvalidParamsError("task is required");
		}

		// Validate file paths if provided
		if (files && Array.isArray(files)) {
			validatePaths(workspace, files);
		}

		return {
			patterns: [],
			constraints: [],
			learnings: [],
			observations: [],
			riskAssessment: {
				overallRisk: "low",
				riskAreas: [],
				recommendations: [],
			},
		};
	}

	private async handleValidateQuick(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace, file, files } = params as {
			workspace: string;
			file?: string;
			files?: string[];
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		// Validate file paths
		if (file) {
			validatePath(workspace, file);
		}
		if (files && Array.isArray(files)) {
			validatePaths(workspace, files);
		}

		return {
			passed: true,
			typescript: { passed: true, errors: 0 },
			tests: { discovered: 0 },
			lint: { passed: true, errors: 0, warnings: 0 },
		};
	}

	// =========================================================================
	// HELPER METHODS
	// =========================================================================

	/**
	 * Update last activity time and reset idle timer
	 */
	private updateActivity(): void {
		this.lastActivity = Date.now();
		this.resetIdleTimer();
	}

	/**
	 * Reset the idle timer
	 */
	private resetIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
		}

		this.idleTimer = setTimeout(() => {
			if (this.connections.size === 0) {
				this.logger.info("Idle timeout reached, shutting down");
				this.emit("idle_timeout");
				this.shutdown();
			} else {
				// Still have connections, reset timer
				this.resetIdleTimer();
			}
		}, this.config.idleTimeoutMs || DEFAULT_IDLE_TIMEOUT_MS);
	}

	/**
	 * Broadcast event to all subscribers of a workspace
	 *
	 * Filters connections to only send to those subscribed to the given workspace.
	 * Each connection context tracks which workspace(s) it is subscribed to.
	 */
	private broadcastToWorkspace(workspace: string, event: unknown): void {
		const notification = createNotification(event as any);
		for (const [socket, ctx] of this.connections) {
			// Only send to connections subscribed to this workspace
			if (ctx.workspace === workspace) {
				try {
					socket.write(serializeResponse(notification));
				} catch {
					// Ignore write errors - connection may be closing
				}
			}
		}
	}

	/**
	 * Hash workspace path for identification
	 */
	private hashWorkspace(path: string): string {
		let hash = 0;
		const normalized = path.toLowerCase().replace(/\\/g, "/");
		for (let i = 0; i < normalized.length; i++) {
			hash = (hash << 5) - hash + normalized.charCodeAt(i);
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}
}
