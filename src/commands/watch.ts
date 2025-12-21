/**
 * Watch Command
 *
 * Implements snap watch - Continuous file watching daemon for behavioral learning.
 *
 * Usage:
 *   snap watch              # Start watching (foreground)
 *   snap watch --verbose    # With detailed logging
 *   snap watch stop         # Not implemented yet (uses Ctrl+C)
 *   snap watch status       # Show watcher status
 *
 * @see implementation_plan.md - behavioral learning
 * @see the_vision.md - "learnFromBehavior" concept
 */

import chalk from "chalk";
import { Command } from "commander";

import { isSnapbackInitialized } from "../services/snapback-dir";
import { analyzeBehavioralSignals, createWatcher, getBehavioralSignals, type WatcherStats } from "../services/watcher";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the watch command
 */
export function createWatchCommand(): Command {
	const watch = new Command("watch")
		.description("Start file watcher for behavioral learning")
		.option("-v, --verbose", "Enable verbose logging")
		.option("--depth <number>", "Max directory depth", "10")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized in this workspace"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				console.log(chalk.cyan("SnapBack Watch"));
				console.log(chalk.gray("Continuous behavioral learning daemon"));
				console.log();

				// Create watcher
				const watcher = createWatcher({
					workspaceRoot: cwd,
					verbose: options.verbose,
					depth: Number.parseInt(options.depth, 10),
				});

				// Set up event handlers
				watcher.on("ready", (stats: WatcherStats) => {
					console.log(chalk.green("✓"), `Watching ${stats.filesWatched} files`);
					console.log(chalk.gray("  Press Ctrl+C to stop"));
					console.log();
				});

				watcher.on(
					"change",
					(path: string, meta: { isCritical: boolean; isRisky: boolean; changeCount: number }) => {
						const icon = meta.isCritical
							? chalk.red("●")
							: meta.isRisky
								? chalk.yellow("●")
								: chalk.blue("●");
						console.log(`${icon} ${chalk.dim("changed:")} ${path}`);

						if (meta.isCritical && meta.changeCount === 1) {
							console.log(chalk.yellow(`  → Consider: snap protect add "${path}"`));
						}
					},
				);

				watcher.on("add", (path: string) => {
					console.log(`${chalk.green("+")} ${chalk.dim("added:")} ${path}`);
				});

				watcher.on("unlink", (path: string) => {
					console.log(`${chalk.red("-")} ${chalk.dim("deleted:")} ${path}`);
				});

				watcher.on("signal", (signal: { path: string; suggestion?: string }) => {
					if (signal.suggestion) {
						console.log(chalk.yellow("💡"), signal.suggestion);
					}
				});

				watcher.on("pattern", (pattern: { type: string; message: string }) => {
					if (pattern.type === "PROMOTION_READY") {
						console.log(chalk.magenta("📊"), pattern.message);
						console.log(chalk.gray("   Run: snap patterns promote"));
					} else if (pattern.type === "FREQUENTLY_CHANGED") {
						console.log(chalk.yellow("📈"), pattern.message);
					}
				});

				watcher.on("error", (error: Error) => {
					console.error(chalk.red("Error:"), error.message);
				});

				// Handle graceful shutdown
				const shutdown = async () => {
					console.log();
					console.log(chalk.gray("Stopping watcher..."));
					await watcher.stop();

					const stats = watcher.getStats();
					console.log();
					console.log(chalk.cyan("Session Summary:"));
					console.log(`  Signals recorded: ${stats.signalsRecorded}`);
					console.log(`  Patterns detected: ${stats.patternsDetected}`);

					if (stats.signalsRecorded > 0) {
						console.log();
						console.log(chalk.gray("Analyze with: snap watch analyze"));
					}

					process.exit(0);
				};

				process.on("SIGINT", shutdown);
				process.on("SIGTERM", shutdown);

				// Start watching
				await watcher.start();

				// Keep process alive
				await new Promise(() => {});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Add status subcommand
	watch
		.command("status")
		.description("Show watcher statistics")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const signals = await getBehavioralSignals(cwd);

				// Compute stats
				const stats = {
					totalSignals: signals.length,
					byType: {} as Record<string, number>,
					mostChanged: [] as { path: string; count: number }[],
					criticalChanges: 0,
				};

				const fileCounts = new Map<string, number>();

				for (const signal of signals) {
					stats.byType[signal.type] = (stats.byType[signal.type] || 0) + 1;

					if (signal.type === "file_change") {
						fileCounts.set(signal.path, (fileCounts.get(signal.path) || 0) + 1);
					}

					if (signal.metadata?.critical) {
						stats.criticalChanges++;
					}
				}

				// Top 5 most changed
				stats.mostChanged = [...fileCounts.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5)
					.map(([path, count]) => ({ path, count }));

				if (options.json) {
					console.log(JSON.stringify(stats, null, 2));
					return;
				}

				console.log(chalk.cyan("Watcher Statistics:"));
				console.log();
				console.log(`  Total signals:     ${stats.totalSignals}`);
				console.log(`  Critical changes:  ${stats.criticalChanges}`);
				console.log();

				if (Object.keys(stats.byType).length > 0) {
					console.log(chalk.gray("By Type:"));
					for (const [type, count] of Object.entries(stats.byType)) {
						console.log(`  ${type}: ${count}`);
					}
					console.log();
				}

				if (stats.mostChanged.length > 0) {
					console.log(chalk.gray("Most Changed Files:"));
					for (const { path, count } of stats.mostChanged) {
						console.log(`  ${count}x  ${path}`);
					}
				}

				if (stats.totalSignals === 0) {
					console.log(chalk.gray("No behavioral data yet."));
					console.log(chalk.gray("Start watching: snap watch"));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Add analyze subcommand
	watch
		.command("analyze")
		.description("Analyze behavioral signals and generate learnings")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const learnings = await analyzeBehavioralSignals(cwd);

				if (options.json) {
					console.log(JSON.stringify(learnings, null, 2));
					return;
				}

				if (learnings.length === 0) {
					console.log(chalk.yellow("No actionable patterns detected yet."));
					console.log(chalk.gray("Continue using snap watch to collect more data."));
					return;
				}

				console.log(chalk.cyan(`Behavioral Insights (${learnings.length}):`));
				console.log();

				for (const learning of learnings) {
					console.log(chalk.bold(`💡 ${learning.trigger}`));
					console.log(`   ${learning.action}`);
					console.log();
				}

				console.log(chalk.gray('Record as learning: snap learn "trigger" "action"'));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return watch;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { createWatchCommand as default };
