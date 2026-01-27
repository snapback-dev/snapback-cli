/**
 * SnapBack Daemon Client
 *
 * Client for communicating with the SnapBack daemon.
 * Features:
 * - Lazy connection (connects on first request)
 * - Auto-start daemon if not running
 * - Exponential backoff reconnection
 * - Request/response correlation with retry logic
 * - Timeout handling with configurable limits
 * - Connection health monitoring
 * - Cross-platform support (Unix sockets / Windows named pipes)
 *
 * @module daemon/client
 */

import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { connect, type Socket } from "node:net";
import { platform } from "node:os";

import { ConnectionError, DaemonError, TimeoutError } from "./errors.js";
import type {
	BeginSessionResult,
	CreateSnapshotResult,
	DaemonMethod,
	DaemonNotification,
	DaemonResponse,
	PingResult,
	StatusResult,
} from "./protocol.js";

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

const IS_WINDOWS = platform() === "win32";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default request timeout in milliseconds */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Maximum reconnection attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 5;

/** Base delay for exponential backoff (milliseconds) */
const RECONNECT_BASE_DELAY_MS = 100;

/** Maximum delay between reconnection attempts (milliseconds) */
const RECONNECT_MAX_DELAY_MS = 5_000;

/** Number of retries for transient failures */
const DEFAULT_REQUEST_RETRIES = 2;

/** Delay before daemon process is considered started */
const DAEMON_START_WAIT_MS = 1_000;

/** Maximum time to wait for daemon to start */
const DAEMON_START_TIMEOUT_MS = 10_000;

/** Health check interval in milliseconds */
const HEALTH_CHECK_INTERVAL_MS = 30_000;

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export interface DaemonClientConfig {
	/** Path to Unix socket or Windows named pipe */
	socketPath: string;
	/** Path to PID file */
	pidPath: string;
	/** Path to daemon executable (for auto-start) */
	daemonPath?: string;
	/** Whether to auto-start daemon if not running (default: true) */
	autoStart?: boolean;
	/** Request timeout in milliseconds (default: 30000) */
	requestTimeout?: number;
	/** Maximum reconnection attempts (default: 5) */
	maxReconnectAttempts?: number;
	/** Number of retries for failed requests (default: 2) */
	requestRetries?: number;
	/** Enable connection health monitoring (default: true) */
	enableHealthCheck?: boolean;
	/** Health check interval in milliseconds (default: 30000) */
	healthCheckInterval?: number;
}

// =============================================================================
// CLIENT EVENTS
// =============================================================================

export interface DaemonClientEvents {
	connected: [];
	disconnected: [];
	reconnecting: [attempt: number, maxAttempts: number];
	reconnected: [];
	error: [error: Error];
	notification: [notification: DaemonNotification];
	healthCheck: [healthy: boolean, latencyMs: number];
}

// =============================================================================
// CONNECTION STATE
// =============================================================================

enum ConnectionState {
	Disconnected = "disconnected",
	Connecting = "connecting",
	Connected = "connected",
	Reconnecting = "reconnecting",
}

// =============================================================================
// PENDING REQUEST TRACKING
// =============================================================================

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (err: Error) => void;
	method: string;
	params: Record<string, unknown>;
	startTime: number;
	retries: number;
	timeoutId: NodeJS.Timeout;
}

// =============================================================================
// DAEMON CLIENT CLASS
// =============================================================================

export class DaemonClient extends EventEmitter<DaemonClientEvents> {
	private socket: Socket | null = null;
	private requestId = 0;
	private pending = new Map<string, PendingRequest>();
	private buffer = "";
	private connectionState = ConnectionState.Disconnected;
	private reconnectAttempts = 0;
	private healthCheckTimer: NodeJS.Timeout | null = null;
	private daemonProcess: ChildProcess | null = null;

	constructor(private readonly config: DaemonClientConfig) {
		super();
	}

	// =========================================================================
	// PUBLIC API - CONNECTION MANAGEMENT
	// =========================================================================

	/**
	 * Connect to the daemon
	 *
	 * If auto-start is enabled and daemon is not running, will attempt to start it.
	 * Uses exponential backoff for connection retries.
	 */
	async connect(): Promise<void> {
		if (this.connectionState === ConnectionState.Connected) {
			return;
		}

		if (this.connectionState === ConnectionState.Connecting) {
			// Wait for existing connection attempt
			return new Promise((resolve, reject) => {
				const onConnected = () => {
					this.off("error", onError);
					resolve();
				};
				const onError = (err: Error) => {
					this.off("connected", onConnected);
					reject(err);
				};
				this.once("connected", onConnected);
				this.once("error", onError);
			});
		}

		this.connectionState = ConnectionState.Connecting;

		try {
			// Check if daemon is running, optionally auto-start
			const running = await this.ensureDaemonRunning();
			if (!running) {
				throw new ConnectionError("Failed to connect: daemon is not running");
			}

			await this.establishConnection();

			// Start health check if enabled
			if (this.config.enableHealthCheck !== false) {
				this.startHealthCheck();
			}
		} catch (err) {
			this.connectionState = ConnectionState.Disconnected;
			throw err;
		}
	}

