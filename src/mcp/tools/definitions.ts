/**
 * SnapBack MCP Tool Definitions v2
 *
 * Updated based on LLM tool selection research + reviewer feedback:
 * - Tool renames: analyze_risk → assess_risk, check_dependencies → validate_dependencies
 * - Proper MCP ToolAnnotations (title, readOnlyHint, destructiveHint, idempotentHint)
 * - outputSchema with ranked next_actions for tool chaining
 * - Error handling with isError: true (per MCP spec)
 * - Wrapper aliases for ctx7.* → snapback.docs_*
 * - Separator changed from : to _ for internal tools
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/schema
 * @see ai_dev_utils/resources/mpc_defs/mcp-tool-naming-audit.md
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Extended tool definition with MCP annotations and output schema
 */
export interface SnapBackToolDefinition extends MCPTool {
	annotations?: {
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
	};
	/** JSON Schema for structured output */
	outputSchema?: Record<string, unknown>;
	/** Internal: tier requirement */
	tier?: "free" | "pro";
	/** Whether this tool requires backend connectivity */
	requiresBackend?: boolean;
}

/**
 * Standard output schema with ranked next_actions
 * Enables LLMs to chain tools intelligently
 */
export const createOutputSchemaWithNextActions = (
	resultProperties: Record<string, unknown>,
): Record<string, unknown> => ({
	type: "object",
	properties: {
		...resultProperties,
		next_actions: {
			type: "array",
			description: "Ranked list of suggested next tools to call",
			items: {
				type: "object",
				properties: {
					tool: { type: "string", description: "Tool name to call next" },
					priority: {
						type: "number",
						description: "Priority 0-1, higher = more relevant",
					},
					reason: { type: "string", description: "Why this tool is suggested" },
					condition: {
						type: "string",
						description: "When to call this tool",
					},
				},
				required: ["tool", "priority", "reason"],
			},
		},
	},
});

// =============================================================================
// ANALYSIS TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.assess_risk
 *
 * Renamed from: snapback.analyze_risk
 * Rationale: "assess" is more measured than "detect_danger" (avoids brochure vibes)
 *            while being more decisive than generic "analyze"
 */
