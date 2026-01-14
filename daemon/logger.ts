/**
 * SnapBack Daemon Logger
 *
 * Structured logging with correlation IDs, JSON format for log aggregation,
 * and proper log levels.
 *
 * @module daemon/logger
 */

import { randomUUID } from "node:crypto";
import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { MAX_LOG_SIZE } from "./constants.js";

// =============================================================================
// LOG TYPES
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
	/** Unique request/operation ID for tracing */
	requestId?: string;
	/** Workspace path */
	workspace?: string;
	/** Method being called */
	method?: string;
	/** Duration in milliseconds */
	durationMs?: number;
	/** Error details */
	error?: string;
	/** Stack trace */
	stack?: string;
	/** Additional context */
	[key: string]: unknown;
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	pid: number;
	context?: LogContext;
}

// =============================================================================
// LOG LEVEL PRIORITIES
// =============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

// =============================================================================
// LOGGER CLASS
// =============================================================================

export class DaemonLogger {
	private logPath: string;
	private minLevel: LogLevel;
	private writeToConsole: boolean;
	private writeToFile: boolean;
	private rotationPromise: Promise<void> | null = null;

	constructor(options: {
		logPath: string;
		minLevel?: LogLevel;
		writeToConsole?: boolean;
		writeToFile?: boolean;
	}) {
		this.logPath = options.logPath;
		this.minLevel = options.minLevel ?? "info";
		this.writeToConsole = options.writeToConsole ?? true;
		this.writeToFile = options.writeToFile ?? true;
	}

	/**
	 * Log a debug message
	 */
	debug(message: string, context?: LogContext): void {
		this.log("debug", message, context);
	}

	/**
	 * Log an info message
	 */
	info(message: string, context?: LogContext): void {
		this.log("info", message, context);
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, context?: LogContext): void {
		this.log("warn", message, context);
	}

	/**
	 * Log an error message
	 */
	error(message: string, context?: LogContext): void {
		this.log("error", message, context);
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: LogContext): ChildLogger {
		return new ChildLogger(this, context);
	}

	/**
	 * Generate a new request ID
	 */
	static generateRequestId(): string {
		return randomUUID().slice(0, 8);
	}

	/**
	 * Internal log method
	 */
	private log(level: LogLevel, message: string, context?: LogContext): void {
		// Check log level
		if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			pid: process.pid,
			context,
		};

		// Write to console
		if (this.writeToConsole) {
			this.writeToStderr(entry);
		}

		// Write to file (async, non-blocking)
		if (this.writeToFile) {
			this.writeToLogFile(entry).catch(() => {
				// Ignore file write errors - logging should never crash the daemon
			});
		}
	}

	/**
	 * Write log entry to stderr as JSON
	 */
	private writeToStderr(entry: LogEntry): void {
		const json = JSON.stringify(entry);
		process.stderr.write(`${json}\n`);
	}

	/**
	 * Write log entry to log file
	 */
	private async writeToLogFile(entry: LogEntry): Promise<void> {
		try {
			// Ensure directory exists
			await mkdir(dirname(this.logPath), { recursive: true });

			// Check if rotation is needed
			await this.rotateIfNeeded();

			// Append to log file
			const line = `${JSON.stringify(entry)}\n`;
			await appendFile(this.logPath, line, "utf-8");
		} catch {
			// Ignore errors - logging should never crash the daemon
		}
	}

	/**
	 * Rotate log file if it exceeds max size
	 */
	private async rotateIfNeeded(): Promise<void> {
		// Prevent concurrent rotations
		if (this.rotationPromise) {
			return this.rotationPromise;
		}

		try {
			const stats = await stat(this.logPath);
			if (stats.size > MAX_LOG_SIZE) {
				this.rotationPromise = this.rotate();
				await this.rotationPromise;
			}
		} catch (err) {
			// File doesn't exist yet, that's fine
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
				throw err;
			}
		} finally {
			this.rotationPromise = null;
		}
	}

	/**
	 * Rotate the log file
	 */
	private async rotate(): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const rotatedPath = this.logPath.replace(".log", `-${timestamp}.log`);

		try {
			await rename(this.logPath, rotatedPath);
		} catch (err) {
			// Ignore rotation errors
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
				console.error("Log rotation failed:", err);
			}
		}
	}
}

// =============================================================================
// CHILD LOGGER
// =============================================================================

/**
 * Child logger with inherited context
 */
class ChildLogger {
	constructor(
		private parent: DaemonLogger,
		private inheritedContext: LogContext,
	) {}

	debug(message: string, context?: LogContext): void {
		this.parent.debug(message, { ...this.inheritedContext, ...context });
	}

	info(message: string, context?: LogContext): void {
		this.parent.info(message, { ...this.inheritedContext, ...context });
	}

	warn(message: string, context?: LogContext): void {
		this.parent.warn(message, { ...this.inheritedContext, ...context });
	}

	error(message: string, context?: LogContext): void {
		this.parent.error(message, { ...this.inheritedContext, ...context });
	}

	child(context: LogContext): ChildLogger {
		return new ChildLogger(this.parent, { ...this.inheritedContext, ...context });
	}
}

// =============================================================================
// DEFAULT LOGGER
// =============================================================================

let defaultLogger: DaemonLogger | null = null;

/**
 * Initialize the default logger
 */
export function initLogger(logPath: string, options?: { minLevel?: LogLevel }): DaemonLogger {
	defaultLogger = new DaemonLogger({
		logPath,
		minLevel: options?.minLevel ?? "info",
		writeToConsole: true,
		writeToFile: true,
	});
	return defaultLogger;
}

/**
 * Get the default logger
 */
export function getLogger(): DaemonLogger {
	if (!defaultLogger) {
		// Create a console-only logger if not initialized
		defaultLogger = new DaemonLogger({
			logPath: "/dev/null",
			minLevel: "info",
			writeToConsole: true,
			writeToFile: false,
		});
	}
	return defaultLogger;
}

/**
 * Log convenience functions
 */
export function debug(message: string, context?: LogContext): void {
	getLogger().debug(message, context);
}

export function info(message: string, context?: LogContext): void {
	getLogger().info(message, context);
}

export function warn(message: string, context?: LogContext): void {
	getLogger().warn(message, context);
}

export function error(message: string, context?: LogContext): void {
	getLogger().error(message, context);
}

export function generateRequestId(): string {
	return DaemonLogger.generateRequestId();
}
