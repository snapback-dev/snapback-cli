/**
 * Context Command
 *
 * @fileoverview Implements `snap context` - Get relevant context before starting work.
 * This is the CLI equivalent of the MCP's `codebase.start_task()` tool.
 *
 * ## Purpose
 *
 * Before implementing any code changes, developers should understand:
 * - Relevant patterns and constraints
 * - Past learnings that apply
 * - Recent violations to avoid
 *
 * This command surfaces that context in a digestible format.
 *
 * ## Usage Examples
 *
 * ```bash
 * # Get context for a task
 * snap context "add user authentication"
 *
 * # Include files you plan to modify
 * snap context "refactor auth" --files src/auth.ts src/session.ts
 *
 * # Search with specific keywords
 * snap context --keywords auth session jwt
 *
 * # Machine-readable output
 * snap context "add auth" --json
 *
 * # With semantic search (slower, more accurate)
 * snap context "add auth" --semantic
 * ```
 *
 * ## Output Format
 *
 * Default output uses boxen for visual hierarchy:
 * ```
 * ┌─────────────────────────────────────┐
 * │  📋 Context Loaded                  │
 * │                                     │
 * │  Hard Rules: 12 constraints         │
 * │  Patterns: 8 patterns               │
 * │  Learnings: 3 relevant              │
 * │  Violations: 2 to avoid             │
 * └─────────────────────────────────────┘
 *
 * Relevant Learnings:
 * ┌──────────┬───────────────────────────┐
 * │ Trigger  │ Action                    │
 * ├──────────┼───────────────────────────┤
 * │ auth     │ Use @snapback/auth...     │
 * └──────────┴───────────────────────────┘
 *
 * ⚠ Recent Violations (avoid these):
 *   • missing-error-handling: No try-catch...
 *     Fix: Always wrap async calls in try-catch
 * ```
 *
 * ## Related
 *
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 * - MCP equivalent: `ai_dev_utils/mcp/server.ts` → `handleStartTask()`
 * - Intelligence method: `Intelligence.getContext()`
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands/context
 */

import type { ContextResult } from "@snapback/intelligence";
import chalk from "chalk";
import { Command } from "commander";

import { getIntelligence, getIntelligenceWithSemantic } from "../services/intelligence-service";
import { displayBox } from "../utils/display";
import { createContextTable } from "../utils/tables";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options parsed from command line
 *
 * @internal
 */
