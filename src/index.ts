import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { checkbox, confirm, input, search } from "@inquirer/prompts";
import type { Snapshot, SnapshotStorage } from "@snapback/contracts";
import { createSnapshotStorage } from "@snapback/contracts/types/snapshot";
import { Guardian } from "@snapback/core";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

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
	program.name("snapback").description("AI-safe code snapshots and risk analysis");

	program
		.command("analyze <file>")
		.option("-i, --interactive", "Interactive mode with detailed analysis")
		.option("-a, --ast", "Use AST-based analysis for deeper insights")
		.action(async (file) => {
			try {
				// Check if --ast flag was passed by examining process.argv
				const astFlag = process.argv.includes("--ast") || process.argv.includes("-a");

				const fullPath = resolve(process.cwd(), file);
				const text = await readFile(fullPath, "utf-8");

				const spinner = ora("Analyzing file...").start();
				const g = new Guardian();

				let risk: any;
				if (astFlag) {
					risk = await g.analyzeWithAST(text);
				} else {
					risk = await g.quickCheckDoc(text);
				}

				spinner.succeed("Analysis complete");
				console.log(chalk.cyan("Risk:"), risk);

				// Provide detailed feedback based on risk factors
				if (risk.factors.length > 0) {
					console.log(chalk.yellow("\nRisk Factors:"));
					risk.factors.forEach((factor: string) => {
						console.log(chalk.yellow(`  ⚠ ${factor}`));
					});
				}

				// Provide recommendations
				if (risk.score > 0.7) {
					console.log(
						chalk.red(
							"\nRecommendation: Consider creating a snapshot before proceeding with these changes.",
						),
					);
				} else if (risk.score > 0.4) {
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
				console.log(chalk.green("Created snapshot"), snap.id);
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

			console.table(
				snaps.map((s: Snapshot) => ({
					id: s.id.substring(0, 8),
					time: new Date(s.timestamp).toISOString(),
					...(s.meta?.message && { message: s.meta.message }),
				})),
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
		.action(async (options) => {
			try {
				// MVP Note: This pre-commit hook replaces the need for complex webhook integrations
				// For MVP, we'll implement a simplified version that checks for common risk patterns

				const spinner = options.quiet ? null : ora("Checking for risky changes...").start();

				// Get staged files (in a real implementation, this would use git commands)
				// For MVP, we'll just check all files in the current directory
				const cwd = process.cwd();
				const allFiles = await getAllFiles(cwd);

				// Filter for code files
				const codeFiles = allFiles.filter(
					(file) =>
						file.endsWith(".ts") ||
						file.endsWith(".tsx") ||
						file.endsWith(".js") ||
						file.endsWith(".jsx") ||
						file.endsWith(".py") ||
						file.endsWith(".java") ||
						file.endsWith(".cpp") ||
						file.endsWith(".c"),
				);

				if (codeFiles.length === 0) {
					if (spinner) {
						spinner.succeed("No code files to check");
					}
					return;
				}

				if (spinner) {
					spinner.text = `Analyzing ${codeFiles.length} files...`;
				}

				const g = new Guardian();
				let hasRiskyChanges = false;
				let riskCount = 0;

				// Check each file for risks
				for (const file of codeFiles) {
					try {
						const fullPath = resolve(cwd, file);
						const content = await readFile(fullPath, "utf-8");

						// Quick check for AI risk patterns
						const risk = await g.quickCheckDoc(content);

						if (risk.score > 0.5) {
							hasRiskyChanges = true;
							riskCount++;

							if (!options.quiet) {
								console.log(chalk.yellow(`⚠  Risk detected in ${file}: ${risk.score.toFixed(2)}`));
								if (risk.factors.length > 0) {
									risk.factors.forEach((factor: string) => {
										console.log(chalk.gray(`   - ${factor}`));
									});
								}
							}
						}
					} catch (_error) {
						// Skip files that can't be read or analyzed
						if (!options.quiet) {
							console.log(chalk.gray(`⚠  Could not analyze ${file}`));
						}
					}
				}

				if (hasRiskyChanges) {
					if (spinner) {
						spinner.warn(`Found risks in ${riskCount} files`);
					}

					if (options.snapshot) {
						// Create snapshot for risky changes
						const snapshotSpinner = ora("Creating snapshot...").start();
						try {
							const storage: SnapshotStorage = await createSnapshotStorage(cwd);
							const snap = await storage.create({
								description: "Pre-commit snapshot for risky AI changes",
								protected: true,
							});

							snapshotSpinner.succeed(`Snapshot created: ${snap.id.substring(0, 8)}`);
						} catch (error: any) {
							snapshotSpinner.fail("Failed to create snapshot");
							console.error(chalk.red("Error:"), error.message);
							process.exit(1);
						}
					} else if (!options.quiet) {
						console.log(
							chalk.yellow("\n💡 Recommendation: Consider creating a snapshot before committing"),
						);
						console.log(chalk.gray("Run with --snapshot flag to automatically create a snapshot"));
					}

					// Exit with error code to block commit (unless --no-verify is used)
					if (!options.quiet) {
						console.log(chalk.gray("\nTo bypass this check, use: git commit --no-verify"));
					}
					process.exit(1);
				} else {
					if (spinner) {
						spinner.succeed("No risky changes detected");
					}
				}
			} catch (error: any) {
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

	const useAst = await confirm({
		message: "Use AST-based analysis for deeper insights?",
		default: false,
	});

	const answers = { file, ast: useAst };

	try {
		const fullPath = resolve(process.cwd(), answers.file);
		const text = await readFile(fullPath, "utf-8");

		const spinner = ora("Analyzing file...").start();
		const g = new Guardian();

		let risk: any;
		if (answers.ast) {
			risk = await g.analyzeWithAST(text);
		} else {
			risk = await g.quickCheckDoc(text);
		}

		spinner.succeed("Analysis complete");
		console.log(chalk.cyan("Risk:"), risk);

		if (risk.factors.length > 0) {
			console.log(chalk.yellow("\nRisk Factors:"));
			risk.factors.forEach((factor: string) => {
				console.log(chalk.yellow(`  ⚠ ${factor}`));
			});
		}

		// Ask if user wants to create a snapshot
		const createSnapshot = await confirm({
			message: "Would you like to create a snapshot?",
			default: risk.score > 0.5,
		});

		if (createSnapshot) {
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
