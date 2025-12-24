/**
 * CLI MCP Server Types
 *
 * Type definitions for the embedded MCP server in the CLI.
 * Uses snapback.* namespace for external/customer-facing MCP tools.
 *
 * @module cli/mcp/types
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Suggested next action for tool chaining
 */
export interface NextAction {
	/** Tool name to call next */
	tool: string;
	/** Priority 0-1, higher = more relevant */
	priority: number;
	/** Why this tool is suggested */
	reason: string;
	/** When to call this tool (optional) */
	condition?: string;
}

/**
 * Session health tracking for continuous context
 */
export interface SessionHealth {
	/** Session health score 0-100 */
	score: number;
	/** Coaching message for the AI */
	coaching?: string;
	/** Risk level indicator */
	riskLevel: "low" | "moderate" | "high" | "critical";
	/** Files modified in this session */
	filesModified: number;
	/** Tool calls made in this session */
	toolCallCount: number;
}

/**
 * Standard tool response with session context
 */
export interface ToolResponse<T = Record<string, unknown>> {
	/** Tool-specific result data */
	data: T;
	/** Suggested next actions for tool chaining */
	nextActions: NextAction[];
	/** Session health context */
	session: SessionHealth;
	/** Human-readable hint */
	hint?: string;
}

/**
 * Error response for tool failures
 */
export interface ToolErrorResponse {
	/** Error message */
	message: string;
	/** Error code */
	code: string;
	/** Log ID for debugging */
	logId: string;
	/** Suggestion for fixing the error */
	suggestion?: string;
}

// =============================================================================
// TOOL DEFINITION TYPES
// =============================================================================

/**
 * MCP Tool annotations per spec
 */
export interface ToolAnnotations {
	/** Human-readable title for the tool */
	title?: string;
	/** If true, the tool does not modify any state */
	readOnlyHint?: boolean;
	/** If true, the tool may perform destructive updates */
	destructiveHint?: boolean;
	/** If true, calling the tool multiple times with same args has same effect */
	idempotentHint?: boolean;
	/** If true, tool interacts with external entities */
	openWorldHint?: boolean;
}

/**
 * Extended tool definition with annotations and metadata
 */
export interface SnapBackTool extends MCPTool {
	annotations?: ToolAnnotations;
	/** JSON Schema for structured output */
	outputSchema?: Record<string, unknown>;
	/** Tier requirement (free or pro) */
	tier?: "free" | "pro";
	/** Whether this tool requires backend connectivity */
	requiresBackend?: boolean;
}

// =============================================================================
// HANDLER TYPES
// =============================================================================

/**
 * Tool handler function signature
 */
export type ToolHandler<TArgs = Record<string, unknown>, TResult = Record<string, unknown>> = (
	args: TArgs,
	context: ToolContext,
) => Promise<ToolResponse<TResult>>;

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Current session health */
	session: SessionHealth;
	/** API key for Pro tier features */
	apiKey?: string;
	/** Whether running in quiet mode (MCP_QUIET=1) */
	quietMode: boolean;
}

// =============================================================================
// SERVER TYPES
// =============================================================================

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
	/** Server name */
	name: string;
	/** Server version */
	version: string;
	/** Workspace root directory */
	workspaceRoot: string;
	/** Enable quiet mode (suppress stderr) */
	quietMode?: boolean;
	/** Optional API key for Pro features */
	apiKey?: string;
}

/**
 * Server status for health checks
 */
export interface MCPServerStatus {
	/** Server running state */
	running: boolean;
	/** Server uptime in seconds */
	uptime: number;
	/** Tool call count since start */
	toolCallCount: number;
	/** Current session health */
	session: SessionHealth;
	/** Connected client info */
	client?: {
		name: string;
		version?: string;
	};
}

// =============================================================================
// INPUT TYPES (for tool schemas)
// =============================================================================

/**
 * Input for get_context tool
 */
export interface GetContextInput {
	task: string;
	files?: string[];
	keywords?: string[];
}

/**
 * Input for validate_code tool
 */
export interface ValidateCodeInput {
	code: string;
	filePath: string;
}

/**
 * Input for check_patterns tool
 */
export interface CheckPatternsInput {
	code: string;
	filePath: string;
}

/**
 * Input for record_learning tool
 */
export interface RecordLearningInput {
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	action: string;
	source: string;
}

/**
 * Input for report_violation tool
 */
export interface ReportViolationInput {
	type: string;
	file: string;
	whatHappened: string;
	whyItHappened: string;
	prevention: string;
}

/**
 * Input for list_snapshots tool
 */
export interface ListSnapshotsInput {
	limit?: number;
	since?: string;
}

/**
 * Input for restore_snapshot tool
 */
export interface RestoreSnapshotInput {
	snapshotId: string;
	files?: string[];
	dryRun?: boolean;
}

// =============================================================================
// RESULT TYPES (for tool outputs)
// =============================================================================

/**
 * Result for get_context tool
 */
export interface GetContextResult {
	patterns: string[];
	constraints: string[];
	learnings: Array<{ trigger: string; action: string }>;
	violations: Array<{ type: string; count: number; prevention: string }>;
}

/**
 * Result for validate_code tool
 */
export interface ValidateCodeResult {
	confidence: string;
	recommendation: "auto_merge" | "quick_review" | "full_review";
	passed: boolean;
	totalIssues: number;
	layers: Array<{ name: string; passed: boolean; issues: number; duration: string }>;
}

/**
 * Result for check_patterns tool
 */
export interface CheckPatternsResult {
	valid: boolean;
	violations: Array<{ type: string; message: string; line?: number; fix?: string }>;
}

/**
 * Result for record_learning tool
 */
export interface RecordLearningResult {
	recorded: boolean;
	id: string;
}

/**
 * Result for report_violation tool
 */
export interface ReportViolationResult {
	recorded: boolean;
	count: number;
	promotionStatus: "stored" | "promoted_to_patterns" | "ready_for_automation";
}

/**
 * Snapshot metadata
 */
export interface SnapshotMeta {
	id: string;
	timestamp: string;
	reason?: string;
	fileCount: number;
}

/**
 * Result for list_snapshots tool
 */
export interface ListSnapshotsResult {
	snapshots: SnapshotMeta[];
	total: number;
}

/**
 * Result for restore_snapshot tool
 */
export interface RestoreSnapshotResult {
	restored: boolean;
	filesRestored: string[];
	snapshotTimestamp: string;
}
