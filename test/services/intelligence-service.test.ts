/**
 * Intelligence Service Unit Tests
 *
 * Tests the CLI → Intelligence bridge (intelligence-service.ts).
 * Uses real file system operations to avoid vi.mock hoisting issues.
 *
 * Architecture alignment:
 * - daemon_architecture.md: CLI → Daemon → Intelligence
 * - main_onboard.md: CLI as universal entry point
 * - web_onboard.md: Layer 2 (account-required) separate
 *
 * Tests verify:
 * - Creates Intelligence instances for initialized workspaces
 * - Throws helpful errors for uninitialized workspaces
 * - Caches instances per workspace path
 * - Proper config creation with correct paths
 *
 * @see daemon_architecture.md for architecture context
 * @module test/services/intelligence-service
 */

import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	clearIntelligenceCache,
	createWorkspaceIntelligenceConfig,
	getIntelligence,
	getIntelligenceWithSemantic,
	hasIntelligence,
} from "../../src/services/intelligence-service";
import { createSnapbackDirectory, saveWorkspaceConfig } from "../../src/services/snapback-dir";

describe("intelligence-service", () => {
	let testDir: string;
	let testDir2: string;

	beforeEach(async () => {
		// Create temporary test directories
		testDir = join(tmpdir(), `snapback-intel-test-${Date.now()}`);
		testDir2 = join(tmpdir(), `snapback-intel-test2-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
		await mkdir(testDir2, { recursive: true });
	});

	afterEach(async () => {
		// Clear instance cache between tests
		clearIntelligenceCache();

		// Clean up test directories
		try {
			await rm(testDir, { recursive: true, force: true });
			await rm(testDir2, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	/**
	 * Helper to initialize a workspace with .snapback directory
	 */
	async function initializeWorkspace(workspaceRoot: string): Promise<void> {
		await createSnapbackDirectory(workspaceRoot);
		await saveWorkspaceConfig(
			{
				workspaceId: "test-workspace",
				tier: "free",
				protectionLevel: "standard",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			workspaceRoot,
		);
	}

	describe("createWorkspaceIntelligenceConfig", () => {
		it("should create config with correct paths", async () => {
			await initializeWorkspace(testDir);

			const config = createWorkspaceIntelligenceConfig(testDir);

			// rootDir should point to .snapback directory
			expect(config.rootDir).toBe(join(testDir, ".snapback"));

			// Sub-directories should be relative to rootDir
			expect(config.patternsDir).toBe("patterns");
			expect(config.learningsDir).toBe("learnings");
			expect(config.constraintsFile).toBe("constraints.md");
			expect(config.violationsFile).toBe("patterns/violations.jsonl");
			expect(config.embeddingsDb).toBe("embeddings.db");
		});

		it("should apply sensible defaults", async () => {
			await initializeWorkspace(testDir);

			const config = createWorkspaceIntelligenceConfig(testDir);

			// Semantic search disabled by default for fast CLI startup
			expect(config.enableSemanticSearch).toBe(false);

			// Learning loop enabled by default
			expect(config.enableLearningLoop).toBe(true);

			// Auto-promotion enabled by default (3x → pattern, 5x → automation)
			expect(config.enableAutoPromotion).toBe(true);

			// Context files should include standard patterns
			expect(config.contextFiles).toContain("patterns/workspace-patterns.json");
			expect(config.contextFiles).toContain("vitals.json");
		});

		it("should allow custom options to override defaults", async () => {
			await initializeWorkspace(testDir);

			const config = createWorkspaceIntelligenceConfig(testDir, {
				enableSemanticSearch: true,
				enableLearningLoop: false,
				enableAutoPromotion: false,
			});

			expect(config.enableSemanticSearch).toBe(true);
			expect(config.enableLearningLoop).toBe(false);
			expect(config.enableAutoPromotion).toBe(false);
		});
	});

	describe("getIntelligence", () => {
		it("should create Intelligence for initialized workspace", async () => {
			await initializeWorkspace(testDir);

			const intel = await getIntelligence(testDir);

			expect(intel).toBeDefined();
			// Verify it has expected Intelligence methods
			expect(typeof intel.getContext).toBe("function");
			expect(typeof intel.checkPatterns).toBe("function");
			expect(typeof intel.reportViolation).toBe("function");
			expect(typeof intel.recordLearning).toBe("function");
		});

		it("should throw if workspace not initialized", async () => {
			// testDir exists but has no .snapback directory
			await expect(getIntelligence(testDir)).rejects.toThrow("SnapBack not initialized. Run: snap init");
		});

		it("should return cached instance on second call", async () => {
			await initializeWorkspace(testDir);

			const intel1 = await getIntelligence(testDir);
			const intel2 = await getIntelligence(testDir);

			// Should be the exact same instance (cached)
			expect(intel1).toBe(intel2);
		});

		it("should create separate instances for different workspaces", async () => {
			await initializeWorkspace(testDir);
			await initializeWorkspace(testDir2);

			const intel1 = await getIntelligence(testDir);
			const intel2 = await getIntelligence(testDir2);

			// Different workspaces should get different instances
			expect(intel1).not.toBe(intel2);
		});
	});

	describe("hasIntelligence", () => {
		it("should return true for initialized workspace", async () => {
			await initializeWorkspace(testDir);

			const result = await hasIntelligence(testDir);

			expect(result).toBe(true);
		});

		it("should return false for uninitialized workspace", async () => {
			// testDir exists but has no .snapback directory
			const result = await hasIntelligence(testDir);

			expect(result).toBe(false);
		});
	});

	describe("clearIntelligenceCache", () => {
		it("should clear cache and allow new instance creation", async () => {
			await initializeWorkspace(testDir);

			const intel1 = await getIntelligence(testDir);

			// Clear the cache
			clearIntelligenceCache();

			// Get a new instance - should be different object
			const intel2 = await getIntelligence(testDir);

			// Should not be the same instance after cache clear
			expect(intel1).not.toBe(intel2);
		});
	});

	describe("getIntelligenceWithSemantic", () => {
		it("should create semantic Intelligence instance for initialized workspace", async () => {
			await initializeWorkspace(testDir);

			const semanticIntel1 = await getIntelligenceWithSemantic(testDir);
			const semanticIntel2 = await getIntelligenceWithSemantic(testDir);

			// Semantic variant should be cached for the same workspace
			expect(semanticIntel1).toBe(semanticIntel2);

			// Semantic instance should differ from the non-semantic one
			const regularIntel = await getIntelligence(testDir);
			expect(semanticIntel1).not.toBe(regularIntel);
		});

		it("should throw for uninitialized workspace", async () => {
			// testDir exists but SnapBack has not been initialized
			await expect(getIntelligenceWithSemantic(testDir)).rejects.toThrow(
				"SnapBack not initialized. Run: snap init",
			);
		});
	});

	describe("Intelligence facade methods", () => {
		it("should provide access to validation pipeline", async () => {
			await initializeWorkspace(testDir);

			const intel = await getIntelligence(testDir);

			// Validate some code - should not throw
			const result = await intel.checkPatterns('console.log("test");', "test.ts");

			expect(result).toBeDefined();
			expect(result.overall).toBeDefined();
			expect(typeof result.overall.passed).toBe("boolean");
		});

		it("should provide access to learning system", async () => {
			await initializeWorkspace(testDir);

			const intel = await getIntelligence(testDir);

			// Record a learning - should not throw
			const result = await intel.recordLearning({
				type: "pattern",
				trigger: "test trigger",
				action: "test action",
				source: "test",
			});

			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
		});

		it("should provide access to vitals system", async () => {
			await initializeWorkspace(testDir);

			const intel = await getIntelligence(testDir);

			// Get vitals for workspace
			const vitals = intel.getVitals(testDir);

			expect(vitals).toBeDefined();
			// Vitals should have expected methods
			expect(typeof vitals.current).toBe("function");
		});
	});
});
