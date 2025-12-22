/**
 * Fix Command
 *
 * Implements snap fix <issue> - Auto-fix detected issues.
 * Issues are detected by snap status and can be resolved with this command.
 *
 * Available fixes:
 * - missing-gitignore: Add .snapback to .gitignore
 * - no-protection: Auto-detect and protect critical files
 * - stale-session: End stale session
 * - high-violations: Show violation patterns for learning
 * - not-logged-in: Prompt to login
 *
 * @see implementation_plan.md Section 1.2
 */

import { access, appendFile, constants, readFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";

import {
	endCurrentSession,
	getCurrentSession,
	getProtectedFiles,
	getViolations,
	getWorkspaceVitals,
	isSnapbackInitialized,
	type ProtectedFile,
	saveProtectedFiles,
} from "../services/snapback-dir";
import { displayBox } from "../utils/display";

// =============================================================================
// TYPES
// =============================================================================

interface FixResult {
	success: boolean;
	message: string;
	details?: string[];
}

type FixFunction = (workspaceRoot: string, dryRun: boolean) => Promise<FixResult>;

// =============================================================================
// FIX REGISTRY
// =============================================================================

const FIXES: Record<string, { description: string; fix: FixFunction }> = {
	"missing-gitignore": {
		description: "Add .snapback to .gitignore",
		fix: fixMissingGitignore,
	},
	"no-protection": {
		description: "Auto-detect and protect critical files",
		fix: fixNoProtection,
	},
	"stale-session": {
		description: "End stale session (>24h old)",
		fix: fixStaleSession,
	},
	"high-violations": {
		description: "Review and learn from violation patterns",
		fix: fixHighViolations,
	},
	"not-logged-in": {
		description: "Login to SnapBack for full features",
		fix: fixNotLoggedIn,
	},
};

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the fix command
 */
export function createFixCommand(): Command {
	const fix = new Command("fix")
		.description("Auto-fix detected issues")
		.argument("[issue]", "Issue ID to fix (from snap status)")
		.option("--dry-run", "Show what would be fixed without making changes")
		.option("--all", "Fix all detected issues")
		.option("--list", "List all available fixes")
		.action(async (issue: string | undefined, options) => {
			const cwd = process.cwd();

			try {
				// List all fixes
				if (options.list) {
					displayAvailableFixes();
					return;
				}

				// Check if initialized
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized in this workspace"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				// Fix all issues
				if (options.all) {
					await fixAll(cwd, options.dryRun);
					return;
				}

				// Single issue fix
				if (!issue) {
					console.log(chalk.yellow("No issue specified"));
					console.log();
					console.log("Usage:");
					console.log(chalk.gray("  snap fix <issue-id>    Fix a specific issue"));
					console.log(chalk.gray("  snap fix --all         Fix all detected issues"));
					console.log(chalk.gray("  snap fix --list        List all available fixes"));
					console.log();
					console.log("Run", chalk.cyan("snap status"), "to see detected issues.");
					return;
				}

				// Validate issue
				const fixer = FIXES[issue];
				if (!fixer) {
					console.log(chalk.red(`Unknown issue: ${issue}`));
					console.log();
					displayAvailableFixes();
					return;
				}

				// Apply fix
				if (options.dryRun) {
					console.log(chalk.cyan("Dry run:"), `Would fix "${issue}"`);
					console.log(chalk.gray(`  ${fixer.description}`));
				}

				const result = await fixer.fix(cwd, options.dryRun);

				if (result.success) {
					if (options.dryRun) {
						console.log(chalk.cyan("✓"), result.message);
					} else {
						console.log(chalk.green("✓"), result.message);
					}
				} else {
					console.log(chalk.yellow("○"), result.message);
				}

				if (result.details && result.details.length > 0) {
					for (const detail of result.details) {
						console.log(chalk.gray(`  ${detail}`));
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return fix;
}

// =============================================================================
// FIX IMPLEMENTATIONS
// =============================================================================

/**
 * Fix missing .gitignore entry for .snapback
 */
async function fixMissingGitignore(workspaceRoot: string, dryRun: boolean): Promise<FixResult> {
	const gitignorePath = join(workspaceRoot, ".gitignore");

	try {
		// Check if .gitignore exists
		await access(gitignorePath, constants.F_OK);

		// Read current content
		const content = await readFile(gitignorePath, "utf-8");

		// Check if already has .snapback
		if (content.includes(".snapback")) {
			return {
				success: false,
				message: ".snapback already in .gitignore",
			};
		}

		// Prepare addition
		const addition = "\n# SnapBack snapshots (large binary data)\n.snapback/snapshots/\n.snapback/embeddings.db\n";

		if (dryRun) {
			return {
				success: true,
				message: "Would add .snapback entries to .gitignore",
				details: [".snapback/snapshots/", ".snapback/embeddings.db"],
			};
		}

		// Append to .gitignore
		await appendFile(gitignorePath, addition);

		return {
			success: true,
			message: "Added .snapback entries to .gitignore",
			details: [".snapback/snapshots/", ".snapback/embeddings.db"],
		};
	} catch {
		// No .gitignore exists, create one
		if (dryRun) {
			return {
				success: true,
				message: "Would create .gitignore with .snapback entries",
			};
		}

		const content = "# SnapBack snapshots (large binary data)\n.snapback/snapshots/\n.snapback/embeddings.db\n";
		const { writeFile } = await import("node:fs/promises");
		await writeFile(gitignorePath, content);

		return {
			success: true,
			message: "Created .gitignore with .snapback entries",
		};
	}
}

/**
 * Fix no protection by auto-detecting critical files
 */
async function fixNoProtection(workspaceRoot: string, dryRun: boolean): Promise<FixResult> {
	const currentProtected = await getProtectedFiles(workspaceRoot);

	if (currentProtected.length > 0) {
		return {
			success: false,
			message: `Already have ${currentProtected.length} protected files`,
		};
	}

	// Get vitals to know what framework we're dealing with
	const vitals = await getWorkspaceVitals(workspaceRoot);

	// Auto-detect critical files
	const criticalPatterns = await detectCriticalPatterns(workspaceRoot, vitals?.framework);

	if (criticalPatterns.length === 0) {
		return {
			success: false,
			message: "No critical files detected to protect",
		};
	}

	if (dryRun) {
		return {
			success: true,
			message: `Would protect ${criticalPatterns.length} critical file patterns`,
			details: criticalPatterns.map((p) => p.pattern),
		};
	}

	// Save protected files
	await saveProtectedFiles(criticalPatterns, workspaceRoot);

	return {
		success: true,
		message: `Protected ${criticalPatterns.length} critical file patterns`,
		details: criticalPatterns.map((p) => `${p.pattern} (${p.reason})`),
	};
}

/**
 * Fix stale session by ending it
 */
async function fixStaleSession(workspaceRoot: string, dryRun: boolean): Promise<FixResult> {
	const session = await getCurrentSession(workspaceRoot);

	if (!session) {
		return {
			success: false,
			message: "No active session",
		};
	}

	const sessionStart = new Date(session.startedAt);
	const hoursSinceStart = (Date.now() - sessionStart.getTime()) / (1000 * 60 * 60);

	if (hoursSinceStart <= 24) {
		return {
			success: false,
			message: `Session is only ${Math.floor(hoursSinceStart)}h old (not stale)`,
		};
	}

	if (dryRun) {
		return {
			success: true,
			message: `Would end stale session (${Math.floor(hoursSinceStart)}h old)`,
			details: [
				`ID: ${session.id.substring(0, 8)}`,
				session.task ? `Task: ${session.task}` : "(no task)",
				`Snapshots: ${session.snapshotCount}`,
			],
		};
	}

	// Archive and end session
	const { appendSnapbackJsonl } = await import("../services/snapback-dir");
	await appendSnapbackJsonl(
		"session/history.jsonl",
		{
			...session,
			endedAt: new Date().toISOString(),
			endMessage: "Auto-ended by snap fix (stale session)",
		},
		workspaceRoot,
	);
	await endCurrentSession(workspaceRoot);

	return {
		success: true,
		message: `Ended stale session (${Math.floor(hoursSinceStart)}h old)`,
		details: [`ID: ${session.id.substring(0, 8)}`, `Snapshots: ${session.snapshotCount}`],
	};
}

/**
 * Fix high violations by showing patterns and suggesting learnings
 */
async function fixHighViolations(workspaceRoot: string, _dryRun: boolean): Promise<FixResult> {
	const violations = await getViolations(workspaceRoot);
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const recentViolations = violations.filter((v) => new Date(v.date) > oneWeekAgo);

	if (recentViolations.length <= 5) {
		return {
			success: false,
			message: `Only ${recentViolations.length} violations this week (threshold: >5)`,
		};
	}

	// Group violations by type
	const byType: Record<string, number> = {};
	for (const v of recentViolations) {
		byType[v.type] = (byType[v.type] || 0) + 1;
	}

	// Sort by frequency
	const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);

	const details = sorted.map(([type, count]) => {
		const emoji = count >= 3 ? "🔴" : count >= 2 ? "🟡" : "⚪";
		const promoted = count >= 3 ? " (pattern candidate)" : "";
		return `${emoji} ${type}: ${count} occurrences${promoted}`;
	});

	// Show the violations summary
	console.log();
	console.log(
		displayBox(
			`${chalk.yellow("High Violation Count")}\n\n` +
				`${recentViolations.length} violations in the last week.\n` +
				"Review these patterns to prevent future issues.\n\n" +
				details.join("\n"),
			{ type: "warning" },
		),
	);

	return {
		success: true,
		message: "Violation patterns analyzed",
		details: [
			"Patterns with 3+ occurrences are candidates for automation.",
			"Run: snap patterns list  to see promoted patterns",
			'Run: snap learn "<trigger>" "<action>"  to record learnings',
		],
	};
}

/**
 * Fix not logged in by prompting to login
 */
async function fixNotLoggedIn(_workspaceRoot: string, _dryRun: boolean): Promise<FixResult> {
	console.log();
	console.log(
		displayBox(
			`${chalk.cyan("Login for Full Features")}\n\n` +
				"Some features require a SnapBack account:\n" +
				"• Pro tier: Snapshots, recovery, advanced protection\n" +
				"• Free tier: Risk analysis, pattern tracking\n\n" +
				`${chalk.bold("Run:")} snap login`,
			{ type: "info" },
		),
	);

	return {
		success: true,
		message: "Login instructions displayed",
		details: ["Run: snap login"],
	};
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Display list of available fixes
 */
function displayAvailableFixes(): void {
	console.log(chalk.cyan("Available Fixes:"));
	console.log();

	for (const [id, { description }] of Object.entries(FIXES)) {
		console.log(`  ${chalk.bold(id)}`);
		console.log(chalk.gray(`    ${description}`));
	}

	console.log();
	console.log(chalk.gray("Usage: snap fix <issue-id>"));
	console.log(chalk.gray("       snap fix --all"));
}

/**
 * Fix all detected issues
 */
async function fixAll(workspaceRoot: string, dryRun: boolean): Promise<void> {
	console.log(chalk.cyan(dryRun ? "Dry run: Would fix all issues" : "Fixing all detected issues..."));
	console.log();

	let fixedCount = 0;
	let skippedCount = 0;

	for (const [id, { description, fix }] of Object.entries(FIXES)) {
		process.stdout.write(`  ${id}... `);

		try {
			const result = await fix(workspaceRoot, dryRun);

			if (result.success) {
				console.log(chalk.green("✓"), chalk.gray(result.message));
				fixedCount++;
			} else {
				console.log(chalk.gray("○"), chalk.gray(result.message));
				skippedCount++;
			}
		} catch (error) {
			console.log(chalk.red("✗"), chalk.gray(error instanceof Error ? error.message : "Unknown error"));
		}
	}

	console.log();
	console.log(chalk.gray(`Fixed: ${fixedCount}, Skipped: ${skippedCount}`));
}

/**
 * Detect critical file patterns based on what exists in the workspace
 */
async function detectCriticalPatterns(workspaceRoot: string, framework?: string): Promise<ProtectedFile[]> {
	const patterns: ProtectedFile[] = [];
	const now = new Date().toISOString();

	// Environment files (always check)
	const envPatterns = [".env", ".env.local", ".env.production", ".env.development"];
	for (const pattern of envPatterns) {
		try {
			await access(join(workspaceRoot, pattern), constants.F_OK);
			patterns.push({
				pattern,
				addedAt: now,
				reason: "Environment variables",
			});
		} catch {
			// File doesn't exist
		}
	}

	// Add glob patterns for env files
	patterns.push({
		pattern: ".env.*",
		addedAt: now,
		reason: "Environment variables (all variants)",
	});

	// Configuration files
	const configPatterns = ["tsconfig.json", "package.json", "pnpm-lock.yaml", "yarn.lock", "package-lock.json"];
	for (const pattern of configPatterns) {
		try {
			await access(join(workspaceRoot, pattern), constants.F_OK);
			patterns.push({
				pattern,
				addedAt: now,
				reason: "Configuration file",
			});
		} catch {
			// File doesn't exist
		}
	}

	// Config file globs
	patterns.push({
		pattern: "*.config.js",
		addedAt: now,
		reason: "Configuration files",
	});
	patterns.push({
		pattern: "*.config.ts",
		addedAt: now,
		reason: "Configuration files",
	});

	// Framework-specific patterns
	if (framework) {
		const frameworkPatterns = getFrameworkPatterns(framework);
		patterns.push(...frameworkPatterns.map((p) => ({ ...p, addedAt: now })));
	}

	// Database/Auth patterns
	const criticalDirs = [
		{ dir: "prisma", pattern: "prisma/**", reason: "Database schema" },
		{ dir: "drizzle", pattern: "drizzle/**", reason: "Database schema" },
		{ dir: "src/auth", pattern: "src/auth/**", reason: "Authentication" },
		{ dir: "src/lib/auth", pattern: "src/lib/auth/**", reason: "Authentication" },
		{ dir: "app/api/auth", pattern: "app/api/auth/**", reason: "Authentication API" },
	];

	for (const { dir, pattern, reason } of criticalDirs) {
		try {
			await access(join(workspaceRoot, dir), constants.F_OK);
			patterns.push({
				pattern,
				addedAt: now,
				reason,
			});
		} catch {
			// Directory doesn't exist
		}
	}

	return patterns;
}

/**
 * Get framework-specific protection patterns
 */
function getFrameworkPatterns(framework: string): Omit<ProtectedFile, "addedAt">[] {
	const patterns: Omit<ProtectedFile, "addedAt">[] = [];

	switch (framework.toLowerCase()) {
		case "next.js":
		case "nextjs":
			patterns.push({
				pattern: "next.config.*",
				reason: "Next.js configuration",
			});
			patterns.push({
				pattern: "middleware.ts",
				reason: "Next.js middleware",
			});
			break;

		case "nuxt":
			patterns.push({
				pattern: "nuxt.config.*",
				reason: "Nuxt configuration",
			});
			break;

		case "sveltekit":
			patterns.push({
				pattern: "svelte.config.js",
				reason: "SvelteKit configuration",
			});
			break;

		case "astro":
			patterns.push({
				pattern: "astro.config.*",
				reason: "Astro configuration",
			});
			break;

		case "remix":
			patterns.push({
				pattern: "remix.config.js",
				reason: "Remix configuration",
			});
			break;
	}

	return patterns;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { detectCriticalPatterns, FIXES };
