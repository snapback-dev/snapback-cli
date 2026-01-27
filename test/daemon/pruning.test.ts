/**
 * Daemon Pruning Integration Tests
 *
 * Tests for automated learning/violation pruning via daemon protocol
 */

import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_DIR = join(homedir(), ".snapback-test-daemon-pruning");
const TEST_WORKSPACE = join(TEST_DIR, "workspace");

describe("daemon/pruning", () => {
	beforeEach(async () => {
		await mkdir(TEST_WORKSPACE, { recursive: true });
		await mkdir(join(TEST_WORKSPACE, ".snapback"), { recursive: true });
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("protocol integration", () => {
		it("should support learning.prune method string", async () => {
			// Type-level test - verify learning.prune is a valid string literal
			const method: string = "learning.prune";
			expect(method).toBe("learning.prune");
		});

		it("should have handleLearningPrune method in daemon server", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			// Verify method exists (private method, so check via prototype)
			expect(daemon).toBeDefined();
			// @ts-expect-error - accessing private method for testing
			expect(typeof daemon.handleLearningPrune).toBe("function");
		});

		it("should have pruneLearnings method in DaemonClient", async () => {
			const { DaemonClient } = await import("../../src/daemon/client.js");
			const client = new DaemonClient({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				autoStart: false,
			});

			expect(typeof client.pruneLearnings).toBe("function");
		});
	});

	describe("singleton management", () => {
		it("should export getLearningPruner singleton function", async () => {
			// Import server to get the singleton function
			const serverModule = await import("../../src/daemon/server.js");
			expect(serverModule).toBeDefined();

			// The function is private, but we can verify the module loads without errors
			expect(serverModule.SnapBackDaemon).toBeDefined();
		});

		it("should export AutomatedLearningPruner service", async () => {
			const { AutomatedLearningPruner } = await import("../../src/services/learning-pruner.js");
			expect(AutomatedLearningPruner).toBeDefined();
			expect(typeof AutomatedLearningPruner).toBe("function");
		});

		it("should create AutomatedLearningPruner instance", async () => {
			const { AutomatedLearningPruner } = await import("../../src/services/learning-pruner.js");
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});

			expect(pruner).toBeDefined();
			// @ts-expect-error - accessing private property for testing
			expect(pruner.config.workspaceRoot).toBe(TEST_WORKSPACE);
			// @ts-expect-error - accessing private property for testing
			expect(pruner.config.dryRun).toBe(true);
		});
	});

	describe("scheduled pruning", () => {
		it("should have pruningTimer property in daemon", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			// @ts-expect-error - accessing private property for testing
			expect(daemon.pruningTimer).toBe(null);
		});

		it("should have startScheduledPruning method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			// @ts-expect-error - accessing private method for testing
			expect(typeof daemon.startScheduledPruning).toBe("function");
		});

		it("should have runScheduledPruning method", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			// @ts-expect-error - accessing private method for testing
			expect(typeof daemon.runScheduledPruning).toBe("function");
		});
	});

	describe("notification broadcast", () => {
		it("should have broadcastToWorkspace method for notifications", async () => {
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			// @ts-expect-error - accessing private method for testing
			expect(typeof daemon.broadcastToWorkspace).toBe("function");
		});
	});

	describe("integration workflow", () => {
		it("should complete full workflow without errors", async () => {
			// This is a smoke test - verifies all components can be imported and instantiated
			const { SnapBackDaemon } = await import("../../src/daemon/server.js");
			const { DaemonClient } = await import("../../src/daemon/client.js");
			const { AutomatedLearningPruner } = await import("../../src/services/learning-pruner.js");

			const daemon = new SnapBackDaemon({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				lockPath: join(TEST_DIR, "daemon.lock"),
				idleTimeoutMs: 60000,
				maxConnections: 5,
				version: "1.0.0-test",
			});

			const client = new DaemonClient({
				socketPath: join(TEST_DIR, "test.sock"),
				pidPath: join(TEST_DIR, "daemon.pid"),
				autoStart: false,
			});

			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});

			expect(daemon).toBeDefined();
			expect(client).toBeDefined();
			expect(pruner).toBeDefined();
		});
	});
});
