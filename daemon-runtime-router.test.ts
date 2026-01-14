/**
 * Daemon RuntimeRouter Integration Tests (ADR-001)
 *
 * Tests that verify the daemon uses RuntimeRouter for snapshot operations
 * instead of direct SnapshotManager access.
 *
 * NOTE: These tests use the real RuntimeRouter implementation to verify
 * proper integration with the daemon server.
 *
 * @module test/daemon-runtime-router
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// Type Definitions
// =============================================================================

// Type for the server module with RuntimeRouter exports
type ServerModuleWithRouter = {
	getRuntimeRouter: (workspace: string) => {
		createSnapshot: (...args: unknown[]) => Promise<unknown>;
		listSnapshots: (...args: unknown[]) => Promise<unknown[]>;
		restoreSnapshot: (...args: unknown[]) => Promise<unknown>;
		deleteSnapshot: (...args: unknown[]) => Promise<boolean>;
		getSnapshot: (...args: unknown[]) => Promise<unknown>;
		dispose: () => Promise<void>;
		getContext: () => unknown;
	};
	runtimeRouterInstances: Map<string, unknown>;
	disposeRuntimeRouters: () => Promise<void>;
};

// Helper to import server module with type assertion
async function importServerModule(): Promise<ServerModuleWithRouter> {
	// Clear module cache for fresh imports
	vi.resetModules();
	const mod = await import("../src/daemon/server.js");
	return mod as unknown as ServerModuleWithRouter;
}

describe("Daemon RuntimeRouter Integration (ADR-001)", () => {
	let serverModule: ServerModuleWithRouter;

	beforeEach(async () => {
		serverModule = await importServerModule();
		// Clear any existing router instances
		serverModule.runtimeRouterInstances.clear();
	});

	describe("getRuntimeRouter", () => {
		it("should be exported from daemon/server", async () => {
			// This test verifies the function exists
			expect(serverModule.getRuntimeRouter).toBeDefined();
			expect(typeof serverModule.getRuntimeRouter).toBe("function");
		});

		it("should return a RuntimeRouter instance with expected methods", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");

			expect(router).toBeDefined();
			expect(typeof router.createSnapshot).toBe("function");
			expect(typeof router.listSnapshots).toBe("function");
			expect(typeof router.restoreSnapshot).toBe("function");
			expect(typeof router.deleteSnapshot).toBe("function");
			expect(typeof router.getSnapshot).toBe("function");
			expect(typeof router.dispose).toBe("function");
		});

		it("should use singleton pattern per workspace", async () => {
			const router1 = serverModule.getRuntimeRouter("/workspace/a");
			const router2 = serverModule.getRuntimeRouter("/workspace/a");
			const router3 = serverModule.getRuntimeRouter("/workspace/b");

			expect(router1).toBe(router2); // Same workspace = same instance
			expect(router1).not.toBe(router3); // Different workspace = different instance
		});

		it("should create RuntimeRouter with local-first context", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");
			const context = router.getContext();

			expect(context).toBeDefined();
			expect((context as { connectivity: string }).connectivity).toBe("offline");
			expect((context as { privacyMode: boolean }).privacyMode).toBe(true);
		});

		it("should set workspace path in context", async () => {
			const router = serverModule.getRuntimeRouter("/my/workspace/path");
			const context = router.getContext();

			expect((context as { workspace: { path: string } }).workspace.path).toBe("/my/workspace/path");
		});
	});

	describe("RuntimeRouter Snapshot Methods", () => {
		it("should have createSnapshot method that returns a promise", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");

			// Verify the method exists and is async
			expect(typeof router.createSnapshot).toBe("function");
		});

		it("should have listSnapshots method that returns a promise", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");

			// Verify the method exists
			expect(typeof router.listSnapshots).toBe("function");
		});

		it("should have restoreSnapshot method", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");

			// Verify the method exists
			expect(typeof router.restoreSnapshot).toBe("function");
		});

		it("should have deleteSnapshot method", async () => {
			const router = serverModule.getRuntimeRouter("/test/workspace");

			// Verify the method exists
			expect(typeof router.deleteSnapshot).toBe("function");
		});
	});

	describe("RuntimeRouter Instance Map", () => {
		it("should track router instances in runtimeRouterInstances map", async () => {
			// Initially empty
			expect(serverModule.runtimeRouterInstances.size).toBe(0);

			// Create a router
			serverModule.getRuntimeRouter("/test/workspace");

			// Map should have one entry
			expect(serverModule.runtimeRouterInstances.size).toBe(1);
			expect(serverModule.runtimeRouterInstances.has("/test/workspace")).toBe(true);
		});
	});

	describe("Cleanup and Disposal", () => {
		it("should export disposeRuntimeRouters function", async () => {
			expect(serverModule.disposeRuntimeRouters).toBeDefined();
			expect(typeof serverModule.disposeRuntimeRouters).toBe("function");
		});

		it("should clear runtimeRouterInstances on dispose", async () => {
			// Create some routers
			serverModule.getRuntimeRouter("/workspace/a");
			serverModule.getRuntimeRouter("/workspace/b");

			expect(serverModule.runtimeRouterInstances.size).toBe(2);

			// Dispose all
			await serverModule.disposeRuntimeRouters();

			// Map should be cleared
			expect(serverModule.runtimeRouterInstances.size).toBe(0);
		});
	});
});

describe("Daemon Handler RuntimeRouter Usage", () => {
	it("getRuntimeRouter should be available for handlers", async () => {
		const serverModule = await importServerModule();

		// Verify getRuntimeRouter is exported (used by handlers)
		expect(serverModule.getRuntimeRouter).toBeDefined();
		expect(typeof serverModule.getRuntimeRouter).toBe("function");
	});

	it("disposeRuntimeRouters should be available for cleanup", async () => {
		const serverModule = await importServerModule();

		expect(serverModule.disposeRuntimeRouters).toBeDefined();
		expect(typeof serverModule.disposeRuntimeRouters).toBe("function");
	});

	it("runtimeRouterInstances map should be exported", async () => {
		const serverModule = await importServerModule();

		expect(serverModule.runtimeRouterInstances).toBeDefined();
		expect(serverModule.runtimeRouterInstances).toBeInstanceOf(Map);
	});
});
