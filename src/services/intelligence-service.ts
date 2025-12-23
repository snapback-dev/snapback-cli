/**
 * Intelligence Service
 *
 * @fileoverview Provides singleton access to @snapback/intelligence for CLI commands.
 * This is the bridge between the internal MCP tooling and customer-facing CLI.
 *
 * ## Architecture Context
 *
 * This service implements DUAL-USE architecture:
 * - Internal MCP (`ai_dev_utils/mcp`) → rootDir: `ai_dev_utils/` → For SnapBack dev team
 * - Customer CLI (`apps/cli`) → rootDir: `.snapback/` → For customers
 *
 * Same algorithms from @snapback/intelligence, different data sources.
 *
 * ## Related Files
 *
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 * - Internal MCP: `ai_dev_utils/mcp/server.ts` (reference implementation)
 * - Intelligence Package: `packages/intelligence/src/Intelligence.ts`
 * - Storage Service: `apps/cli/src/services/snapback-dir.ts`
 *
 * ## Storage Layout
 *
 * When initialized, Intelligence expects this structure in .snapback/:
 * ```
 * .snapback/
 * ├── config.json              # Workspace config (required for init check)
 * ├── vitals.json              # Workspace vitals (optional)
 * ├── constraints.md           # User-defined constraints (optional)
 * ├── embeddings.db            # Semantic search DB (created if enabled)
 * ├── patterns/
 * │   ├── violations.jsonl     # Violation tracking
 * │   └── workspace-patterns.json  # Promoted patterns
 * └── learnings/
 *     └── user-learnings.jsonl # User learnings
 * ```
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Get intelligence for current workspace
 * const intel = await getIntelligence();
 *
 * // Get context before starting work
 * const context = await intel.getContext({
 *   task: "add authentication",
 *   keywords: ["auth", "session"],
 * });
 *
 * // Validate code before committing
 * const result = await intel.validateCode(code, "src/auth.ts");
 *
 * // Report a violation (auto-promotes at 3x)
 * const status = await intel.reportViolation({
 *   type: "missing-error-handling",
 *   file: "src/api.ts",
 *   message: "No try-catch around async operation",
 *   reason: "Forgot to add error handling",
 *   prevention: "Always wrap async calls in try-catch",
 * });
 * ```
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module services/intelligence-service
 */

import type { IntelligenceConfig } from "@snapback/intelligence";
import { Intelligence } from "@snapback/intelligence";

import { getWorkspaceDir, isSnapbackInitialized } from "./snapback-dir";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration options for workspace intelligence
 *
 * @remarks
 * These map to IntelligenceConfig from @snapback/intelligence.
 * We provide sensible defaults for CLI usage.
 */
export interface WorkspaceIntelligenceOptions {
	/**
	 * Enable semantic search using embeddings
	 * @default false - Disabled for faster startup in CLI
	 *
	 * @remarks
	 * When enabled, creates embeddings.db in .snapback/
	 * Requires initial indexing which can be slow.
	 * Consider enabling only for `snap context --semantic` flag.
	 */
	enableSemanticSearch?: boolean;

	/**
	 * Enable the learning loop (interaction tracking, feedback)
	 * @default true
	 *
	 * @remarks
	 * Powers `snap stats` and golden dataset building.
	 * Tracks CLI interactions for accuracy improvement.
	 */
	enableLearningLoop?: boolean;

