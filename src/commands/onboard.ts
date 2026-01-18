/**
 * Onboard Command
 *
 * Interactive onboarding that analyzes the workspace and provides
 * intelligent recommendations for improving AI context and patterns.
 *
 * @module commands/onboard
 */

import chalk from "chalk";
import { Command } from "commander";
import {
	analyzeWorkspace,
	applyRecommendations,
	renderGapSummary,
	renderProfileSummary,
	renderRecommendations,
} from "../services/onboarding";
import { displayBrandedHeader } from "../ui/logo";
import { prompts, status } from "../ui/prompts";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the onboard command
 */
export function createOnboardCommand(): Command {
	return new Command("onboard")
		.description("Interactive onboarding with workspace analysis")
		.option("--dry-run", "Show what would be done without making changes")
		.option("--quick", "Quick scan without pattern detection")
		.option("--apply-all", "Apply all auto-fixable recommendations")
		.option("--json", "Output analysis as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Display header
				if (!options.json) {
					console.clear();
					console.log(displayBrandedHeader({ showTagline: true }));
					console.log();
					console.log(chalk.cyan.bold("Welcome to SnapBack Onboarding"));
					console.log(chalk.gray("Let's analyze your workspace and help you get the most out of SnapBack."));
					console.log();
				}

				// Analyze workspace
				const analysis = await analyzeWorkspace(cwd);

				// JSON output mode
				if (options.json) {
					console.log(JSON.stringify(analysis, null, 2));
					return;
				}

				// Display results
				renderProfileSummary(analysis.profile);
				renderGapSummary(analysis.profile.gaps);
				renderRecommendations(analysis.recommendations);

				// Show quick wins
				if (analysis.quickWins.length > 0) {
					console.log(chalk.green.bold("Quick Wins"));
					console.log(chalk.gray("─".repeat(50)));
					console.log(chalk.gray("These improvements can be made quickly for immediate benefit:"));
					for (const win of analysis.quickWins.slice(0, 3)) {
						console.log(`  • ${win.title} (${win.estimatedTime})`);
					}
					console.log();
				}

				// Critical issues warning
				if (analysis.criticalIssues.length > 0) {
					console.log(chalk.red.bold("⚠️  Critical Issues"));
					console.log(chalk.gray("─".repeat(50)));
					for (const issue of analysis.criticalIssues) {
						console.log(chalk.red(`  • ${issue.patternName}`));
						console.log(chalk.gray(`    ${issue.recommendation}`));
					}
					console.log();
				}

				// Ask to apply recommendations
				if (analysis.recommendations.length > 0) {
					if (options.applyAll) {
						console.log(chalk.cyan("Applying all auto-fixable recommendations..."));
						await applyRecommendations(cwd, analysis.recommendations, {
							dryRun: options.dryRun,
							autoApply: true,
							interactive: false,
						});
					} else if (!options.dryRun) {
						const applyNow = await prompts.confirm({
							message: "Would you like to apply any recommendations now?",
							default: true,
						});

						if (applyNow) {
							await applyRecommendations(cwd, analysis.recommendations, {
								dryRun: false,
								autoApply: false,
								interactive: true,
							});
						}
					}
				}

				// Show next steps
				console.log(chalk.cyan.bold("Next Steps"));
				console.log(chalk.gray("─".repeat(50)));
				console.log("  1. Review and customize the generated context files");
				console.log(`  2. Run ${chalk.yellow("snap status")} to check workspace health`);
				console.log(`  3. Configure your AI tools with ${chalk.yellow("snap tools configure")}`);
				console.log();

				// Final message
				if (analysis.profile.healthScore >= 70) {
					status.success("Your workspace is well-configured for AI assistance!");
				} else if (analysis.profile.healthScore >= 40) {
					status.warning("Your workspace could benefit from additional context documentation.");
				} else {
					status.error("Your workspace needs attention. Consider addressing the critical issues above.");
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Onboarding failed:"), message);
				process.exit(1);
			}
		});
}