interface ContextOptions {
	/** Files the user plans to modify */
	files?: string[];
	/** Keywords to search for in patterns/learnings */
	keywords?: string[];
	/** Output as JSON instead of formatted */
	json?: boolean;
	/** Use semantic search (slower, more accurate) */
	semantic?: boolean;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the context command
 *
 * @returns Commander Command instance
 *
 * @remarks
 * ## Implementation Notes for LLM Agents
 *
 * 1. This command is the CLI equivalent of MCP's `start_task` tool
 * 2. It uses the Intelligence facade from @snapback/intelligence
 * 3. Display utilities should be imported from ../utils/display
 * 4. Table utilities should be imported from ../utils/tables
 *
 * ## Error Handling
 *
 * Handle these cases:
 * - Workspace not initialized → Show "Run: snap init"
 * - No task or keywords provided → Show usage hint
 * - Intelligence errors → Show error message, exit 1
 *
 * ## Display Strategy
 *
 * 1. Use `displayBox()` for the summary (type: "info")
 * 2. Use `createContextTable()` for learnings list
 * 3. Use plain chalk for violations (they're warnings)
 * 4. Always show the tip at the end
 *
 * @example
 * ```typescript
 * // In apps/cli/src/index.ts:
 * import { createContextCommand } from "./commands/context";
 * program.addCommand(createContextCommand());
 * ```
 */
export function createContextCommand(): Command {
	const context = new Command("context")
		.description("Get relevant context before starting work")
		.argument("[task]", "Description of what you want to implement")
		.option("-f, --files <files...>", "Files you plan to modify")
		.option("-k, --keywords <keywords...>", "Keywords to search for")
		.option("--json", "Output as JSON")
		.option("--semantic", "Use semantic search (slower, more accurate)")
		.action(async (task: string | undefined, options: ContextOptions) => {
			await handleContextCommand(task, options);
		});

	return context;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the context command execution
 *
 * @param task - Optional task description
 * @param options - Command options
 *
 * @remarks
 * ## Implementation Flow
 *
 * 1. Get Intelligence instance (with or without semantic)
 * 2. Build context input from task + files + keywords
 * 3. Call intelligence.getContext()
 * 4. Format and display results
 *
 * ## Intelligence.getContext() Input
 *
 * ```typescript
 * interface ContextInput {
 *   task: string;           // What user wants to do
 *   files?: string[];       // Files they'll modify
 *   keywords?: string[];    // Search terms
 * }
 * ```
 *
 * ## Intelligence.getContext() Output
 *
 * The result contains:
 * - `hardRules`: String of constraint rules
 * - `patterns`: String of patterns
 * - `relevantLearnings`: Array of {trigger, action, type}
 * - `recentViolations`: Array of {type, message, prevention}
 * - `semanticContext`: If semantic search enabled
 * - `hint`: Helpful tip for the user
 *
 * @internal
 */
async function handleContextCommand(task: string | undefined, options: ContextOptions): Promise<void> {
	const cwd = process.cwd();

	try {
		// STEP 1: Get Intelligence instance
		// Use semantic variant if --semantic flag is set
		const intelligence = options.semantic ? await getIntelligenceWithSemantic(cwd) : await getIntelligence(cwd);

		// STEP 2: Build context input
		// If no task provided, use a generic one
		// Keywords can come from --keywords or be extracted from task
		const contextInput = {
			task: task || "general development",
			files: options.files || [],
			keywords: options.keywords || extractKeywords(task),
		};

		// STEP 3: Get context from Intelligence
		// This searches patterns, learnings, and violations
		const result = await intelligence.getContext(contextInput);

		// STEP 4: Handle JSON output mode
		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		// STEP 5: Display formatted output
		displayContextResults(result, options.semantic);
	} catch (error: unknown) {
		// Handle known error cases
		const message = error instanceof Error ? error.message : String(error);

		if (message.includes("not initialized")) {
			console.log(chalk.yellow("SnapBack not initialized in this workspace"));
			console.log(chalk.gray("Run: snap init"));
			process.exit(1);
		}

		console.error(chalk.red("Error:"), message);
		process.exit(1);
	}
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display context results in formatted output
 *
 * @param result - Context result from Intelligence
 * @param usedSemantic - Whether semantic search was used
 *
 * @remarks
 * ## Display Hierarchy
 *
 * 1. Summary box (always shown)
 *    - Shows counts of rules, patterns, learnings, violations
 *    - If semantic used, shows compression ratio
 *
 * 2. Learnings table (if any learnings found)
 *    - Uses cli-table3 via createContextTable()
 *    - Shows trigger and action columns
 *
 * 3. Violations list (if any violations found)
 *    - Plain text with chalk styling
 *    - Shows type, message, and prevention tip
 *
 * 4. Tip (always shown)
 *    - Reminds user to validate before committing
 *
 * @internal
 */
function displayContextResults(result: ContextResult, usedSemantic?: boolean): void {
	// PART 1: Summary box
	const summaryContent = formatContextSummary(result, usedSemantic);

	console.log(
		displayBox({
			title: "📋 Context Loaded",
			content: summaryContent,
			type: "info",
		}),
	);

	// PART 2: Learnings table
	if (result.relevantLearnings && result.relevantLearnings.length > 0) {
		console.log();
		console.log(chalk.cyan("Relevant Learnings:"));
		console.log(createContextTable(result.relevantLearnings));
	}

	// PART 3: Violations to avoid
	if (result.recentViolations && result.recentViolations.length > 0) {
		console.log();
		console.log(chalk.yellow("⚠ Recent Violations (avoid these):"));

		// Show up to 3 violations to avoid overwhelming output
		for (const violation of result.recentViolations.slice(0, 3)) {
			console.log(chalk.gray(`  • ${violation.type}: ${violation.message}`));
			if (violation.prevention) {
				console.log(chalk.green(`    Fix: ${violation.prevention}`));
			}
		}

		// Hint if there are more
		if (result.recentViolations.length > 3) {
			console.log(chalk.gray(`  ... and ${result.recentViolations.length - 3} more`));
		}
	}

	// PART 4: Tip
	console.log();
	console.log(chalk.gray("Tip: Run 'snap validate <file>' before committing"));
}

/**
 * Format context summary for display in box
 *
 * @param result - Context result from Intelligence
 * @param usedSemantic - Whether semantic search was used
 * @returns Formatted string for box content
 *
 * @remarks
 * Creates a multi-line summary showing:
 * - Number of hard rules (from hardRules string)
 * - Number of patterns (from patterns string)
 * - Number of relevant learnings
 * - Number of violations to avoid
 * - Semantic compression ratio (if used)
 *
 * @internal
 */
function formatContextSummary(result: ContextResult, usedSemantic?: boolean): string {
	const parts: string[] = [];

	// Count hard rules (lines in hardRules string that start with ##)
	if (result.hardRules) {
		const ruleCount = (result.hardRules.match(/^##/gm) || []).length || "loaded";
		parts.push(`${chalk.bold("Hard Rules:")} ${ruleCount} constraints`);
	}

	// Count patterns (non-empty lines in patterns string)
	if (result.patterns) {
		const patternCount = result.patterns.split("\n").filter(Boolean).length;
		parts.push(`${chalk.bold("Patterns:")} ${patternCount} patterns`);
	}

	// Count learnings
	if (result.relevantLearnings?.length) {
		parts.push(`${chalk.bold("Learnings:")} ${result.relevantLearnings.length} relevant`);
	}

	// Count violations
	if (result.recentViolations?.length) {
		parts.push(`${chalk.bold("Violations:")} ${result.recentViolations.length} to avoid`);
	}

	// Semantic search info
	if (usedSemantic && result.semanticContext) {
		parts.push(
			`${chalk.bold("Semantic:")} ${result.semanticContext.sections} sections (${result.semanticContext.compression} compression)`,
		);
	}

	// If no context found, show a helpful message
	if (parts.length === 0) {
		parts.push("No specific context found for this task.");
		parts.push("Try adding --keywords to refine the search.");
	}

	return parts.join("\n");
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract keywords from task description
 *
 * @param task - Task description string
 * @returns Array of keywords
 *
 * @remarks
 * Simple keyword extraction that:
 * - Splits on whitespace
 * - Filters out common words (the, a, an, to, for, etc.)
 * - Returns up to 5 keywords
 *
 * This is a fallback when --keywords isn't provided.
 *
 * @example
 * ```typescript
 * extractKeywords("add user authentication system")
 * // Returns: ["add", "user", "authentication", "system"]
 * ```
 *
 * @internal
 */
function extractKeywords(task: string | undefined): string[] {
	if (!task) {
		return [];
	}

	// Common words to filter out
	const stopWords = new Set([
		"the",
		"a",
		"an",
		"to",
		"for",
		"of",
		"in",
		"on",
		"with",
		"and",
		"or",
		"is",
		"are",
		"it",
		"this",
		"that",
	]);

	// Split, filter, and limit
	return task
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length > 2 && !stopWords.has(word))
		.slice(0, 5);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleContextCommand };
