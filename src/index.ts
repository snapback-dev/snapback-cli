import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { checkbox, confirm, input, search } from "@inquirer/prompts";
import type { Snapshot, SnapshotStorage } from "@snapback/contracts";
import { createSnapshotStorage } from "@snapback/contracts/types/snapshot";
import { CLIEngineAdapter } from "@snapback/engine/transports/cli";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
// New CLI commands
import {
	createInitCommand,
	createLearnCommand,
	createLoginCommand,
	createLogoutCommand,
	createPatternsCommand,
	createProtectCommand,
	createSessionCommand,
	createStatusCommand,
	createToolsCommand,
	createWatchCommand,
	createWhoamiCommand,
} from "./commands";
// CLI-UX-002: Git Client for staged files
import { GitClient, GitNotInstalledError, GitNotRepositoryError, isCodeFile } from "./services/git-client";
// CLI-UX-001, 003, 004: UX Utilities
import {
	createFileSummaryTable,
	createRiskSignalTable,
	createSnapshotTable,
	displayHighRiskWarning,
	displaySaveStory,
	displaySnapshotSuccess,
	type FileRiskSummary,
	ProgressTracker,
} from "./utils";

// V2 Engine adapter instance (replaces V1 Guardian)
const engineAdapter = new CLIEngineAdapter();

// Helper function to recursively get all files
async function getAllFiles(dir: string, baseDir: string = dir): Promise<string[]> {
	const files: string[] = [];
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			// Skip node_modules, .git, and other common ignore patterns
			if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) {
				continue;
			}
			if (entry.isDirectory()) {
				files.push(...(await getAllFiles(fullPath, baseDir)));
			} else {
				files.push(relative(baseDir, fullPath));
			}
		}
	} catch {
		// Ignore permission errors
	}
	return files;
}

