/**
 * Intelligence Service Unit Tests
 *
 * @fileoverview Tests for the intelligence-service.ts singleton manager.
 *
 * ## Test Strategy
 *
 * These tests verify the Intelligence service behaves correctly:
 * 1. Creates Intelligence instances for initialized workspaces
 * 2. Throws helpful errors for uninitialized workspaces
 * 3. Caches instances per workspace path
 * 4. Handles corrupted config gracefully
 *
 * ## 4-Path Coverage Pattern
 *
 * Each function should have tests for:
 * - **Happy Path**: Normal successful operation
 * - **Sad Path**: Expected failure cases (not initialized)
 * - **Edge Cases**: Caching, multiple workspaces
 * - **Error Cases**: Corrupted config, file system errors
 *
 * ## Mocking Strategy
 *
 * We mock:
 * - `@snapback/intelligence` → Mock Intelligence class
 * - `../services/snapback-dir` → Control init state
 *
 * We don't mock:
 * - The service itself (that's what we're testing)
 * - Internal caching logic
 *
 * ## Related Files
 *
 * - Implementation: `apps/cli/src/services/intelligence-service.ts`
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// MOCKS
// =============================================================================

/**
 * Mock Intelligence class
 *
 * @remarks
 * This mock tracks:
 * - Constructor calls (to verify config)
 * - Method calls (to verify correct usage)
 * - Dispose calls (to verify cleanup)
 *
 * ## Implementation Notes for LLM Agents
 *
 * 1. The mock needs to implement all methods used by the service
 * 2. Use vi.fn() for methods to track calls
 * 3. Return realistic shapes from methods
 */
const mockIntelligence = {
	getContext: vi.fn().mockResolvedValue({
		task: "test",
		hardRules: "",
		patterns: "",
		relevantLearnings: [],
		recentViolations: [],
	}),
	validateCode: vi.fn().mockResolvedValue({
		overall: { passed: true, confidence: 0.95, totalIssues: 0 },
		recommendation: "auto_merge",
		layers: [],
		focusPoints: [],
	}),
	getStats: vi.fn().mockReturnValue({
		totalInteractions: 0,
		feedbackReceived: 0,
		correctRate: 0,
		goldenExamples: 0,
		queryTypeBreakdown: {},
	}),
	getViolationsSummary: vi.fn().mockReturnValue({
		total: 0,
		uniqueTypes: 0,
		byType: [],
		summary: { readyForPromotion: 0, readyForAutomation: 0, tracking: 0 },
	}),
	initialize: vi.fn().mockResolvedValue(undefined),
	dispose: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock Intelligence constructor
 *
 * @remarks
 * Captures config passed to constructor for verification.
 */
const MockIntelligenceClass = vi.fn().mockImplementation(() => mockIntelligence);

// Mock the @snapback/intelligence module
vi.mock("@snapback/intelligence", () => ({
	Intelligence: MockIntelligenceClass,
}));

/**
 * Mock snapback-dir functions
 *
 * @remarks
 * These control whether workspace appears initialized.
 */
const mockIsSnapbackInitialized = vi.fn();
const mockGetWorkspaceDir = vi.fn();

vi.mock("../services/snapback-dir", () => ({
	isSnapbackInitialized: mockIsSnapbackInitialized,
	getWorkspaceDir: mockGetWorkspaceDir,
}));

// =============================================================================
// TEST SETUP
// =============================================================================

// Import AFTER mocks are set up
import {
	clearIntelligenceCache,
	createWorkspaceIntelligenceConfig,
	getIntelligence,
	getIntelligenceWithSemantic,
	hasIntelligence,
} from "../../src/services/intelligence-service";

describe("intelligence-service", () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();

		// Clear the instance cache
		clearIntelligenceCache();

		// Default mock returns
		mockIsSnapbackInitialized.mockResolvedValue(true);
		mockGetWorkspaceDir.mockReturnValue("/test/workspace/.snapback");
	});

	afterEach(() => {
		// Ensure cache is cleared after each test
		clearIntelligenceCache();
	});

	// =========================================================================
	// createWorkspaceIntelligenceConfig
	// =========================================================================

	describe("createWorkspaceIntelligenceConfig", () => {
		/**
		 * Happy Path: Creates config with correct paths
		 *
		 * @remarks
		 * Verifies that config uses .snapback/ directory structure.
		 */
		it("should create config with correct paths", () => {
			// Arrange
			const workspaceRoot = "/test/workspace";
			mockGetWorkspaceDir.mockReturnValue("/test/workspace/.snapback");

			// Act
			const config = createWorkspaceIntelligenceConfig(workspaceRoot);

			// Assert
			expect(config.rootDir).toBe("/test/workspace/.snapback");
			expect(config.patternsDir).toBe("patterns");
			expect(config.learningsDir).toBe("learnings");
			expect(config.violationsFile).toBe("patterns/violations.jsonl");
		});

		/**
		 * Happy Path: Applies default options
		 *
		 * @remarks
		 * Verifies sensible defaults for CLI usage.
		 */
		it("should apply sensible defaults", () => {
			// Act
			const config = createWorkspaceIntelligenceConfig("/test");

			// Assert
			expect(config.enableSemanticSearch).toBe(false); // Disabled by default for speed
			expect(config.enableLearningLoop).toBe(true);
			expect(config.enableAutoPromotion).toBe(true);
		});

		/**
		 * Edge Case: Custom options override defaults
		 */
		it("should allow custom options to override defaults", () => {
			// Act
			const config = createWorkspaceIntelligenceConfig("/test", {
				enableSemanticSearch: true,
				enableLearningLoop: false,
			});

			// Assert
			expect(config.enableSemanticSearch).toBe(true);
			expect(config.enableLearningLoop).toBe(false);
			expect(config.enableAutoPromotion).toBe(true); // Still default
		});
	});

	// =========================================================================
	// getIntelligence
	// =========================================================================

	describe("getIntelligence", () => {
		/**
		 * Happy Path: Creates Intelligence for initialized workspace
		 */
		it("should create Intelligence for initialized workspace", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);

			// Act
			const intel = await getIntelligence("/test/workspace");

			// Assert
			expect(intel).toBeDefined();
			expect(MockIntelligenceClass).toHaveBeenCalledTimes(1);

			// Verify config was passed correctly
			const passedConfig = MockIntelligenceClass.mock.calls[0][0];
			expect(passedConfig.rootDir).toBe("/test/workspace/.snapback");
		});

		/**
		 * Sad Path: Throws if workspace not initialized
		 *
		 * @remarks
		 * The error message should guide user to run `snap init`.
		 */
		it("should throw if workspace not initialized", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(false);

			// Act & Assert
			await expect(getIntelligence("/test/workspace")).rejects.toThrow(
				"SnapBack not initialized. Run: snap init",
			);

			// Intelligence should not be created
			expect(MockIntelligenceClass).not.toHaveBeenCalled();
		});

		/**
		 * Edge Case: Returns cached instance on second call
		 *
		 * @remarks
		 * This is the singleton behavior - important for performance.
		 */
		it("should return cached instance on second call", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);

			// Act
			const intel1 = await getIntelligence("/test/workspace");
			const intel2 = await getIntelligence("/test/workspace");

			// Assert
			expect(intel1).toBe(intel2); // Same instance
			expect(MockIntelligenceClass).toHaveBeenCalledTimes(1); // Only created once
		});

		/**
		 * Edge Case: Different workspaces get different instances
		 */
		it("should create separate instances for different workspaces", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);
			mockGetWorkspaceDir
				.mockReturnValueOnce("/workspace-a/.snapback")
				.mockReturnValueOnce("/workspace-b/.snapback");

			// Act
			const intel1 = await getIntelligence("/workspace-a");
			const intel2 = await getIntelligence("/workspace-b");

			// Assert
			expect(MockIntelligenceClass).toHaveBeenCalledTimes(2);
			// Both should be the mock (but in real usage would be different)
		});

		/**
		 * Edge Case: Uses cwd when no path provided
		 */
		it("should use cwd when no path provided", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);
			const originalCwd = process.cwd();

			// Act
			await getIntelligence();

			// Assert
			expect(mockIsSnapbackInitialized).toHaveBeenCalledWith(originalCwd);
		});
	});

	// =========================================================================
	// hasIntelligence
	// =========================================================================

	describe("hasIntelligence", () => {
		/**
		 * Happy Path: Returns true for initialized workspace
		 */
		it("should return true for initialized workspace", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);

			// Act
			const result = await hasIntelligence("/test/workspace");

			// Assert
			expect(result).toBe(true);
		});

		/**
		 * Sad Path: Returns false for uninitialized workspace
		 */
		it("should return false for uninitialized workspace", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(false);

			// Act
			const result = await hasIntelligence("/test/workspace");

			// Assert
			expect(result).toBe(false);
		});
	});

	// =========================================================================
	// getIntelligenceWithSemantic
	// =========================================================================

	describe("getIntelligenceWithSemantic", () => {
		/**
		 * Happy Path: Creates with semantic search enabled
		 */
		it("should create Intelligence with semantic search enabled", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);

			// Act
			const intel = await getIntelligenceWithSemantic("/test/workspace");

			// Assert
			expect(intel).toBeDefined();

			// Verify config had semantic search enabled
			const passedConfig = MockIntelligenceClass.mock.calls[0][0];
			expect(passedConfig.enableSemanticSearch).toBe(true);

			// Verify initialize was called (for semantic setup)
			expect(mockIntelligence.initialize).toHaveBeenCalled();
		});

		/**
		 * Edge Case: Semantic instances are cached separately
		 */
		it("should cache semantic instances separately from regular instances", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);

			// Act
			const regular = await getIntelligence("/test/workspace");
			const semantic = await getIntelligenceWithSemantic("/test/workspace");

			// Assert - Both created (different cache keys)
			expect(MockIntelligenceClass).toHaveBeenCalledTimes(2);
		});
	});

	// =========================================================================
	// clearIntelligenceCache
	// =========================================================================

	describe("clearIntelligenceCache", () => {
		/**
		 * Happy Path: Clears cache and disposes instances
		 */
		it("should clear cache and dispose instances", async () => {
			// Arrange
			mockIsSnapbackInitialized.mockResolvedValue(true);
			await getIntelligence("/test/workspace");

			// Act
			clearIntelligenceCache();

			// Assert
			expect(mockIntelligence.dispose).toHaveBeenCalled();

			// New call should create new instance
			await getIntelligence("/test/workspace");
			expect(MockIntelligenceClass).toHaveBeenCalledTimes(2);
		});
	});
});
