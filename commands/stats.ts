/**
 * Stats Command
 *
 * @fileoverview Implements `snap stats` - Show learning engine statistics.
 * This is the CLI equivalent of the MCP's `codebase.get_learning_stats()` tool.
 *
 * ## Purpose
 *
 * The learning engine tracks interactions and violations to improve over time.
 * This command shows:
 * - How many interactions have been logged
 * - Feedback rate (how often users provide feedback)
 * - Accuracy rate (when feedback says AI was correct)
 * - Golden examples (high-confidence correct examples)
 * - Violation patterns and their promotion status
 *
 * ## Learning Loop Overview
 *
 * ```
 * Week 1: Bootstrap
 * ├── User creates patterns, records learnings
 * ├── violations.jsonl starts accumulating
 * └── Golden dataset is empty
 *
 * Week 2-4: Pattern Recognition
 * ├── Same violations appear multiple times
 * ├── At 3x → auto-promoted to workspace-patterns.json
 * ├── User feedback improves accuracy
 * └── Golden examples start accumulating
 *
 * Month 2+: Self-Sustaining
 * ├── Patterns catch most violations automatically
 * ├── High accuracy rate from golden examples
 * └── New patterns continue to be learned
 * ```
 *
 * ## Usage Examples
 *
 * ```bash
 * # Show learning statistics
 * snap stats
 *
 * # Machine-readable output
 * snap stats --json
 * ```
 *
 * ## Output Format
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │  📊 Learning Statistics                 │
 * │                                         │
 * │  Total Interactions: 142                │
 * │  Feedback Rate: 68%                     │
 * │  Accuracy Rate: 94%                     │
 * │  Golden Examples: 23                    │
 * └─────────────────────────────────────────┘
 *
 * Violation Patterns:
 * ┌──────────────────────────┬───────┬────────────────────────┐
 * │ Type                     │ Count │ Status                 │
 * ├──────────────────────────┼───────┼────────────────────────┤
 * │ missing-error-handling   │ 5     │ 🤖 Ready for automation│
 * │ vague-assertion          │ 3     │ 📈 Ready for promotion │
 * │ layer-boundary-violation │ 1     │ 📝 Tracking            │
 * └──────────────────────────┴───────┴────────────────────────┘
 *
 * Violations at 3x → promoted | 5x → automated
 * ```
 *
 * ## Related
 *
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 * - MCP equivalent: `ai_dev_utils/mcp/server.ts` → `handleGetLearningStats()`
 * - Intelligence methods: `Intelligence.getStats()`, `Intelligence.getViolationsSummary()`
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands/stats
 */

import type { LearningStats, ViolationsSummary } from "@snapback/intelligence";
import chalk from "chalk";
import Table from "cli-table3";
import { Command } from "commander";

import { getIntelligence } from "../services/intelligence-service";
import { displayBox } from "../utils/display";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options parsed from command line
 *
 * @internal
 */