export function createCLI() {
	const program = new Command();
	program.name("snapback").description("AI-safe code snapshots and risk analysis").alias("snap");

	// =========================================================================
	// NEW COMMANDS - Customer MCP System
	// =======================================================================

	// Auth commands
	program.addCommand(createLoginCommand());
	program.addCommand(createLogoutCommand());
	program.addCommand(createWhoamiCommand());

	// Workspace management
	program.addCommand(createInitCommand());
	program.addCommand(createStatusCommand());

	// MCP tools configuration
	program.addCommand(createToolsCommand());

	// Protection management
	program.addCommand(createProtectCommand());

	// Session management
	program.addCommand(createSessionCommand());

	// Learning system
	program.addCommand(createLearnCommand());
	program.addCommand(createPatternsCommand());

	// Continuous watching
	program.addCommand(createWatchCommand());

	// =========================================================================
	// EXISTING COMMANDS
	// =========================================================================

	program
		.command("analyze <file>")
		.option("-i, --interactive", "Interactive mode with detailed analysis")
		.option("-a, --ast", "Use AST-based analysis for deeper insights")
		.action(async (file) => {
			try {
				const fullPath = resolve(process.cwd(), file);
				const text = await readFile(fullPath, "utf-8");

				const spinner = ora("Analyzing file...").start();

				// Use V2 engine adapter for analysis
				const result = await engineAdapter.analyze({
					files: [{ path: file, content: text }],
					format: "json",
				});

				spinner.succeed("Analysis complete");

				// Parse the JSON output if available
				let riskData: {
					riskScore: number;
					riskLevel: string;
					signals?: Array<{ signal: string; value: number }>;
				};
				try {
					riskData = JSON.parse(result.output);
				} catch {
					riskData = { riskScore: result.riskScore, riskLevel: result.riskLevel };
				}

				console.log(chalk.cyan("Risk Level:"), riskData.riskLevel.toUpperCase());
				console.log(chalk.cyan("Risk Score:"), `${riskData.riskScore.toFixed(1)}/10`);

				// Display risk signals in formatted table (CLI-UX-003)
				if (riskData.signals && riskData.signals.length > 0) {
					console.log();
					console.log(createRiskSignalTable(riskData.signals));
				}

				// Display boxed warning for high-risk files (CLI-UX-001)
				if (riskData.riskScore > 7) {
					console.log();
					console.log(displayHighRiskWarning(file, riskData.riskScore));
				} else if (riskData.riskScore > 4) {
					console.log(chalk.yellow("\nRecommendation: Review changes before proceeding."));
				}
			} catch (error: any) {
				console.error(chalk.red("Error:"), error.message);
				process.exit(1);
			}
		});

	program
		.command("snapshot")
		.option("-m, --message <message>", "Add a message to the snapshot")
		.option("-f, --files <files...>", "Specify files to include in snapshot")
		.action(async (options) => {
			const spinner = ora("Creating snapshot...").start();

			try {
				const storage: SnapshotStorage = await createSnapshotStorage(process.cwd());
				const snap = await storage.create({
					description: options.message,
					protected: false,
					...(options.files && { files: options.files }),
				});

				spinner.succeed("Snapshot created");

				// Display boxed success output (CLI-UX-001)
				console.log();
				console.log(displaySnapshotSuccess(snap.id, options.message, options.files?.length || 0));
			} catch (error: any) {
				spinner.fail("Failed to create snapshot");
				console.error(chalk.red("Error:"), error.message);
				process.exit(1);
			}
		});

	program.command("list").action(async () => {
		const spinner = ora("Loading snapshots...").start();

		try {
			const storage: SnapshotStorage = await createSnapshotStorage(process.cwd());
			const snaps = await storage.list();

			spinner.succeed("Snapshots loaded");

			if (snaps.length === 0) {
				console.log(chalk.yellow("No snapshots found"));
				return;
			}

			// Display snapshots in formatted table (CLI-UX-003)
			console.log();
			console.log(
				createSnapshotTable(
					snaps.map((s: Snapshot) => ({
						id: s.id,
						timestamp: new Date(s.timestamp),
						message: s.meta?.message,
						fileCount: s.files?.length,
					})),
				),
			);
		} catch (error: any) {
			spinner.fail("Failed to load snapshots");
			console.error(chalk.red("Error:"), error.message);
			process.exit(1);
		}
	});

	program
		.command("interactive")
		.description("Interactive mode with guided workflow")
		.action(async () => {
			console.log(chalk.blue("Welcome to SnapBack Interactive Mode!"));

			const action = await search({
				message: "What would you like to do?",
				source: async (term) => {
					const choices = [
						{ name: "Analyze a file", value: "analyze" },
						{ name: "Create a snapshot", value: "snapshot" },
						{ name: "List snapshots", value: "list" },
						{ name: "Exit", value: "exit" },
					];
					if (!term) {
						return choices;
					}
					return choices.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()));
				},
			});

			switch (action) {
				case "analyze":
					await interactiveAnalyze();
					break;
				case "snapshot":
					await interactiveSnapshot();
					break;
				case "list":
					await interactiveList();
					break;
				case "exit":
					console.log(chalk.blue("Goodbye!"));
					process.exit(0);
			}
		});

	program
		.command("check")
		.description("Pre-commit hook to check for risky AI changes")
		.option("-s, --snapshot", "Create snapshot if risky changes detected")
		.option("-q, --quiet", "Suppress output unless issues found")
		.option("-a, --all", "Check all files, not just staged (legacy behavior)")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// CLI-UX-002: Use GitClient for staged files
				const git = new GitClient({ cwd });

				// Validate git environment
				if (!(await git.isGitInstalled())) {
					throw new GitNotInstalledError();
				}

				if (!(await git.isGitRepository())) {
					throw new GitNotRepositoryError(cwd);
				}

				// Get files to check
				let filesToCheck: string[];

				if (options.all) {
					// Legacy behavior: all files
					const allFiles = await getAllFiles(cwd);
					filesToCheck = allFiles.filter(isCodeFile);
				} else {
					// New behavior: staged files only (CLI-UX-002)
					const stagedFiles = await git.getStagedFiles();
					filesToCheck = stagedFiles
						.filter((f) => f.status !== "deleted")
						.filter((f) => isCodeFile(f.path))
						.map((f) => f.path);
				}

				if (filesToCheck.length === 0) {
					if (!options.quiet) {
						console.log(chalk.green("\u2713 No staged code files to check"));
					}
					return;
				}

				// CLI-UX-004: Use ProgressTracker for real-time feedback
				const progress = new ProgressTracker({
					total: filesToCheck.length,
					label: "Analyzing",
					quiet: options.quiet,
				});

				progress.start();

				const fileResults: FileRiskSummary[] = [];
				let hasRiskyChanges = false;

				for (const file of filesToCheck) {
					progress.update(file);

					try {
						// Get content - staged version or working directory
						const content = options.all
							? await readFile(resolve(cwd, file), "utf-8")
							: await git.getStagedContent(file);

						const result = await engineAdapter.analyze({
							files: [{ path: file, content }],
							format: "json",
							quiet: true,
						});

						let signals: Array<{ signal: string; value: number }> = [];
						try {
							const data = JSON.parse(result.output);
							signals = data.signals || [];
						} catch {
							// Output wasn't JSON
						}

						const riskLevel = result.riskScore > 7 ? "high" : result.riskScore > 4 ? "medium" : "low";

						fileResults.push({
							file,
							riskScore: result.riskScore,
							riskLevel,
							topSignal: signals.filter((s) => s.value > 0)[0]?.signal,
						});

						if (result.riskScore > 5) {
							hasRiskyChanges = true;
						}
					} catch {
						// Skip files that can't be analyzed (binary, permissions, etc.)
					}
				}

				// Summary statistics
				const highRisk = fileResults.filter((f) => f.riskScore > 7).length;
				const mediumRisk = fileResults.filter((f) => f.riskScore > 4 && f.riskScore <= 7).length;

				if (hasRiskyChanges) {
					progress.fail(
						`Found risks in ${highRisk + mediumRisk} files (${highRisk} high, ${mediumRisk} medium) - ${progress.getElapsed()}`,
					);

					// CLI-UX-003: Display results in formatted table
					if (!options.quiet && fileResults.length > 0) {
						console.log();
						console.log(chalk.cyan("Analysis Results:"));
						console.log(createFileSummaryTable(fileResults));
					}

					if (options.snapshot) {
						const snapshotSpinner = ora("Creating snapshot...").start();
						try {
							const storage: SnapshotStorage = await createSnapshotStorage(cwd);
							const snap = await storage.create({
								description: "Pre-commit snapshot for risky AI changes",
								protected: true,
							});

							snapshotSpinner.succeed(`Snapshot created: ${snap.id.substring(0, 8)}`);

							// CLI-UX-001: Display save story
							const maxRiskScore = Math.max(...fileResults.map((f) => f.riskScore));
							console.log();
							console.log(
								displaySaveStory(
									maxRiskScore,
									fileResults.map((f) => f.file),
									snap.id,
								),
							);
						} catch (error: any) {
							snapshotSpinner.fail("Failed to create snapshot");
							console.error(chalk.red("Error:"), error.message);
							process.exit(1);
						}
					} else if (!options.quiet) {
						console.log(
							chalk.yellow(
								"\n\ud83d\udca1 Recommendation: Consider creating a snapshot before committing",
							),
						);
						console.log(chalk.gray("Run with --snapshot flag to automatically create a snapshot"));
					}

					if (!options.quiet) {
						console.log(chalk.gray("\nTo bypass this check, use: git commit --no-verify"));
					}
					process.exit(1);
				} else {
					progress.complete(
						`No risky changes detected in ${filesToCheck.length} files - ${progress.getElapsed()}`,
					);
				}
			} catch (error: any) {
				if (error instanceof GitNotInstalledError) {
					console.error(chalk.red("Error:"), "Git must be installed to use the check command");
					console.log(chalk.gray("Install git: https://git-scm.com/downloads"));
					process.exit(1);
				}

				if (error instanceof GitNotRepositoryError) {
					console.error(chalk.red("Error:"), "This command must be run inside a git repository");
					console.log(chalk.gray("Initialize with: git init"));
					process.exit(1);
				}

				if (!options.quiet) {
					console.error(chalk.red("Error:"), error.message);
				}
				process.exit(1);
			}
		});

	return program;
}

