/**
 * Patterns Command
 *
 * Implements snap patterns list/report - Manage workspace patterns.
 * Patterns are auto-promoted from violations after 3 occurrences.
 *
 * @see implementation_plan.md Section 1.2
 */

import chalk from "chalk";
import { Command } from "commander";

import {
	getViolations,
	isSnapbackInitialized,
	readSnapbackJson,
	recordViolation,
	type ViolationEntry,
	writeSnapbackJson,
} from "../services/snapback-dir";
import { formatDate } from "../utils";

// =============================================================================
// TYPES
// =============================================================================

interface WorkspacePattern {
	type: string;
	description: string;
	prevention: string;
	occurrences: number;
	promotedAt: string;
	lastSeenAt: string;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the patterns command with subcommands
 */
export function createPatternsCommand(): Command {
	const patterns = new Command("patterns").description("Manage workspace patterns");

	patterns
		.command("list")
		.description("List promoted patterns")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const patternsList = await readSnapbackJson<WorkspacePattern[]>(
					"patterns/workspace-patterns.json",
					cwd,
				);

				if (options.json) {
					console.log(JSON.stringify(patternsList || [], null, 2));
					return;
				}

				if (!patternsList || patternsList.length === 0) {
					console.log(chalk.yellow("No patterns recorded yet"));
					console.log(chalk.gray("Patterns are promoted after 3 occurrences of the same violation."));
					return;
				}

				console.log(chalk.cyan(`Active Patterns (${patternsList.length}):`));
				console.log();

				for (const pattern of patternsList) {
					console.log(chalk.bold(pattern.type));
					console.log(`  ${pattern.description}`);
					console.log(chalk.green(`  Prevention: ${pattern.prevention}`));
					console.log(
						chalk.gray(
							`  Occurrences: ${pattern.occurrences} • Last seen: ${formatDate(pattern.lastSeenAt)}`,
						),
					);
					console.log();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	patterns
		.command("report")
		.description("Report a pattern violation")
		.argument("<type>", "Violation type (e.g., 'layer-boundary-violation')")
		.argument("<file>", "File where it occurred")
		.argument("<message>", "What happened")
		.option("-p, --prevention <prevention>", "How to prevent in future")
		.action(async (type: string, file: string, message: string, options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				// Get existing violations
				const violations = await getViolations(cwd);

				// Count occurrences of this type
				const count = violations.filter((v) => v.type === type).length + 1;

				// Record new violation
				const violation: ViolationEntry = {
					type,
					file,
					message,
					count,
					date: new Date().toISOString(),
					...(options.prevention && { prevention: options.prevention }),
				};

				await recordViolation(violation, cwd);

				console.log(chalk.yellow("⚠"), `Violation recorded: ${type}`);
				console.log(chalk.gray(`  File: ${file}`));
				console.log(chalk.gray(`  Message: ${message}`));
				console.log(chalk.gray(`  Occurrences: ${count}/3 for promotion`));

				// Auto-promote at 3x
				if (count >= 3) {
					await promoteToPattern(type, message, options.prevention, cwd);
					console.log();
					console.log(chalk.green("📈"), `Pattern promoted: ${type}`);
					console.log(chalk.gray("  This pattern will now be detected automatically."));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	patterns
		.command("violations")
		.description("Show recent violations")
		.option("-n, --number <count>", "Number of violations to show", "20")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const violations = await getViolations(cwd);
				const count = Number.parseInt(options.number, 10);
				const recent = violations.slice(-count).reverse();

				if (options.json) {
					console.log(JSON.stringify(recent, null, 2));
					return;
				}

				if (recent.length === 0) {
					console.log(chalk.green("✓"), "No violations recorded");
					return;
				}

				console.log(chalk.cyan(`Recent Violations (${recent.length}):`));
				console.log();

				// Group by type
				const grouped = new Map<string, ViolationEntry[]>();
				for (const v of recent) {
					const existing = grouped.get(v.type) || [];
					existing.push(v);
					grouped.set(v.type, existing);
				}

				for (const [type, vList] of grouped) {
					const count = vList.length;
					const promotionStatus = count >= 3 ? chalk.green("(promoted)") : chalk.gray(`(${count}/3)`);
					console.log(chalk.bold(type), promotionStatus);

					for (const v of vList.slice(0, 3)) {
						console.log(chalk.gray(`  ${v.file}`));
						console.log(chalk.gray(`    ${v.message}`));
					}

					if (vList.length > 3) {
						console.log(chalk.gray(`  ... and ${vList.length - 3} more`));
					}
					console.log();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	patterns
		.command("summary")
		.description("Show violation summary and promotion status")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const violations = await getViolations(cwd);
				const patterns =
					(await readSnapbackJson<WorkspacePattern[]>("patterns/workspace-patterns.json", cwd)) || [];

				// Count by type
				const typeCounts = new Map<string, number>();
				for (const v of violations) {
					typeCounts.set(v.type, (typeCounts.get(v.type) || 0) + 1);
				}

				const summary = {
					totalViolations: violations.length,
					promotedPatterns: patterns.length,
					pendingPromotion: [...typeCounts.entries()].filter(([_, count]) => count >= 2 && count < 3).length,
					byType: Object.fromEntries(typeCounts),
				};

				if (options.json) {
					console.log(JSON.stringify(summary, null, 2));
					return;
				}

				console.log(chalk.cyan("Pattern Summary:"));
				console.log();
				console.log(`  Total violations:     ${summary.totalViolations}`);
				console.log(`  Promoted patterns:    ${summary.promotedPatterns}`);
				console.log(`  Pending promotion:    ${summary.pendingPromotion}`);
				console.log();

				if (typeCounts.size > 0) {
					console.log(chalk.cyan("By Type:"));
					const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
					for (const [type, count] of sorted) {
						const status = count >= 3 ? chalk.green("promoted") : chalk.gray(`${count}/3`);
						console.log(`  ${type.padEnd(30)} ${count} (${status})`);
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return patterns;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Promote a violation type to a pattern after 3 occurrences
 */
async function promoteToPattern(
	type: string,
	description: string,
	prevention: string | undefined,
	workspaceRoot: string,
): Promise<void> {
	// Get violations for this type
	const violations = await getViolations(workspaceRoot);
	const typeViolations = violations.filter((v) => v.type === type);
	const occurrences = typeViolations.length;

	// Get existing patterns
	const patterns =
		(await readSnapbackJson<WorkspacePattern[]>("patterns/workspace-patterns.json", workspaceRoot)) || [];

	// Check if already promoted
	const existingIndex = patterns.findIndex((p) => p.type === type);

	const pattern: WorkspacePattern = {
		type,
		description,
		prevention: prevention || typeViolations.find((v) => v.prevention)?.prevention || "Review and fix manually",
		occurrences,
		promotedAt: existingIndex >= 0 ? patterns[existingIndex].promotedAt : new Date().toISOString(),
		lastSeenAt: new Date().toISOString(),
	};

	if (existingIndex >= 0) {
		patterns[existingIndex] = pattern;
	} else {
		patterns.push(pattern);
	}

	await writeSnapbackJson("patterns/workspace-patterns.json", patterns, workspaceRoot);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { promoteToPattern };
