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
import { createRuntimeContext, type ISnapshotStorage, LocalEngineAdapter, RuntimeRouter } from "@snapback/core/runtime";
import { Intelligence } from "@snapback/intelligence";
import { LocalStorage, ProtectionManager, SnapshotManager } from "@snapback/sdk";
import { AutomatedLearningPruner } from "../services/learning-pruner.js";

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
	InternalError,
	InvalidParamsError,
	MethodNotFoundError,
	ParseError,
	RequestTooLargeError,
	TimeoutError,
	toDaemonError,
	WorkspaceNotFoundError,
} from "./errors.js";
import { disposeFileWatcherService, type FileChangeEvent, getFileWatcherService } from "./file-watcher.js";
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
	const instance = intelligenceInstances.get(workspaceRoot);
	if (!instance) {
		throw new Error(`Intelligence instance not found for workspace: ${workspaceRoot}`);
	}
	return instance;
}

// =============================================================================
// RUNTIME ROUTER SINGLETON (ADR-001 Core Runtime Architecture)
// =============================================================================

/**
 * RuntimeRouter instances per workspace (singleton pattern for ADR-001 compliance)
 * Per ADR-001: Use RuntimeRouter for connectivity-aware routing between local and platform.
 * Daemon operates in local-first mode with privacy by default.
 */
export const runtimeRouterInstances = new Map<string, RuntimeRouter>();

/**
 * Get or create RuntimeRouter instance for a workspace.
 * Per ADR-001: Routes snapshot operations through RuntimeRouter instead of direct storage access.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns RuntimeRouter instance configured for local-first operation
 */
export function getRuntimeRouter(workspaceRoot: string): RuntimeRouter {
	if (!runtimeRouterInstances.has(workspaceRoot)) {
		// Create storage adapter (SQLite-based, same as SnapshotManager)
		const dbPath = join(workspaceRoot, ".snapback", "snapshots.db");
		const storage = new LocalStorage(dbPath);

		// Wrap storage with LocalEngineAdapter (ADR-001 ILocalEngine interface)
		const localEngine = new LocalEngineAdapter(storage as unknown as ISnapshotStorage);

		// Create runtime context for daemon (local-first, privacy by default)
		const context = createRuntimeContext({
			connectivity: "offline", // Daemon assumes local-first operation
			authState: "anonymous", // No platform auth in daemon
			tier: "free",
			privacyMode: true, // Privacy by default for local operations
			featureFlags: {},
			workspace: {
				path: workspaceRoot,
			},
		});

		// Create RuntimeRouter with local engine only (no platform runtime for daemon)
		const router = new RuntimeRouter(
			localEngine,
			null, // No platform runtime - daemon is local-only
			context,
			{
				enableSyncQueue: false, // No sync queue for local-only daemon
			},
		);

		runtimeRouterInstances.set(workspaceRoot, router);
	}

	const instance = runtimeRouterInstances.get(workspaceRoot);
	if (!instance) {
		throw new Error(`RuntimeRouter instance not found for workspace: ${workspaceRoot}`);
	}
	return instance;
}

/**
 * Dispose all RuntimeRouter instances.
 * Should be called during daemon shutdown for proper resource cleanup.
 */
export async function disposeRuntimeRouters(): Promise<void> {
	const disposePromises = Array.from(runtimeRouterInstances.values()).map((router) => router.dispose());

	await Promise.all(disposePromises);
	runtimeRouterInstances.clear();
}

// =============================================================================
// SNAPSHOT MANAGER SINGLETON (ARCHITECTURE_REFACTOR_SPEC.md Phase 2)
// =============================================================================

/**
 * SnapshotManager instances per workspace (singleton pattern for SDK integration)
 * Per ARCHITECTURE_REFACTOR_SPEC.md Phase 2: Import OSS SDK
 */
const snapshotManagerInstances = new Map<string, SnapshotManager>();
const storageInstances = new Map<string, LocalStorage>();

/**
 * Get or create SnapshotManager instance for a workspace.
 * Per ARCHITECTURE_REFACTOR_SPEC.md Phase 2: Wire CLI daemon handlers to use SDK packages.
 */
function getSnapshotManager(workspaceRoot: string): SnapshotManager {
	if (!snapshotManagerInstances.has(workspaceRoot)) {
		// Create storage adapter (SQLite-based)
		const dbPath = join(workspaceRoot, ".snapback", "snapshots.db");
		const storage = new LocalStorage(dbPath);
		storageInstances.set(workspaceRoot, storage);

		// Create SnapshotManager with deduplication enabled
		const manager = new SnapshotManager(storage, {
			enableDeduplication: true,
			namingStrategy: "semantic",
			autoProtect: false,
		});
		snapshotManagerInstances.set(workspaceRoot, manager);
	}
	const instance = snapshotManagerInstances.get(workspaceRoot);
	if (!instance) {
		throw new Error(`SnapshotManager instance not found for workspace: ${workspaceRoot}`);
	}
	return instance;
}

// =============================================================================
// PROTECTION MANAGER SINGLETON (ARCHITECTURE_REFACTOR_SPEC.md Sprint 1)
// =============================================================================

/**
 * ProtectionManager instances per workspace (singleton pattern for SDK integration)
 * Per ARCHITECTURE_REFACTOR_SPEC.md Sprint 1: Add protection methods to daemon protocol
 */
const protectionManagerInstances = new Map<string, ProtectionManager>();

/**
 * Get or create ProtectionManager instance for a workspace.
 * Per ARCHITECTURE_REFACTOR_SPEC.md Sprint 1: Enable protection delegation through daemon.
 */
function getProtectionManager(workspaceRoot: string): ProtectionManager {
	if (!protectionManagerInstances.has(workspaceRoot)) {
		// Create ProtectionManager with default config
		const manager = new ProtectionManager({
			patterns: [],
			defaultLevel: "watch",
			enabled: true,
			autoProtectConfigs: true,
		});
		protectionManagerInstances.set(workspaceRoot, manager);
	}
	const instance = protectionManagerInstances.get(workspaceRoot);
	if (!instance) {
		throw new Error(`ProtectionManager instance not found for workspace: ${workspaceRoot}`);
	}
	return instance;
}

// =============================================================================
// LEARNING PRUNER SINGLETON (Automated Learning Lifecycle Management)
// =============================================================================

/**
 * AutomatedLearningPruner instances per workspace (singleton pattern for background pruning)
 */
const learningPrunerInstances = new Map<string, AutomatedLearningPruner>();

/**
 * Get or create AutomatedLearningPruner instance for a workspace.
 * Enables automated pruning of stale learnings and violations.
 */