export const assessRiskTool: SnapBackToolDefinition = {
	name: "snapback.assess_risk",
	description: `Evaluates code changes for potential issues before applying them.

**Signal Words (when to auto-trigger):**
- "is this safe", "safe to apply", "risky"
- "before I accept", "should I accept"
- "AI suggested", "Copilot suggested", "Claude suggested"
- "breaking change", "major refactor"
- User mentions: auth, security, payments, database, migrations

**When to call this tool:**
- BEFORE accepting AI-generated code from Cursor, Copilot, Claude, or Windsurf
- When reviewing diffs with security-sensitive changes (auth, payments, config)
- For changes touching database schemas or migrations
- When the user asks "is this safe?"

**When NOT to call:**
- Trivial formatting/typo fixes
- Changes already applied (use snapback.create_snapshot first next time)

Returns risk assessment with severity levels and specific mitigation steps.`,

	inputSchema: {
		type: "object",
		properties: {
			changes: {
				type: "array",
				description:
					"Array of diff changes. Each item has 'value' (line content), optional 'added'/'removed' booleans.",
				items: {
					type: "object",
					properties: {
						added: { type: "boolean" },
						removed: { type: "boolean" },
						value: { type: "string" },
						count: { type: "number" },
					},
					required: ["value"],
				},
			},
			filePath: {
				type: "string",
				description: "Path to file being changed (helps identify auth/config/migration files)",
			},
		},
		required: ["changes"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		risk_level: {
			type: "string",
			enum: ["safe", "low", "medium", "high", "critical"],
			description: "Overall risk assessment",
		},
		risk_score: {
			type: "number",
			minimum: 0,
			maximum: 100,
			description: "Numeric risk score (0-100)",
		},
		issues: {
			type: "array",
			items: {
				type: "object",
				properties: {
					severity: { type: "string", enum: ["info", "warning", "error"] },
					message: { type: "string" },
					line: { type: "number" },
					mitigation: { type: "string" },
				},
			},
			description: "Specific issues detected",
		},
		recommendations: {
			type: "array",
			items: { type: "string" },
			description: "Actionable recommendations",
		},
		session: {
			type: "object",
			properties: {
				score: { type: "number" },
				coaching: { type: "string" },
			},
			description: "Session health context",
		},
	}),

	annotations: {
		title: "Risk Assessment",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// PROTECTION TOOLS (Pro Tier)
// =============================================================================

/**
 * snapback.create_snapshot
 *
 * KEPT AS-IS per reviewer feedback: "Do not rename checkpoint tools. They're already ideal."
 */
export const createSnapshotTool: SnapBackToolDefinition = {
	name: "snapback.create_snapshot",
	description: `Creates a restorable code snapshot before risky modifications.

**Signal Words (when to auto-trigger):**
- "save a snapshot", "create a backup", "checkpoint"
- "before I start", "before this change"
- "save my work", "create restore point"
- After prepare_workspace returns 🟡 or 🔴 protection score

**When to call this tool:**
- Before major refactoring or breaking changes
- Before modifying auth, security, or payment code
- Before AI-assisted multi-file refactors
- When the user says "save a snapshot" or "create a backup"
- When prepare_workspace recommends it (protection score < 70%)

**When NOT to call:**
- After every single save (use workspace vitals to decide)
- For trivial changes the user can easily redo

Returns snapshot ID for later restoration via snapback.restore_snapshot.`,

	inputSchema: {
		type: "object",
		properties: {
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files to include in snapshot (relative to workspace root)",
			},
			reason: {
				type: "string",
				description: 'Why this snapshot was created (e.g., "Pre-auth refactor")',
			},
			trigger: {
				type: "string",
				enum: ["manual", "mcp", "ai_assist", "session_end"],
				description: "What triggered the snapshot",
			},
			onMissingFile: {
				type: "string",
				enum: ["error", "warn", "skip"],
				description: "How to handle missing files: error (fail), warn (log + continue), skip (silent continue)",
				default: "error",
			},
			suggestAlternatives: {
				type: "boolean",
				description: "Whether to suggest alternative file paths when file not found (default: true)",
				default: true,
			},
		},
		required: ["files"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		snapshot_id: {
			type: "string",
			description: "Unique ID to reference this snapshot",
		},
		timestamp: {
			type: "string",
			format: "date-time",
			description: "When snapshot was created",
		},
		file_count: {
			type: "number",
			description: "Number of files captured",
		},
		total_bytes: {
			type: "number",
			description: "Total size of snapshot",
		},
		reason: {
			type: "string",
			description: "Recorded reason for snapshot",
		},
		validation: {
			type: "object",
			properties: {
				requested: { type: "number", description: "Files requested" },
				included: { type: "number", description: "Files included" },
				skipped: { type: "number", description: "Files skipped" },
			},
			description: "Validation summary",
		},
	}),

	annotations: {
		title: "Create Restore Point",
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false, // Each call creates a new snapshot
	},

	tier: "pro",
	requiresBackend: true,
};

/**
 * snapback.list_snapshots
 *
 * KEPT AS-IS, added title annotation for human readability
 */
export const listSnapshotsTool: SnapBackToolDefinition = {
	name: "snapback.list_snapshots",
	description: `Lists available snapshots for restoration.

**Signal Words (when to auto-trigger):**
- "show snapshots", "list backups", "what snapshots"
- "show restore points", "available checkpoints"
- Before calling restore_snapshot (to choose which one)

**When to call this tool:**
- When user wants to see restore points
- Before choosing which snapshot to restore
- To verify a snapshot was created successfully

Returns recent snapshots with IDs, timestamps, and reasons.`,

	inputSchema: {
		type: "object",
		properties: {
			limit: {
				type: "number",
				description: "Max snapshots to return (default: 20)",
				default: 20,
			},
			since: {
				type: "string",
				format: "date-time",
				description: "Only show snapshots after this time",
			},
		},
	},

	outputSchema: createOutputSchemaWithNextActions({
		snapshots: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string" },
					timestamp: { type: "string" },
					reason: { type: "string" },
					file_count: { type: "number" },
				},
			},
			description: "Available snapshots, most recent first",
		},
		total: {
			type: "number",
			description: "Total snapshot count",
		},
	}),

	annotations: {
		title: "Restore Points",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "pro",
	requiresBackend: true,
};

