/**
 * FileWatcherService Tests
 *
 * Comprehensive tests for the daemon file watcher service.
 * Based on vitest best practices and chokidar mocking patterns.
 *
 * @see https://vitest.dev/guide/mocking
 * @see https://github.com/paulmillr/chokidar
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock chokidar before importing the module
const mockWatcher = {
	on: vi.fn().mockReturnThis(),
	close: vi.fn().mockResolvedValue(undefined),
	add: vi.fn(),
	unwatch: vi.fn(),
	getWatched: vi.fn().mockReturnValue({}),
};

vi.mock("chokidar", () => ({
	watch: vi.fn(() => mockWatcher),
}));

import { watch } from "chokidar";
import {
	disposeFileWatcherService,
	type FileChangeEvent,
	FileWatcherService,
	getFileWatcherService,
	type WatcherConfig,
} from "../../src/daemon/file-watcher";

describe("daemon/file-watcher", () => {
	let service: FileWatcherService;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock watcher's on method to track handlers
		mockWatcher.on = vi.fn().mockReturnThis();
		mockWatcher.close = vi.fn().mockResolvedValue(undefined);
		service = new FileWatcherService();
	});

	afterEach(async () => {
		await service.closeAll();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// SINGLETON TESTS
	// =========================================================================

	describe("singleton pattern", () => {
		it("should export getFileWatcherService function", () => {
			expect(getFileWatcherService).toBeDefined();
			expect(typeof getFileWatcherService).toBe("function");
		});

		it("should return same instance on multiple calls", () => {
			const instance1 = getFileWatcherService();
			const instance2 = getFileWatcherService();
			expect(instance1).toBe(instance2);
		});

		it("should export disposeFileWatcherService function", () => {
			expect(disposeFileWatcherService).toBeDefined();
			expect(typeof disposeFileWatcherService).toBe("function");
		});

		it("should dispose and create new instance after dispose", async () => {
			const instance1 = getFileWatcherService();
			await disposeFileWatcherService();
			const instance2 = getFileWatcherService();
			expect(instance1).not.toBe(instance2);
		});
	});

	// =========================================================================
	// SUBSCRIPTION TESTS
	// =========================================================================

	describe("subscribe()", () => {
		it("should create new watcher for workspace", async () => {
			const result = await service.subscribe("/workspace/test", "subscriber-1");

			expect(result.subscribed).toBe(true);
			expect(result.patterns).toContain("**/*.ts");
			expect(watch).toHaveBeenCalledWith(
				expect.arrayContaining(["**/*.ts", "**/*.tsx", "**/*.js"]),
				expect.objectContaining({
					cwd: "/workspace/test",
					persistent: true,
					ignoreInitial: true,
				}),
			);
		});

		it("should add subscriber to existing watcher", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");
			const result = await service.subscribe("/workspace/test", "subscriber-2");

			expect(result.subscribed).toBe(true);
			// watch should only be called once for the same workspace
			expect(watch).toHaveBeenCalledTimes(1);
		});

		it("should use custom patterns when provided", async () => {
			const config: WatcherConfig = {
				patterns: ["**/*.py", "**/*.rb"],
			};

			const result = await service.subscribe("/workspace/python", "subscriber-1", config);

			expect(result.patterns).toEqual(["**/*.py", "**/*.rb"]);
		});

		it("should merge custom ignored patterns with defaults", async () => {
			const config: WatcherConfig = {
				ignored: ["**/vendor/**"],
			};

			await service.subscribe("/workspace/test", "subscriber-1", config);

			expect(watch).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					ignored: expect.arrayContaining(["**/node_modules/**", "**/.git/**", "**/vendor/**"]),
				}),
			);
		});

		it("should register event handlers on watcher", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");

			expect(mockWatcher.on).toHaveBeenCalledWith("add", expect.any(Function));
			expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function));
			expect(mockWatcher.on).toHaveBeenCalledWith("unlink", expect.any(Function));
			expect(mockWatcher.on).toHaveBeenCalledWith("error", expect.any(Function));
		});
	});

	// =========================================================================
	// UNSUBSCRIPTION TESTS
	// =========================================================================

	describe("unsubscribe()", () => {
		it("should remove subscriber from watcher", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");
			await service.subscribe("/workspace/test", "subscriber-2");

			const result = await service.unsubscribe("/workspace/test", "subscriber-1");

			expect(result.unsubscribed).toBe(true);
			expect(service.getSubscribers("/workspace/test")).toEqual(["subscriber-2"]);
		});

		it("should close watcher when no subscribers remain", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");
			await service.unsubscribe("/workspace/test", "subscriber-1");

			expect(mockWatcher.close).toHaveBeenCalled();
			expect(service.isWatching("/workspace/test")).toBe(false);
		});

		it("should return false for non-existent workspace", async () => {
			const result = await service.unsubscribe("/workspace/nonexistent", "subscriber-1");

			expect(result.unsubscribed).toBe(false);
		});

		it("should keep watcher open when other subscribers exist", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");
			await service.subscribe("/workspace/test", "subscriber-2");
			await service.unsubscribe("/workspace/test", "subscriber-1");

			expect(mockWatcher.close).not.toHaveBeenCalled();
			expect(service.isWatching("/workspace/test")).toBe(true);
		});
	});

	// =========================================================================
	// SUBSCRIBER MANAGEMENT TESTS
	// =========================================================================

	describe("getSubscribers()", () => {
		it("should return empty array for unwatched workspace", () => {
			const subscribers = service.getSubscribers("/workspace/unknown");
			expect(subscribers).toEqual([]);
		});

		it("should return all subscribers for workspace", async () => {
			await service.subscribe("/workspace/test", "sub-1");
			await service.subscribe("/workspace/test", "sub-2");
			await service.subscribe("/workspace/test", "sub-3");

			const subscribers = service.getSubscribers("/workspace/test");
			expect(subscribers).toHaveLength(3);
			expect(subscribers).toContain("sub-1");
			expect(subscribers).toContain("sub-2");
			expect(subscribers).toContain("sub-3");
		});
	});

	describe("isWatching()", () => {
		it("should return false for unwatched workspace", () => {
			expect(service.isWatching("/workspace/unknown")).toBe(false);
		});

		it("should return true for watched workspace", async () => {
			await service.subscribe("/workspace/test", "subscriber-1");
			expect(service.isWatching("/workspace/test")).toBe(true);
		});
	});

	// =========================================================================
	// CLOSE ALL TESTS
	// =========================================================================

	describe("closeAll()", () => {
		it("should close all watchers in parallel", async () => {
			// Create multiple watchers
			await service.subscribe("/workspace/one", "sub-1");

			// Reset to track new calls
			mockWatcher.close.mockClear();
			mockWatcher.on.mockClear();

			await service.subscribe("/workspace/two", "sub-2");
			await service.subscribe("/workspace/three", "sub-3");

			// closeAll should close remaining watchers
			await service.closeAll();

			// All watchers should be closed
			expect(service.isWatching("/workspace/one")).toBe(false);
			expect(service.isWatching("/workspace/two")).toBe(false);
			expect(service.isWatching("/workspace/three")).toBe(false);
		});

		it("should clear all debounce timers", async () => {
			vi.useFakeTimers();

			await service.subscribe("/workspace/test", "subscriber-1");

			// Trigger a file event that sets up debounce timer
			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			if (changeHandler) {
				changeHandler("test.ts");
			}

			// Close all should clear the pending timer
			await service.closeAll();

			// Advance time - if timer wasn't cleared, it would fire
			vi.advanceTimersByTime(200);

			vi.useRealTimers();
		});
	});

	// =========================================================================
	// RISK ASSESSMENT TESTS
	// =========================================================================

	describe("risk assessment", () => {
		it("should detect high-risk auth files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			// Get the change handler
			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			// Trigger change on auth file
			changeHandler("src/auth/login.ts");
			vi.advanceTimersByTime(150);

			expect(events).toHaveLength(1);
			expect(events[0].riskLevel).toBe("high");
			expect(events[0].riskReason).toContain("auth");

			vi.useRealTimers();
		});

		it("should detect high-risk security files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("lib/security/validator.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("high");
			expect(events[0].riskReason).toContain("security");

			vi.useRealTimers();
		});

		it("should detect high-risk payment files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("services/payment/stripe.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("high");
			expect(events[0].riskReason).toContain("payment");

			vi.useRealTimers();
		});

		it("should detect high-risk .env files by extension", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler(".env.local");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("high");

			vi.useRealTimers();
		});

		it("should detect high-risk config files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("config.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("high");
			expect(events[0].riskReason).toContain("config");

			vi.useRealTimers();
		});

		it("should detect medium-risk middleware files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/middleware/cors.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("medium");
			expect(events[0].riskReason).toContain("middleware");

			vi.useRealTimers();
		});

		it("should detect medium-risk API files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/api/users.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("medium");
			expect(events[0].riskReason).toContain("api");

			vi.useRealTimers();
		});

		it("should classify regular files as low-risk", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/components/Button.tsx");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("low");
			expect(events[0].riskReason).toBeUndefined();

			vi.useRealTimers();
		});

		it("should detect high-risk .pem files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("certs/server.pem");
			vi.advanceTimersByTime(150);

			expect(events[0].riskLevel).toBe("high");
			expect(events[0].riskReason).toContain(".pem");

			vi.useRealTimers();
		});
	});

	// =========================================================================
	// DEBOUNCING TESTS
	// =========================================================================

	describe("debouncing", () => {
		it("should debounce rapid file changes", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			// Simulate rapid changes to the same file
			changeHandler("src/app.ts");
			vi.advanceTimersByTime(50);
			changeHandler("src/app.ts");
			vi.advanceTimersByTime(50);
			changeHandler("src/app.ts");
			vi.advanceTimersByTime(150);

			// Should only emit once after debounce period
			expect(events).toHaveLength(1);

			vi.useRealTimers();
		});

		it("should emit separate events for different files", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/file1.ts");
			changeHandler("src/file2.ts");
			vi.advanceTimersByTime(150);

			expect(events).toHaveLength(2);
			expect(events.map((e) => e.file)).toContain("src/file1.ts");
			expect(events.map((e) => e.file)).toContain("src/file2.ts");

			vi.useRealTimers();
		});

		it("should reset debounce timer on new change", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/app.ts");
			vi.advanceTimersByTime(80); // 80ms elapsed
			changeHandler("src/app.ts"); // Reset timer
			vi.advanceTimersByTime(80); // 80ms more

			// Total 160ms, but timer was reset, so still waiting
			expect(events).toHaveLength(0);

			vi.advanceTimersByTime(50); // 130ms after reset, should fire at 100ms
			expect(events).toHaveLength(1);

			vi.useRealTimers();
		});
	});

	// =========================================================================
	// FILE EVENT TYPES TESTS
	// =========================================================================

	describe("file event types", () => {
		it("should emit add events", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const addHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "add")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			addHandler("src/newFile.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].type).toBe("add");

			vi.useRealTimers();
		});

		it("should emit change events", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			changeHandler("src/existing.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].type).toBe("change");

			vi.useRealTimers();
		});

		it("should emit unlink events", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const unlinkHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "unlink")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();

			unlinkHandler("src/deleted.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].type).toBe("unlink");

			vi.useRealTimers();
		});

		it("should include workspace and timestamp in events", async () => {
			const events: FileChangeEvent[] = [];
			service.on("file_changed", (event: FileChangeEvent) => events.push(event));

			await service.subscribe("/workspace/test", "subscriber-1");

			const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "change")?.[1] as (
				path: string,
			) => void;

			vi.useFakeTimers();
			const beforeTime = Date.now();

			changeHandler("src/file.ts");
			vi.advanceTimersByTime(150);

			expect(events[0].workspace).toBe("/workspace/test");
			expect(events[0].timestamp).toBeGreaterThanOrEqual(beforeTime);

			vi.useRealTimers();
		});
	});

	// =========================================================================
	// ERROR HANDLING TESTS
	// =========================================================================

	describe("error handling", () => {
		it("should emit error events from watcher", async () => {
			const errors: Array<{ workspace: string; error: string }> = [];
			service.on("error", (err) => errors.push(err));

			await service.subscribe("/workspace/test", "subscriber-1");

			const errorHandler = mockWatcher.on.mock.calls.find((call) => call[0] === "error")?.[1] as (
				error: Error,
			) => void;

			errorHandler(new Error("Watch error"));

			expect(errors).toHaveLength(1);
			expect(errors[0].workspace).toBe("/workspace/test");
			expect(errors[0].error).toContain("Watch error");
		});
	});

	// =========================================================================
	// CONCURRENT OPERATIONS TESTS
	// =========================================================================

	describe("concurrent operations", () => {
		it("should handle concurrent subscriptions to different workspaces", async () => {
			const results = await Promise.all([
				service.subscribe("/workspace/one", "sub-1"),
				service.subscribe("/workspace/two", "sub-2"),
				service.subscribe("/workspace/three", "sub-3"),
			]);

			expect(results.every((r) => r.subscribed)).toBe(true);
			expect(service.isWatching("/workspace/one")).toBe(true);
			expect(service.isWatching("/workspace/two")).toBe(true);
			expect(service.isWatching("/workspace/three")).toBe(true);
		});

		it("should handle concurrent subscriptions to same workspace", async () => {
			const results = await Promise.all([
				service.subscribe("/workspace/test", "sub-1"),
				service.subscribe("/workspace/test", "sub-2"),
				service.subscribe("/workspace/test", "sub-3"),
			]);

			expect(results.every((r) => r.subscribed)).toBe(true);
			expect(service.getSubscribers("/workspace/test")).toHaveLength(3);
		});
	});
});
