/**
 * SnapBack Daemon Constants
 *
 * Centralized constants for daemon configuration, limits, and timeouts.
 *
 * @module daemon/constants
 */

// =============================================================================
// TIMEOUTS
// =============================================================================

/**
 * Default idle timeout in milliseconds (15 minutes)
 * Daemon will shutdown after this period of inactivity
 */
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Default request timeout in milliseconds (30 seconds)
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30 * 1000;

/**
 * Operation timeout for individual handlers (10 seconds)
 */
export const OPERATION_TIMEOUT_MS = 10 * 1000;

/**
 * Daemon startup wait timeout (5 seconds)
 */
export const DAEMON_STARTUP_TIMEOUT_MS = 5 * 1000;

/**
 * Daemon startup check interval (100ms)
 */
export const DAEMON_STARTUP_CHECK_INTERVAL_MS = 100;

/**
 * Reconnection base delay (100ms)
 */
export const RECONNECT_BASE_DELAY_MS = 100;

/**
 * Maximum reconnection delay (10 seconds)
 */
export const RECONNECT_MAX_DELAY_MS = 10 * 1000;

/**
 * Maximum reconnection attempts
 */
export const RECONNECT_MAX_ATTEMPTS = 5;

// =============================================================================
// LIMITS
// =============================================================================

/**
 * Maximum connections allowed
 */
export const MAX_CONNECTIONS = 10;

/**
 * Maximum buffer size per connection (1MB)
 */
export const MAX_BUFFER_SIZE = 1024 * 1024;

/**
 * Maximum pending requests per client
 */
export const MAX_PENDING_REQUESTS = 100;

/**
 * Maximum log file size before rotation (10MB)
 */
export const MAX_LOG_SIZE = 10 * 1024 * 1024;

/**
 * Maximum path length for validation
 */
export const MAX_PATH_LENGTH = 4096;

// =============================================================================
// FILE NAMES
// =============================================================================

/**
 * Daemon directory name
 */
export const DAEMON_DIR = "daemon";

/**
 * Socket file name
 */
export const SOCKET_NAME = "daemon.sock";

/**
 * PID file name
 */
export const PID_FILE = "daemon.pid";

/**
 * Lock file name
 */
export const LOCK_FILE = "daemon.lock";

/**
 * Log file name
 */
export const LOG_FILE = "daemon.log";

/**
 * State file name
 */
export const STATE_FILE = "state.json";

// =============================================================================
// SOCKET PERMISSIONS
// =============================================================================

/**
 * Unix socket permissions (owner read/write only)
 */
export const SOCKET_PERMISSIONS = 0o600;

/**
 * PID file permissions (owner read/write only)
 */
export const PID_FILE_PERMISSIONS = 0o600;

// =============================================================================
// PROTOCOL
// =============================================================================

/**
 * JSON-RPC version
 */
export const JSONRPC_VERSION = "2.0";

/**
 * Message delimiter
 */
export const MESSAGE_DELIMITER = "\n";

/**
 * Windows named pipe prefix
 */
export const WINDOWS_PIPE_PREFIX = "\\\\.\\pipe\\";

/**
 * Windows named pipe name
 */
export const WINDOWS_PIPE_NAME = "snapback-daemon";

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Default health check port
 */
export const DEFAULT_HEALTH_PORT = 3847;

// =============================================================================
// VERSION
// =============================================================================

/**
 * Daemon protocol version
 */
export const DAEMON_VERSION = "1.0.0";
