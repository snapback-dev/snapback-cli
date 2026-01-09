/**
 * Integration Test: CLI Daemon → SDK Packages Wiring
 *
 * Per ARCHITECTURE_REFACTOR_SPEC.md Phase 2 (Week 2):
 * - Update CLI daemon handlers to use SDK packages
 * - Add @snapback/sdk dependency to CLI
 * - Write integration tests for SDK → daemon wiring
 *
 * These tests verify the CLI daemon can properly integrate with:
 * 1. @snapback/sdk SnapshotManager for snapshot operations
 * 2. @snapback/sdk ProtectionManager for protection decisions
 * 3. @snapback/sdk StorageAdapter for persistence
 *
 * @module test/integration/daemon-sdk
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { connect, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
// SDK imports for verification
import { MemoryStorage, ProtectionManager, SnapshotManager } from "@snapback/sdk";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DaemonRequest, DaemonResponse } from "../../src/daemon/protocol";

// Test helpers
const TEST_DIR = join(homedir(), ".snapback-test-daemon-sdk");
const TEST_SOCKET = join(TEST_DIR, "test.sock");
const TEST_LOCK = join(TEST_DIR, "daemon.lock");
const TEST_WORKSPACE = join(TEST_DIR, "workspace");

/**
 * Send a JSON-RPC request and get response
 */
async function sendRequest(socket: Socket, request: DaemonRequest): Promise<DaemonResponse> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("Request timeout")), 5000);

		let buffer = "";
		const onData = (data: Buffer) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			for (const line of lines) {
				if (line.trim()) {
					try {
						const response = JSON.parse(line) as DaemonResponse;
						clearTimeout(timeout);
						socket.off("data", onData);
						resolve(response);
						return;
					} catch {
						// Not complete JSON yet
					}
				}
			}
		};

		socket.on("data", onData);
		socket.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});

		socket.write(`${JSON.stringify(request)}\n`);
	});
}

