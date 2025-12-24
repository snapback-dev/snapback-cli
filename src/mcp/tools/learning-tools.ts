/**
 * Learning Tools for Customer MCP Server
 *
 * Implements session management, personalized recommendations,
 * and session-end hooks with auto-learning prompts.
 *
 * These tools require backend access but gracefully degrade to local
 * data from .snapback/ when the server is unavailable.
 *
 * @module learning-tools
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { SnapBackAPIClient } from "../client/snapback-api";
import {
	analyzeSession,
	endSessionTracking,
	getSessionState,
	persistSessionSummary,
	recordSuggestedLearnings,
	type SessionSummary,
	startSessionTracking,
} from "../utils/session-lifecycle";

// =============================================================================
// SCHEMAS
// =============================================================================

export const StartSessionSchema = z.object({
	taskDescription: z.string().optional().describe("What you're working on"),
	files: z.array(z.string()).optional().describe("Files you plan to modify"),
});

export const GetRecommendationsSchema = z.object({
	context: z.string().optional().describe("Description of what you need help with"),
	keywords: z.array(z.string()).optional().describe("Keywords related to your task"),
});

export const SessionStatsSchema = z.object({
	// No required parameters
});

export const EndSessionSchema = z.object({
	acceptLearnings: z
		.array(z.number())
		.optional()
		.describe("Indices of suggested learnings to accept (from previous end_session call)"),
	customLearning: z
		.object({
			type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]),
			trigger: z.string(),
			action: z.string(),
		})
		.optional()
		.describe("Custom learning to record"),
	skipLearnings: z.boolean().optional().describe("Skip learning prompts and just end session"),
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Recommendation {
	type: "pattern" | "pitfall" | "workflow" | "discovery" | "efficiency";
	title: string;
	description: string;
	confidence?: number;
	source?: string;
}

export interface SessionGuidance {
	sessionId: string;
	recommendations: Recommendation[];
	workspaceVitals?: {
		framework?: string;
		packageManager?: string;
		typescript?: boolean;
	};
	protectedFiles?: string[];
}

export interface SessionStats {
	sessionId: string;
	startedAt: string;
	duration: string;
	snapshotCount: number;
	riskAnalysesPerformed: number;
	filesModified: number;
	coaching?: string;
}

// =============================================================================
// LOCAL DATA READERS (for offline fallback)
// =============================================================================

interface WorkspaceVitals {
	framework?: string;
	packageManager?: string;
	typescript?: { enabled: boolean };
}

interface LearningEntry {
	id: string;
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	action: string;
	source: string;
	createdAt: string;
}

interface SessionState {
	id: string;
	task?: string;
	startedAt: string;
	snapshotCount: number;
	filesModified?: number;
}

/**
 * Read JSON file from .snapback/
 */
