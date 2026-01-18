/**
 * Status Command
 *
 * Implements snap status - Workspace health check.
 * Shows workspace vitals, session status, and detected issues.
 *
 * @see implementation_plan.md Section 1.2
 */

import { access, constants, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";

import {
	getCredentials,
	getCurrentSession,
	getProtectedFiles,
	getViolations,
	getWorkspaceConfig,
	getWorkspaceDir,
	getWorkspaceVitals,
	isLoggedIn,
	isSnapbackInitialized,
} from "../services/snapback-dir";

// =============================================================================
// TYPES
// =============================================================================

interface Issue {
	id: string;
	severity: "warning" | "error";
	description: string;
	fix?: string;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the status command
 */
export function createStatusCommand(): Command {
	return new Command("status")
		.description("Show workspace health and status")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized in this workspace"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const status = await gatherStatus(cwd);

				if (options.json) {
					console.log(JSON.stringify(status, null, 2));
					return;
				}

				displayStatus(status);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});
}

// =============================================================================
// STATUS GATHERING
// =============================================================================

interface WorkspaceStatus {
	initialized: boolean;
	loggedIn: boolean;
	user?: {
		email: string;
		tier: "free" | "pro";
	};
	workspace?: {
		id?: string;
		tier?: string;
		syncEnabled?: boolean;
	};
	vitals?: {
		framework?: string;
		packageManager?: string;
		typescript?: boolean;
		typescriptStrict?: boolean;
	};
	session?: {
		id: string;
		task?: string;
		startedAt: string;
		snapshotCount: number;
	};
	protection: {
		count: number;
		patterns: string[];
	};
	violations: {
		total: number;
		recent: number;
	};
	snapshots: {
		count: number;
		totalSize: string;
	};
	issues: Issue[];
}

/**
 * Gather all status information
 */
async function gatherStatus(workspaceRoot: string): Promise<WorkspaceStatus> {
	const status: WorkspaceStatus = {
		initialized: true,
		loggedIn: false,
		protection: { count: 0, patterns: [] },
		violations: { total: 0, recent: 0 },
		snapshots: { count: 0, totalSize: "0 KB" },
		issues: [],
	};

	// Check login status
	status.loggedIn = await isLoggedIn();
	if (status.loggedIn) {
		const creds = await getCredentials();
		if (creds) {
			status.user = {
				email: creds.email,
				tier: creds.tier,
			};
		}
	}

	// Get workspace config
	const config = await getWorkspaceConfig(workspaceRoot);
	if (config) {
		status.workspace = {
			id: config.workspaceId,
			tier: config.tier,
			syncEnabled: config.syncEnabled,
		};
	}

	// Get vitals
	const vitals = await getWorkspaceVitals(workspaceRoot);
	if (vitals) {
		status.vitals = {
			framework: vitals.framework,
			packageManager: vitals.packageManager,
			typescript: vitals.typescript?.enabled,
			typescriptStrict: vitals.typescript?.strict,
		};
	}

	// Get session
	const session = await getCurrentSession(workspaceRoot);
	if (session) {
		status.session = {
			id: session.id,
			task: session.task,
			startedAt: session.startedAt,
			snapshotCount: session.snapshotCount,
		};
	}

	// Get protection
	const protectedFiles = await getProtectedFiles(workspaceRoot);
	status.protection = {
		count: protectedFiles.length,
		patterns: protectedFiles.slice(0, 5).map((f) => f.pattern),
	};

	// Get violations
	const violations = await getViolations(workspaceRoot);
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	status.violations = {
		total: violations.length,
		recent: violations.filter((v) => new Date(v.date) > oneWeekAgo).length,
	};

	// Get snapshots
	const snapshotInfo = await getSnapshotInfo(workspaceRoot);
	status.snapshots = snapshotInfo;

	// Detect issues
	status.issues = await detectIssues(workspaceRoot, status);

	return status;
}

/**
 * Get snapshot information
 */
async function getSnapshotInfo(workspaceRoot: string): Promise<{ count: number; totalSize: string }> {
	const snapshotsDir = join(getWorkspaceDir(workspaceRoot), "snapshots");

	try {
		await access(snapshotsDir, constants.F_OK);
		const entries = await readdir(snapshotsDir, { withFileTypes: true });
		const snapDirs = entries.filter((e) => e.isDirectory());

		// Calculate total size
		let totalBytes = 0;
		for (const dir of snapDirs) {
			const stats = await getDirectorySize(join(snapshotsDir, dir.name));
			totalBytes += stats;
		}

		return {
			count: snapDirs.length,
			totalSize: formatBytes(totalBytes),
		};
	} catch {
		return { count: 0, totalSize: "0 KB" };
	}
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
	let size = 0;

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);
			if (entry.isDirectory()) {
				size += await getDirectorySize(fullPath);
			} else {
				const stats = await stat(fullPath);
				size += stats.size;
			}
		}
	} catch {
		// Ignore errors
	}

	return size;
}