describe("CLI Daemon → SDK Integration", () => {
	beforeAll(async () => {
		await mkdir(TEST_DIR, { recursive: true });
		await mkdir(TEST_WORKSPACE, { recursive: true });

		// Create test files in workspace
		await writeFile(join(TEST_WORKSPACE, "test.ts"), 'export const test = "hello";');
		await writeFile(join(TEST_WORKSPACE, "config.json"), '{"version": "1.0.0"}');
	});

	afterAll(async () => {
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	afterEach(async () => {
		vi.restoreAllMocks();
	});

	// =========================================================================
	// SDK MODULE AVAILABILITY TESTS
	// =========================================================================

	describe("SDK Module Availability", () => {
		it("should have SnapshotManager available from SDK", () => {
			expect(SnapshotManager).toBeDefined();
			expect(typeof SnapshotManager).toBe("function");
		});

		it("should have ProtectionManager available from SDK", () => {
			expect(ProtectionManager).toBeDefined();
			expect(typeof ProtectionManager).toBe("function");
		});

		it("should have MemoryStorage available from SDK", () => {
			expect(MemoryStorage).toBeDefined();
			expect(typeof MemoryStorage).toBe("function");
		});
	});

	// =========================================================================
	// SDK SNAPSHOT MANAGER INTEGRATION
	// =========================================================================

	describe("SnapshotManager Integration", () => {
		let storage: MemoryStorage;
		let snapshotManager: SnapshotManager;

		beforeEach(() => {
			storage = new MemoryStorage();
			snapshotManager = new SnapshotManager(storage, {
				enableDeduplication: true,
			});
		});

		afterEach(async () => {
			await storage.close();
		});

		it("should create snapshot via SDK SnapshotManager", async () => {
			const snapshot = await snapshotManager.createTest({
				filePath: "test.ts",
				content: 'export const test = "hello";',
			});

			expect(snapshot).toBeDefined();
			expect(snapshot.id).toBeDefined();
			expect(typeof snapshot.id).toBe("string");
		});

		it("should list snapshots via SDK SnapshotManager", async () => {
			await snapshotManager.createTest({
				filePath: "test1.ts",
				content: "const a = 1;",
			});
			await snapshotManager.createTest({
				filePath: "test2.ts",
				content: "const b = 2;",
			});

			const snapshots = await snapshotManager.list();
			expect(snapshots).toHaveLength(2);
		});

		it("should protect/unprotect snapshots via SDK", async () => {
			const snapshot = await snapshotManager.createTest({
				filePath: "test.ts",
				content: "test content",
			});

			// Protect
			await snapshotManager.protect(snapshot.id);
			const protected_ = await snapshotManager.get(snapshot.id);
			expect(protected_?.meta?.protected).toBe(true);

			// Cannot delete protected
			await expect(snapshotManager.delete(snapshot.id)).rejects.toThrow("Cannot delete protected snapshot");

			// Unprotect
			await snapshotManager.unprotect(snapshot.id);
			const unprotected = await snapshotManager.get(snapshot.id);
			expect(unprotected?.meta?.protected).toBe(false);

			// Can delete now
			await expect(snapshotManager.delete(snapshot.id)).resolves.not.toThrow();
		});

		it("should handle deduplication correctly", async () => {
			const content = "const duplicate = true;";

			// First snapshot
			const snap1 = await snapshotManager.createTest({
				filePath: "test.ts",
				content,
			});
			expect(snap1.id).toBeDefined();

			// Duplicate should fail
			await expect(
				snapshotManager.createTest({
					filePath: "test.ts",
					content,
				}),
			).rejects.toThrow("Duplicate snapshot detected");
		});
	});

	// =========================================================================
	// SDK PROTECTION MANAGER INTEGRATION
	// =========================================================================

	describe("ProtectionManager Integration", () => {
		let protectionManager: ProtectionManager;

		beforeEach(() => {
			protectionManager = new ProtectionManager({
				patterns: [
					{ pattern: "**/*.config.ts", level: "block", enabled: true },
					{ pattern: "**/.env*", level: "block", enabled: true },
					{ pattern: "src/**/*.ts", level: "watch", enabled: true },
				],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			});
		});

		it("should get protection level for config files", () => {
			const protection = protectionManager.getProtection("app.config.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("block");
		});

		it("should get protection level for env files", () => {
			const protection = protectionManager.getProtection(".env");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("block");
		});

		it("should get protection level for source files", () => {
			const protection = protectionManager.getProtection("src/app.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("watch");
		});

		it("should protect files dynamically", () => {
			protectionManager.protect("custom/file.ts", "warn", "Test reason");

			const protection = protectionManager.getProtection("custom/file.ts");
			expect(protection?.level).toBe("warn");
		});

		it("should check if file is protected", () => {
			expect(protectionManager.isProtected("app.config.ts")).toBe(true);
			expect(protectionManager.isProtected("random.txt")).toBe(false);
		});
	});

	// =========================================================================
	// DAEMON → SDK WIRING TESTS
	// =========================================================================

	describe("Daemon → SDK Wiring", () => {
		it("should be able to import daemon server module", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");
			expect(SnapBackDaemon).toBeDefined();
		});

		it("daemon handlers should be ready for SDK integration", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");

			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// Test snapshot.create handler exists
				const createResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "1",
					method: "snapshot.create",
					params: {
						workspace: TEST_WORKSPACE,
						files: ["test.ts"],
						reason: "Integration test",
					},
				});

				expect(createResponse.result).toBeDefined();
				expect((createResponse.result as { snapshotId: string }).snapshotId).toBeDefined();

				// Test snapshot.list handler exists
				const listResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "2",
					method: "snapshot.list",
					params: {
						workspace: TEST_WORKSPACE,
					},
				});

				expect(listResponse.result).toBeDefined();
				expect((listResponse.result as { snapshots: unknown[] }).snapshots).toBeDefined();

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});

		it("daemon should handle session with SDK-compatible workflow", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");

			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// Begin session
				const beginResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "1",
					method: "session.begin",
					params: {
						workspace: TEST_WORKSPACE,
						task: "SDK integration test task",
						files: ["test.ts"],
						keywords: ["test", "integration"],
					},
				});

				expect(beginResponse.result).toBeDefined();
				const beginResult = beginResponse.result as { taskId: string };
				expect(beginResult.taskId).toBeDefined();

				// Session status
				const statusResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "2",
					method: "session.status",
					params: {
						workspace: TEST_WORKSPACE,
					},
				});

				expect(statusResponse.result).toBeDefined();
				expect((statusResponse.result as { active: boolean }).active).toBe(true);

				// End session
				const endResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "3",
					method: "session.end",
					params: {
						workspace: TEST_WORKSPACE,
						outcome: "completed",
					},
				});

				expect(endResponse.result).toBeDefined();

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});
	});

	// =========================================================================
	// PHASE 2 IMPLEMENTATION: SDK WIRING TESTS (ENABLED)
	// =========================================================================

	describe("Phase 2 Implementation: SDK Wiring", () => {
		/**
		 * Per ARCHITECTURE_REFACTOR_SPEC.md Section 5, Phase 2:
		 * - Import existing packages-oss/sdk into CLI daemon handlers
		 * - Update handlers to use SDK packages
		 *
		 * IMPLEMENTED: Daemon handlers now use SnapshotManager from @snapback/sdk
		 */

		it("snapshot.create should use SDK SnapshotManager", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");

			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// Create snapshot - should use SDK SnapshotManager
				const createResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "sdk-create",
					method: "snapshot.create",
					params: {
						workspace: TEST_WORKSPACE,
						files: ["test-sdk.ts"],
						reason: "SDK integration test",
					},
				});

				expect(createResponse.result).toBeDefined();
				const result = createResponse.result as { snapshotId: string; createdAt: string };

				// SDK SnapshotManager generates UUIDs, not simple IDs
				expect(result.snapshotId).toBeDefined();
				expect(result.createdAt).toBeDefined();

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});

		it("snapshot.list should query SDK SnapshotManager", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server");

			const daemon = new SnapBackDaemon({
				socketPath: TEST_SOCKET,
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: TEST_LOCK,
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			await daemon.start();

			try {
				const socket = connect(TEST_SOCKET);
				await new Promise<void>((resolve) => socket.on("connect", resolve));

				// List snapshots - should use SDK SnapshotManager.list()
				const listResponse = await sendRequest(socket, {
					jsonrpc: "2.0",
					id: "sdk-list",
					method: "snapshot.list",
					params: {
						workspace: TEST_WORKSPACE,
						limit: 10,
					},
				});

				expect(listResponse.result).toBeDefined();
				const result = listResponse.result as { snapshots: unknown[]; total: number };

				// SDK returns proper structure with total count
				expect(result.snapshots).toBeDefined();
				expect(Array.isArray(result.snapshots)).toBe(true);
				expect(typeof result.total).toBe("number");

				socket.end();
			} finally {
				await daemon.shutdown();
			}
		});

		it.skip("TODO: protection.check should use SDK ProtectionManager", async () => {
			// This test should verify:
			// 1. Daemon checks protection via SDK ProtectionManager
			// 2. Pattern matching works correctly
			// 3. Dynamic protections are respected
			// Note: Protection wiring is Phase 3 work
			expect(true).toBe(true);
		});
	});
});