async function interactiveAnalyze() {
	const cwd = process.cwd();
	const allFiles = await getAllFiles(cwd);

	const file = await search({
		message: "Search for the file you want to analyze:",
		source: async (term) => {
			if (!term) {
				return allFiles.slice(0, 10).map((f) => ({ value: f }));
			}
			const filtered = allFiles.filter((f) => f.toLowerCase().includes(term.toLowerCase()));
			return filtered.slice(0, 10).map((f) => ({ value: f }));
		},
	});

	// Note: AST option is now handled internally by V2 engine signals (complexity, cycles)
	const answers = { file };

	try {
		const fullPath = resolve(process.cwd(), answers.file);
		const text = await readFile(fullPath, "utf-8");

		const spinner = ora("Analyzing file...").start();

		// Use V2 engine adapter for analysis
		const result = await engineAdapter.analyze({
			files: [{ path: answers.file, content: text }],
			format: "json",
		});

		spinner.succeed("Analysis complete");

		// Parse and display results
		let riskData: { riskScore: number; riskLevel: string; signals?: Array<{ signal: string; value: number }> };
		try {
			riskData = JSON.parse(result.output);
		} catch {
			riskData = { riskScore: result.riskScore, riskLevel: result.riskLevel };
		}

		console.log(chalk.cyan("Risk Level:"), riskData.riskLevel.toUpperCase());
		console.log(chalk.cyan("Risk Score:"), `${riskData.riskScore.toFixed(1)}/10`);

		if (riskData.signals && riskData.signals.length > 0) {
			const activeSignals = riskData.signals.filter((s) => s.value > 0);
			if (activeSignals.length > 0) {
				console.log(chalk.yellow("\nRisk Factors:"));
				activeSignals.forEach((signal) => {
					console.log(chalk.yellow(`  ⚠ ${signal.signal}: ${signal.value.toFixed(1)}`));
				});
			}
		}

		// Ask if user wants to create a snapshot (V2 uses 0-10 scale, 5 = medium risk)
		const createSnapshotPrompt = await confirm({
			message: "Would you like to create a snapshot?",
			default: riskData.riskScore > 5,
		});

		if (createSnapshotPrompt) {
			await interactiveSnapshot({ files: [answers.file] });
		}
	} catch (error: any) {
		console.error(chalk.red("Error:"), error.message);
	}
}