/**
 * Detect workspace issues
 */
async function detectIssues(workspaceRoot: string, status: WorkspaceStatus): Promise<Issue[]> {
	const issues: Issue[] = [];

	// Check if logged in
	if (!status.loggedIn) {
		issues.push({
			id: "not-logged-in",
			severity: "warning",
			description: "Not logged in - some features are unavailable",
			fix: "snap login",
		});
	}

	// Check if protected files are set up
	if (status.protection.count === 0) {
		issues.push({
			id: "no-protection",
			severity: "warning",
			description: "No files are protected",
			fix: "snap protect env && snap protect config",
		});
	}

	// Check for .gitignore entry
	const gitignorePath = join(workspaceRoot, ".gitignore");
	try {
		const { readFile } = await import("node:fs/promises");
		const content = await readFile(gitignorePath, "utf-8");
		if (!content.includes(".snapback")) {
			issues.push({
				id: "missing-gitignore",
				severity: "warning",
				description: ".snapback not in .gitignore",
				fix: "Add .snapback/snapshots/ to .gitignore",
			});
		}
	} catch {
		// No .gitignore, not a critical issue
	}

	// Check for stale session
	if (status.session) {
		const sessionStart = new Date(status.session.startedAt);
		const hoursSinceStart = (Date.now() - sessionStart.getTime()) / (1000 * 60 * 60);
		if (hoursSinceStart > 24) {
			issues.push({
				id: "stale-session",
				severity: "warning",
				description: `Session started ${Math.floor(hoursSinceStart)}h ago`,
				fix: "snap session end",
			});
		}
	}

	// Check for high violation count
	if (status.violations.recent > 5) {
		issues.push({
			id: "high-violations",
			severity: "warning",
			description: `${status.violations.recent} violations in the last week`,
			fix: "snap patterns list",
		});
	}

	return issues;
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Display status in a nice format
 */
function displayStatus(status: WorkspaceStatus): void {
	console.log(chalk.cyan.bold("Workspace Status"));
	console.log(chalk.gray("═".repeat(40)));
	console.log();

	// User status
	if (status.user) {
		console.log(
			chalk.green("✓"),
			"Logged in as",
			chalk.cyan(status.user.email),
			status.user.tier === "pro" ? chalk.magenta("Pro ⭐") : "",
		);
	} else {
		console.log(chalk.yellow("○"), "Not logged in");
	}

	// Workspace info
	if (status.workspace?.id) {
		console.log(
			chalk.green("✓"),
			"Workspace:",
			chalk.gray(status.workspace.id.substring(0, 8)),
			status.workspace.syncEnabled ? chalk.green("(synced)") : chalk.gray("(local)"),
		);
	}
	console.log();

	// Vitals
	if (status.vitals) {
		console.log(chalk.cyan("Stack:"));
		if (status.vitals.framework) {
			console.log("  •", status.vitals.framework);
		}
		if (status.vitals.packageManager) {
			console.log("  •", status.vitals.packageManager);
		}
		if (status.vitals.typescript) {
			console.log("  •", "TypeScript", status.vitals.typescriptStrict ? chalk.green("(strict)") : "");
		}
		console.log();
	}

	// Session
	if (status.session) {
		console.log(chalk.cyan("Active Session:"));
		console.log("  ID:", chalk.gray(status.session.id.substring(0, 8)));
		if (status.session.task) {
			console.log("  Task:", status.session.task);
		}
		console.log("  Snapshots:", status.session.snapshotCount);
		console.log();
	}

	// Stats
	console.log(chalk.cyan("Stats:"));
	console.log("  Protected files:", status.protection.count);
	console.log("  Snapshots:", status.snapshots.count, chalk.gray(`(${status.snapshots.totalSize})`));
	console.log("  Violations:", status.violations.total, chalk.gray(`(${status.violations.recent} this week)`));
	console.log();

	// Issues
	if (status.issues.length > 0) {
		console.log(chalk.yellow("Issues:"));
		for (const issue of status.issues) {
			const icon = issue.severity === "error" ? chalk.red("✗") : chalk.yellow("⚠");
			console.log(` ${icon}`, issue.description);
			if (issue.fix) {
				console.log(chalk.gray(`    Fix: ${issue.fix}`));
			}
		}
	} else {
		console.log(chalk.green("✓"), "No issues detected");
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 KB";
	}

	const units = ["B", "KB", "MB", "GB"];
	const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const size = bytes / 1024 ** exp;

	return `${size.toFixed(exp > 0 ? 1 : 0)} ${units[exp]}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { gatherStatus, detectIssues, formatBytes };
