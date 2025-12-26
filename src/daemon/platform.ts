/**
 * Platform Utilities
 *
 * Cross-platform support for daemon socket paths, PID files, and system operations.
 * Follows learnings: Use os.EOL for line splitting, path.join() for paths.
 *
 * @module daemon/platform
 */

import { accessSync, constants, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { appendFile, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

// =============================================================================
// CONSTANTS
// =============================================================================

const DAEMON_DIR = "daemon";
const SOCKET_NAME = "daemon.sock";
const PID_FILE = "daemon.pid";
const LOCK_FILE = "daemon.lock";
const LOG_FILE = "daemon.log";

/**
 * Default idle timeout in milliseconds (15 minutes)
 */
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Maximum connections allowed
 */
export const MAX_CONNECTIONS = 10;

/**
 * Maximum log file size before rotation (10MB)
 */
export const MAX_LOG_SIZE = 10 * 1024 * 1024;

// =============================================================================
// PATH GETTERS
// =============================================================================

/**
 * Get the global SnapBack directory (~/.snapback/)
 */
export function getSnapBackDir(): string {
	if (platform() === "win32") {
		return join(process.env.APPDATA || homedir(), "snapback");
	}
	return join(homedir(), ".snapback");
}

/**
 * Get the daemon directory (~/.snapback/daemon/)
 */
export function getDaemonDir(): string {
	return join(getSnapBackDir(), DAEMON_DIR);
}

/**
 * Get the socket path for IPC communication
 * - Unix: ~/.snapback/daemon/daemon.sock
 * - Windows: \\.\pipe\snapback-daemon
 */
export function getSocketPath(): string {
	if (platform() === "win32") {
		// Windows named pipe
		return "\\\\.\\pipe\\snapback-daemon";
	}
	// Unix domain socket
	return join(getDaemonDir(), SOCKET_NAME);
}

/**
 * Get the PID file path
 */
export function getPidPath(): string {
	return join(getDaemonDir(), PID_FILE);
}

/**
 * Get the lock file path
 */
export function getLockPath(): string {
	return join(getDaemonDir(), LOCK_FILE);
}

/**
 * Get the log file path
 */
export function getLogPath(): string {
	return join(getDaemonDir(), LOG_FILE);
}

// =============================================================================
// WORKSPACE UTILITIES
// =============================================================================

/**
 * Get workspace-specific directory for daemon state
 */
export function getWorkspaceStateDir(workspaceRoot: string): string {
	const hash = hashWorkspacePath(workspaceRoot);
	return join(getSnapBackDir(), "workspaces", hash);
}

/**
 * Create a hash of the workspace path for directory naming
 */
export function hashWorkspacePath(workspacePath: string): string {
	// Simple hash function for workspace paths
	let hash = 0;
	const normalized = workspacePath.toLowerCase().replace(/\\/g, "/");
	for (let i = 0; i < normalized.length; i++) {
		const char = normalized.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

// =============================================================================
// DIRECTORY MANAGEMENT
// =============================================================================

/**
 * Ensure the daemon directory exists
 */
export async function ensureDaemonDir(): Promise<void> {
	await mkdir(getDaemonDir(), { recursive: true });
}

/**
 * Ensure the daemon directory exists (sync version for startup)
 */
export function ensureDaemonDirSync(): void {
	mkdirSync(getDaemonDir(), { recursive: true });
}

// =============================================================================
// PID FILE MANAGEMENT
// =============================================================================

/**
 * Write the PID file
 */
export async function writePidFile(pid: number): Promise<void> {
	await ensureDaemonDir();
	await writeFile(getPidPath(), String(pid), "utf-8");
}

/**
 * Write the PID file (sync version)
 */
export function writePidFileSync(pid: number): void {
	ensureDaemonDirSync();
	writeFileSync(getPidPath(), String(pid), "utf-8");
}

/**
 * Read the PID from the PID file
 */
export async function readPidFile(): Promise<number | null> {
	try {
		const content = await readFile(getPidPath(), "utf-8");
		const pid = Number.parseInt(content.trim(), 10);
		return Number.isNaN(pid) ? null : pid;
	} catch {
		return null;
	}
}

/**
 * Read the PID from the PID file (sync version)
 */
export function readPidFileSync(): number | null {
	try {
		const content = readFileSync(getPidPath(), "utf-8");
		const pid = Number.parseInt(content.trim(), 10);
		return Number.isNaN(pid) ? null : pid;
	} catch {
		return null;
	}
}

/**
 * Remove the PID file
 */
export async function removePidFile(): Promise<void> {
	try {
		await unlink(getPidPath());
	} catch {
		// File doesn't exist, that's fine
	}
}

/**
 * Remove the PID file (sync version)
 */
export function removePidFileSync(): void {
	try {
		unlinkSync(getPidPath());
	} catch {
		// File doesn't exist, that's fine
	}
}

// =============================================================================
// SOCKET FILE MANAGEMENT
// =============================================================================

/**
 * Remove stale socket file
 */
export async function removeSocketFile(): Promise<void> {
	// Skip for Windows named pipes
	if (platform() === "win32") {
		return;
	}

	try {
		await unlink(getSocketPath());
	} catch {
		// File doesn't exist, that's fine
	}
}

/**
 * Remove stale socket file (sync version)
 */
export function removeSocketFileSync(): void {
	// Skip for Windows named pipes
	if (platform() === "win32") {
		return;
	}

	try {
		unlinkSync(getSocketPath());
	} catch {
		// File doesn't exist, that's fine
	}
}

/**
 * Check if socket file exists
 */
export function socketExists(): boolean {
	// Windows named pipes don't have file presence
	if (platform() === "win32") {
		return false;
	}

	try {
		accessSync(getSocketPath(), constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// PROCESS MANAGEMENT
// =============================================================================

/**
 * Check if a process with the given PID is running
 */
export function isProcessRunning(pid: number): boolean {
	try {
		// Signal 0 doesn't actually send a signal, just checks if process exists
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if the daemon is running
 */
export function isDaemonRunning(): boolean {
	const pid = readPidFileSync();
	if (pid === null) {
		return false;
	}
	return isProcessRunning(pid);
}

/**
 * Check if the daemon is running (async version)
 */
export async function isDaemonRunningAsync(): Promise<boolean> {
	const pid = await readPidFile();
	if (pid === null) {
		return false;
	}
	return isProcessRunning(pid);
}

/**
 * Clean up stale daemon files (PID and socket)
 */
export function cleanupStaleDaemonFiles(): void {
	const pid = readPidFileSync();

	// If PID file exists but process is not running, clean up
	if (pid !== null && !isProcessRunning(pid)) {
		removePidFileSync();
		removeSocketFileSync();
	}
}

// =============================================================================
// LOCK FILE MANAGEMENT
// =============================================================================

/**
 * Acquire a lock for daemon startup (prevents race conditions)
 * @param customLockPath - Optional custom lock path (defaults to global lock path)
 */
export async function acquireLock(customLockPath?: string): Promise<boolean> {
	const lockPath = customLockPath ?? getLockPath();
	const lockDir = dirname(lockPath);

	try {
		// Ensure lock directory exists
		await mkdir(lockDir, { recursive: true });

		// Try to create lock file exclusively
		const fd = await open(lockPath, "wx");
		await fd.writeFile(String(process.pid));
		await fd.close();
		return true;
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException).code === "EEXIST") {
			// Lock file exists - check if holder is still running
			try {
				const content = await readFile(lockPath, "utf-8");
				const lockPid = Number.parseInt(content.trim(), 10);
				if (!Number.isNaN(lockPid) && !isProcessRunning(lockPid)) {
					// Holder is dead, remove stale lock
					await unlink(lockPath);
					// Retry
					return acquireLock(customLockPath);
				}
			} catch {
				// Can't read lock file, someone else may be handling it
			}
		}
		return false;
	}
}

/**
 * Release the lock
 * @param customLockPath - Optional custom lock path (defaults to global lock path)
 */
export async function releaseLock(customLockPath?: string): Promise<void> {
	const lockPath = customLockPath ?? getLockPath();
	try {
		await unlink(lockPath);
	} catch {
		// File doesn't exist, that's fine
	}
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Daemon log entry
 */
export interface LogEntry {
	timestamp: string;
	level: "debug" | "info" | "warn" | "error";
	message: string;
	data?: unknown;
}

/**
 * Write to daemon log
 */
export async function writeLog(level: LogEntry["level"], message: string, data?: unknown): Promise<void> {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		data,
	};

	const logPath = getLogPath();
	const line = `${JSON.stringify(entry)}\n`;

	try {
		await ensureDaemonDir();
		await appendFile(logPath, line, "utf-8");
	} catch {
		// Logging should never crash the daemon
		console.error(`[daemon] ${level}: ${message}`, data);
	}
}

/**
 * Console logger for daemon (writes to stderr for daemon, stdout for foreground)
 */
export function daemonLog(level: LogEntry["level"], message: string, data?: unknown): void {
	const prefix = `[snapback-daemon] [${level.toUpperCase()}]`;
	const timestamp = new Date().toISOString();

	if (data !== undefined) {
		console.error(`${timestamp} ${prefix} ${message}`, data);
	} else {
		console.error(`${timestamp} ${prefix} ${message}`);
	}

	// Also write to log file asynchronously
	writeLog(level, message, data).catch(() => {
		// Ignore log write errors
	});
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Daemon configuration
 */
export interface DaemonConfig {
	/** Path to Unix socket or Windows named pipe */
	socketPath: string;
	/** Path to PID file */
	pidPath: string;
	/** Idle timeout in milliseconds before shutdown */
	idleTimeoutMs: number;
	/** Maximum concurrent connections */
	maxConnections: number;
	/** Daemon version */
	version: string;
}

/**
 * Get default daemon configuration
 */
export function getDefaultConfig(): DaemonConfig {
	return {
		socketPath: getSocketPath(),
		pidPath: getPidPath(),
		idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
		maxConnections: MAX_CONNECTIONS,
		version: "1.0.0",
	};
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

/**
 * Format bytes in human-readable form
 */
export function formatBytes(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	let unitIndex = 0;
	let value = bytes;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	return `${value.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Get current platform info
 */
export function getPlatformInfo(): {
	platform: string;
	isWindows: boolean;
	isMac: boolean;
	isLinux: boolean;
} {
	const p = platform();
	return {
		platform: p,
		isWindows: p === "win32",
		isMac: p === "darwin",
		isLinux: p === "linux",
	};
}
