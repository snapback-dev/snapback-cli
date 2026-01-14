/**
 * SnapBack Daemon Constants Tests
 *
 * Verifies all constants have expected values and types.
 *
 * @module daemon/constants.test
 */

import { describe, expect, it } from "vitest";
import {
	DAEMON_DIR,
	DAEMON_STARTUP_CHECK_INTERVAL_MS,
	DAEMON_STARTUP_TIMEOUT_MS,
	DAEMON_VERSION,
	DEFAULT_HEALTH_PORT,
	DEFAULT_IDLE_TIMEOUT_MS,
	DEFAULT_REQUEST_TIMEOUT_MS,
	JSONRPC_VERSION,
	LOCK_FILE,
	LOG_FILE,
	MAX_BUFFER_SIZE,
	MAX_CONNECTIONS,
	MAX_LOG_SIZE,
	MAX_PATH_LENGTH,
	MAX_PENDING_REQUESTS,
	MESSAGE_DELIMITER,
	OPERATION_TIMEOUT_MS,
	PID_FILE,
	PID_FILE_PERMISSIONS,
	RECONNECT_BASE_DELAY_MS,
	RECONNECT_MAX_ATTEMPTS,
	RECONNECT_MAX_DELAY_MS,
	SOCKET_NAME,
	SOCKET_PERMISSIONS,
	STATE_FILE,
	WINDOWS_PIPE_NAME,
	WINDOWS_PIPE_PREFIX,
} from "../../src/daemon/constants.js";

describe("Timeout constants", () => {
	it("DEFAULT_IDLE_TIMEOUT_MS should be 15 minutes", () => {
		expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(15 * 60 * 1000);
		expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(900000);
	});

	it("DEFAULT_REQUEST_TIMEOUT_MS should be 30 seconds", () => {
		expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(30 * 1000);
		expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(30000);
	});

	it("OPERATION_TIMEOUT_MS should be 10 seconds", () => {
		expect(OPERATION_TIMEOUT_MS).toBe(10 * 1000);
		expect(OPERATION_TIMEOUT_MS).toBe(10000);
	});

	it("DAEMON_STARTUP_TIMEOUT_MS should be 5 seconds", () => {
		expect(DAEMON_STARTUP_TIMEOUT_MS).toBe(5 * 1000);
		expect(DAEMON_STARTUP_TIMEOUT_MS).toBe(5000);
	});

	it("DAEMON_STARTUP_CHECK_INTERVAL_MS should be 100ms", () => {
		expect(DAEMON_STARTUP_CHECK_INTERVAL_MS).toBe(100);
	});

	it("RECONNECT_BASE_DELAY_MS should be 100ms", () => {
		expect(RECONNECT_BASE_DELAY_MS).toBe(100);
	});

	it("RECONNECT_MAX_DELAY_MS should be 10 seconds", () => {
		expect(RECONNECT_MAX_DELAY_MS).toBe(10 * 1000);
		expect(RECONNECT_MAX_DELAY_MS).toBe(10000);
	});

	it("RECONNECT_MAX_ATTEMPTS should be 5", () => {
		expect(RECONNECT_MAX_ATTEMPTS).toBe(5);
	});

	it("timeouts should have sensible relationships", () => {
		// Startup timeout should be less than idle timeout
		expect(DAEMON_STARTUP_TIMEOUT_MS).toBeLessThan(DEFAULT_IDLE_TIMEOUT_MS);

		// Operation timeout should be less than request timeout
		expect(OPERATION_TIMEOUT_MS).toBeLessThan(DEFAULT_REQUEST_TIMEOUT_MS);

		// Max reconnect delay should be achievable within a few attempts
		// With base 100ms and exponential backoff, 5 attempts = 100 * 2^4 = 1600ms max
		expect(RECONNECT_MAX_DELAY_MS).toBeGreaterThan(RECONNECT_BASE_DELAY_MS);
	});
});

describe("Limit constants", () => {
	it("MAX_CONNECTIONS should be 10", () => {
		expect(MAX_CONNECTIONS).toBe(10);
	});

	it("MAX_BUFFER_SIZE should be 1MB", () => {
		expect(MAX_BUFFER_SIZE).toBe(1024 * 1024);
		expect(MAX_BUFFER_SIZE).toBe(1048576);
	});

	it("MAX_PENDING_REQUESTS should be 100", () => {
		expect(MAX_PENDING_REQUESTS).toBe(100);
	});

	it("MAX_LOG_SIZE should be 10MB", () => {
		expect(MAX_LOG_SIZE).toBe(10 * 1024 * 1024);
		expect(MAX_LOG_SIZE).toBe(10485760);
	});

	it("MAX_PATH_LENGTH should be 4096", () => {
		expect(MAX_PATH_LENGTH).toBe(4096);
	});

	it("limits should be positive numbers", () => {
		expect(MAX_CONNECTIONS).toBeGreaterThan(0);
		expect(MAX_BUFFER_SIZE).toBeGreaterThan(0);
		expect(MAX_PENDING_REQUESTS).toBeGreaterThan(0);
		expect(MAX_LOG_SIZE).toBeGreaterThan(0);
		expect(MAX_PATH_LENGTH).toBeGreaterThan(0);
	});
});

