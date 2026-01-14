/**
 * Watcher Service Tests
 *
 * Tests for the file watching and behavioral learning service.
 * Following 4-path coverage: happy, sad, edge, error.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendSnapbackJsonl, createSnapbackDirectory, writeSnapbackJson } from "../../src/services/snapback-dir";
import {
	analyzeBehavioralSignals,
	createWatcher,
	getBehavioralSignals,
	SnapbackWatcher,
} from "../../src/services/watcher";

// =============================================================================
// TEST SETUP
// =============================================================================

describe("Watcher Service", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create temp directory for each test
		testDir = join(tmpdir(), `snapback-watcher-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
		await mkdir(testDir, { recursive: true });
		await createSnapbackDirectory(testDir);
		// Initialize with config.json (required for isSnapbackInitialized)
		await writeSnapbackJson(
			"config.json",
			{ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
			testDir,
		);
	});

	afterEach(async () => {
		// Clean up temp directory
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// =========================================================================
	// createWatcher - Factory Function
	// =========================================================================

	describe("createWatcher", () => {
		it("should create a SnapbackWatcher instance", () => {
			// Happy path: factory creates watcher
			const watcher = createWatcher({ workspaceRoot: testDir });

			expect(watcher).toBeInstanceOf(SnapbackWatcher);
			expect(watcher.isRunning()).toBe(false);
		});

		it("should accept custom configuration", () => {
			// Happy path: custom config
			const watcher = createWatcher({
				workspaceRoot: testDir,
				debounceMs: 200,
				depth: 5,
				verbose: true,
			});

			expect(watcher).toBeInstanceOf(SnapbackWatcher);
		});
	});

	// =========================================================================
	// SnapbackWatcher - Start/Stop
	// =========================================================================

	describe("SnapbackWatcher.start", () => {
		it("should start watching and emit ready event", async () => {
			// Happy path: watcher starts
			const watcher = createWatcher({ workspaceRoot: testDir });
			const readyPromise = new Promise<void>((resolve) => {
				watcher.on("ready", () => resolve());
			});

			await watcher.start();
			await readyPromise;

			expect(watcher.isRunning()).toBe(true);

			await watcher.stop();
		});

		it("should throw if already started", async () => {
			// Error path: double start
			const watcher = createWatcher({ workspaceRoot: testDir });

			await watcher.start();

			await expect(watcher.start()).rejects.toThrow("Watcher already started");

			await watcher.stop();
		});

		it("should throw if snapback not initialized", async () => {
			// Sad path: not initialized
			const uninitDir = join(tmpdir(), `uninitialized-${Date.now()}`);
			await mkdir(uninitDir, { recursive: true });

			const watcher = createWatcher({ workspaceRoot: uninitDir });

			await expect(watcher.start()).rejects.toThrow("SnapBack not initialized");

			await rm(uninitDir, { recursive: true, force: true });
		});
	});

	describe("SnapbackWatcher.stop", () => {
		it("should stop watching and clean up", async () => {
			// Happy path: watcher stops
			const watcher = createWatcher({ workspaceRoot: testDir });

			await watcher.start();
			expect(watcher.isRunning()).toBe(true);

			await watcher.stop();
			expect(watcher.isRunning()).toBe(false);
		});

		it("should be safe to call stop when not running", async () => {
			// Edge path: stop without start
			const watcher = createWatcher({ workspaceRoot: testDir });

			await expect(watcher.stop()).resolves.not.toThrow();
		});
	});

	// =========================================================================
	// SnapbackWatcher - Stats
	// =========================================================================

	describe("SnapbackWatcher.getStats", () => {
		it("should return initial stats before start", () => {
			// Happy path: stats available
			const watcher = createWatcher({ workspaceRoot: testDir });
			const stats = watcher.getStats();

			expect(stats).toHaveProperty("startedAt");
			expect(stats.filesWatched).toBe(0);
			expect(stats.signalsRecorded).toBe(0);
			expect(stats.patternsDetected).toBe(0);
			expect(stats.lastActivityAt).toBeNull();
		});

		it("should track files watched after start", async () => {
			// Happy path: files counted
			const watcher = createWatcher({ workspaceRoot: testDir });

			// Create some files
			await writeFile(join(testDir, "test.ts"), "const x = 1;");
			await writeFile(join(testDir, "config.json"), "{}");

			await watcher.start();

			// Give chokidar time to scan
			await new Promise((resolve) => setTimeout(resolve, 300));

			const stats = watcher.getStats();
			expect(stats.filesWatched).toBeGreaterThan(0);

			await watcher.stop();
		});
	});

	// =========================================================================
	// getBehavioralSignals - Reading Signals
	// =========================================================================

	describe("getBehavioralSignals", () => {
		it("should return empty array when no signals", async () => {
			// Sad path: no signals
			const signals = await getBehavioralSignals(testDir);
			expect(signals).toEqual([]);
		});

		it("should return recorded signals", async () => {
			// Happy path: signals exist
			const signal = {
				type: "file_change" as const,
				path: "src/index.ts",
				timestamp: new Date().toISOString(),
			};

			await appendSnapbackJsonl("learnings/behavioral-signals.jsonl", signal, testDir);

			const signals = await getBehavioralSignals(testDir);

			expect(signals).toHaveLength(1);
			expect(signals[0]).toMatchObject({
				type: "file_change",
				path: "src/index.ts",
			});
		});
	});

	// =========================================================================
	// analyzeBehavioralSignals - Pattern Detection
	// =========================================================================

	describe("analyzeBehavioralSignals", () => {
		it("should return empty array when no signals", async () => {
			// Sad path: no signals
			const learnings = await analyzeBehavioralSignals(testDir);
			expect(learnings).toEqual([]);
		});

		it("should return empty when signals below threshold", async () => {
			// Edge path: not enough signals
			for (let i = 0; i < 5; i++) {
				await appendSnapbackJsonl(
					"learnings/behavioral-signals.jsonl",
					{
						type: "file_change",
						path: "src/index.ts",
						timestamp: new Date().toISOString(),
					},
					testDir,
				);
			}

			const learnings = await analyzeBehavioralSignals(testDir);
			expect(learnings).toEqual([]);
		});

		it("should detect frequently changed files at 10+ changes", async () => {
			// Happy path: pattern detected
			for (let i = 0; i < 12; i++) {
				await appendSnapbackJsonl(
					"learnings/behavioral-signals.jsonl",
					{
						type: "file_change",
						path: "src/config.ts",
						timestamp: new Date().toISOString(),
					},
					testDir,
				);
			}

			const learnings = await analyzeBehavioralSignals(testDir);

			expect(learnings).toHaveLength(1);
			expect(learnings[0].type).toBe("pattern");
			expect(learnings[0].trigger).toContain("config.ts");
			expect(learnings[0].action).toContain("12x");
		});

		it("should detect multiple frequently changed files", async () => {
			// Happy path: multiple patterns
			const files = ["src/auth.ts", "src/db.ts"];

			for (const file of files) {
				for (let i = 0; i < 10; i++) {
					await appendSnapbackJsonl(
						"learnings/behavioral-signals.jsonl",
						{
							type: "file_change",
							path: file,
							timestamp: new Date().toISOString(),
						},
						testDir,
					);
				}
			}

			const learnings = await analyzeBehavioralSignals(testDir);

			expect(learnings).toHaveLength(2);
		});
	});

	// =========================================================================
	// Event Emission Tests
	// =========================================================================

	describe("Event Emission", () => {
		it("should emit change events for file modifications", async () => {
			// Happy path: change event
			const watcher = createWatcher({ workspaceRoot: testDir });
			const events: string[] = [];

			watcher.on("change", (path) => events.push(path));

			await watcher.start();

			// Create and modify a file
			const testFile = join(testDir, "test-change.ts");
			await writeFile(testFile, "const x = 1;");

			// Wait for initial write to settle
			await new Promise((resolve) => setTimeout(resolve, 400));

			// Now modify the file
			await writeFile(testFile, "const x = 2;");

			// Wait for events
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Check that some change event was emitted
			expect(events.length).toBeGreaterThan(0);

			await watcher.stop();
		});

		it("should emit add events for new files", async () => {
			// Happy path: add event
			const watcher = createWatcher({ workspaceRoot: testDir });
			const events: string[] = [];

			watcher.on("add", (path) => events.push(path));

			await watcher.start();

			// Wait for ready state
			await new Promise((resolve) => setTimeout(resolve, 400));

			// Create a new file
			const newFile = join(testDir, "new-file.ts");
			await writeFile(newFile, "export const y = 2;");

			// Wait for events
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Check that some add event was emitted
			expect(events.length).toBeGreaterThan(0);

			await watcher.stop();
		});
	});
});