async function interactiveSnapshot(options: { files?: string[] } = {}) {
	const message = await input({
		message: "Add a message to your snapshot (optional):",
		default: "",
	});

	let files: string[] = options.files || [];

	if (!options.files || options.files.length === 0) {
		const includeFiles = await confirm({
			message: "Include specific files in this snapshot?",
			default: false,
		});

		if (includeFiles) {
			const cwd = process.cwd();
			const allFiles = await getAllFiles(cwd);

			files = await checkbox({
				message: "Select files to include in snapshot (use space to select):",
				choices: allFiles.slice(0, 50).map((f) => ({ value: f, name: f })),
			});
		}
	}

	const spinner = ora("Creating snapshot...").start();

	try {
		const storage: SnapshotStorage = await createSnapshotStorage(process.cwd());
		const snap = await storage.create({
			description: message,
			protected: false,
			...(files.length > 0 && { files }),
		});

		spinner.succeed("Snapshot created");
		console.log(chalk.green("Created snapshot"), snap.id);
	} catch (error: any) {
		spinner.fail("Failed to create snapshot");
		console.error(chalk.red("Error:"), error.message);
	}
}

async function interactiveList() {
	const spinner = ora("Loading snapshots...").start();

	try {
		const storage: SnapshotStorage = await createSnapshotStorage(process.cwd());
		const snaps: Snapshot[] = await storage.list();

		spinner.succeed("Snapshots loaded");

		if (snaps.length === 0) {
			console.log(chalk.yellow("No snapshots found"));
			return;
		}

		// Show detailed snapshot information
		console.log(chalk.blue("\nSnapshots:"));
		snaps.forEach((snap: Snapshot, index: number) => {
			console.log(chalk.gray(`\n${index + 1}. ${snap.id.substring(0, 8)}`));
			console.log(chalk.gray(`   Time: ${new Date(snap.timestamp).toISOString()}`));
			if (snap.meta?.message) {
				console.log(chalk.gray(`   Message: ${snap.meta.message}`));
			}
			// Note: The storage interface doesn't currently support files property
			// This would need to be added to the storage interface if needed
		});
	} catch (error: any) {
		spinner.fail("Failed to load snapshots");
		console.error(chalk.red("Error:"), error.message);
	}
}

// Only execute the CLI if this file is run directly
if (import.meta.url === new URL(process.argv[1], `file://${process.platform === "win32" ? "/" : ""}`).href) {
	const program = createCLI();
	program.parseAsync(process.argv);
}

// Export the program for testing
export const program = createCLI();