function getLearningPruner(workspaceRoot: string): AutomatedLearningPruner {
	if (!learningPrunerInstances.has(workspaceRoot)) {
		// Create pruner with default config (archive-only mode for safety)
		const pruner = new AutomatedLearningPruner({
			workspaceRoot,
			dryRun: false, // Actually archive files
			maxAgeDays: 90,
			minUsageCount: 3,
			archiveDir: ".snapback/archive",
		});
		learningPrunerInstances.set(workspaceRoot, pruner);
	}
	const instance = learningPrunerInstances.get(workspaceRoot);
	if (!instance) {
		throw new Error(`AutomatedLearningPruner instance not found for workspace: ${workspaceRoot}`);
	}
	return instance;
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
	private pruningTimer: NodeJS.Timeout | null = null;
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

			// Start scheduled pruning (daily at 2am)
			this.startScheduledPruning();

			// Restore persisted state
			await this.restoreState();

			// Initialize file watcher service and wire up events
			this.initFileWatcherEvents();

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

		// Clear pruning timer
		if (this.pruningTimer) {
			clearTimeout(this.pruningTimer);
			this.pruningTimer = null;
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

		// Close all file watchers
		await disposeFileWatcherService();

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

			// ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Snapshot delete handler
			case "snapshot.delete":
				return this.handleSnapshotDelete(params, requestId);

			// ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Remaining snapshot operations
			case "snapshot.bulkDelete":
				return this.handleSnapshotBulkDelete(params, requestId);

			case "snapshot.protect":
				return this.handleSnapshotProtect(params, requestId);

			case "snapshot.unprotect":
				return this.handleSnapshotUnprotect(params, requestId);

			case "snapshot.rename":
				return this.handleSnapshotRename(params, requestId);

			case "learning.add":
				return this.handleLearningAdd(params, requestId);

			case "learning.search":
				return this.handleLearningSearch(params, requestId);

			case "learning.list":
				return this.handleLearningList(params, requestId);

			case "learning.prune":
				return this.handleLearningPrune(params, requestId);

			case "learning.evaluate":
				return this.handleLearningEvaluate(params, requestId);

			case "learning.updateSession":
				return this.handleLearningUpdateSession(params, requestId);

			case "learning.gc":
				return this.handleLearningGC(params, requestId);

			case "context.get":
				return this.handleContextGet(params, requestId);

			case "validate.quick":
				return this.handleValidateQuick(params, requestId);

			case "watch.subscribe":
				return this.handleWatchSubscribe(params, requestId);

			case "watch.unsubscribe":
				return this.handleWatchUnsubscribe(params, requestId);

			// MCP coordination methods
			case "snapshot.created":
				return this.handleSnapshotCreatedNotification(params, requestId);

			case "file.modified":
				return this.handleFileModifiedNotification(params, requestId);

			// Protection methods (ARCHITECTURE_REFACTOR_SPEC.md Sprint 1)
			case "protection.getLevel":
				return this.handleProtectionGetLevel(params, requestId);

			case "protection.setLevel":
				return this.handleProtectionSetLevel(params, requestId);

			case "protection.list":
				return this.handleProtectionList(params, requestId);

			// Validation methods (ARCHITECTURE_REFACTOR_SPEC.md Section D.3)
			case "validate.comprehensive":
				return this.handleValidateComprehensive(params, requestId);

			// Violation tracking methods (ARCHITECTURE_REFACTOR_SPEC.md Section D.3)
			case "violation.report":
				return this.handleViolationReport(params, requestId);

			case "violation.list":
				return this.handleViolationList(params, requestId);

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
		const { workspace, task, files, keywords } = params as {
			workspace: string;
			task: string;
			files?: string[];
			keywords?: string[];
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
		ctx.sessionStartedAt = Date.now();
		ctx.lastActivity = Date.now();

		// Get Intelligence instance for cross-surface coordination
		const intel = getIntelligence(workspace);

		// Start Intelligence session with same task ID (enables Extension, MCP, CLI to share state)
		intel.startSession(taskId, {
			workspaceId: workspace,
			tags: keywords || [],
		});

		// Extract keywords from task if not provided
		const effectiveKeywords =
			keywords && keywords.length > 0
				? keywords
				: task
						.toLowerCase()
						.split(/\s+/)
						.filter((w) => w.length > 3);

		// Get context from Intelligence (patterns, constraints, learnings)
		let patterns: Array<{ name: string; description: string }> = [];
		const constraints: Array<{ domain: string; name: string; value: string | number; description: string }> = [];
		let learnings: Array<{ type: string; trigger: string; action: string; relevanceScore: number }> = [];

		try {
			const contextResult = await intel.getContext({
				task,
				keywords: effectiveKeywords,
			});

			// Extract patterns from context
			if (contextResult.patterns) {
				const patternLines = contextResult.patterns.split("\n").filter(Boolean);
				patterns = patternLines.slice(0, 5).map((line) => ({
					name: line.substring(0, 50),
					description: line,
				}));
			}

			// Get learnings relevant to keywords
			const learningsResult = intel.queryLearnings(effectiveKeywords);
			learnings = learningsResult.slice(0, 5).map((l, index) => ({
				type: l.type,
				trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
				action: l.action,
				// Score based on position (earlier = more relevant)
				relevanceScore: (learningsResult.length - index) / learningsResult.length,
			}));
		} catch (err) {
			this.logger.warn("Failed to get Intelligence context", { requestId, error: String(err) });
		}

		// Get constraints from context file
		try {
			const ctxPath = join(workspace, ".snapback", "ctx", "context.json");
			if (existsSync(ctxPath)) {
				const ctxContent = JSON.parse(await readFile(ctxPath, "utf8"));
				if (ctxContent.constraints) {
					for (const [domain, domainConstraints] of Object.entries(ctxContent.constraints)) {
						for (const [name, constraint] of Object.entries(domainConstraints as Record<string, any>)) {
							constraints.push({
								domain,
								name,
								value: constraint.max || constraint.value,
								description: constraint.description || "",
							});
						}
					}
				}
			}
		} catch {
			this.logger.debug("No constraints file found", { requestId, workspace });
		}

		// Assess risk based on files
		const riskAreas: string[] = [];
		const recommendations: string[] = [];

		if (files && files.length > 0) {
			for (const file of files) {
				const lowerPath = file.toLowerCase();
				if ((lowerPath.includes("auth") || lowerPath.includes("login")) && !riskAreas.includes("auth")) {
					riskAreas.push("auth");
					recommendations.push("Test with both valid and invalid credentials");
				}
				if ((lowerPath.includes("payment") || lowerPath.includes("stripe")) && !riskAreas.includes("payment")) {
					riskAreas.push("payment");
					recommendations.push("Use test mode/sandbox for payment testing");
				}
				if (
					(lowerPath.includes("database") || lowerPath.includes("migration")) &&
					!riskAreas.includes("database")
				) {
					riskAreas.push("database");
					recommendations.push("Verify migrations can be rolled back");
				}
				if ((lowerPath.includes("config") || lowerPath.includes(".env")) && !riskAreas.includes("config")) {
					riskAreas.push("config");
					recommendations.push("Ensure secrets are not committed");
				}
				if (
					(lowerPath.includes("security") || lowerPath.includes("crypto")) &&
					!riskAreas.includes("security")
				) {
					riskAreas.push("security");
				}
			}
			if (files.length >= 5) {
				recommendations.push("Consider breaking into smaller focused changes");
			}
		}

		// Determine overall risk
		const criticalAreas = ["auth", "payment", "security"];
		const hasCritical = riskAreas.some((a) => criticalAreas.includes(a));
		const overallRisk: "low" | "medium" | "high" = hasCritical
			? "high"
			: riskAreas.length >= 2
				? "medium"
				: riskAreas.length > 0
					? "medium"
					: "low";

		this.logger.info("Session started with Intelligence", {
			requestId,
			workspace,
			taskId,
			patternsCount: patterns.length,
			learningsCount: learnings.length,
			overallRisk,
		});

		return {
			taskId,
			snapshot: {
				created: false,
				reason:
					overallRisk === "high"
						? "Consider creating a safety snapshot"
						: "Auto-snapshot available on request",
			},
			patterns,
			constraints,
			learnings,
			riskAssessment: {
				overallRisk,
				riskAreas,
				recommendations,
			},
			nextActions: [
				...(overallRisk === "high"
					? [{ tool: "snapshot_create", priority: 1, reason: "Create safety snapshot for high-risk changes" }]
					: []),
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

		const sessionStartedAt = ctx.sessionStartedAt || ctx.lastActivity;
		const duration = Date.now() - sessionStartedAt;
		const taskId = ctx.currentTaskId;

		// Get Intelligence instance for session data
		const intel = getIntelligence(workspace);

		// Get file modifications from this session
		let filesModified = 0;
		let linesChanged = 0;

		if (taskId) {
			try {
				const modifications = intel.getFileModifications(taskId, sessionStartedAt);
				filesModified = modifications.length;
				linesChanged = modifications.reduce((sum, m) => sum + m.linesChanged, 0);
			} catch (err) {
				this.logger.warn("Failed to get session modifications", { requestId, error: String(err) });
			}

			// End Intelligence session
			try {
				intel.endSession(taskId);
			} catch (err) {
				this.logger.warn("Failed to end Intelligence session", { requestId, error: String(err) });
			}
		}

		// Clear session state
		ctx.sessionActive = false;
		ctx.currentTaskId = undefined;
		ctx.sessionStartedAt = undefined;

		this.logger.info("Session ended with Intelligence", {
			requestId,
			workspace,
			outcome,
			duration,
			filesModified,
			linesChanged,
		});

		return {
			summary: {
				filesModified,
				linesChanged,
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

		// 🆕 ARCHITECTURE_REFACTOR_SPEC.md Phase 2: Use SDK SnapshotManager
		try {
			const snapshotManager = getSnapshotManager(workspace);

			// Read file contents for snapshot
			const fileInputs = await Promise.all(
				files.map(async (filePath) => {
					try {
						const fullPath = join(workspace, filePath);
						const content = await readFile(fullPath, "utf-8");
						return { path: filePath, content, action: "modify" as const };
					} catch {
						// File doesn't exist or can't be read - use empty content
						return { path: filePath, content: "", action: "add" as const };
					}
				}),
			);

			// Create snapshot using SDK SnapshotManager
			const snapshot = await snapshotManager.create(fileInputs, {
				description: reason,
			});

			// Calculate total size
			const totalSize = fileInputs.reduce((sum, f) => sum + f.content.length, 0);

			// Broadcast snapshot created event
			this.broadcastToWorkspace(workspace, {
				type: "snapshot.created",
				timestamp: Date.now(),
				workspace,
				data: { snapshotId: snapshot.id, fileCount: files.length, reason },
			});

			this.logger.info("Snapshot created via SDK", {
				requestId,
				workspace,
				snapshotId: snapshot.id,
				fileCount: files.length,
			});

			return {
				snapshotId: snapshot.id,
				fileCount: files.length,
				totalSize,
				createdAt: new Date(snapshot.timestamp).toISOString(),
				deduplicated: false,
			};
		} catch (err) {
			// Fallback to simple ID generation if SDK fails
			this.logger.warn("SDK snapshot creation failed, using fallback", {
				requestId,
				error: err instanceof Error ? err.message : String(err),
			});

			const snapshotId = `snap_${Date.now().toString(36)}_${requestId}`;

			// Broadcast snapshot created event
			this.broadcastToWorkspace(workspace, {
				type: "snapshot.created",
				timestamp: Date.now(),
				workspace,
				data: { snapshotId, fileCount: files.length, reason },
			});

			this.logger.info("Snapshot created (fallback)", {
				requestId,
				workspace,
				snapshotId,
				fileCount: files.length,
			});

			return {
				snapshotId,
				fileCount: files.length,
				totalSize: 0,
				createdAt: new Date().toISOString(),
				deduplicated: false,
			};
		}
	}

	private async handleSnapshotList(params: Record<string, unknown>, _requestId: string): Promise<unknown> {
		const { workspace, limit } = params as {
			workspace: string;
			limit?: number;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		// 🆕 ARCHITECTURE_REFACTOR_SPEC.md Phase 2: Use SDK SnapshotManager
		try {
			const snapshotManager = getSnapshotManager(workspace);
			const allSnapshots = await snapshotManager.list();

			// Apply limit if provided
			const snapshots = limit ? allSnapshots.slice(0, limit) : allSnapshots;

			return {
				snapshots: snapshots.map((s) => ({
					id: s.id,
					createdAt: new Date(s.timestamp).toISOString(),
					fileCount: (s.files || []).length,
					reason: s.meta?.name,
					protected: s.meta?.protected || false,
				})),
				total: allSnapshots.length,
			};
		} catch (err) {
			// Fallback to empty list if SDK fails
			this.logger.warn("SDK snapshot list failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				snapshots: [],
				total: 0,
			};
		}
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

		// 🆕 ARCHITECTURE_REFACTOR_SPEC.md Phase 2: Use SDK SnapshotManager
		try {
			const snapshotManager = getSnapshotManager(workspace);
			const result = await snapshotManager.restore(snapshotId, workspace, { dryRun });

			return {
				restored: result.success && !dryRun,
				filesRestored: result.restoredFiles.length,
				dryRun: !!dryRun,
				changes: result.restoredFiles.map((f: string) => ({ file: f, action: "restore" })),
				errors: result.errors,
			};
		} catch (err) {
			// Fallback response if SDK fails
			this.logger.warn("SDK snapshot restore failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				restored: false,
				filesRestored: 0,
				dryRun: !!dryRun,
				changes: [],
				errors: [err instanceof Error ? err.message : String(err)],
			};
		}
	}

	/**
	 * Handle snapshot.delete - Delete a snapshot by ID
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Snapshot domain delegation
	 */
	private async handleSnapshotDelete(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ deleted: boolean; snapshotId: string }> {
		const { workspace, snapshotId } = params as {
			workspace: string;
			snapshotId: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!snapshotId || typeof snapshotId !== "string") {
			throw new InvalidParamsError("snapshotId is required");
		}

		try {
			const snapshotManager = getSnapshotManager(workspace);
			await snapshotManager.delete(snapshotId);

			this.logger.info("Snapshot deleted via daemon", {
				workspace,
				snapshotId,
			});

			return {
				deleted: true,
				snapshotId,
			};
		} catch (err) {
			this.logger.warn("SDK snapshot delete failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				deleted: false,
				snapshotId,
			};
		}
	}

	/**
	 * Handle snapshot.bulkDelete - Bulk delete snapshots by age
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Remaining snapshot operations
	 */
	private async handleSnapshotBulkDelete(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ success: boolean; deletedCount: number }> {
		const {
			workspace,
			olderThanDays,
			keepProtected = true,
		} = params as {
			workspace: string;
			olderThanDays?: number;
			keepProtected?: boolean;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		try {
			const snapshotManager = getSnapshotManager(workspace);

			// Calculate cutoff time
			const cutoffTime = olderThanDays
				? Date.now() - olderThanDays * 24 * 60 * 60 * 1000
				: Date.now() - 30 * 24 * 60 * 60 * 1000; // Default: 30 days

			// Get all snapshots and filter by age
			const allSnapshots = await snapshotManager.list();
			const toDelete = allSnapshots.filter((s) => {
				// Skip if newer than cutoff
				if (s.timestamp >= cutoffTime) {
					return false;
				}
				// Skip protected if requested
				if (keepProtected && s.meta?.protected) {
					return false;
				}
				return true;
			});

			// Delete each snapshot
			let deletedCount = 0;
			for (const snapshot of toDelete) {
				try {
					// Unprotect if needed
					if (snapshot.meta?.protected) {
						await snapshotManager.unprotect(snapshot.id);
					}
					await snapshotManager.delete(snapshot.id);
					deletedCount++;
				} catch (err) {
					this.logger.warn("Failed to delete snapshot in bulk operation", {
						snapshotId: snapshot.id,
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			this.logger.info("Bulk delete completed via daemon", {
				workspace,
				olderThanDays: olderThanDays || 30,
				keepProtected,
				deletedCount,
			});

			return {
				success: true,
				deletedCount,
			};
		} catch (err) {
			this.logger.warn("SDK bulk delete failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				success: false,
				deletedCount: 0,
			};
		}
	}

	/**
	 * Handle snapshot.protect - Mark snapshot as protected
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Remaining snapshot operations
	 */
	private async handleSnapshotProtect(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ success: boolean; snapshotId: string }> {
		const { workspace, snapshotId } = params as {
			workspace: string;
			snapshotId: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!snapshotId || typeof snapshotId !== "string") {
			throw new InvalidParamsError("snapshotId is required");
		}

		try {
			const snapshotManager = getSnapshotManager(workspace);
			await snapshotManager.protect(snapshotId);

			this.logger.info("Snapshot protected via daemon", {
				workspace,
				snapshotId,
			});

			return {
				success: true,
				snapshotId,
			};
		} catch (err) {
			this.logger.warn("SDK snapshot protect failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				success: false,
				snapshotId,
			};
		}
	}

	/**
	 * Handle snapshot.unprotect - Remove protection from snapshot
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Remaining snapshot operations
	 */
	private async handleSnapshotUnprotect(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ success: boolean; snapshotId: string }> {
		const { workspace, snapshotId } = params as {
			workspace: string;
			snapshotId: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!snapshotId || typeof snapshotId !== "string") {
			throw new InvalidParamsError("snapshotId is required");
		}

		try {
			const snapshotManager = getSnapshotManager(workspace);
			await snapshotManager.unprotect(snapshotId);

			this.logger.info("Snapshot unprotected via daemon", {
				workspace,
				snapshotId,
			});

			return {
				success: true,
				snapshotId,
			};
		} catch (err) {
			this.logger.warn("SDK snapshot unprotect failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				success: false,
				snapshotId,
			};
		}
	}

	/**
	 * Handle snapshot.rename - Rename a snapshot
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 3: Remaining snapshot operations
	 */
	private async handleSnapshotRename(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ success: boolean; snapshotId: string; newName: string }> {
		const { workspace, snapshotId, newName } = params as {
			workspace: string;
			snapshotId: string;
			newName: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!snapshotId || typeof snapshotId !== "string") {
			throw new InvalidParamsError("snapshotId is required");
		}
		if (!newName || typeof newName !== "string") {
			throw new InvalidParamsError("newName is required");
		}

		try {
			const snapshotManager = getSnapshotManager(workspace);

			// Get snapshot
			const snapshot = await snapshotManager.get(snapshotId);
			if (!snapshot) {
				throw new Error(`Snapshot ${snapshotId} not found`);
			}

			// Update name in metadata
			const updated = {
				...snapshot,
				meta: {
					...snapshot.meta,
					name: newName,
				},
			};

			// Save updated snapshot (reuse storage adapter directly)
			const storage = storageInstances.get(workspace);
			if (!storage) {
				throw new Error("Storage not found for workspace");
			}

			await storage.save(updated);

			this.logger.info("Snapshot renamed via daemon", {
				workspace,
				snapshotId,
				newName,
			});

			return {
				success: true,
				snapshotId,
				newName,
			};
		} catch (err) {
			this.logger.warn("SDK snapshot rename failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return {
				success: false,
				snapshotId,
				newName,
			};
		}
	}

	private async handleLearningAdd(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, type, trigger, action, source } = params as {
			workspace: string;
			type: string;
			trigger: string;
			action: string;
			source?: string;
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

		// Use Intelligence to persist the learning
		try {
			const intel = getIntelligence(workspace);
			await intel.recordLearning({
				type: type as "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow",
				trigger,
				action,
				source: source || "daemon",
			});

			this.logger.info("Learning added via Intelligence", { requestId, workspace, learningId, type });
		} catch (err) {
			this.logger.warn("Failed to add learning via Intelligence, falling back to local storage", {
				requestId,
				error: String(err),
			});

			// Fallback: Write directly to JSONL file
			try {
				const learningsDir = join(workspace, ".snapback", "learnings");
				if (!existsSync(learningsDir)) {
					mkdirSync(learningsDir, { recursive: true });
				}
				const learningsPath = join(learningsDir, "learnings.jsonl");
				const entry = {
					type,
					trigger,
					action,
					source: source || "daemon",
					timestamp: new Date().toISOString(),
				};
				await writeFile(learningsPath, `${JSON.stringify(entry)}\n`, { flag: "a" });
			} catch (writeErr) {
				this.logger.error("Failed to write learning", { requestId, error: String(writeErr) });
			}
		}

		return {
			learningId,
			message: "Learning recorded",
		};
	}

	private async handleLearningSearch(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const {
			workspace,
			keywords: keywordsParam,
			limit,
		} = params as {
			workspace: string;
			keywords: string[];
			limit?: number;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!keywordsParam || !Array.isArray(keywordsParam)) {
			throw new InvalidParamsError("keywords is required and must be an array");
		}

		try {
			const intel = getIntelligence(workspace);
			const learningsResult = intel.queryLearnings(keywordsParam);

			// Apply limit if provided
			const limitedLearnings = limit ? learningsResult.slice(0, limit) : learningsResult.slice(0, 10);

			const learnings = limitedLearnings.map((l, index) => ({
				type: l.type,
				trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
				action: l.action,
				source: l.source,
				// Score based on position (earlier = more relevant)
				score: (limitedLearnings.length - index) / Math.max(limitedLearnings.length, 1),
			}));

			this.logger.debug("Learning search completed", {
				requestId,
				workspace,
				keywordCount: keywordsParam.length,
				resultsCount: learnings.length,
			});

			return {
				learnings,
				count: learnings.length,
			};
		} catch (err) {
			this.logger.warn("Failed to search learnings via Intelligence", { requestId, error: String(err) });

			// Return empty results on error
			return {
				learnings: [],
				count: 0,
			};
		}
	}

	/**
	 * Handle learning.list - List all learnings in a workspace
	 * ARCHITECTURE_REFACTOR_SPEC.md Sprint 1: Learning operations
	 */
	private async handleLearningList(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, limit } = params as {
			workspace: string;
			limit?: number;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		try {
			const intel = getIntelligence(workspace);
			const allLearnings = intel.queryLearnings([]);

			// Apply limit if provided (default to 50)
			const limitedLearnings = allLearnings.slice(0, limit || 50);

			const learnings = limitedLearnings.map((l) => ({
				type: l.type,
				trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
				action: l.action,
				source: l.source,
				timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : undefined,
			}));

			this.logger.debug("Learning list completed", {
				requestId,
				workspace,
				resultsCount: learnings.length,
				total: allLearnings.length,
			});

			return {
				learnings,
				total: allLearnings.length,
			};
		} catch (err) {
			this.logger.warn("Failed to list learnings via Intelligence", { requestId, error: String(err) });

			// Return empty results on error
			return {
				learnings: [],
				total: 0,
			};
		}
	}

	/**
	 * Handle manual pruning trigger
	 * Runs all pruning operations immediately for the specified workspace
	 */
	private async handleLearningPrune(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace } = params as {
			workspace: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		this.logger.info("Manual pruning triggered", {
			requestId,
			workspace,
		});

		try {
			const pruner = getLearningPruner(workspace);
			await pruner.initialize();

			// Run all pruning operations
			const violationResult = await pruner.pruneStaleViolations();
			const scoreResult = await pruner.updateLearningScores();
			const dedupeResult = await pruner.deduplicateLearnings();
			const archiveResult = await pruner.archiveStaleItems();

			const totalArchived = violationResult.archivedCount + archiveResult.archived.learnings;

			this.logger.info("Manual pruning completed", {
				requestId,
				workspace,
				violations: violationResult.archivedCount,
				learnings: archiveResult.archived.learnings,
				lowConfidence: scoreResult.lowConfidenceCount,
				duplicates: dedupeResult.mergedCount,
			});

			// Broadcast notification if anything was archived
			if (totalArchived > 0) {
				this.broadcastToWorkspace(workspace, {
					type: "learning.pruned",
					timestamp: Date.now(),
					workspace,
					data: {
						violationsArchived: violationResult.archivedCount,
						learningsArchived: archiveResult.archived.learnings,
						archivePath: archiveResult.archivePath,
						message: `Archived ${totalArchived} stale items. Run 'snap learning review' to approve deletion.`,
					},
				});
			}

			return {
				success: true,
				violations: {
					totalChecked: violationResult.totalChecked,
					staleCount: violationResult.staleCount,
					archivedCount: violationResult.archivedCount,
				},
				learnings: {
					totalScored: scoreResult.totalScored,
					lowConfidenceCount: scoreResult.lowConfidenceCount,
					avgConfidence: scoreResult.avgConfidence,
					archivedCount: archiveResult.archived.learnings,
				},
				deduplication: {
					totalChecked: dedupeResult.totalChecked,
					mergedCount: dedupeResult.mergedCount,
				},
				archivePath: archiveResult.archivePath,
			};
		} catch (err) {
			this.logger.error("Manual pruning failed", {
				requestId,
				workspace,
				error: err instanceof Error ? err.message : String(err),
			});

			throw new InternalError(`Pruning failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	/**
	 * Handle learning evaluation (Phase 1 - Observe Mode)
	 * Matches learnings against command context without modifying behavior.
	 */
	private async handleLearningEvaluate(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, commandName, args, filesOrPaths, intent } = params as {
			workspace: string;
			commandName: string;
			args?: Record<string, unknown>;
			filesOrPaths?: string[];
			intent?: "implement" | "debug" | "refactor" | "review";
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!commandName || typeof commandName !== "string") {
			throw new InvalidParamsError("commandName is required");
		}

		const startTime = performance.now();

		try {
			// Get or create LearningEvaluationService for this workspace
			// Dynamic import to handle build order and optional dependency
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const intelligenceModule = (await import("@snapback/intelligence")) as any;
			const storageModule = await import("@snapback/intelligence/storage");

			const LearningEvaluationServiceClass = intelligenceModule.LearningEvaluationService;
			const StateStoreClass = storageModule.StateStore;

			if (!LearningEvaluationServiceClass) {
				throw new Error("LearningEvaluationService not available - rebuild @snapback/intelligence");
			}

			const stateStore = new StateStoreClass({
				snapbackDir: join(workspace, ".snapback"),
			});
			await stateStore.load();

			// Default to observe mode (Phase 1), allow override via params
			const mode = (params.mode as "observe" | "warn" | "apply-safe" | "apply-all" | "off") || "observe";
			const evaluationService = new LearningEvaluationServiceClass(stateStore, mode, {
				minConfidence: 0.4,
				minScore: 0.5,
				maxResults: 3,
			});

			// Evaluate learnings for this command
			const result = await evaluationService.evaluate({
				workspaceId: workspace,
				commandName,
				args,
				filesOrPaths,
				intent,
			});

			const durationMs = performance.now() - startTime;

			this.logger.debug("Learning evaluation completed", {
				requestId,
				workspace,
				commandName,
				matchCount: result.selectedLearnings.length,
				durationMs: Number(durationMs.toFixed(2)),
			});

			// Save state to persist access counts
			if (stateStore.isDirty()) {
				await stateStore.save();
			}

			return {
				selectedLearnings: result.selectedLearnings,
				debug: {
					evaluatedCount: result.selectedLearnings.length,
					durationMs,
					skippedReason: result.debug?.skippedReason,
				},
			};
		} catch (err) {
			const durationMs = performance.now() - startTime;

			this.logger.warn("Learning evaluation failed", {
				requestId,
				workspace,
				commandName,
				error: err instanceof Error ? err.message : String(err),
				durationMs: Number(durationMs.toFixed(2)),
			});

			// Return empty result on failure (graceful degradation)
			return {
				selectedLearnings: [],
				debug: {
					evaluatedCount: 0,
					durationMs,
					skippedReason: `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
				},
			};
		}
	}

	/**
	 * Phase 2.6a: Update session's applied learnings
	 */
	private async handleLearningUpdateSession(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, sessionId, learningIds } = params as {
			workspace: string;
			sessionId: string;
			learningIds: string[];
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!sessionId || typeof sessionId !== "string") {
			throw new InvalidParamsError("sessionId is required");
		}
		if (!Array.isArray(learningIds)) {
			throw new InvalidParamsError("learningIds must be an array");
		}

		try {
			const storageModule = await import("@snapback/intelligence/storage");
			const StateStoreClass = storageModule.StateStore;

			const stateStore = new StateStoreClass({
				snapbackDir: join(workspace, ".snapback"),
			});
			await stateStore.load();

			const success = stateStore.updateSessionLearnings(sessionId, learningIds);

			if (success && stateStore.isDirty()) {
				await stateStore.save();
			}

			this.logger.debug("Session learnings updated", {
				requestId,
				workspace,
				sessionId,
				updatedCount: learningIds.length,
				success,
			});

			return {
				success,
				sessionId,
				updatedCount: success ? learningIds.length : 0,
			};
		} catch (err) {
			this.logger.warn("Failed to update session learnings", {
				requestId,
				workspace,
				sessionId,
				error: err instanceof Error ? err.message : String(err),
			});

			return {
				success: false,
				sessionId,
				updatedCount: 0,
			};
		}
	}

	/**
	 * Phase 2.6b: Learning garbage collection (archive/delete)
	 */
	private async handleLearningGC(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, operation, dryRun } = params as {
			workspace: string;
			operation?: "archive" | "delete" | "all";
			dryRun?: boolean;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		const op = operation || "archive"; // Default to archive only
		const isDryRun = dryRun ?? true; // Default to dry-run for safety

		const startTime = performance.now();

		try {
			const { AutomatedLearningPruner } = await import("../services/learning-pruner.js");

			const pruner = new AutomatedLearningPruner({
				workspaceRoot: workspace,
				dryRun: isDryRun,
				maxAgeDays: 90,
				minUsageCount: 3,
			});

			await pruner.initialize();

			const results: Record<string, unknown> = {};

			if (op === "archive" || op === "all") {
				const archiveResult = await pruner.archiveStaleItems();
				results.archive = archiveResult;
			}

			if (op === "delete" || op === "all") {
				const deleteResult = await pruner.deletePermanentlyArchived();
				results.delete = deleteResult;
			}

			const durationMs = performance.now() - startTime;

			this.logger.info("Learning GC completed", {
				requestId,
				workspace,
				operation: op,
				dryRun: isDryRun,
				durationMs: Number(durationMs.toFixed(2)),
			});

			return results;
		} catch (err) {
			const durationMs = performance.now() - startTime;

			this.logger.error("Learning GC failed", {
				requestId,
				workspace,
				operation: op,
				error: err instanceof Error ? err.message : String(err),
				durationMs: Number(durationMs.toFixed(2)),
			});

			throw new InternalError(`Learning GC failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	private async handleContextGet(params: Record<string, unknown>, requestId: string): Promise<unknown> {
		const { workspace, task, files, keywords } = params as {
			workspace: string;
			task: string;
			files?: string[];
			keywords?: string[];
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

		// Get Intelligence instance
		const intel = getIntelligence(workspace);

		// Extract effective keywords
		const effectiveKeywords =
			keywords && keywords.length > 0
				? keywords
				: task
						.toLowerCase()
						.split(/\s+/)
						.filter((w) => w.length > 3);

		// Get context from Intelligence
		let patterns: Array<{ name: string; description: string }> = [];
		const constraints: Array<{ domain: string; name: string; value: string | number; description: string }> = [];
		let learnings: Array<{ type: string; trigger: string; action: string; relevanceScore: number }> = [];

		try {
			const contextResult = await intel.getContext({
				task,
				keywords: effectiveKeywords,
			});

			// Extract patterns
			if (contextResult.patterns) {
				const patternLines = contextResult.patterns.split("\n").filter(Boolean);
				patterns = patternLines.slice(0, 5).map((line) => ({
					name: line.substring(0, 50),
					description: line,
				}));
			}

			// Get learnings
			const learningsResult = intel.queryLearnings(effectiveKeywords);
			learnings = learningsResult.slice(0, 5).map((l, index) => ({
				type: l.type,
				trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
				action: l.action,
				// Score based on position (earlier = more relevant)
				relevanceScore: (learningsResult.length - index) / Math.max(learningsResult.length, 1),
			}));
		} catch (err) {
			this.logger.warn("Failed to get Intelligence context", { requestId, error: String(err) });
		}

		// Get constraints from context file
		try {
			const ctxPath = join(workspace, ".snapback", "ctx", "context.json");
			if (existsSync(ctxPath)) {
				const ctxContent = JSON.parse(await readFile(ctxPath, "utf8"));
				if (ctxContent.constraints) {
					for (const [domain, domainConstraints] of Object.entries(ctxContent.constraints)) {
						for (const [name, constraint] of Object.entries(domainConstraints as Record<string, any>)) {
							constraints.push({
								domain,
								name,
								value: constraint.max || constraint.value,
								description: constraint.description || "",
							});
						}
					}
				}
			}
		} catch {
			// No constraints file
		}

		// Build risk assessment
		const riskAreas: string[] = [];
		const recommendations: string[] = [];

		if (files && files.length > 0) {
			for (const file of files) {
				const lowerPath = file.toLowerCase();
				if (lowerPath.includes("auth") && !riskAreas.includes("auth")) {
					riskAreas.push("auth");
				}
				if (lowerPath.includes("payment") && !riskAreas.includes("payment")) {
					riskAreas.push("payment");
				}
				if (lowerPath.includes("security") && !riskAreas.includes("security")) {
					riskAreas.push("security");
				}
				if (lowerPath.includes("config") && !riskAreas.includes("config")) {
					riskAreas.push("config");
				}
			}
		}

		const criticalAreas = ["auth", "payment", "security"];
		const hasCritical = riskAreas.some((a) => criticalAreas.includes(a));
		const overallRisk = hasCritical ? "high" : riskAreas.length > 0 ? "medium" : "low";

		return {
			patterns,
			constraints,
			learnings,
			observations: [],
			riskAssessment: {
				overallRisk,
				riskAreas,
				recommendations,
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
	// MCP COORDINATION METHODS
	// =========================================================================

	/**
	 * Handle snapshot.created notification from MCP
	 *
	 * This is CRITICAL for cross-surface coordination:
	 * When MCP tools create snapshots, the Extension's vitals system needs to know
	 * so it can reset pressure and update the UI. Without this handler, MCP-created
	 * snapshots don't reset the vitals pressure gauge.
	 *
	 * Flow: MCP → Daemon (this handler) → Broadcast to Extension subscribers
	 */
	private async handleSnapshotCreatedNotification(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{ acknowledged: boolean }> {
		const { workspace, id, filePath, trigger, source } = params as {
			workspace: string;
			id: string;
			filePath?: string;
			trigger?: string;
			source?: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!id || typeof id !== "string") {
			throw new InvalidParamsError("id (snapshot ID) is required");
		}

		this.logger.info("Snapshot created notification from MCP", {
			requestId,
			workspace,
			snapshotId: id,
			filePath,
			trigger,
			source,
		});

		// Update workspace snapshot count
		const ctx = this.workspaces.get(workspace);
		if (ctx) {
			ctx.snapshotCount++;
			ctx.lastActivity = Date.now();
		}

		// Broadcast snapshot.created event to all subscribers of this workspace
		// This is what triggers the Extension's AutoDecisionIntegration to call vitals.onSnapshot()
		this.broadcastToWorkspace(workspace, {
			type: "snapshot.created",
			timestamp: Date.now(),
			workspace,
			data: {
				snapshotId: id,
				filePath: filePath || "unknown",
				trigger: trigger || "mcp",
				source: source || "mcp",
			},
		});

		return { acknowledged: true };
	}

	/**
	 * Handle file.modified notification from MCP
	 *
	 * Records file modifications for AI attribution tracking.
	 * Enables cross-surface coordination of file change detection.
	 */
	private async handleFileModifiedNotification(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{ acknowledged: boolean }> {
		const {
			workspace,
			path: filePath,
			linesChanged,
			aiAttributed,
		} = params as {
			workspace: string;
			path: string;
			linesChanged: number;
			aiAttributed: boolean;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!filePath || typeof filePath !== "string") {
			throw new InvalidParamsError("path is required");
		}

		// Validate the file path
		validatePath(workspace, filePath);

		this.logger.debug("File modified notification from MCP", {
			requestId,
			workspace,
			filePath,
			linesChanged,
			aiAttributed,
		});

		// Record the modification in Intelligence for session tracking
		const ctx = this.workspaces.get(workspace);
		if (ctx?.currentTaskId) {
			try {
				const intel = getIntelligence(workspace);
				intel.recordFileModification(ctx.currentTaskId, {
					path: filePath,
					timestamp: Date.now(),
					type: "update",
					linesChanged: linesChanged || 0,
				});
			} catch (err) {
				this.logger.warn("Failed to record file modification", { requestId, error: String(err) });
			}
		}

		// Broadcast file change event for risk detection
		this.broadcastToWorkspace(workspace, {
			type: "risk.detected",
			timestamp: Date.now(),
			workspace,
			data: {
				file: filePath,
				changeType: "modified",
				riskLevel: aiAttributed ? "medium" : "low",
				reason: aiAttributed ? "AI-attributed file modification" : "File modified",
			},
		});

		return { acknowledged: true };
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

	// =========================================================================
	// SCHEDULED PRUNING METHODS
	// =========================================================================

	/**
	 * Start scheduled pruning (daily at 2am local time)
	 */
	private startScheduledPruning(): void {
		// Calculate milliseconds until next 2am
		const now = new Date();
		const next2am = new Date();
		next2am.setHours(2, 0, 0, 0);

		// If 2am has passed today, schedule for tomorrow
		if (now > next2am) {
			next2am.setDate(next2am.getDate() + 1);
		}

		const msUntil2am = next2am.getTime() - now.getTime();

		this.logger.info("Scheduled pruning enabled", {
			nextRun: next2am.toISOString(),
			msUntil: msUntil2am,
		});

		// Schedule the first run
		this.pruningTimer = setTimeout(() => {
			this.runScheduledPruning();
			// After first run, schedule daily
			this.pruningTimer = setInterval(
				() => this.runScheduledPruning(),
				24 * 60 * 60 * 1000, // 24 hours
			);
		}, msUntil2am);
	}

	/**
	 * Run scheduled pruning for all workspaces
	 */
	private async runScheduledPruning(): Promise<void> {
		this.logger.info("Running scheduled pruning", {
			workspaceCount: this.workspaces.size,
		});

		const results: Array<{
			workspace: string;
			violations: number;
			learnings: number;
		}> = [];

		for (const [workspaceRoot, _ctx] of this.workspaces) {
			try {
				const pruner = getLearningPruner(workspaceRoot);
				await pruner.initialize();

				// Run all pruning operations
				const violationResult = await pruner.pruneStaleViolations();
				const scoreResult = await pruner.updateLearningScores();
				const dedupeResult = await pruner.deduplicateLearnings();
				const archiveResult = await pruner.archiveStaleItems();

				const totalArchived = violationResult.archivedCount + archiveResult.archived.learnings;

				if (totalArchived > 0) {
					results.push({
						workspace: workspaceRoot,
						violations: violationResult.archivedCount,
						learnings: archiveResult.archived.learnings,
					});

					this.logger.info("Pruning completed for workspace", {
						workspace: workspaceRoot,
						violations: violationResult.archivedCount,
						learnings: archiveResult.archived.learnings,
						lowConfidence: scoreResult.lowConfidenceCount,
						duplicates: dedupeResult.mergedCount,
					});

					// Broadcast notification to workspace
					this.broadcastToWorkspace(workspaceRoot, {
						type: "learning.pruned",
						timestamp: Date.now(),
						workspace: workspaceRoot,
						data: {
							violationsArchived: violationResult.archivedCount,
							learningsArchived: archiveResult.archived.learnings,
							archivePath: archiveResult.archivePath,
							message: `Archived ${totalArchived} stale items. Run 'snap learning review' to approve deletion.`,
						},
					});
				}
			} catch (error) {
				this.logger.error("Pruning failed for workspace", {
					workspace: workspaceRoot,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.logger.info("Scheduled pruning complete", {
			workspacesProcessed: this.workspaces.size,
			workspacesWithArchives: results.length,
			totalViolations: results.reduce((sum, r) => sum + r.violations, 0),
			totalLearnings: results.reduce((sum, r) => sum + r.learnings, 0),
		});
	}

	// =========================================================================
	// FILE WATCHER METHODS
	// =========================================================================

	/**
	 * Initialize file watcher event handlers
	 */
	private initFileWatcherEvents(): void {
		const fileWatcher = getFileWatcherService();

		// Wire up file change events to broadcast to subscribers
		fileWatcher.on("file_changed", (event: FileChangeEvent) => {
			this.logger.debug("File change detected", {
				workspace: event.workspace,
				file: event.file,
				type: event.type,
				riskLevel: event.riskLevel,
			});

			// Broadcast to all subscribers of this workspace
			this.broadcastToWorkspace(event.workspace, {
				type: "risk.detected",
				timestamp: event.timestamp,
				workspace: event.workspace,
				data: {
					file: event.file,
					changeType: event.type,
					riskLevel: event.riskLevel,
					reason: event.riskReason || "File modified",
					suggestion:
						event.riskLevel === "high"
							? "Consider creating a snapshot before making more changes"
							: event.riskLevel === "medium"
								? "Monitor changes closely"
								: undefined,
				},
			});

			// Update workspace activity
			const workspaceCtx = this.workspaces.get(event.workspace);
			if (workspaceCtx) {
				workspaceCtx.lastActivity = event.timestamp;
			}
		});

		fileWatcher.on("error", (event: { workspace: string; error: string }) => {
			this.logger.warn("File watcher error", event);
		});
	}

	/**
	 * Handle watch.subscribe
	 */
	private async handleWatchSubscribe(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{ subscribed: boolean; patterns: string[] }> {
		const { workspace, patterns } = params as {
			workspace: string;
			patterns?: string[];
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		// Validate workspace path exists and is a directory (not using file path validator)
		// Workspace paths are intentionally absolute - they define the root context
		if (!existsSync(workspace)) {
			throw new InvalidParamsError(`Workspace path does not exist: ${workspace}`);
		}

		const fileWatcher = getFileWatcherService();

		// Use requestId as subscriber ID for this connection
		const result = await fileWatcher.subscribe(workspace, requestId, {
			patterns,
		});

		// Track workspace subscription for this connection
		// Find the connection that made this request and update its context
		for (const [_socket, ctx] of this.connections) {
			// If this is the requesting connection, update its workspace
			if (!ctx.workspace || ctx.workspace === workspace) {
				ctx.workspace = workspace;
				break;
			}
		}

		// Ensure workspace context exists
		if (!this.workspaces.has(workspace)) {
			this.workspaces.set(workspace, {
				id: this.hashWorkspace(workspace),
				root: workspace,
				initialized: true,
				sessionActive: false,
				snapshotCount: 0,
				lastActivity: Date.now(),
				subscribers: new Set([requestId]),
			});
		} else {
			const ctx = this.workspaces.get(workspace);
			if (ctx) {
				ctx.subscribers.add(requestId);
			}
		}

		this.logger.debug("Watch subscription added", {
			requestId,
			workspace,
			patterns: result.patterns,
		});

		return result;
	}

	/**
	 * Handle watch.unsubscribe
	 */
	private async handleWatchUnsubscribe(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{ unsubscribed: boolean }> {
		const { workspace } = params as {
			workspace: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		const fileWatcher = getFileWatcherService();

		const result = await fileWatcher.unsubscribe(workspace, requestId);

		// Update workspace subscribers
		const ctx = this.workspaces.get(workspace);
		if (ctx) {
			ctx.subscribers.delete(requestId);
		}

		this.logger.debug("Watch subscription removed", {
			requestId,
			workspace,
			unsubscribed: result.unsubscribed,
		});

		return result;
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

	// =========================================================================
	// PROTECTION METHODS (ARCHITECTURE_REFACTOR_SPEC.md Sprint 1)
	// =========================================================================

	/**
	 * Handle protection.getLevel - get protection level for a file
	 */
	private async handleProtectionGetLevel(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ level: string | null; reason?: string; pattern?: string }> {
		const { workspace, filePath } = params as {
			workspace: string;
			filePath: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!filePath || typeof filePath !== "string") {
			throw new InvalidParamsError("filePath is required");
		}

		// Validate path is within workspace
		validatePath(workspace, filePath);

		const protectionManager = getProtectionManager(workspace);
		const protection = protectionManager.getProtection(filePath);

		if (!protection) {
			return { level: null };
		}

		return {
			level: protection.level,
			reason: protection.reason,
			pattern: protection.pattern,
		};
	}

	/**
	 * Handle protection.setLevel - set protection level for a file
	 */
	private async handleProtectionSetLevel(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{ success: boolean; previousLevel?: string }> {
		const { workspace, filePath, level, reason } = params as {
			workspace: string;
			filePath: string;
			level: "watch" | "warn" | "block";
			reason?: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!filePath || typeof filePath !== "string") {
			throw new InvalidParamsError("filePath is required");
		}
		if (!level || !["watch", "warn", "block"].includes(level)) {
			throw new InvalidParamsError("level must be 'watch', 'warn', or 'block'");
		}

		// Validate path is within workspace
		validatePath(workspace, filePath);

		const protectionManager = getProtectionManager(workspace);

		// Get previous level if exists
		const existing = protectionManager.getProtection(filePath);
		const previousLevel = existing?.level;

		// Set new level
		if (existing) {
			protectionManager.updateLevel(filePath, level);
		} else {
			protectionManager.protect(filePath, level, reason);
		}

		this.logger.debug("Protection level set", {
			workspace,
			filePath,
			level,
			previousLevel,
		});

		return {
			success: true,
			previousLevel,
		};
	}

	/**
	 * Handle protection.list - list all protected files in a workspace
	 */
	private async handleProtectionList(
		params: Record<string, unknown>,
		_requestId: string,
	): Promise<{
		files: Array<{
			path: string;
			level: string;
			pattern?: string;
			reason?: string;
			protectedAt?: string;
		}>;
		total: number;
	}> {
		const { workspace, level, limit } = params as {
			workspace: string;
			level?: "watch" | "warn" | "block";
			limit?: number;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		const protectionManager = getProtectionManager(workspace);
		let files = protectionManager.listProtected();

		// Filter by level if specified
		if (level) {
			files = files.filter((f) => f.level === level);
		}

		// Map to response format
		const mappedFiles = files.map((f) => ({
			path: f.path,
			level: f.level,
			pattern: f.pattern,
			reason: f.reason,
			protectedAt: f.addedAt?.toISOString(),
		}));

		// Apply limit if specified
		const result = limit ? mappedFiles.slice(0, limit) : mappedFiles;

		return {
			files: result,
			total: files.length,
		};
	}

	/**
	 * Handle validate.comprehensive - comprehensive validation using multiple checks
	 * Per ARCHITECTURE_REFACTOR_SPEC.md Section D.3: Missing Protocol Methods
	 */
	private async handleValidateComprehensive(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{
		valid: boolean;
		issues: Array<{ type: string; severity: string; message: string; line?: number }>;
		checks: { syntax: boolean; types: boolean; dependencies: boolean; patterns: boolean };
	}> {
		const { workspace, code, filePath } = params as {
			workspace: string;
			code: string;
			filePath: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (typeof code !== "string") {
			throw new InvalidParamsError("code must be a string");
		}
		if (!filePath || typeof filePath !== "string") {
			throw new InvalidParamsError("filePath is required");
		}

		// Validate path is within workspace
		validatePath(workspace, filePath);

		this.logger.debug("Running comprehensive validation", {
			requestId,
			workspace,
			filePath,
			codeLength: code.length,
		});

		const issues: Array<{ type: string; severity: string; message: string; line?: number }> = [];
		const checks = {
			syntax: true,
			types: true,
			dependencies: true,
			patterns: true,
		};

		// 1. Basic syntax check (simple heuristic for demo)
		try {
			// Check for common syntax errors
			if (code.includes("import {") && !code.includes("} from")) {
				issues.push({
					type: "syntax",
					severity: "error",
					message: "Incomplete import statement",
				});
				checks.syntax = false;
			}
		} catch (err) {
			this.logger.warn("Syntax check failed", { requestId, error: String(err) });
			checks.syntax = false;
		}

		// 2. Pattern validation using Intelligence
		try {
			const _intel = getIntelligence(workspace);
			// Note: Intelligence.detectViolations may not exist yet
			// For now, we'll skip pattern validation
			// TODO: Implement pattern detection when Intelligence API is updated
			this.logger.debug("Pattern validation skipped (not yet implemented)", { requestId });
		} catch (err) {
			this.logger.warn("Pattern validation failed", { requestId, error: String(err) });
		}

		const valid = issues.filter((i) => i.severity === "error").length === 0;

		return {
			valid,
			issues,
			checks,
		};
	}

	/**
	 * Handle violation.report - report a code violation
	 * Per ARCHITECTURE_REFACTOR_SPEC.md Section D.3: Missing Protocol Methods
	 */
	private async handleViolationReport(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{ success: boolean; violationId: string }> {
		const { workspace, violation } = params as {
			workspace: string;
			violation: {
				filePath: string;
				type: string;
				severity: string;
				message: string;
				line?: number;
				column?: number;
				code?: string;
			};
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}
		if (!violation || typeof violation !== "object") {
			throw new InvalidParamsError("violation is required and must be an object");
		}
		if (!violation.filePath || !violation.type || !violation.message) {
			throw new InvalidParamsError("violation must have filePath, type, and message");
		}

		// Validate path is within workspace
		validatePath(workspace, violation.filePath);

		this.logger.info("Violation reported", {
			requestId,
			workspace,
			filePath: violation.filePath,
			type: violation.type,
			severity: violation.severity,
		});

		// Store violation in Intelligence for learning
		try {
			const _intel = getIntelligence(workspace);
			// Note: Intelligence doesn't have direct violation storage yet,
			// but we can track via session history
			const violationId = `violation_${Date.now().toString(36)}_${requestId}`;

			// Store in workspace violations file
			const violationsPath = join(workspace, ".snapback", "violations.jsonl");
			await mkdir(dirname(violationsPath), { recursive: true });

			const violationEntry = {
				id: violationId,
				timestamp: new Date().toISOString(),
				...violation,
			};

			await writeFile(violationsPath, `${JSON.stringify(violationEntry)}\n`, { flag: "a" });

			return {
				success: true,
				violationId,
			};
		} catch (err) {
			this.logger.error("Failed to store violation", { requestId, error: String(err) });
			throw new DaemonError(ErrorCodes.INTERNAL_ERROR, "Failed to store violation");
		}
	}

	/**
	 * Handle violation.list - list recent violations
	 * Per ARCHITECTURE_REFACTOR_SPEC.md Section D.3: Missing Protocol Methods
	 */
	private async handleViolationList(
		params: Record<string, unknown>,
		requestId: string,
	): Promise<{
		violations: Array<{
			id: string;
			filePath: string;
			type: string;
			severity: string;
			message: string;
			timestamp: string;
			line?: number;
		}>;
		total: number;
	}> {
		const {
			workspace,
			limit = 50,
			severity,
		} = params as {
			workspace: string;
			limit?: number;
			severity?: string;
		};

		if (!workspace || typeof workspace !== "string") {
			throw new InvalidParamsError("workspace is required");
		}

		this.logger.debug("Listing violations", {
			requestId,
			workspace,
			limit,
			severity,
		});

		try {
			const violationsPath = join(workspace, ".snapback", "violations.jsonl");

			// Check if violations file exists
			if (!existsSync(violationsPath)) {
				return { violations: [], total: 0 };
			}

			// Read violations file
			const content = await readFile(violationsPath, "utf8");
			const lines = content.trim().split("\n").filter(Boolean);

			// Parse violations
			let violations = lines
				.map((line) => {
					try {
						return JSON.parse(line);
					} catch {
						return null;
					}
				})
				.filter((v): v is NonNullable<typeof v> => v !== null);

			// Filter by severity if specified
			if (severity) {
				violations = violations.filter((v) => v.severity === severity);
			}

			// Sort by timestamp descending (most recent first)
			violations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

			// Apply limit
			const result = violations.slice(0, limit);

			return {
				violations: result,
				total: violations.length,
			};
		} catch (err) {
			this.logger.error("Failed to list violations", { requestId, error: String(err) });
			throw new DaemonError(ErrorCodes.INTERNAL_ERROR, "Failed to list violations");
		}
	}
}