/**
 * snapback.restore_snapshot
 *
 * KEPT AS-IS, added title annotation
 */
export const restoreSnapshotTool: SnapBackToolDefinition = {
	name: "snapback.restore_snapshot",
	description: `Restores code from a previously created snapshot.

**Signal Words (when to auto-trigger):**
- "undo", "revert", "roll back", "go back"
- "restore", "broke everything", "this broke"
- "need to undo", "that didn't work"
- "bring back", "previous version"

**When to call this tool:**
- After AI changes broke something
- When tests fail after modifications
- When user asks to "undo" or "revert" changes
- To return to a known good state

Returns the restored file contents. The actual file writes happen automatically.`,

	inputSchema: {
		type: "object",
		properties: {
			snapshotId: {
				type: "string",
				description: "ID of snapshot to restore (from list_snapshots)",
			},
			files: {
				type: "array",
				items: { type: "string" },
				description: "Specific files to restore (optional, defaults to all)",
			},
			dryRun: {
				type: "boolean",
				description: "If true, show what would be restored without applying",
				default: false,
			},
		},
		required: ["snapshotId"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		restored: {
			type: "boolean",
			description: "Whether restoration was applied",
		},
		files_restored: {
			type: "array",
			items: { type: "string" },
			description: "Files that were restored",
		},
		snapshot_timestamp: {
			type: "string",
			description: "When the snapshot was originally created",
		},
	}),

	annotations: {
		title: "Revert to Snapshot",
		readOnlyHint: false,
		destructiveHint: true, // Overwrites current files
		idempotentHint: true, // Same snapshot ID = same result
	},

	tier: "pro",
	requiresBackend: true,
};

// =============================================================================
// DOCUMENTATION TOOLS (Free Tier)
// Consolidated tool that combines library resolution + doc fetching
// =============================================================================

/**
 * snapback.get_library_docs
 *
 * Consolidated tool that replaces docs_find + docs_fetch workflow
 * Rationale: One-step documentation lookup is simpler for LLMs than two-step process
 */
// =============================================================================
// META TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.meta_list_tools
 *
 * Renamed from: catalog.list_tools
 * Rationale: Unified under snapback.* namespace, "meta_" prefix indicates meta-operation
 */
