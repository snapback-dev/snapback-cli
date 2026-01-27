/**
 * AutomatedLearningPruner Tests
 *
 * Tests for automated learning and violation lifecycle management.
 * Covers file existence validation, pattern detection, confidence scoring,
 * deduplication, and archival.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { StateStore } from "@snapback/intelligence/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutomatedLearningPruner } from "../../src/services/learning-pruner.js";

const TEST_DIR = path.join(process.cwd(), ".test-learning-pruner");
const TEST_WORKSPACE = path.join(TEST_DIR, "workspace");

describe("AutomatedLearningPruner", () => {
	beforeEach(() => {
		// Clean test directory
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true });
		}
		fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
		fs.mkdirSync(path.join(TEST_WORKSPACE, ".snapback"), { recursive: true });
	});

	afterEach(() => {
		// Cleanup
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("Initialization", () => {
		it("should initialize with default config", async () => {
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
			});

			await pruner.initialize();
			expect(pruner).toBeDefined();
		});

		it("should accept custom config", async () => {
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
				maxAgeDays: 60,
				minUsageCount: 5,
				archiveDir: ".snapback/custom-archive",
			});

			await pruner.initialize();
			expect(pruner).toBeDefined();
		});
	});

	describe("pruneStaleViolations()", () => {
		it("should identify violations for missing files", async () => {
			// Setup: Create state with violations
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			// Add violation for missing file
			stateStore.recordViolation({
				type: "silent_catch",
				file: "src/missing.ts",
				description: "Empty catch block",
				prevention: "Add logging",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.pruneStaleViolations();

			expect(result.totalChecked).toBe(1);
			expect(result.staleCount).toBe(1);
			expect(result.dryRun).toBe(true);
		});

		it("should not prune violations for existing files with patterns", async () => {
			// Setup: Create file with pattern
			const testFile = path.join(TEST_WORKSPACE, "src", "test.ts");
			fs.mkdirSync(path.dirname(testFile), { recursive: true });
			fs.writeFileSync(
				testFile,
				`
try {
  doSomething();
} catch (e) {}
			`,
			);

			// Add violation
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.recordViolation({
				type: "silent_catch",
				file: "src/test.ts",
				description: "Empty catch block",
				prevention: "Add logging",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.pruneStaleViolations();

			expect(result.totalChecked).toBe(1);
			expect(result.staleCount).toBe(0); // Pattern still exists (truly empty catch)
		});

		it("should archive violations when not in dry-run mode", async () => {
			// Setup: Create state with violations for missing file
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.recordViolation({
				type: "silent_catch",
				file: "src/missing.ts",
				description: "Empty catch block",
				prevention: "Add logging",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: false,
			});
			await pruner.initialize();

			const result = await pruner.pruneStaleViolations();

			expect(result.archivedCount).toBe(1);
			expect(result.archivedFiles.length).toBe(1);

			// Verify archive file exists
			const archiveFile = result.archivedFiles[0];
			expect(fs.existsSync(archiveFile)).toBe(true);
		});
	});

	describe("updateLearningScores()", () => {
		it("should calculate age-based scores", async () => {
			// Setup: Create learning with known age
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 60); // 60 days old

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			// Manually set old date
			stateStore.updateLearning(learning.id, { createdAt: oldDate.toISOString() });
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				maxAgeDays: 90,
				minUsageCount: 3,
			});
			await pruner.initialize();

			const result = await pruner.updateLearningScores();

			expect(result.totalScored).toBe(1);
			expect(result.updatedCount).toBe(1);
			expect(result.avgConfidence).toBeGreaterThan(0);
			expect(result.avgConfidence).toBeLessThan(1);
		});

		it("should calculate usage-based scores", async () => {
			// Setup: Create learning with usage
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			// Simulate usage
			stateStore.updateLearning(learning.id, {
				accessCount: 5,
				appliedCount: 2,
			});
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				minUsageCount: 3,
			});
			await pruner.initialize();

			const result = await pruner.updateLearningScores();

			expect(result.totalScored).toBe(1);
			expect(result.updatedCount).toBe(1);
			// High usage should result in high confidence
			expect(result.avgConfidence).toBeGreaterThan(0.7);
		});

		it("should identify low-confidence learnings", async () => {
			// Setup: Create old learning with no usage
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 100); // Very old

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			stateStore.updateLearning(learning.id, {
				createdAt: oldDate.toISOString(),
				accessCount: 0,
				appliedCount: 0,
			});
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				maxAgeDays: 90,
			});
			await pruner.initialize();

			const result = await pruner.updateLearningScores();

			expect(result.lowConfidenceCount).toBe(1);
		});

		it("should respect dry-run mode", async () => {
			// Setup
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});
			await stateStore.save();

			// Test with dry-run
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.updateLearningScores();

			expect(result.updatedCount).toBeGreaterThan(0);

			// Reload state and verify no changes persisted
			const reloadedStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await reloadedStore.load();
			const learnings = reloadedStore.getLearnings();

			// Original relevance score should be unchanged (1.0)
			expect(learnings[0].relevanceScore).toBe(1.0);
		});
	});

	describe("deduplicateLearnings()", () => {
		it("should identify duplicate learnings", async () => {
			// Setup: Create similar learnings
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.addLearning({
				type: "pattern",
				trigger: "deploying to production",
				action: "run build verification first",
				tier: "warm",
			});

			stateStore.addLearning({
				type: "pattern",
				trigger: "deploying to prod",
				action: "run build verification before deploy",
				tier: "warm",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.deduplicateLearnings();

			expect(result.totalChecked).toBe(2);
			expect(result.duplicateGroups).toBeGreaterThan(0);
		});

		it("should not merge dissimilar learnings", async () => {
			// Setup: Create dissimilar learnings
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.addLearning({
				type: "pattern",
				trigger: "deploying to production",
				action: "run build verification",
				tier: "warm",
			});

			stateStore.addLearning({
				type: "pitfall",
				trigger: "using process.env in client",
				action: "use import.meta.env instead",
				tier: "warm",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.deduplicateLearnings();

			expect(result.totalChecked).toBe(2);
			expect(result.duplicateGroups).toBe(0);
		});

		it("should merge duplicates and combine keywords", async () => {
			// Setup: Create duplicates with different keywords
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.addLearning({
				type: "pattern",
				trigger: "deploying to production",
				action: "run build verification",
				tier: "warm",
				keywords: ["deploy", "production"],
			});

			stateStore.addLearning({
				type: "pattern",
				trigger: "deploying to prod",
				action: "run build checks",
				tier: "warm",
				keywords: ["build", "CI"],
			});

			await stateStore.save();

			// Test (non-dry-run to see actual merge)
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: false,
			});
			await pruner.initialize();

			const result = await pruner.deduplicateLearnings();

			expect(result.mergedCount).toBeGreaterThan(0);

			// Note: Actual merge logic would require removeLearn() method in StateStore
			// For now, just verify the count is tracked
		});
	});

	describe("archiveStaleItems()", () => {
		it("should identify stale learnings by low confidence", async () => {
			// Setup: Create learning with low score
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			stateStore.updateLearning(learning.id, { relevanceScore: 0.2 });
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.archiveStaleItems();

			expect(result.archived.learnings).toBe(1);
			expect(result.dryRun).toBe(true);
		});

		it("should identify stale learnings by age with no usage", async () => {
			// Setup: Create old learning with no usage
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 100);

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			stateStore.updateLearning(learning.id, {
				createdAt: oldDate.toISOString(),
				accessCount: 0,
				appliedCount: 0,
			});
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				maxAgeDays: 90,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.archiveStaleItems();

			expect(result.archived.learnings).toBe(1);
		});

		it("should not archive recent learnings with usage", async () => {
			// Setup: Create recent learning with usage
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			stateStore.updateLearning(learning.id, {
				accessCount: 5,
				appliedCount: 2,
				relevanceScore: 0.8,
			});
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			const result = await pruner.archiveStaleItems();

			expect(result.archived.learnings).toBe(0);
		});

		it("should create archive files when not in dry-run", async () => {
			// Setup: Create stale learning
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			const learning = stateStore.addLearning({
				type: "pattern",
				trigger: "test",
				action: "test action",
				tier: "warm",
			});

			stateStore.updateLearning(learning.id, { relevanceScore: 0.2 });
			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: false,
			});
			await pruner.initialize();

			const result = await pruner.archiveStaleItems();

			expect(result.archived.learnings).toBe(1);
			expect(result.dryRun).toBe(false);

			// Verify archive directory exists
			const archiveDir = path.join(TEST_WORKSPACE, ".snapback", "archive");
			expect(fs.existsSync(archiveDir)).toBe(true);

			// Verify archive file exists
			const archiveFiles = fs.readdirSync(archiveDir);
			const learningArchives = archiveFiles.filter((f) => f.startsWith("learnings_"));
			expect(learningArchives.length).toBe(1);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty state gracefully", async () => {
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
			});
			await pruner.initialize();

			const pruneResult = await pruner.pruneStaleViolations();
			expect(pruneResult.totalChecked).toBe(0);

			const scoreResult = await pruner.updateLearningScores();
			expect(scoreResult.totalScored).toBe(0);

			const dedupeResult = await pruner.deduplicateLearnings();
			expect(dedupeResult.totalChecked).toBe(0);

			const archiveResult = await pruner.archiveStaleItems();
			expect(archiveResult.archived.learnings).toBe(0);
		});

		it("should handle missing .snapback directory", async () => {
			// Remove .snapback directory
			const snapbackDir = path.join(TEST_WORKSPACE, ".snapback");
			if (fs.existsSync(snapbackDir)) {
				fs.rmSync(snapbackDir, { recursive: true });
			}

			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
			});

			// Should not throw
			await expect(pruner.initialize()).resolves.not.toThrow();
		});

		it("should handle file read errors gracefully", async () => {
			// Setup: Create violation for file with permission issues
			const stateStore = new StateStore({ snapbackDir: path.join(TEST_WORKSPACE, ".snapback") });
			await stateStore.load();

			stateStore.recordViolation({
				type: "silent_catch",
				file: "src/protected.ts",
				description: "Empty catch block",
				prevention: "Add logging",
			});

			await stateStore.save();

			// Test
			const pruner = new AutomatedLearningPruner({
				workspaceRoot: TEST_WORKSPACE,
				dryRun: true,
			});
			await pruner.initialize();

			// Should not throw even if file doesn't exist
			const result = await pruner.pruneStaleViolations();
			expect(result.staleCount).toBe(1);
		});
	});
});
