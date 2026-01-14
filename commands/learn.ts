/**
 * Learn Command
 *
 * Implements snap learn - Record learnings for future reference.
 * Learnings are stored in .snapback/learnings/user-learnings.jsonl
 *
 * @see implementation_plan.md Section 1.2
 */

import chalk from "chalk";
import { Command } from "commander";

import {
	generateId,
	getLearnings,
	isSnapbackInitialized,
	type LearningEntry,
	recordLearning,
} from "../services/snapback-dir";
import { formatDate } from "../utils";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the learn command
 */
export function createLearnCommand(): Command {
	const learn = new Command("learn")
		.description("Record learnings for future reference")
		.argument("<trigger>", "When to apply this learning (keyword or situation)")
		.argument("<action>", "What to do when triggered")
		.option("-t, --type <type>", "Learning type: pattern, pitfall, efficiency, discovery, workflow", "pattern")
		.option("-s, --source <source>", "Where this learning came from", "cli")
		.action(async (trigger: string, action: string, options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized in this workspace"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				// Validate type
				const validTypes = ["pattern", "pitfall", "efficiency", "discovery", "workflow"];
				if (!validTypes.includes(options.type)) {
					console.log(chalk.red(`Invalid type: ${options.type}`));
					console.log(chalk.gray(`Valid types: ${validTypes.join(", ")}`));
					process.exit(1);
				}

				// Create learning entry
				const learning: LearningEntry = {
					id: generateId("L"),
					type: options.type as LearningEntry["type"],
					trigger,
					action,
					source: options.source,
					createdAt: new Date().toISOString(),
				};

				await recordLearning(learning, cwd);

				console.log(chalk.green("✓"), "Learning recorded");
				console.log();
				console.log(`  ${chalk.cyan("Type:")}    ${formatType(learning.type)}`);
				console.log(`  ${chalk.cyan("Trigger:")} ${trigger}`);
				console.log(`  ${chalk.cyan("Action:")}  ${action}`);
				console.log();
				console.log(chalk.gray(`Query with: snap learn list --keyword "${trigger.split(" ")[0]}"`));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Add list subcommand
	learn
		.command("list")
		.description("List recorded learnings")
		.option("-t, --type <type>", "Filter by type")
		.option("-k, --keyword <keyword>", "Search by keyword in trigger")
		.option("-n, --number <count>", "Number of learnings to show", "20")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				let learnings = await getLearnings(cwd);

				// Filter by type
				if (options.type) {
					learnings = learnings.filter((l) => l.type === options.type);
				}

				// Filter by keyword
				if (options.keyword) {
					const keyword = options.keyword.toLowerCase();
					learnings = learnings.filter(
						(l) => l.trigger.toLowerCase().includes(keyword) || l.action.toLowerCase().includes(keyword),
					);
				}

				// Limit
				const count = Number.parseInt(options.number, 10);
				const recent = learnings.slice(-count).reverse();

				if (options.json) {
					console.log(JSON.stringify(recent, null, 2));
					return;
				}

				if (recent.length === 0) {
					console.log(chalk.yellow("No learnings found"));
					console.log(chalk.gray('Record with: snap learn "trigger" "action"'));
					return;
				}

				console.log(chalk.cyan(`Learnings (${recent.length}):`));
				console.log();

				for (const learning of recent) {
					console.log(formatType(learning.type), chalk.bold(learning.trigger));
					console.log(`  → ${learning.action}`);
					console.log(chalk.gray(`  ${formatDate(learning.createdAt)} • ${learning.source}`));
					console.log();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return learn;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format learning type with emoji
 */
function formatType(type: LearningEntry["type"]): string {
	const formats: Record<LearningEntry["type"], string> = {
		pattern: chalk.blue("📋 pattern"),
		pitfall: chalk.red("⚠️  pitfall"),
		efficiency: chalk.green("⚡ efficiency"),
		discovery: chalk.yellow("💡 discovery"),
		workflow: chalk.magenta("🔄 workflow"),
	};

	return formats[type] || type;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { formatType };