describe("File name constants", () => {
	it("DAEMON_DIR should be 'daemon'", () => {
		expect(DAEMON_DIR).toBe("daemon");
	});

	it("SOCKET_NAME should be 'daemon.sock'", () => {
		expect(SOCKET_NAME).toBe("daemon.sock");
	});

	it("PID_FILE should be 'daemon.pid'", () => {
		expect(PID_FILE).toBe("daemon.pid");
	});

	it("LOCK_FILE should be 'daemon.lock'", () => {
		expect(LOCK_FILE).toBe("daemon.lock");
	});

	it("LOG_FILE should be 'daemon.log'", () => {
		expect(LOG_FILE).toBe("daemon.log");
	});

	it("STATE_FILE should be 'state.json'", () => {
		expect(STATE_FILE).toBe("state.json");
	});

	it("file names should not contain path separators", () => {
		const fileNames = [SOCKET_NAME, PID_FILE, LOCK_FILE, LOG_FILE, STATE_FILE];
		for (const name of fileNames) {
			expect(name).not.toContain("/");
			expect(name).not.toContain("\\");
		}
	});
});

describe("Permission constants", () => {
	it("SOCKET_PERMISSIONS should be 0o600 (owner read/write only)", () => {
		expect(SOCKET_PERMISSIONS).toBe(0o600);
		expect(SOCKET_PERMISSIONS).toBe(384); // decimal equivalent
	});

	it("PID_FILE_PERMISSIONS should be 0o600 (owner read/write only)", () => {
		expect(PID_FILE_PERMISSIONS).toBe(0o600);
	});

	it("permissions should be restrictive (no group/other access)", () => {
		// Check that group and other bits are not set
		// 0o600 = rw------- (owner read/write, no group/other)
		const groupOtherMask = 0o077;
		expect(SOCKET_PERMISSIONS & groupOtherMask).toBe(0);
		expect(PID_FILE_PERMISSIONS & groupOtherMask).toBe(0);
	});
});

describe("Protocol constants", () => {
	it("JSONRPC_VERSION should be '2.0'", () => {
		expect(JSONRPC_VERSION).toBe("2.0");
	});

	it("MESSAGE_DELIMITER should be newline", () => {
		expect(MESSAGE_DELIMITER).toBe("\n");
	});

	it("WINDOWS_PIPE_PREFIX should be valid named pipe prefix", () => {
		expect(WINDOWS_PIPE_PREFIX).toBe("\\\\.\\pipe\\");
	});

	it("WINDOWS_PIPE_NAME should be 'snapback-daemon'", () => {
		expect(WINDOWS_PIPE_NAME).toBe("snapback-daemon");
	});

	it("Windows pipe constants should form valid pipe path", () => {
		const pipePath = `${WINDOWS_PIPE_PREFIX}${WINDOWS_PIPE_NAME}`;
		expect(pipePath).toBe("\\\\.\\pipe\\snapback-daemon");
	});
});

describe("Health check constants", () => {
	it("DEFAULT_HEALTH_PORT should be 3847", () => {
		expect(DEFAULT_HEALTH_PORT).toBe(3847);
	});

	it("DEFAULT_HEALTH_PORT should be valid port number", () => {
		expect(DEFAULT_HEALTH_PORT).toBeGreaterThan(1024); // Above privileged ports
		expect(DEFAULT_HEALTH_PORT).toBeLessThanOrEqual(65535); // Valid port range
	});
});

describe("Version constants", () => {
	it("DAEMON_VERSION should be semver format", () => {
		expect(DAEMON_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("DAEMON_VERSION should be '1.0.0'", () => {
		expect(DAEMON_VERSION).toBe("1.0.0");
	});
});

describe("All constants are immutable", () => {
	it("constants should be primitive values or strings", () => {
		const constants = {
			DEFAULT_IDLE_TIMEOUT_MS,
			DEFAULT_REQUEST_TIMEOUT_MS,
			OPERATION_TIMEOUT_MS,
			DAEMON_STARTUP_TIMEOUT_MS,
			DAEMON_STARTUP_CHECK_INTERVAL_MS,
			RECONNECT_BASE_DELAY_MS,
			RECONNECT_MAX_DELAY_MS,
			RECONNECT_MAX_ATTEMPTS,
			MAX_CONNECTIONS,
			MAX_BUFFER_SIZE,
			MAX_PENDING_REQUESTS,
			MAX_LOG_SIZE,
			MAX_PATH_LENGTH,
			DAEMON_DIR,
			SOCKET_NAME,
			PID_FILE,
			LOCK_FILE,
			LOG_FILE,
			STATE_FILE,
			SOCKET_PERMISSIONS,
			PID_FILE_PERMISSIONS,
			JSONRPC_VERSION,
			MESSAGE_DELIMITER,
			WINDOWS_PIPE_PREFIX,
			WINDOWS_PIPE_NAME,
			DEFAULT_HEALTH_PORT,
			DAEMON_VERSION,
		};

		for (const [_name, value] of Object.entries(constants)) {
			const type = typeof value;
			expect(type === "number" || type === "string").toBe(true);
		}
	});
});