export const metaListToolsTool: SnapBackToolDefinition = {
	name: "snapback.meta_list_tools",
	description: `Lists tools available from connected external MCP servers.

**When to call this tool:**
- To discover what integrations are available
- When user asks "what can you do?" or "what tools do you have?"
- For debugging MCP connectivity issues

Returns catalog of connected MCP servers and their tools.`,

	inputSchema: {
		type: "object",
		properties: {},
	},

	outputSchema: createOutputSchemaWithNextActions({
		servers: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					status: { type: "string", enum: ["connected", "disconnected"] },
					tools: {
						type: "array",
						items: { type: "string" },
					},
				},
			},
			description: "Connected MCP servers and their tools",
		},
	}),

	annotations: {
		title: "List Connected Tools",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// WORKSPACE HEALTH TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.get_workspace_vitals
 *
 * Already well-named, kept as-is with enhanced outputSchema
 */
export const getWorkspaceVitalsTool: SnapBackToolDefinition = {
	name: "snapback.get_workspace_vitals",
	description: `Gets current workspace health signals before making changes.

**When to call this tool:**
- BEFORE any risky modification
- When planning refactoring or major changes
- When user asks "is it safe to continue?"
- To decide whether to create a snapshot first

Returns pulse (velocity), temperature (AI activity), pressure (risk), oxygen (coverage).`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceId: {
				type: "string",
				description: "Workspace path (defaults to current)",
			},
		},
	},

	outputSchema: createOutputSchemaWithNextActions({
		pulse: {
			type: "object",
			properties: {
				level: {
					type: "string",
					enum: ["resting", "elevated", "racing", "critical"],
				},
				changesPerMinute: { type: "number" },
			},
			description: "Change velocity",
		},
		temperature: {
			type: "object",
			properties: {
				level: { type: "string", enum: ["cold", "warm", "hot", "burning"] },
				aiPercentage: { type: "number" },
			},
			description: "AI activity level",
		},
		pressure: {
			type: "object",
			properties: {
				value: { type: "number" },
				unsnapshotedChanges: { type: "number" },
			},
			description: "Risk accumulation (0-100)",
		},
		oxygen: {
			type: "object",
			properties: {
				value: { type: "number" },
			},
			description: "Snapshot coverage (%)",
		},
		trajectory: {
			type: "string",
			enum: ["stable", "escalating", "critical", "recovering"],
			description: "Overall workspace state",
		},
		guidance: {
			type: "object",
			properties: {
				shouldSnapshot: { type: "boolean" },
				reason: { type: "string" },
				suggestion: { type: "string" },
			},
			description: "Recommended action",
		},
	}),

	annotations: {
		title: "Workspace Health",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.acknowledge_risk
 *
 * Kept as-is - good naming
 */
export const acknowledgeRiskTool: SnapBackToolDefinition = {
	name: "snapback.acknowledge_risk",
	description: `Acknowledges current risk state and proceeds with changes.

**When to call this tool:**
- After reviewing elevated vitals and deciding to proceed
- When user explicitly says "I understand the risks"
- To create an audit trail of risk acknowledgments

Returns confirmation and reminder to snapshot after changes.`,

	inputSchema: {
		type: "object",
		properties: {
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files you intend to modify",
			},
			reason: {
				type: "string",
				description: "Why you are proceeding despite the risk",
			},
			workspaceId: {
				type: "string",
				description: "Workspace path (optional)",
			},
		},
		required: ["files", "reason"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		acknowledged: {
			type: "boolean",
			description: "Whether acknowledgment was recorded",
		},
		filesCount: {
			type: "number",
			description: "Number of files acknowledged",
		},
		timestamp: {
			type: "string",
			format: "date-time",
			description: "When acknowledgment was recorded",
		},
	}),

	annotations: {
		title: "Acknowledge Risk",
		readOnlyHint: false, // Creates audit record
		destructiveHint: false,
		idempotentHint: false, // Each call creates new record
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// INTELLIGENCE TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.get_context
 *
 * Kept as-is - well-named
 */
export const getContextTool: SnapBackToolDefinition = {
	name: "snapback.get_context",
	description: `Gets architectural context for a development task.

**When to call this tool:**
- BEFORE implementing any code changes
- When you need to understand codebase patterns
- To check for relevant learnings from past sessions
- When user asks about project architecture or conventions

Returns patterns, constraints, learnings, and recent violations relevant to the task.`,

	inputSchema: {
		type: "object",
		properties: {
			task: {
				type: "string",
				description: "What you're about to implement",
			},
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files you plan to modify",
			},
			keywords: {
				type: "array",
				items: { type: "string" },
				description: "Keywords to search in patterns/learnings",
			},
		},
		required: ["task"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		patterns: {
			type: "array",
			items: { type: "string" },
			description: "Relevant codebase patterns to follow",
		},
		constraints: {
			type: "array",
			items: { type: "string" },
			description: "Hard rules that must be followed",
		},
		learnings: {
			type: "array",
			items: {
				type: "object",
				properties: {
					trigger: { type: "string" },
					action: { type: "string" },
				},
			},
			description: "Past learnings relevant to this task",
		},
		violations: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string" },
					count: { type: "number" },
					prevention: { type: "string" },
				},
			},
			description: "Recent violations to avoid repeating",
		},
		hint: {
			type: "string",
			description: "Quick guidance for this task",
		},
	}),

	annotations: {
		title: "Get Codebase Context",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.check_patterns
 *
 * Kept as-is - verb-noun pattern is correct
 */
export const checkPatternsTool: SnapBackToolDefinition = {
	name: "snapback.check_patterns",
	description: `Validates code against codebase patterns before committing.

**When to call this tool:**
- BEFORE committing code changes
- After implementing a feature
- To catch architectural violations early

Returns list of violations and suggestions for fixing them.`,

	inputSchema: {
		type: "object",
		properties: {
			code: {
				type: "string",
				description: "Code to validate",
			},
			filePath: {
				type: "string",
				description: "Where this code will go",
			},
		},
		required: ["code", "filePath"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		valid: {
			type: "boolean",
			description: "Whether code passes all pattern checks",
		},
		violations: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string" },
					message: { type: "string" },
					line: { type: "number" },
					fix: { type: "string" },
				},
			},
			description: "Pattern violations found",
		},
		suggestion: {
			type: "string",
			description: "Overall recommendation",
		},
	}),

	annotations: {
		title: "Pattern Validation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.validate_code
 *
 * 7-layer validation pipeline tool
 */
export const validateCodeTool: SnapBackToolDefinition = {
	name: "snapback.validate_code",
	description: `Run comprehensive 7-layer validation pipeline on code.

**Layers:**
1. Syntax (brackets, semicolons)
2. Types (any usage, @ts-ignore)
3. Tests (vague assertions, coverage)
4. Architecture (layer boundaries)
5. Security (secrets, eval)
6. Dependencies (deprecated packages)
7. Performance (console.log, sync I/O)

**When to call this tool:**
- Before committing complex changes
- For code review automation
- When you need detailed validation feedback

Returns confidence score, recommendation, and issues per layer with fix suggestions.`,

	inputSchema: {
		type: "object",
		properties: {
			code: {
				type: "string",
				description: "Code to run through validation pipeline",
			},
			filePath: {
				type: "string",
				description: "File path for context-aware validation",
			},
		},
		required: ["code", "filePath"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		confidence: {
			type: "string",
			description: "Confidence score as percentage",
		},
		recommendation: {
			type: "string",
			enum: ["auto_merge", "quick_review", "full_review"],
			description: "Merge recommendation",
		},
		passed: {
			type: "boolean",
			description: "Whether code passes validation",
		},
		totalIssues: {
			type: "number",
			description: "Total issue count across all layers",
		},
		layers: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					passed: { type: "boolean" },
					issues: { type: "number" },
					duration: { type: "string" },
				},
			},
			description: "Results per validation layer",
		},
	}),

	annotations: {
		title: "7-Layer Code Validation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.record_learning
 *
 * Learning recording tool
 */
export const recordLearningTool: SnapBackToolDefinition = {
	name: "snapback.record_learning",
	description: `Records a learning from the current session for future reference.

**When to call this tool:**
- After discovering a useful pattern
- When encountering a pitfall to avoid
- To capture workflow improvements

**Types:**
- pattern: Reusable code pattern
- pitfall: Common mistake to avoid
- efficiency: Performance optimization
- discovery: New capability found
- workflow: Process improvement

Storage: .snapback/learnings/learnings.jsonl`,

	inputSchema: {
		type: "object",
		properties: {
			type: {
				type: "string",
				enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
				description: "Type of learning",
			},
			trigger: {
				type: "string",
				description: "What triggers this learning (keyword or situation)",
			},
			action: {
				type: "string",
				description: "What to do when triggered",
			},
			source: {
				type: "string",
				description: "Where this learning came from (task ID or session)",
			},
		},
		required: ["type", "trigger", "action", "source"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		recorded: {
			type: "boolean",
			description: "Whether learning was recorded",
		},
		id: {
			type: "string",
			description: "Learning ID for reference",
		},
		message: {
			type: "string",
			description: "Confirmation message",
		},
	}),

	annotations: {
		title: "Record Learning",
		readOnlyHint: false, // Writes to storage
		destructiveHint: false,
		idempotentHint: false, // Each call creates new learning
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.validate_recommendation
 *
 * NEW: Replaces Context7 with hybrid 3-layer validation
 * Validates AI package recommendations using npm registry + GitHub API
 */
export const validateRecommendationTool: SnapBackToolDefinition = {
	name: "snapback.validate_recommendation",
	description: `Validates AI-suggested package installations/upgrades using hybrid 3-layer approach.

**Signal Words (when to auto-trigger):**
- "should I install", "should I add", "should I upgrade"
- "AI suggested installing", "Copilot recommended"
- "what about using", "try using", "switch to"
- "npm install", "pnpm add", "yarn add"
- User asks about a specific package/library

**When to call this tool:**
- BEFORE you recommend "npm install X" to the user
- BEFORE installing packages recommended by other AI assistants
- When user asks "should I use library X?"
- To check for breaking changes in version upgrades
- When troubleshooting dependency conflicts

**Replaces Context7 with:**
- Layer 1: npm registry API (peer dependencies, engine requirements)
- Layer 2: GitHub API (changelog scanning, breaking changes)
- Layer 3: Local migration guidance

**Returns:**
- Dependency cascade risks (peer deps, engine mismatches)
- Breaking changes detected in changelogs
- Migration guidance for major version bumps
- Recommendation: proceed / review-required / block`,

	inputSchema: {
		type: "object",
		properties: {
			packageName: {
				type: "string",
				description: "Package name (e.g., 'react', 'lodash')",
			},
			targetVersion: {
				type: "string",
				description: "Target version to install (e.g., '18.2.0')",
			},
			currentPackageJson: {
				type: "object",
				description: "Current package.json content",
				properties: {
					dependencies: {
						type: "object",
						additionalProperties: { type: "string" },
					},
					devDependencies: {
						type: "object",
						additionalProperties: { type: "string" },
					},
					peerDependencies: {
						type: "object",
						additionalProperties: { type: "string" },
					},
				},
			},
			context: {
				type: "object",
				description: "Optional context about the recommendation",
				properties: {
					aiAssistant: { type: "string" },
					recommendationReason: { type: "string" },
				},
			},
		},
		required: ["packageName", "targetVersion", "currentPackageJson"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		safe: {
			type: "boolean",
			description: "Whether installation is safe",
		},
		recommendation: {
			type: "string",
			enum: ["proceed", "review-required", "block"],
			description: "Action recommendation",
		},
		summary: {
			type: "string",
			description: "Human-readable summary",
		},
		risks: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string" },
					package: { type: "string" },
					current: { type: "string" },
					required: { type: "string" },
					severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
					recommendation: { type: "string" },
				},
			},
			description: "Dependency cascade risks detected",
		},
		breakingChanges: {
			type: "array",
			items: {
				type: "object",
				properties: {
					version: { type: "string" },
					hasBreakingChanges: { type: "boolean" },
					changelog: { type: "string" },
					keywords: { type: "array", items: { type: "string" } },
				},
			},
			description: "Breaking changes found in releases",
		},
		migrationGuidance: {
			type: "string",
			nullable: true,
			description: "Migration steps if breaking changes detected",
		},
		layersExecuted: {
			type: "array",
			items: { type: "string" },
			description: "Which validation layers were executed",
		},
	}),

	annotations: {
		title: "Validate Package Recommendation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: true, // Calls external APIs
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// CONTEXT TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.ctx_init
 *
 * Initialize context system in workspace
 */
export const ctxInitTool: SnapBackToolDefinition = {
	name: "snapback.ctx_init",
	description: `Initialize context system in workspace. Creates .snapback/ctx/context.json with project defaults.

**When to call this tool:**
- First time setting up SnapBack in a project
- When user says "initialize context" or "set up snapback"
- After cloning a project that uses SnapBack

Creates context.json (editable source of truth) and .ctx (obfuscated LLM format).`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
			force: {
				type: "boolean",
				description: "Force regenerate even if context.json exists",
				default: false,
			},
		},
	},

	annotations: {
		title: "Initialize Context",
		readOnlyHint: false,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_build
 *
 * Rebuild .ctx from context.json
 */
export const ctxBuildTool: SnapBackToolDefinition = {
	name: "snapback.ctx_build",
	description: `Rebuild .ctx from context.json. Run after modifying context.json to regenerate the obfuscated LLM-readable format.

**When to call this tool:**
- After editing .snapback/ctx/context.json
- When ctx_validate reports stale context
- Before committing context changes

Returns the new .ctx size and hash.`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
		},
	},

	annotations: {
		title: "Build Context",
		readOnlyHint: false,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_validate
 *
 * Validate context freshness
 */
export const ctxValidateTool: SnapBackToolDefinition = {
	name: "snapback.ctx_validate",
	description: `Validate context freshness. Checks if .ctx is in sync with context.json.

**When to call this tool:**
- Before any operation that relies on context constraints
- As part of pre-commit validation
- When debugging context-related issues

Returns validation status and hash.`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
		},
	},

	annotations: {
		title: "Validate Context",
		readOnlyHint: true,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_constraint
 *
 * Get a constraint value
 */
export const ctxConstraintTool: SnapBackToolDefinition = {
	name: "snapback.ctx_constraint",
	description: `Get a constraint value for runtime decision-making.

**When to call this tool:**
- Before checking if a value exceeds project limits
- When you need threshold values for bundle size, performance, etc.
- To understand project constraints

Returns threshold, current value, and unit for the specified domain and name.`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
			domain: {
				type: "string",
				description: "Constraint domain (e.g., 'extension', 'web', 'bundle')",
			},
			name: {
				type: "string",
				description: "Constraint name (e.g., 'bundle', 'fcp', 'size')",
			},
		},
		required: ["domain", "name"],
	},

	annotations: {
		title: "Get Constraint",
		readOnlyHint: true,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_blockers
 *
 * Get current project blockers
 */
export const ctxBlockersTool: SnapBackToolDefinition = {
	name: "snapback.ctx_blockers",
	description: `Get current project blockers for prioritization decisions.

**When to call this tool:**
- When planning what to work on next
- To understand what's blocking progress
- When user asks about project status or blockers

Returns list of blocking issues with current vs target values.`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
		},
	},

	annotations: {
		title: "Get Blockers",
		readOnlyHint: true,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_check
 *
 * Check a value against a constraint
 */
export const ctxCheckTool: SnapBackToolDefinition = {
	name: "snapback.ctx_check",
	description: `Check a value against a constraint.

**When to call this tool:**
- After measuring bundle size, to check against limit
- After performance test, to validate against targets
- When deciding if a change is acceptable

Returns pass/fail status, ratio, and severity level (ok/warning/critical).`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
			domain: {
				type: "string",
				description: "Constraint domain (e.g., 'extension', 'web')",
			},
			name: {
				type: "string",
				description: "Constraint name (e.g., 'bundle', 'fcp')",
			},
			value: {
				type: "number",
				description: "Value to check against constraint (in base units: bytes, ms)",
			},
		},
		required: ["domain", "name", "value"],
	},

	annotations: {
		title: "Check Constraint",
		readOnlyHint: true,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.ctx_status
 *
 * Quick context health check - get project status at a glance
 */
export const ctxStatusTool: SnapBackToolDefinition = {
	name: "snapback.ctx_status",
	description: `**Purpose:** Quick context health check - get project status at a glance.

**Signal Words (when to auto-trigger):**
- "project status", "context health", "what's the status"
- "blockers", "what's blocking", "priorities"
- At the start of a session to understand project state

**Returns:**
- Context sync status (valid/stale)
- Project phase and priority
- Active blockers count and labels
- Key constraint thresholds
- Overall health indicator (🟢 healthy / 🟡 attention / 🔴 critical)

**Use this instead of multiple ctx_* calls when you just need a quick overview.**`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceRoot: {
				type: "string",
				description: "Workspace root path (defaults to current directory)",
			},
		},
	},

	annotations: {
		title: "Context Status",
		readOnlyHint: true,
		destructiveHint: false,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// EXPORT ALL TOOLS
// =============================================================================

/**
 * Complete tool catalog with proper MCP structure
 */
export const snapbackToolDefinitions: SnapBackToolDefinition[] = [
	// Analysis (Free)
	assessRiskTool,
	validateRecommendationTool, // Replaces Context7 (validation + docs via migration guidance)

	// Protection (Pro)
	createSnapshotTool,
	listSnapshotsTool,
	restoreSnapshotTool,

	// Meta (Free)
	metaListToolsTool,

	// Workspace Health (Free)
	getWorkspaceVitalsTool,
	acknowledgeRiskTool,

	// Intelligence (Free)
	getContextTool,
	checkPatternsTool,
	validateCodeTool,
	recordLearningTool,

	// Context System (Free)
	ctxInitTool,
	ctxBuildTool,
	ctxValidateTool,
	ctxConstraintTool,
	ctxBlockersTool,
	ctxCheckTool,
	ctxStatusTool,
];

/**
 * Backward compatibility mappings
 * Old tool name → New tool name
 */
export const toolNameMigrations: Record<string, string> = {
	// Primary renames per research
	"snapback.analyze_risk": "snapback.assess_risk",
	"catalog.list_tools": "snapback.meta_list_tools",

	// ctx7 → snapback.get_library_docs (consolidated)
	"ctx7.resolve-library-id": "snapback.get_library_docs",
	"ctx7.get-library-docs": "snapback.get_library_docs",
};

/**
 * Helper to get tool by name (supports old names via migration)
 */
export function getToolByName(name: string): SnapBackToolDefinition | undefined {
	const migratedName = toolNameMigrations[name] || name;
	return snapbackToolDefinitions.find((t) => t.name === migratedName);
}

// =============================================================================
// ERROR HANDLING HELPER
// =============================================================================

/**
 * Standard error response per MCP spec
 * Returns isError: true so LLM can see and self-correct
 *
 * From feedback: "MCP strongly recommends tool execution errors be returned
 * as a tool result with isError: true, not as a protocol-level error."
 */
export function createErrorResult(
	message: string,
	suggestion?: string,
): {
	content: Array<{ type: "text"; text: string }>;
	isError: true;
} {
	const parts = [`❌ ${message}`];

	if (suggestion) {
		parts.push(`\n💡 Suggestion: ${suggestion}`);
	}

	return {
		content: [{ type: "text", text: parts.join("") }],
		isError: true,
	};
}

/**
 * Standard success response with next_actions
 */
export function createSuccessResult<T extends Record<string, unknown>>(
	data: T,
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
		condition?: string;
	}> = [],
): {
	content: Array<{ type: "text"; text: string }>;
} {
	const result = {
		...data,
		next_actions: nextActions,
	};

	// Generate human-readable summary
	let summary = "";
	if (nextActions.length > 0) {
		const topAction = nextActions.sort((a, b) => b.priority - a.priority)[0];
		summary = `\n\n💡 Suggested next: ${topAction.tool} (${topAction.reason})`;
	}

	return {
		content: [
			{ type: "text", text: JSON.stringify(result, null, 2) },
			...(summary ? [{ type: "text" as const, text: summary }] : []),
		],
	};
}