	/**
	 * Disconnect from the daemon gracefully
	 *
	 * Cancels all pending requests and closes the socket connection.
	 */
	async disconnect(): Promise<void> {
		this.stopHealthCheck();

		// Cancel all pending requests
		for (const [id, pending] of this.pending) {
			clearTimeout(pending.timeoutId);
			pending.reject(new ConnectionError("Client disconnected"));
			this.pending.delete(id);
		}

		if (!this.socket) {
			this.connectionState = ConnectionState.Disconnected;
			return;
		}

		return new Promise((resolve) => {
			const socket = this.socket;
			if (socket) {
				const cleanup = () => {
					this.socket = null;
					this.connectionState = ConnectionState.Disconnected;
					this.buffer = "";
					resolve();
				};

				socket.once("close", cleanup);
				socket.end();

				// Force close after timeout
				setTimeout(() => {
					if (this.socket === socket) {
						socket.destroy();
						cleanup();
					}
				}, 1000);
			} else {
				this.connectionState = ConnectionState.Disconnected;
				resolve();
			}
		});
	}

	/**
	 * Check if connected to daemon
	 */
	isConnected(): boolean {
		return this.connectionState === ConnectionState.Connected;
	}

	/**
	 * Get the current connection state
	 */
	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	// =========================================================================
	// PUBLIC API - REQUEST METHODS
	// =========================================================================

	/**
	 * Send a request to the daemon
	 *
	 * Automatically connects if not already connected.
	 * Implements retry logic for transient failures.
	 */
	async request<T = unknown>(method: DaemonMethod | string, params: Record<string, unknown> = {}): Promise<T> {
		// Ensure connected
		if (this.connectionState !== ConnectionState.Connected) {
			await this.connect();
		}

		const maxRetries = this.config.requestRetries ?? DEFAULT_REQUEST_RETRIES;
		return this.executeRequest<T>(method, params, maxRetries);
	}

	// =========================================================================
	// CONVENIENCE METHODS
	// =========================================================================

	/**
	 * Ping the daemon to check if it's responsive
	 */
	async ping(): Promise<PingResult> {
		return this.request<PingResult>("daemon.ping", {});
	}

	/**
	 * Get daemon status including memory usage and connection count
	 */
	async status(): Promise<StatusResult> {
		return this.request<StatusResult>("daemon.status", {});
	}

	/**
	 * Begin a task session for the given workspace
	 */
	async beginTask(
		workspace: string,
		task: string,
		files?: string[],
		keywords?: string[],
	): Promise<BeginSessionResult> {
		return this.request<BeginSessionResult>("session.begin", {
			workspace,
			task,
			files,
			keywords,
		});
	}

	/**
	 * End the current task session
	 */
	async endTask(
		workspace: string,
		outcome?: "completed" | "abandoned" | "blocked",
	): Promise<{
		summary: { filesModified: number; linesChanged: number; duration: number };
		snapshot: { created: boolean };
		learningsAccepted: number;
	}> {
		return this.request("session.end", {
			workspace,
			outcome,
		});
	}

	/**
	 * Get session status for a workspace
	 */
	async sessionStatus(workspace: string): Promise<{
		active: boolean;
		taskId?: string;
		task?: string;
		startedAt?: string;
		filesModified: number;
		snapshotCount: number;
	}> {
		return this.request("session.status", { workspace });
	}

	/**
	 * Create a snapshot of the specified files
	 */
	async createSnapshot(workspace: string, files: string[], reason?: string): Promise<CreateSnapshotResult> {
		return this.request<CreateSnapshotResult>("snapshot.create", {
			workspace,
			files,
			reason,
		});
	}

	/**
	 * Restore files from a snapshot
	 */
	async restoreSnapshot(
		workspace: string,
		snapshotId: string,
		options?: { files?: string[]; dryRun?: boolean },
	): Promise<{
		restored: boolean;
		filesRestored: number;
		dryRun: boolean;
		changes: Array<{ file: string; action: string }>;
	}> {
		return this.request("snapshot.restore", {
			workspace,
			snapshotId,
			files: options?.files,
			dryRun: options?.dryRun,
		});
	}

