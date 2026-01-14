/**
 * SnapBack Daemon Module
 *
 * Exports for the daemon server, client, and utilities.
 *
 * @module daemon
 */

// Client exports
export { createDaemonClient, DaemonClient, type DaemonClientConfig, type DaemonClientEvents } from "./client.js";

// Constants exports
export {
	DEFAULT_HEALTH_PORT,
	DEFAULT_IDLE_TIMEOUT_MS,
	LOCK_FILE,
	MAX_BUFFER_SIZE,
	MAX_CONNECTIONS,
	OPERATION_TIMEOUT_MS,
	PID_FILE,
	SOCKET_NAME,
	SOCKET_PERMISSIONS,
	STATE_FILE,
} from "./constants.js";
// Push Architecture exports (stress_test_remediation.md)
export {
	ContextWriter,
	type CtxFile,
	createContextWriter,
	type WorkspaceState,
} from "./context-writer.js";
// Error exports
export {
	ConnectionError,
	DaemonError,
	InternalError,
	InvalidParamsError,
	InvalidRequestError,
	MethodNotFoundError,
	ParseError,
	PathTraversalError,
	PermissionDeniedError,
	RequestTooLargeError,
	TimeoutError,
	toDaemonError,
	WorkspaceNotFoundError,
} from "./errors.js";
// Logger exports
export { DaemonLogger, generateRequestId, initLogger } from "./logger.js";
// Path validator exports
export { validatePath, validatePaths } from "./path-validator.js";
// Platform exports
export {
	acquireLock,
	cleanupStaleDaemonFiles,
	type DaemonConfig as PlatformDaemonConfig,
	daemonLog,
	ensureDaemonDir,
	ensureDaemonDirSync,
	formatBytes,
	formatDuration,
	getDaemonDir,
	getDefaultConfig,
	getLockPath,
	getLogPath,
	getPidPath,
	getPlatformInfo,
	getSnapBackDir,
	getSocketPath,
	getWorkspaceStateDir,
	hashWorkspacePath,
	isDaemonRunning,
	isDaemonRunningAsync,
	isProcessRunning,
	type LogEntry,
	MAX_LOG_SIZE,
	readPidFile,
	readPidFileSync,
	releaseLock,
	removePidFile,
	removePidFileSync,
	removeSocketFile,
	removeSocketFileSync,
	socketExists,
	writeLog,
	writePidFile,
	writePidFileSync,
} from "./platform.js";
// Protocol exports
export {
	type BeginSessionParams,
	type BeginSessionResult,
	type CreateSnapshotParams,
	type CreateSnapshotResult,
	createErrorResponse,
	createNotification,
	createResponse,
	type DaemonError as ProtocolDaemonError,
	type DaemonEvent,
	type DaemonEventType,
	type DaemonMethod,
	type DaemonNotification,
	type DaemonRequest,
	type DaemonResponse,
	ErrorCodes,
	type PingResult,
	parseRequest,
	type StatusResult,
	serializeResponse,
	type WorkspaceContext,
} from "./protocol.js";
// Server exports
export { type DaemonConfig, SnapBackDaemon } from "./server.js";

// Session Tracking exports (fixes dogfooding issues)
export {
	clearSessionTracker,
	type FileAccess,
	getSessionTracker,
	SessionFileTracker,
	type SessionSummary,
} from "./session-file-tracker.js";