async function readSnapbackJson<T>(relativePath: string, workspaceRoot: string): Promise<T | null> {
	try {
		const content = await readFile(join(workspaceRoot, ".snapback", relativePath), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Load JSONL file from .snapback/
 */
async function loadSnapbackJsonl<T>(relativePath: string, workspaceRoot: string): Promise<T[]> {
	try {
		const content = await readFile(join(workspaceRoot, ".snapback", relativePath), "utf-8");
		return content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as T);
	} catch {
		return [];
	}
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `sess_${timestamp}${random}`;
}

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

// =============================================================================
// LOCAL FALLBACK HANDLERS
// =============================================================================

/**
 * Get recommendations from local .snapback/ data
 */
async function getLocalRecommendations(workspaceRoot: string, keywords?: string[]): Promise<Recommendation[]> {
	const learnings = await loadSnapbackJsonl<LearningEntry>("learnings/user-learnings.jsonl", workspaceRoot);

	if (learnings.length === 0) {
		return [];
	}

	// Filter by keywords if provided
	let filtered = learnings;
	if (keywords && keywords.length > 0) {
		const keywordLower = keywords.map((k) => k.toLowerCase());
		filtered = learnings.filter((l) => {
			const text = `${l.trigger} ${l.action}`.toLowerCase();
			return keywordLower.some((k) => text.includes(k));
		});
	}

	// Take most recent 5
	const recent = filtered.slice(-5).reverse();

	return recent.map((l) => ({
		type: l.type,
		title: `${l.type.charAt(0).toUpperCase() + l.type.slice(1)}: ${l.trigger.slice(0, 50)}`,
		description: l.action,
		source: "local",
	}));
}

/**
 * Get local session data
 */
async function getLocalSession(workspaceRoot: string): Promise<SessionState | null> {
	return readSnapbackJson<SessionState>("session/current.json", workspaceRoot);
}

/**
 * Get workspace vitals from .snapback/
 */
async function getLocalVitals(workspaceRoot: string): Promise<WorkspaceVitals | null> {
	return readSnapbackJson<WorkspaceVitals>("vitals.json", workspaceRoot);
}

/**
 * Get protected files list from .snapback/
 */
async function getLocalProtectedFiles(workspaceRoot: string): Promise<string[]> {
	const protected_ = await readSnapbackJson<{ pattern: string }[]>("protected.json", workspaceRoot);
	return protected_?.map((p) => p.pattern) ?? [];
}

// =============================================================================
// TOOL HANDLERS
// =============================================================================

/**
 * Start a development session with personalized guidance
 */
export async function handleStartSession(
	args: z.infer<typeof StartSessionSchema>,
	apiClient: SnapBackAPIClient | undefined,
	workspaceRoot: string,
): Promise<{
	content: Array<{ type: string; json?: unknown; text?: string }>;
}> {
	const { taskDescription, files } = args;

	// Try server first if available
	if (apiClient) {
		try {
			// Get workspace ID from config
			const config = await readSnapbackJson<{ workspaceId?: string }>("config.json", workspaceRoot);
			const workspaceId = config?.workspaceId || "local";

			// Call server for session initialization
			const result = (await apiClient.request("mcp.startSession", {
				workspaceId,
				taskDescription,
				files,
			})) as { guidance?: { recommendations?: Recommendation[] } };

			return {
				content: [
					{ type: "json", json: result },
					{
						type: "text",
						text: formatSessionGuidance(result.guidance?.recommendations || []),
					},
				],
			};
		} catch (error) {
			console.error("[SnapBack MCP] Server unavailable for startSession, using local fallback:", error);
			// Fall through to local
		}
	}

	// Local fallback
	const sessionId = generateSessionId();

	// Start session tracking for metrics
	startSessionTracking(workspaceRoot, sessionId, taskDescription);

	const vitals = await getLocalVitals(workspaceRoot);
	const protectedFiles = await getLocalProtectedFiles(workspaceRoot);
	const recommendations = await getLocalRecommendations(workspaceRoot);

	const guidance: SessionGuidance = {
		sessionId,
		recommendations,
		workspaceVitals: vitals
			? {
					framework: vitals.framework,
					packageManager: vitals.packageManager,
					typescript: vitals.typescript?.enabled,
				}
			: undefined,
		protectedFiles: protectedFiles.length > 0 ? protectedFiles : undefined,
	};

	return {
		content: [
			{ type: "json", json: guidance },
			{
				type: "text",
				text: formatLocalSessionStart(guidance, taskDescription),
			},
		],
	};
}

/**
 * Get personalized recommendations
 */
export async function handleGetRecommendations(
	args: z.infer<typeof GetRecommendationsSchema>,
	apiClient: SnapBackAPIClient | undefined,
	workspaceRoot: string,
): Promise<{
	content: Array<{ type: string; json?: unknown; text?: string }>;
}> {
	const { context, keywords } = args;

	// Try server first if available
	if (apiClient) {
		try {
			const config = await readSnapbackJson<{ workspaceId?: string }>("config.json", workspaceRoot);
			const workspaceId = config?.workspaceId || "local";

			const result = (await apiClient.request("mcp.getRecommendations", {
				workspaceId,
				context,
				keywords,
			})) as { recommendations?: Recommendation[] };

			return {
				content: [
					{ type: "json", json: result },
					{
						type: "text",
						text: formatRecommendations(result.recommendations || []),
					},
				],
			};
		} catch (error) {
			console.error("[SnapBack MCP] Server unavailable for getRecommendations, using local fallback:", error);
			// Fall through to local
		}
	}

	// Local fallback
	const recommendations = await getLocalRecommendations(workspaceRoot, keywords);

	return {
		content: [
			{ type: "json", json: { recommendations, source: "local" } },
			{
				type: "text",
				text: formatLocalRecommendations(recommendations),
			},
		],
	};
}

/**
 * Get session statistics
 */
export async function handleSessionStats(
	_args: z.infer<typeof SessionStatsSchema>,
	apiClient: SnapBackAPIClient | undefined,
	workspaceRoot: string,
): Promise<{
	content: Array<{ type: string; json?: unknown; text?: string }>;
}> {
	// Try server first if available
	if (apiClient) {
		try {
			const config = await readSnapbackJson<{ workspaceId?: string }>("config.json", workspaceRoot);
			const workspaceId = config?.workspaceId || "local";

			const result = (await apiClient.request("mcp.getSessionStats", { workspaceId })) as SessionStats;

			return {
				content: [
					{ type: "json", json: result },
					{
						type: "text",
						text: formatSessionStats(result),
					},
				],
			};
		} catch (error) {
			console.error("[SnapBack MCP] Server unavailable for sessionStats, using local fallback:", error);
			// Fall through to local
		}
	}

	// Local fallback
	const session = await getLocalSession(workspaceRoot);

	if (!session) {
		return {
			content: [
				{ type: "json", json: { active: false } },
				{
					type: "text",
					text: "📊 No active session. Use `snapback.start_session` to begin.",
				},
			],
		};
	}

	const startTime = new Date(session.startedAt).getTime();
	const duration = formatDuration(Date.now() - startTime);

	const stats: SessionStats = {
		sessionId: session.id,
		startedAt: session.startedAt,
		duration,
		snapshotCount: session.snapshotCount || 0,
		riskAnalysesPerformed: 0, // Local doesn't track this
		filesModified: session.filesModified || 0,
		coaching: getSessionCoaching(session.snapshotCount || 0, session.filesModified || 0),
	};

	return {
		content: [
			{ type: "json", json: stats },
			{
				type: "text",
				text: formatLocalSessionStats(stats),
			},
		],
	};
}

// =============================================================================
// FORMATTERS
// =============================================================================

function formatSessionGuidance(recommendations: Recommendation[]): string {
	if (!recommendations.length) {
		return "✅ Session started. Ready to assist.";
	}

	const lines = recommendations.map((r, i) => `${i + 1}. **${r.title}**: ${r.description}`);

	return `📋 Session Guidance:

${lines.join("\n")}

Use \`snapback.get_recommendations\` for more personalized suggestions.`;
}

function formatLocalSessionStart(guidance: SessionGuidance, task?: string): string {
	const parts: string[] = [`✅ Session started (ID: ${guidance.sessionId})`];

	if (task) {
		parts.push(`📝 Task: ${task}`);
	}

	if (guidance.workspaceVitals?.framework) {
		parts.push(`🔧 Framework: ${guidance.workspaceVitals.framework}`);
	}

	if (guidance.protectedFiles && guidance.protectedFiles.length > 0) {
		parts.push(
			`🛡️ Protected files: ${guidance.protectedFiles.slice(0, 3).join(", ")}${guidance.protectedFiles.length > 3 ? ` +${guidance.protectedFiles.length - 3} more` : ""}`,
		);
	}

	if (guidance.recommendations.length > 0) {
		parts.push("");
		parts.push("📋 Recommendations from your learnings:");
		for (const r of guidance.recommendations.slice(0, 3)) {
			parts.push(`  • ${r.description.slice(0, 80)}${r.description.length > 80 ? "..." : ""}`);
		}
	}

	parts.push("");
	parts.push("ℹ️ Running in local mode. Connect API key for personalized recommendations.");

	return parts.join("\n");
}

function formatRecommendations(recommendations: Recommendation[]): string {
	if (!recommendations.length) {
		return "No specific recommendations. Continue with your approach.";
	}

	const lines = recommendations.map((r, i) => {
		const confidence = r.confidence ? ` (${Math.round(r.confidence * 100)}% match)` : "";
		return `${i + 1}. **${r.title}**${confidence}\n   ${r.description}`;
	});

	return `💡 Recommendations:

${lines.join("\n\n")}`;
}

function formatLocalRecommendations(recommendations: Recommendation[]): string {
	if (!recommendations.length) {
		return "💡 No local learnings found. Use `snap learn` CLI command to record learnings.";
	}

	const lines = recommendations.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}`);

	return `💡 Recommendations from local learnings:

${lines.join("\n\n")}

ℹ️ Connect API key for cross-workspace recommendations.`;
}

function formatSessionStats(stats: SessionStats): string {
	return `📊 Session Statistics

**Session ID:** ${stats.sessionId}
**Started:** ${stats.startedAt}
**Duration:** ${stats.duration}

**Activity:**
• Snapshots created: ${stats.snapshotCount}
• Risk analyses: ${stats.riskAnalysesPerformed}
• Files modified: ${stats.filesModified}

${stats.coaching ? `💡 ${stats.coaching}` : ""}`;
}

function formatLocalSessionStats(stats: SessionStats): string {
	return `📊 Session Statistics (Local)

**Session ID:** ${stats.sessionId}
**Started:** ${stats.startedAt}
**Duration:** ${stats.duration}

**Activity:**
• Snapshots created: ${stats.snapshotCount}
• Files modified: ${stats.filesModified}

${stats.coaching ? `💡 ${stats.coaching}` : ""}

ℹ️ Connect API key for detailed analytics.`;
}

function getSessionCoaching(snapshotCount: number, filesModified: number): string {
	if (snapshotCount === 0 && filesModified > 5) {
		return "Consider creating a snapshot - you've modified several files without a restore point.";
	}
	if (snapshotCount > 10) {
		return "Great snapshot discipline! Your changes are well-protected.";
	}
	if (filesModified === 0) {
		return "Session just started. Ready when you are!";
	}
	return "Looking good! Keep up the steady progress.";
}

/**
 * End session with learning prompts
 */
export async function handleEndSession(
	args: z.infer<typeof EndSessionSchema>,
	_apiClient: SnapBackAPIClient | undefined,
	workspaceRoot: string,
): Promise<{
	content: Array<{ type: string; text: string }>;
}> {
	const { acceptLearnings, customLearning, skipLearnings } = args;

	// Check if session exists
	const sessionState = getSessionState(workspaceRoot);
	if (!sessionState) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ active: false, message: "No active session" }, null, 2),
				},
				{
					type: "text",
					text: "📊 No active session to end. Use `snapback.start_session` to begin a new session.",
				},
			],
		};
	}

	// Analyze session
	const summary = analyzeSession(workspaceRoot);
	if (!summary) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ error: "Failed to analyze session" }, null, 2),
				},
				{
					type: "text",
					text: "⚠️ Failed to analyze session. Session will be ended without summary.",
				},
			],
		};
	}

	// Record accepted learnings if provided
	const recordedLearnings: Array<{ type: string; trigger: string; action: string }> = [];

	if (acceptLearnings && acceptLearnings.length > 0 && !skipLearnings) {
		const recorded = recordSuggestedLearnings(
			workspaceRoot,
			summary.suggestedLearnings,
			summary.metrics.sessionId,
			acceptLearnings,
		);
		recordedLearnings.push(...recorded.map((l) => ({ type: l.type, trigger: l.trigger, action: l.action })));
	}

	// Record custom learning if provided
	if (customLearning && !skipLearnings) {
		const { recordLearning } = await import("../utils/session-lifecycle");
		const entry = recordLearning(workspaceRoot, {
			type: customLearning.type,
			trigger: customLearning.trigger,
			action: customLearning.action,
			source: `session:${summary.metrics.sessionId}`,
			sessionId: summary.metrics.sessionId,
		});
		recordedLearnings.push({ type: entry.type, trigger: entry.trigger, action: entry.action });
	}

	// Persist session summary
	persistSessionSummary(workspaceRoot, summary);

	// End tracking
	endSessionTracking(workspaceRoot);

	// Format response
	const response = {
		sessionEnded: true,
		metrics: summary.metrics,
		score: summary.score,
		recordedLearnings: recordedLearnings.length > 0 ? recordedLearnings : undefined,
		suggestedLearnings: skipLearnings ? undefined : summary.suggestedLearnings,
	};

	return {
		content: [
			{ type: "text", text: JSON.stringify(response, null, 2) },
			{
				type: "text",
				text: formatEndSessionSummary(summary, recordedLearnings, skipLearnings),
			},
		],
	};
}

/**
 * Format end session summary for display
 */
function formatEndSessionSummary(
	summary: SessionSummary,
	recordedLearnings: Array<{ type: string; trigger: string }>,
	skippedLearnings?: boolean,
): string {
	const { metrics, score, coaching, suggestedLearnings } = summary;
	const durationMin = Math.round(metrics.durationMs / 60000);

	const parts: string[] = [
		"📊 **Session Ended**",
		"",
		`**Duration:** ${durationMin} min`,
		`**Score:** ${formatScore(score)}`,
		`**Snapshots:** ${metrics.snapshotCount} | **Risks Analyzed:** ${metrics.risksAnalyzed}`,
		`**Files Modified:** ${metrics.filesModified.length}`,
		"",
		"**Coaching:**",
		coaching,
	];

	// Show recorded learnings
	if (recordedLearnings.length > 0) {
		parts.push("");
		parts.push("✅ **Learnings Recorded:**");
		for (const l of recordedLearnings) {
			parts.push(`  • [${l.type}] ${l.trigger}`);
		}
	}

	// Show suggested learnings if not skipped
	if (!skippedLearnings && suggestedLearnings.length > 0) {
		parts.push("");
		parts.push("💡 **Suggested Learnings** (call `end_session` with `acceptLearnings: [indices]` to record):");
		suggestedLearnings.forEach((l, i) => {
			parts.push(`  ${i}. [${l.type}] "${l.trigger}" → ${l.suggestedAction}`);
			parts.push(`     Confidence: ${Math.round(l.confidence * 100)}% | Reason: ${l.reason}`);
		});
	}

	parts.push("");
	parts.push("Use `snapback.start_session` to begin a new session.");

	return parts.join("\n");
}

function formatScore(score: SessionSummary["score"]): string {
	const icons: Record<SessionSummary["score"], string> = {
		excellent: "🌟 Excellent",
		good: "✅ Good",
		fair: "📊 Fair",
		"needs-improvement": "⚠️ Needs Improvement",
	};
	return icons[score];
}

// =============================================================================
// TOOL DEFINITIONS (for MCP registration)
// =============================================================================

export const learningToolDefinitions = [
	{
		name: "snapback.start_session",
		description: `**Purpose:** PERSONALIZATION tool - loads user preferences and past learnings for tailored recommendations.

**Signal Words (when to auto-trigger):**
- "start session", "begin work", "new session"
- "what should I work on", "recommendations"
- At the beginning of a conversation

**Key Difference from prepare_workspace:**
- prepare_workspace: RISK ASSESSMENT (protection score, snapshot decision support)
- start_session: PERSONALIZATION (user preferences, past learnings)

**When to Use:**
- At the beginning of a coding session
- When switching to a new task
- When you want personalized recommendations

**Returns:**
- Session ID for tracking
- Personalized recommendations based on YOUR patterns
- User preferences for this workspace

**Offline Behavior:** Falls back to local .snapback/ data`,
		inputSchema: {
			type: "object",
			properties: {
				taskDescription: {
					type: "string",
					description: "What you're working on",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you plan to modify",
				},
			},
		},
		requiresBackend: true,
	},
	{
		name: "snapback.get_recommendations",
		description: `**Purpose:** Get personalized recommendations for your current context.

**When to Use:**
- When you're unsure how to approach a task
- When you want to learn from your past patterns
- When starting work in a new area

**Returns:**
- Curated recommendations based on your history
- Relevant patterns from your workspaces

**Offline Behavior:** Returns recommendations from local .snapback/learnings/`,
		inputSchema: {
			type: "object",
			properties: {
				context: {
					type: "string",
					description: "Description of what you need help with",
				},
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords related to your task",
				},
			},
		},
		requiresBackend: true,
	},
	{
		name: "snapback.session_stats",
		description: `**Purpose:** Get statistics for your current session.

**Returns:**
- Snapshot count
- Risk analyses performed
- Session duration
- Coaching suggestions

**Offline Behavior:** Returns local session stats from .snapback/session/`,
		inputSchema: {
			type: "object",
			properties: {},
		},
		requiresBackend: true,
	},
	{
		name: "snapback.end_session",
		description: `**Purpose:** End current session with auto-learning prompts and session summary.

**Signal Words (when to auto-trigger):**
- "end session", "done for now", "wrap up"
- "finish working", "session complete"
- User indicates they're done with the current task

**When to Use:**
- At the end of a coding session
- When switching to a completely different project
- When you want to capture learnings from the session

**Returns:**
- Session metrics (duration, snapshots, files modified)
- Session quality score (excellent/good/fair/needs-improvement)
- Coaching suggestions based on session behavior
- Suggested learnings to record (call again with acceptLearnings to save)

**Learning Flow:**
1. First call: Returns suggested learnings based on session patterns
2. Second call with acceptLearnings: Records selected learnings
3. Or call with skipLearnings: true to end without learning prompts

**Example:**
\`\`\`
// First call - get suggestions
{ } → Returns suggested learnings with indices

// Second call - accept some
{ acceptLearnings: [0, 2] } → Records learnings at indices 0 and 2

// Or add custom learning
{ customLearning: { type: "pattern", trigger: "auth changes", action: "always test login flow" }}
\`\`\``,
		inputSchema: {
			type: "object",
			properties: {
				acceptLearnings: {
					type: "array",
					items: { type: "number" },
					description: "Indices of suggested learnings to accept (from previous end_session call)",
				},
				customLearning: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
							description: "Type of learning",
						},
						trigger: {
							type: "string",
							description: "What triggers this learning",
						},
						action: {
							type: "string",
							description: "What to do when triggered",
						},
					},
					required: ["type", "trigger", "action"],
					description: "Custom learning to record",
				},
				skipLearnings: {
					type: "boolean",
					description: "Skip learning prompts and just end session",
				},
			},
		},
		requiresBackend: false,
	},
];