	/**
	 * List snapshots for a workspace
	 */
	async listSnapshots(
		workspace: string,
		limit?: number,
	): Promise<{
		snapshots: Array<{
			id: string;
			createdAt: string;
			fileCount: number;
			reason?: string;
		}>;
		total: number;
	}> {
		return this.request("snapshot.list", {
			workspace,
			limit,
		});
	}

	/**
	 * Get context for a task (patterns, constraints, learnings)
	 */
	async getContext(
		workspace: string,
		task: string,
		files?: string[],
		keywords?: string[],
	): Promise<{
		patterns: unknown[];
		constraints: unknown[];
		learnings: unknown[];
		observations: unknown[];
		riskAssessment: {
			overallRisk: string;
			riskAreas: unknown[];
			recommendations: unknown[];
		};
	}> {
		return this.request("context.get", {
			workspace,
			task,
			files,
			keywords,
		});
	}

	/**
	 * Add a learning to the knowledge base
	 */
	async addLearning(
		workspace: string,
		type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow",
		trigger: string,
		action: string,
	): Promise<{ learningId: string; message: string }> {
		return this.request("learning.add", {
			workspace,
			type,
			trigger,
			action,
		});
	}

	/**
	 * Search learnings by keywords
	 */
	async searchLearnings(
		workspace: string,
		keywords: string[],
	): Promise<{
		learnings: unknown[];
		count: number;
	}> {
		return this.request("learning.search", {
			workspace,
			keywords,
		});
	}

	/**
	 * Manually trigger pruning of stale learnings and violations
	 */
	async pruneLearnings(workspace: string): Promise<{
		success: boolean;
		violations: {
			totalChecked: number;
			staleCount: number;
			archivedCount: number;
		};
		learnings: {
			totalScored: number;
			lowConfidenceCount: number;
			avgConfidence: number;
			archivedCount: number;
		};
		deduplication: {
			totalChecked: number;
			mergedCount: number;
		};
		archivePath: string;
	}> {
		return this.request("learning.prune", {
			workspace,
		});
	}

	/**
	 * Evaluate learnings for a command (Phase 1 - Observe Mode)
	 * Returns matching learnings without applying them.
	 */
	async evaluateLearnings(
		workspace: string,
		commandName: string,
		options?: {
			args?: Record<string, unknown>;
			filesOrPaths?: string[];
			intent?: "implement" | "debug" | "refactor" | "review";
			mode?: "observe" | "warn" | "apply-safe" | "apply-all" | "off";
		},
	): Promise<{
		selectedLearnings: Array<{
			id: string;
			title: string;
			type: "pattern" | "pitfall" | "efficiency" | "workflow" | "discovery";
			score: number;
			action: {
				type: "add-flag" | "set-env" | "inject-validation" | "warn" | "suggest-file";
				payload: Record<string, unknown>;
			};
			tags: string[];
		}>;
		debug?: {
			evaluatedCount: number;
			durationMs: number;
			skippedReason?: string;
		};
	}> {
		return this.request("learning.evaluate", {
			workspace,
			commandName,
			...options,
		});
	}

	/**
	 * Update session's applied learnings (Phase 2.6a)
	 */
	async updateSessionLearnings(
		workspace: string,
		sessionId: string,
		learningIds: string[],
	): Promise<{
		success: boolean;
		sessionId: string;
		updatedCount: number;
	}> {
		return this.request("learning.updateSession", {
			workspace,
			sessionId,
			learningIds,
		});
	}

	/**
	 * Run quick validation on files
	 */
	async quickCheck(
		workspace: string,
		options?: { file?: string; files?: string[] },
	): Promise<{
		passed: boolean;
		typescript: { passed: boolean; errors: number };
		tests: { discovered: number };
		lint: { passed: boolean; errors: number; warnings: number };
	}> {
		return this.request("validate.quick", {
			workspace,
			file: options?.file,
			files: options?.files,
		});
	}

	/**
	 * Request the daemon to reload its configuration
	 */
	async reload(): Promise<{ reloaded: true }> {
		return this.request("daemon.reload", {});
	}

	/**
	 * Request the daemon to shutdown gracefully
	 */
	async shutdown(): Promise<void> {
		try {
			await this.request("daemon.shutdown", {});
		} catch {
			// Ignore errors - daemon may close connection before responding
		}
		await this.disconnect();
	}

	// =========================================================================
	// PRIVATE - CONNECTION MANAGEMENT
	// =========================================================================

