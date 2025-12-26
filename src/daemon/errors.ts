/**
 * SnapBack Daemon Error Types
 *
 * Custom error classes for daemon operations with proper error codes
 * and context information for debugging.
 *
 * @module daemon/errors
 */

import { ErrorCodes } from "./protocol.js";

// =============================================================================
// BASE DAEMON ERROR
// =============================================================================

/**
 * Base error class for all daemon errors
 */
export class DaemonError extends Error {
	constructor(
		public readonly code: number,
		message: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "DaemonError";
		Error.captureStackTrace?.(this, this.constructor);
	}

	/**
	 * Convert to JSON-RPC error format
	 */
	toJsonRpcError(): { code: number; message: string; data?: unknown } {
		return {
			code: this.code,
			message: this.message,
			data: this.context,
		};
	}
}

// =============================================================================
// SPECIFIC ERROR TYPES
// =============================================================================

/**
 * Parse error - Invalid JSON
 */
export class ParseError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.PARSE_ERROR, message, context);
		this.name = "ParseError";
	}
}

/**
 * Invalid request - Not a valid JSON-RPC request
 */
export class InvalidRequestError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.INVALID_REQUEST, message, context);
		this.name = "InvalidRequestError";
	}
}

/**
 * Method not found
 */
export class MethodNotFoundError extends DaemonError {
	constructor(method: string) {
		super(ErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`, { method });
		this.name = "MethodNotFoundError";
	}
}

/**
 * Invalid params
 */
export class InvalidParamsError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.INVALID_PARAMS, message, context);
		this.name = "InvalidParamsError";
	}
}

/**
 * Internal error
 */
export class InternalError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.INTERNAL_ERROR, message, context);
		this.name = "InternalError";
	}
}

/**
 * Daemon not running
 */
export class DaemonNotRunningError extends DaemonError {
	constructor() {
		super(ErrorCodes.DAEMON_NOT_RUNNING, "Daemon is not running");
		this.name = "DaemonNotRunningError";
	}
}

/**
 * Workspace not found
 */
export class WorkspaceNotFoundError extends DaemonError {
	constructor(workspace: string) {
		super(ErrorCodes.WORKSPACE_NOT_FOUND, `Workspace not found: ${workspace}`, { workspace });
		this.name = "WorkspaceNotFoundError";
	}
}

/**
 * Snapshot operation failed
 */
export class SnapshotError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.SNAPSHOT_FAILED, message, context);
		this.name = "SnapshotError";
	}
}

/**
 * Validation failed
 */
export class ValidationError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.VALIDATION_FAILED, message, context);
		this.name = "ValidationError";
	}
}

/**
 * Permission denied
 */
export class PermissionDeniedError extends DaemonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(ErrorCodes.PERMISSION_DENIED, message, context);
		this.name = "PermissionDeniedError";
	}
}

/**
 * Request timeout
 */
export class TimeoutError extends DaemonError {
	constructor(operation: string, timeoutMs: number) {
		super(ErrorCodes.TIMEOUT, `Operation timed out after ${timeoutMs}ms: ${operation}`, {
			operation,
			timeoutMs,
		});
		this.name = "TimeoutError";
	}
}

/**
 * Path traversal attack detected
 */
export class PathTraversalError extends DaemonError {
	constructor(path: string) {
		super(ErrorCodes.PERMISSION_DENIED, `Path traversal detected: ${path}`, { path });
		this.name = "PathTraversalError";
	}
}

/**
 * Request too large
 */
export class RequestTooLargeError extends DaemonError {
	constructor(size: number, maxSize: number) {
		super(ErrorCodes.INVALID_REQUEST, `Request too large: ${size} bytes (max: ${maxSize})`, {
			size,
			maxSize,
		});
		this.name = "RequestTooLargeError";
	}
}

/**
 * Not implemented
 */
export class NotImplementedError extends DaemonError {
	constructor(feature: string) {
		super(ErrorCodes.INTERNAL_ERROR, `Not implemented: ${feature}`, { feature });
		this.name = "NotImplementedError";
	}
}

/**
 * Connection error (transient)
 */
export class ConnectionError extends DaemonError {
	public readonly isTransient: boolean;

	constructor(message: string, isTransient = true, context?: Record<string, unknown>) {
		super(ErrorCodes.DAEMON_NOT_RUNNING, message, context);
		this.name = "ConnectionError";
		this.isTransient = isTransient;
	}
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Check if an error is a DaemonError
 */
export function isDaemonError(error: unknown): error is DaemonError {
	return error instanceof DaemonError;
}

/**
 * Convert any error to a DaemonError
 */
export function toDaemonError(error: unknown): DaemonError {
	if (isDaemonError(error)) {
		return error;
	}

	if (error instanceof Error) {
		return new InternalError(error.message, { originalError: error.name, stack: error.stack });
	}

	return new InternalError(String(error));
}

/**
 * Check if an error is transient (can be retried)
 */
export function isTransientError(error: unknown): boolean {
	if (error instanceof ConnectionError) {
		return error.isTransient;
	}
	if (error instanceof TimeoutError) {
		return true;
	}
	return false;
}
