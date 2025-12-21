/**
 * Tests for snapback-dir.ts service
 *
 * Tests the .snapback/ directory management functionality.
 */

import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	appendSnapbackJsonl,
	createSnapbackDirectory,
	generateId,
	getProtectedFiles,
	getWorkspaceConfig,
	getWorkspaceDir,
	getWorkspaceVitals,
	isSnapbackInitialized,
	type LearningEntry,
	loadSnapbackJsonl,
	type ProtectedFile,
	readSnapbackJson,
	recordLearning,
	recordViolation,
	saveProtectedFiles,
	saveWorkspaceConfig,
	saveWorkspaceVitals,
	type ViolationEntry,
	type WorkspaceConfig,
	type WorkspaceVitals,
	writeSnapbackJson,
} from "../../src/services/snapback-dir";

describe("snapback-dir service", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create a temporary test directory
		testDir = join(tmpdir(), `snapback-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("createSnapbackDirectory", () => {
		it("should create .snapback directory structure", async () => {
			await createSnapbackDirectory(testDir);

			// Verify directories exist
			const snapbackDir = join(testDir, ".snapback");
			const patternsDir = join(snapbackDir, "patterns");
			const learningsDir = join(snapbackDir, "learnings");
			const sessionDir = join(snapbackDir, "session");
			const snapshotsDir = join(snapbackDir, "snapshots");

			const { stat } = await import("node:fs/promises");

			expect((await stat(snapbackDir)).isDirectory()).toBe(true);
			expect((await stat(patternsDir)).isDirectory()).toBe(true);
			expect((await stat(learningsDir)).isDirectory()).toBe(true);
			expect((await stat(sessionDir)).isDirectory()).toBe(true);
			expect((await stat(snapshotsDir)).isDirectory()).toBe(true);
		});

		it("should create .gitignore file", async () => {
			await createSnapbackDirectory(testDir);

			const gitignorePath = join(testDir, ".snapback", ".gitignore");
			const content = await readFile(gitignorePath, "utf-8");

			expect(content).toContain("snapshots/");
			expect(content).toContain("embeddings.db");
		});

		it("should be idempotent (safe to call multiple times)", async () => {
			await createSnapbackDirectory(testDir);
			await createSnapbackDirectory(testDir);

			const snapbackDir = join(testDir, ".snapback");
			const { stat } = await import("node:fs/promises");
			expect((await stat(snapbackDir)).isDirectory()).toBe(true);
		});
	});

	describe("isSnapbackInitialized", () => {
		it("should return false for non-initialized workspace", async () => {
			const result = await isSnapbackInitialized(testDir);
			expect(result).toBe(false);
		});

		it("should return true after initialization with config", async () => {
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);

			const result = await isSnapbackInitialized(testDir);
			expect(result).toBe(true);
		});
	});

	describe("JSON operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should write and read JSON files", async () => {
			const testData = { foo: "bar", count: 42 };

			await writeSnapbackJson("test.json", testData, testDir);
			const result = await readSnapbackJson<typeof testData>("test.json", testDir);

			expect(result).toEqual(testData);
		});

		it("should return null for non-existent files", async () => {
			const result = await readSnapbackJson("non-existent.json", testDir);
			expect(result).toBeNull();
		});

		it("should append to JSONL files", async () => {
			await appendSnapbackJsonl("test.jsonl", { id: 1, name: "first" }, testDir);
			await appendSnapbackJsonl("test.jsonl", { id: 2, name: "second" }, testDir);

			const result = await loadSnapbackJsonl<{ id: number; name: string }>("test.jsonl", testDir);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ id: 1, name: "first" });
			expect(result[1]).toEqual({ id: 2, name: "second" });
		});

		it("should return empty array for non-existent JSONL files", async () => {
			const result = await loadSnapbackJsonl("non-existent.jsonl", testDir);
			expect(result).toEqual([]);
		});
	});

	describe("WorkspaceConfig operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should save and retrieve workspace config", async () => {
			const config: WorkspaceConfig = {
				workspaceId: "ws_123",
				tier: "pro",
				syncEnabled: true,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			await saveWorkspaceConfig(config, testDir);
			const result = await getWorkspaceConfig(testDir);

			expect(result).toEqual(config);
		});

		it("should return null for missing config", async () => {
			const result = await getWorkspaceConfig(testDir);
			expect(result).toBeNull();
		});
	});

	describe("WorkspaceVitals operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should save and retrieve workspace vitals", async () => {
			const vitals: WorkspaceVitals = {
				framework: "Next.js",
				packageManager: "pnpm",
				typescript: { enabled: true, strict: true },
				detectedAt: "2024-01-01T00:00:00Z",
			};

			await saveWorkspaceVitals(vitals, testDir);
			const result = await getWorkspaceVitals(testDir);

			expect(result).toEqual(vitals);
		});
	});

	describe("ProtectedFiles operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should save and retrieve protected files", async () => {
			const files: ProtectedFile[] = [
				{ pattern: ".env", addedAt: "2024-01-01T00:00:00Z" },
				{ pattern: "*.config.ts", addedAt: "2024-01-01T00:00:00Z", reason: "Configuration" },
			];

			await saveProtectedFiles(files, testDir);
			const result = await getProtectedFiles(testDir);

			expect(result).toEqual(files);
		});

		it("should return empty array for missing protected files", async () => {
			const result = await getProtectedFiles(testDir);
			expect(result).toEqual([]);
		});
	});

	describe("Learning operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should record learnings", async () => {
			const learning: LearningEntry = {
				id: "L123",
				type: "pattern",
				trigger: "test pattern",
				action: "do something",
				source: "test",
				createdAt: new Date().toISOString(),
			};

			await recordLearning(learning, testDir);

			const { getLearnings } = await import("../../src/services/snapback-dir");
			const learnings = await getLearnings(testDir);

			expect(learnings).toHaveLength(1);
			expect(learnings[0]).toEqual(learning);
		});
	});

	describe("Violation operations", () => {
		beforeEach(async () => {
			await createSnapbackDirectory(testDir);
		});

		it("should record violations", async () => {
			const violation: ViolationEntry = {
				type: "test-violation",
				file: "test.ts",
				message: "Test violation",
				date: new Date().toISOString(),
			};

			await recordViolation(violation, testDir);

			const { getViolations } = await import("../../src/services/snapback-dir");
			const violations = await getViolations(testDir);

			expect(violations).toHaveLength(1);
			expect(violations[0]).toEqual(violation);
		});
	});

	describe("generateId", () => {
		it("should generate unique IDs", () => {
			const id1 = generateId();
			const id2 = generateId();

			expect(id1).not.toBe(id2);
			expect(id1.length).toBeGreaterThan(8);
		});

		it("should include prefix when provided", () => {
			const id = generateId("sess");

			expect(id).toMatch(/^sess_/);
		});
	});

	describe("getWorkspaceDir", () => {
		it("should return correct path for workspace root", () => {
			const result = getWorkspaceDir("/some/workspace");
			expect(result).toBe("/some/workspace/.snapback");
		});

		it("should use cwd when no root provided", () => {
			const result = getWorkspaceDir();
			expect(result).toContain(".snapback");
		});
	});
});