	/**
	 * Ensure the daemon is running, starting it if necessary
	 */
	private async ensureDaemonRunning(): Promise<boolean> {
		if (await this.isDaemonRunning()) {
			return true;
		}

		if (this.config.autoStart === false) {
			return false;
		}

		return this.startDaemon();
	}

	/**
	 * Check if the daemon process is running
	 */
	private async isDaemonRunning(): Promise<boolean> {
		try {
			if (!existsSync(this.config.pidPath)) {
				return false;
			}

			const pidContent = readFileSync(this.config.pidPath, "utf-8").trim();
			const pid = Number.parseInt(pidContent, 10);

			if (Number.isNaN(pid) || pid <= 0) {
				return false;
			}

			// Check if process exists by sending signal 0
			// This doesn't actually send a signal, just checks if process exists
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Start the daemon process
	 */
	private async startDaemon(): Promise<boolean> {
		const daemonPath = this.config.daemonPath;
		if (!daemonPath) {
			throw new ConnectionError("Cannot auto-start daemon: daemonPath not configured");
		}

		if (!existsSync(daemonPath)) {
			throw new ConnectionError(`Daemon executable not found: ${daemonPath}`);
		}

		return new Promise((resolve, reject) => {
			const startTime = Date.now();

			// Spawn daemon as detached process
			const args = ["--socket", this.config.socketPath, "--pid", this.config.pidPath];

			this.daemonProcess = spawn(daemonPath, args, {
				detached: true,
				stdio: "ignore",
				// On Windows, use shell to handle .cmd/.bat files
				shell: IS_WINDOWS,
			});

			// Unref to allow parent to exit independently
			this.daemonProcess.unref();

			this.daemonProcess.on("error", (err) => {
				this.daemonProcess = null;
				reject(new ConnectionError(`Failed to start daemon: ${err.message}`));
			});

			// Poll for daemon to be ready
			const checkDaemon = async () => {
				const elapsed = Date.now() - startTime;

				if (elapsed > DAEMON_START_TIMEOUT_MS) {
					reject(new ConnectionError("Daemon start timeout"));
					return;
				}

				if (await this.isDaemonRunning()) {
					// Give daemon a moment to set up socket
					setTimeout(() => resolve(true), DAEMON_START_WAIT_MS);
					return;
				}

				// Check again after delay
				setTimeout(checkDaemon, 200);
			};

			// Start checking after initial delay
			setTimeout(checkDaemon, DAEMON_START_WAIT_MS);
		});
	}

	/**
	 * Establish socket connection to daemon
	 */
	private async establishConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			const socket = connect(this.config.socketPath);
			let settled = false;

			const handleError = (err: Error) => {
				if (settled) {
					return;
				}
				settled = true;
				this.socket = null;
				this.connectionState = ConnectionState.Disconnected;
				reject(new ConnectionError(`Connection failed: ${err.message}`));
			};

			const handleConnect = () => {
				if (settled) {
					return;
				}
				settled = true;

				this.socket = socket;
				this.connectionState = ConnectionState.Connected;
				this.reconnectAttempts = 0;

				// Set up persistent event handlers
				socket.off("error", handleError);
				socket.on("error", this.handleSocketError.bind(this));
				socket.on("close", this.handleSocketClose.bind(this));
				socket.on("data", this.handleSocketData.bind(this));

				this.emit("connected");
				resolve();
			};

			// Set up connection timeout
			const timeoutId = setTimeout(() => {
				if (!settled) {
					settled = true;
					socket.destroy();
					reject(new TimeoutError("connect", 5000));
				}
			}, 5000);

			socket.once("error", handleError);
			socket.once("connect", () => {
				clearTimeout(timeoutId);
				handleConnect();
			});
		});
	}

	/**
	 * Handle socket error event
	 */
	private handleSocketError(err: Error): void {
		this.emit("error", err);

		// Reject all pending requests
		for (const [id, pending] of this.pending) {
			clearTimeout(pending.timeoutId);
			pending.reject(new ConnectionError(`Socket error: ${err.message}`));
			this.pending.delete(id);
		}
	}

	/**
	 * Handle socket close event
	 */
	private handleSocketClose(): void {
		const wasConnected = this.connectionState === ConnectionState.Connected;
		this.socket = null;
		this.connectionState = ConnectionState.Disconnected;
		this.buffer = "";

		if (wasConnected) {
			this.emit("disconnected");
			this.attemptReconnect();
		}
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	private async attemptReconnect(): Promise<void> {
		const maxAttempts = this.config.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS;

		if (this.reconnectAttempts >= maxAttempts) {
			return;
		}

		this.connectionState = ConnectionState.Reconnecting;
		this.reconnectAttempts++;

		this.emit("reconnecting", this.reconnectAttempts, maxAttempts);

		// Calculate delay with exponential backoff and jitter
		const baseDelay = RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1);
		const jitter = Math.random() * 0.3 * baseDelay;
		const delay = Math.min(baseDelay + jitter, RECONNECT_MAX_DELAY_MS);

		await this.sleep(delay);

		try {
			const running = await this.ensureDaemonRunning();
			if (!running) {
				throw new ConnectionError("Daemon not running");
			}

			await this.establishConnection();
			this.emit("reconnected");
		} catch {
			// Try again if we haven't exceeded max attempts
			if (this.reconnectAttempts < maxAttempts) {
				this.attemptReconnect();
			} else {
				this.connectionState = ConnectionState.Disconnected;
			}
		}
	}

	// =========================================================================
	// PRIVATE - DATA HANDLING
	// =========================================================================

	/**
	 * Handle incoming data from socket
	 */
	private handleSocketData(data: Buffer): void {
		this.buffer += data.toString();

		// Parse newline-delimited JSON-RPC
		const lines = this.buffer.split("\n");
		this.buffer = lines.pop() || "";

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			try {
				const message = JSON.parse(line) as DaemonResponse | DaemonNotification;

				// Check if this is a notification (has method but no id)
				if ("method" in message && message.method === "notification") {
					this.emit("notification", message as DaemonNotification);
					continue;
				}

				// Handle response
				const response = message as DaemonResponse;
				const pending = this.pending.get(response.id);

				if (pending) {
					this.pending.delete(response.id);
					clearTimeout(pending.timeoutId);

					if (response.error) {
						const error = new DaemonError(
							response.error.code,
							response.error.message,
							response.error.data as Record<string, unknown> | undefined,
						);
						pending.reject(error);
					} else {
						pending.resolve(response.result);
					}
				}
			} catch {
				this.emit("error", new Error(`Failed to parse response: ${line.substring(0, 100)}`));
			}
		}
	}

	// =========================================================================
	// PRIVATE - REQUEST EXECUTION
	// =========================================================================

	/**
	 * Execute a request with retry logic
	 */
	private async executeRequest<T>(
		method: string,
		params: Record<string, unknown>,
		retriesRemaining: number,
	): Promise<T> {
		const id = String(++this.requestId);
		const timeout = this.config.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT_MS;

		return new Promise((resolve, reject) => {
			// Set up timeout
			const timeoutId = setTimeout(() => {
				const pending = this.pending.get(id);
				if (pending) {
					this.pending.delete(id);

					// Retry on timeout if retries remaining
					if (retriesRemaining > 0) {
						this.executeRequest<T>(method, params, retriesRemaining - 1)
							.then(resolve)
							.catch(reject);
					} else {
						reject(new TimeoutError(method, timeout));
					}
				}
			}, timeout);

			// Store pending request
			this.pending.set(id, {
				resolve: (value) => resolve(value as T),
				reject,
				method,
				params,
				startTime: Date.now(),
				retries: retriesRemaining,
				timeoutId,
			});

			// Send request
			const request = JSON.stringify({
				jsonrpc: "2.0",
				id,
				method,
				params,
			});

			if (!this.socket) {
				this.pending.delete(id);
				clearTimeout(timeoutId);
				reject(new ConnectionError("Not connected"));
				return;
			}

			const success = this.socket.write(`${request}\n`);
			if (!success) {
				// Buffer is full, wait for drain
				this.socket.once("drain", () => {
					// Request already sent, just wait for response
				});
			}
		});
	}

	// =========================================================================
	// PRIVATE - HEALTH MONITORING
	// =========================================================================

	/**
	 * Start periodic health checks
	 */
	private startHealthCheck(): void {
		this.stopHealthCheck();

		const interval = this.config.healthCheckInterval ?? HEALTH_CHECK_INTERVAL_MS;

		this.healthCheckTimer = setInterval(async () => {
			if (this.connectionState !== ConnectionState.Connected) {
				return;
			}

			const startTime = Date.now();
			try {
				await this.ping();
				const latencyMs = Date.now() - startTime;
				this.emit("healthCheck", true, latencyMs);
			} catch {
				this.emit("healthCheck", false, -1);
			}
		}, interval);
	}

	/**
	 * Stop periodic health checks
	 */
	private stopHealthCheck(): void {
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
			this.healthCheckTimer = null;
		}
	}

	// =========================================================================
	// PRIVATE - UTILITIES
	// =========================================================================

	/**
	 * Sleep for the specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new daemon client with the given configuration
 */
export function createDaemonClient(config: DaemonClientConfig): DaemonClient {
	return new DaemonClient(config);
}