interface StatsOptions {
	/** Output as JSON */
	json?: boolean;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the stats command
 *
 * @returns Commander Command instance
 *
 * @remarks
 * ## Implementation Notes for LLM Agents
 *
 * 1. This command uses two Intelligence methods:
 *    - `getStats()` → LearningStats (sync)
 *    - `getViolationsSummary()` → ViolationsSummary (sync)
 *
 * 2. Display uses:
 *    - `displayBox()` for the learning stats summary
 *    - `cli-table3` directly for the violations table
 *
 * 3. Both methods are synchronous (no await needed after getting Intelligence)
 *
 * ## Empty State Handling
 *
 * If no interactions/violations yet:
 * - Show stats box with zeros
 * - Show helpful message about recording learnings
 * - Don't show empty violations table
 *
 * @example
 * ```typescript
 * // In apps/cli/src/index.ts:
 * import { createStatsCommand } from "./commands/stats";
 * program.addCommand(createStatsCommand());
 * ```
 */
export function createStatsCommand(): Command {
	const stats = new Command("stats")
		.description("Show learning statistics")
		.option("--json", "Output as JSON")
		.action(async (options: StatsOptions) => {
			await handleStatsCommand(options);
		});

	return stats;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the stats command execution
 *
 * @param options - Command options
 *
 * @remarks
 * ## Implementation Flow
 *
 * 1. Get Intelligence instance
 * 2. Get learning stats and violations summary
 * 3. Format and display results
 *
 * ## Intelligence Methods Used
 *
 * ```typescript
 * // Get learning statistics
 * const learningStats = intelligence.getStats();
 *
 * // Get violations summary
 * const violationsSummary = intelligence.getViolationsSummary();
 * ```
 *
 * Both methods are synchronous after Intelligence is initialized.
 *
 * @internal
 */
async function handleStatsCommand(options: StatsOptions): Promise<void> {
	const cwd = process.cwd();

	try {
		// STEP 1: Get Intelligence instance
		const intelligence = await getIntelligence(cwd);

		// STEP 2: Get stats (sync methods)
		const learningStats = intelligence.getStats();
		const violationsSummary = intelligence.getViolationsSummary();

		// STEP 3: Handle JSON output
		if (options.json) {
			console.log(
				JSON.stringify(
					{
						learning: learningStats,
						violations: violationsSummary,
					},
					null,
					2,
				),
			);
			return;
		}

		// STEP 4: Display formatted output
		displayStatsResults(learningStats, violationsSummary);
	} catch (error: unknown) {
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
 * Display stats results in formatted output
 *
 * @param learningStats - Stats from Intelligence.getStats()
 * @param violationsSummary - Summary from Intelligence.getViolationsSummary()
 *
 * @remarks
 * ## Display Structure
 *
 * 1. Learning stats box
 *    - Total interactions
 *    - Feedback rate (as percentage)
 *    - Accuracy rate (as percentage)
 *    - Golden examples count
 *
 * 2. Violations table (if any)
 *    - Type, count, status columns
 *    - Limited to top 10 by count
 *
 * 3. Legend
 *    - Explains the promotion thresholds
 *
 * @internal
 */
function displayStatsResults(learningStats: LearningStats, violationsSummary: ViolationsSummary): void {
	// PART 1: Learning stats box
	console.log(
		displayBox({
			title: "📊 Learning Statistics",
			content: formatLearningStats(learningStats),
			type: "info",
		}),
	);

	// PART 2: Violations table (if any violations exist)
	if (violationsSummary.byType.length > 0) {
		console.log();
		console.log(chalk.cyan("Violation Patterns:"));

		// Create table with cli-table3
		const table = new Table({
			head: [chalk.cyan("Type"), chalk.cyan("Count"), chalk.cyan("Status")],
			style: { head: [], border: [] },
		});

		// Add rows (limit to top 10)
		for (const v of violationsSummary.byType.slice(0, 10)) {
			const displayStatus = formatViolationStatus(v.status);
			table.push([v.type, String(v.count), displayStatus]);
		}

		console.log(table.toString());

		// Show if there are more
		if (violationsSummary.byType.length > 10) {
			console.log(chalk.gray(`  ... and ${violationsSummary.byType.length - 10} more types`));
		}
	} else {
		// No violations - show helpful message
		console.log();
		console.log(chalk.gray("No violations recorded yet."));
		console.log(chalk.gray('Record with: snap patterns report "type" "file" "message"'));
	}

	// PART 3: Legend
	console.log();
	console.log(chalk.gray("Violations at 3x → promoted | 5x → automated"));
}

/**
 * Format learning stats for display in box
 *
 * @param stats - Learning statistics
 * @returns Formatted string for box content
 *
 * @remarks
 * Calculates percentages and formats with chalk styling.
 *
 * @internal
 */
function formatLearningStats(stats: LearningStats): string {
	// Calculate feedback rate
	const feedbackRate =
		stats.totalInteractions > 0 ? Math.round((stats.feedbackReceived / stats.totalInteractions) * 100) : 0;

	// Accuracy rate is already 0-1, convert to percentage
	const accuracyRate = Math.round(stats.correctRate * 100);

	return [
		`${chalk.bold("Total Interactions:")} ${stats.totalInteractions}`,
		`${chalk.bold("Feedback Rate:")} ${feedbackRate}%`,
		`${chalk.bold("Accuracy Rate:")} ${accuracyRate}%`,
		`${chalk.bold("Golden Examples:")} ${stats.goldenExamples}`,
	].join("\n");
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Format violation status for display
 *
 * @param status - Status from ViolationsSummary
 * @returns Formatted string with emoji
 *
 * @internal
 */
function formatViolationStatus(status: string): string {
	switch (status) {
		case "tracking":
			return "📝 Tracking";
		case "ready_for_promotion":
			return "📈 Ready for promotion";
		case "ready_for_automation":
			return "🤖 Ready for automation";
		case "promoted":
			return "✅ Promoted";
		case "automated":
			return "🤖 Automated";
		default:
			return status;
	}
}

export { handleStatsCommand };