	/**
	 * Enable auto-promotion of violations to patterns
	 * @default true
	 *
	 * @remarks
	 * At 3x occurrences: promotes to workspace-patterns.json
	 * At 5x occurrences: marks for automation
	 * See ROUTER.md "Pattern Promotion Thresholds"
	 */
	enableAutoPromotion?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default context files to index for customer workspaces
 *
 * @remarks
 * Unlike internal MCP which indexes ARCHITECTURE.md, CONSTRAINTS.md, ROUTER.md,
 * customer workspaces have simpler structure. We index what they create.
 *
 * These files are optional - Intelligence handles missing files gracefully.
 */
const DEFAULT_CONTEXT_FILES = [
	"patterns/workspace-patterns.json", // Promoted patterns
	"vitals.json", // Workspace vitals
	"constraints.md", // Optional user constraints
];

// =============================================================================
// SINGLETON MANAGEMENT
// =============================================================================

/**
 * Cache of Intelligence instances per workspace path
 *
 * @remarks
 * We cache instances to avoid re-initialization overhead.
 * Each workspace gets its own instance with its own data.
 *
 * Key: Absolute path to workspace root
 * Value: Intelligence instance
 *
 * @internal
 */
const instances = new Map<string, Intelligence>();

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Create Intelligence configuration for a customer workspace
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Optional configuration overrides
 * @returns IntelligenceConfig ready for new Intelligence(config)
 *
 * @remarks
 * This mirrors the config structure in `ai_dev_utils/mcp/server.ts` but
 * adapted for customer workspaces which use .snapback/ directory.
 *
 * Key differences from internal MCP config:
 * - rootDir is .snapback/ not ai_dev_utils/
 * - Fewer context files (customers don't have ROUTER.md, etc.)
 * - Semantic search disabled by default for faster startup
 *
 * @example
 * ```typescript
 * const config = createWorkspaceIntelligenceConfig("/path/to/project");
 * const intel = new Intelligence(config);
 * ```
 *
 * @see {@link file://ai_dev_utils/mcp/server.ts} lines 50-75 for internal config
 */
export function createWorkspaceIntelligenceConfig(
	workspaceRoot: string,
	options: WorkspaceIntelligenceOptions = {},
): IntelligenceConfig {
	// Get the .snapback/ directory path
	const snapbackDir = getWorkspaceDir(workspaceRoot);

	return {
		// Root directory for all Intelligence operations
		// All relative paths are resolved from here
		rootDir: snapbackDir,

		// Directory containing pattern files
		// Maps to: .snapback/patterns/
		patternsDir: "patterns",

		// Directory containing learning files
		// Maps to: .snapback/learnings/
		learningsDir: "learnings",

		// Optional user-defined constraints file
		// Maps to: .snapback/constraints.md
		// Customers can create this to add project-specific rules
		constraintsFile: "constraints.md",

		// Violation tracking file (JSONL format)
		// Maps to: .snapback/patterns/violations.jsonl
		// Auto-created on first violation report
		violationsFile: "patterns/violations.jsonl",

		// SQLite database for semantic embeddings
		// Maps to: .snapback/embeddings.db
		// Only created if enableSemanticSearch is true
		embeddingsDb: "embeddings.db",

		// Files to index for context retrieval
		// These are searched when user runs `snap context`
		contextFiles: DEFAULT_CONTEXT_FILES,

		// Feature flags with sensible defaults for CLI
		enableSemanticSearch: options.enableSemanticSearch ?? false,
		enableLearningLoop: options.enableLearningLoop ?? true,
		enableAutoPromotion: options.enableAutoPromotion ?? true,
	};
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get or create Intelligence instance for a workspace
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @param options - Optional configuration overrides
 * @returns Promise<Intelligence> - Initialized Intelligence instance
 * @throws Error if workspace is not initialized (no .snapback/config.json)
 *
 * @remarks
 * This is the main entry point for CLI commands to access Intelligence.
 * It handles:
 * - Checking if workspace is initialized
 * - Caching instances per workspace
 * - Creating new instances with proper config
 *
 * ## Error Handling
 *
 * Throws if:
 * - Workspace not initialized: "SnapBack not initialized. Run: snap init"
 * - Config file corrupted: Will bubble up JSON parse error
 *
 * ## Caching Behavior
 *
 * Instances are cached by workspace path. Second call to same workspace
 * returns the cached instance (fast). Call `clearIntelligenceCache()` to
 * force re-initialization.
 *
 * ## Implementation Notes for LLM Agents
 *
 * 1. Always await this function - it's async due to init check
 * 2. Handle the "not initialized" error in command handlers
 * 3. The returned Intelligence instance has all methods from the facade
 *
 * @example
 * ```typescript
 * // In a command handler:
 * try {
 *   const intel = await getIntelligence();
 *   const context = await intel.getContext({ task: "..." });
 * } catch (error) {
 *   if (error.message.includes("not initialized")) {
 *     console.log(chalk.yellow("Run: snap init"));
 *     process.exit(1);
 *   }
 *   throw error;
 * }
 * ```
 *
 * @see {@link Intelligence} for available methods
 * @see {@link isSnapbackInitialized} for init check logic
 */
export async function getIntelligence(
	workspaceRoot?: string,
	options?: WorkspaceIntelligenceOptions,
): Promise<Intelligence> {
	// Resolve workspace path
	const cwd = workspaceRoot || process.cwd();

	// STEP 1: Check if workspace is initialized
	// This verifies .snapback/config.json exists
	// Without this, Intelligence would fail on missing directories
	if (!(await isSnapbackInitialized(cwd))) {
		throw new Error("SnapBack not initialized. Run: snap init");
	}

	// STEP 2: Check cache for existing instance
	// This avoids re-initialization overhead on repeated calls
	// Note: We cache by path, so different workspaces get different instances
	if (instances.has(cwd)) {
		return instances.get(cwd)!;
	}

	// STEP 3: Create new Intelligence instance
	// This doesn't do heavy initialization - that happens on first use
	const config = createWorkspaceIntelligenceConfig(cwd, options);
	const intelligence = new Intelligence(config);

	// STEP 4: Cache for future calls
	instances.set(cwd, intelligence);

	return intelligence;
}

/**
 * Clear the Intelligence instance cache
 *
 * @remarks
 * Use this in tests to ensure clean state between test cases.
 * Also disposes any active instances to free resources.
 *
 * ## When to Use
 *
 * - In test `afterEach` or `afterAll` hooks
 * - When workspace config changes and you need fresh instance
 * - When debugging initialization issues
 *
 * @example
 * ```typescript
 * // In test file:
 * afterEach(() => {
 *   clearIntelligenceCache();
 * });
 * ```
 */
export function clearIntelligenceCache(): void {
	// Dispose all instances to free resources (close DB connections, etc.)
	for (const instance of instances.values()) {
		// Intelligence.dispose() is async but we fire-and-forget here
		// In tests, await the individual dispose if needed
		instance.dispose().catch(() => {
			// Intentionally silent: dispose errors during cache clear are non-critical
			// The cache is being cleared regardless, and logging would be noisy
		});
	}

	// Clear the cache
	instances.clear();
}

/**
 * Check if Intelligence is available for a workspace
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @returns Promise<boolean> - true if Intelligence can be used
 *
 * @remarks
 * This is a non-throwing version of getIntelligence() for conditional logic.
 * Useful when you want to show different UI based on initialization state.
 *
 * @example
 * ```typescript
 * if (await hasIntelligence()) {
 *   // Show full intelligence-powered UI
 * } else {
 *   // Show basic UI with init prompt
 * }
 * ```
 */
export async function hasIntelligence(workspaceRoot?: string): Promise<boolean> {
	try {
		await getIntelligence(workspaceRoot);
		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Intelligence with semantic search enabled
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @returns Promise<Intelligence> - Instance with semantic search ready
 *
 * @remarks
 * This variant enables semantic search and calls initialize() to ensure
 * the embeddings database is ready. Use for `snap context --semantic`.
 *
 * ## Performance Note
 *
 * First call with semantic search will:
 * 1. Create embeddings.db if not exists
 * 2. Index all context files
 * 3. This can take several seconds
 *
 * Subsequent calls are fast (uses cached embeddings).
 *
 * @example
 * ```typescript
 * // In context command with --semantic flag:
 * const intel = await getIntelligenceWithSemantic();
 * const result = await intel.semanticSearch(query, 2000);
 * ```
 */
export async function getIntelligenceWithSemantic(workspaceRoot?: string): Promise<Intelligence> {
	const cwd = workspaceRoot || process.cwd();

	// Check init first
	if (!(await isSnapbackInitialized(cwd))) {
		throw new Error("SnapBack not initialized. Run: snap init");
	}

	// Create with semantic search enabled
	// Note: We use a different cache key to avoid conflicts
	const cacheKey = `${cwd}:semantic`;

	if (instances.has(cacheKey)) {
		return instances.get(cacheKey)!;
	}

	const config = createWorkspaceIntelligenceConfig(cwd, {
		enableSemanticSearch: true,
	});

	const intelligence = new Intelligence(config);

	// Initialize semantic search (creates/loads embeddings)
	await intelligence.initialize();

	instances.set(cacheKey, intelligence);

	return intelligence;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { Intelligence };
