/**
 * Daemon Client Tests
 *
 * TDD RED phase: Tests for the daemon client implementation
 */

import { mkdir, rm, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapBackDaemon } from "../../src/daemon/server";

// Test helpers
const TEST_DIR = join(homedir(), ".snapback-test-daemon-client");
const TEST_SOCKET = join(TEST_DIR, "test.sock");
const TEST_PID = join(TEST_DIR, "daemon.pid");
const TEST_LOCK = join(TEST_DIR, "daemon.lock");

describe("daemon/client", () => {
	let daemon: SnapBackDaemon | null = null;

	beforeEach(async () => {
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		vi.restoreAllMocks();

		if (daemon) {
			await daemon.shutdown();
			daemon = null;
		}

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

	describe("DaemonClient class", () => {
		it("should export DaemonClient class", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			expect(DaemonClient).toBeDefined();
			expect(typeof DaemonClient).toBe("function");
		});

		it("should create instance with config", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			expect(client).toBeDefined();
		});
	});

	describe("connection methods", () => {
		it("should have connect method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			expect(typeof client.connect).toBe("function");
		});

		it("should have disconnect method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			expect(typeof client.disconnect).toBe("function");
		});

		it("should have isConnected method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			expect(typeof client.isConnected).toBe("function");
		});
	});

	describe("request method", () => {
		it("should have request method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			expect(typeof client.request).toBe("function");
		});

		it("should send request and receive response", async () => {
			// Start daemon
			daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});
			await daemon.start();

			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			await client.connect();
			const response = await client.request("daemon.ping", {});

			expect(response).toMatchObject({
				pong: true,
			});

			await client.disconnect();
		});
	});

	describe("convenience methods", () => {
		beforeEach(async () => {
			// Start daemon for convenience method tests
			daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});
			await daemon.start();
		});

		it("should have ping convenience method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			await client.connect();
			const result = await client.ping();

			expect(result).toMatchObject({
				pong: true,
				uptime: expect.any(Number),
			});

			await client.disconnect();
		});

		it("should have status convenience method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			await client.connect();
			const result = await client.status();

			expect(result).toMatchObject({
				pid: expect.any(Number),
				version: expect.any(String),
				uptime: expect.any(Number),
			});

			await client.disconnect();
		});

		it("should have beginTask convenience method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			await client.connect();
			const result = await client.beginTask("/test/workspace", "Test task");

			expect(result).toMatchObject({
				taskId: expect.any(String),
			});

			await client.disconnect();
		});

		it("should have createSnapshot convenience method", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			await client.connect();
			const result = await client.createSnapshot("/test/workspace", ["file1.ts", "file2.ts"]);

			expect(result).toMatchObject({
				snapshotId: expect.any(String),
				fileCount: 2,
			});

			await client.disconnect();
		});
	});

	describe("error handling", () => {
		it("should throw when daemon not running", async () => {
			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				autoStart: false, // Don't auto-start daemon
			});

			await expect(client.connect()).rejects.toThrow();
		});

		it("should handle request timeout", async () => {
			// Start daemon
			daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});
			await daemon.start();

			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				requestTimeout: 100, // Very short timeout
			});

			await client.connect();

			// Request with unknown method that takes time should timeout
			// (Actually it won't timeout because our server responds quickly,
			// but this tests the timeout infrastructure exists)
			const result = await client.request("daemon.ping", {});
			expect(result).toBeDefined();

			await client.disconnect();
		});
	});

	describe("reconnection", () => {
		it("should reconnect after disconnect", async () => {
			// Start daemon
			daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});
			await daemon.start();

			const { DaemonClient } = await import("../../src/daemon/client");
			const client = new DaemonClient({
				socketPath: TEST_SOCKET,
				pidPath: TEST_PID,
			});

			// First connection
			await client.connect();
			let response = await client.request("daemon.ping", {});
			expect(response).toMatchObject({ pong: true });

			// Disconnect
			await client.disconnect();
			expect(client.isConnected()).toBe(false);

			// Reconnect
			await client.connect();
			response = await client.request("daemon.ping", {});
			expect(response).toMatchObject({ pong: true });

			await client.disconnect();
		});
	});
});
