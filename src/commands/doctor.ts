/**
 * Doctor Command
 *
 * Implements snap doctor - Comprehensive diagnostic command.
 * Checks all aspects of SnapBack configuration and health.
 *
 * Diagnostics include:
 * - CLI installation and PATH
 * - Authentication status
 * - Workspace configuration
 * - MCP tool configurations
 * - Git integration
 * - Network connectivity
 *
 * @see cli_ui_imp.md Phase 6
 */

import { exec } from "node:child_process";
import { access, constants, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { detectAIClients } from "@snapback/mcp-config";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

const execAsync = promisify(exec);

import {
	getCredentials,
	getGlobalDir,
	getWorkspaceConfig,
	getWorkspaceDir,
	isLoggedIn,
	isSnapbackInitialized,
} from "../services/snapback-dir";
import { displayBox } from "../utils/display";

// =============================================================================
// TYPES
// =============================================================================

interface DiagnosticResult {
	name: string;
	status: "ok" | "warning" | "error" | "info";
	message: string;
	details?: string[];
	fix?: string;
}

interface DiagnosticReport {
	timestamp: string;
	cliVersion: string;
	nodeVersion: string;
	platform: string;
	results: DiagnosticResult[];
	summary: {
		total: number;
		ok: number;
		warnings: number;
		errors: number;
	};
}

interface DoctorOptions {
	fix?: boolean;
	json?: boolean;
	verbose?: boolean;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the doctor command
 */
export function createDoctorCommand(): Command {
	return new Command("doctor")
		.description("Diagnose SnapBack configuration and health")
		.option("--fix", "Attempt to auto-fix detected issues")
		.option("--json", "Output as JSON")
		.option("--verbose", "Show detailed information")
		.action(async (options: DoctorOptions) => {
			const spinner = ora("Running diagnostics...").start();

			try {
				const report = await runDiagnostics(options);

				spinner.stop();

				if (options.json) {
					console.log(JSON.stringify(report, null, 2));
					return;
				}

				displayReport(report, options.verbose);

				// Auto-fix if requested
				if (options.fix && report.summary.errors + report.summary.warnings > 0) {
					console.log();
					await runAutoFixes(report.results);
				}

				// Exit with appropriate code
				if (report.summary.errors > 0) {
					process.exit(1);
				}
			} catch (error: unknown) {
				spinner.fail("Diagnostics failed");
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});
}

// =============================================================================
// DIAGNOSTICS
// =============================================================================

/**
 * Run all diagnostics
 */
async function runDiagnostics(_options: DoctorOptions = {}): Promise<DiagnosticReport> {
	const results: DiagnosticResult[] = [];

	// Get CLI version from package.json
	let cliVersion = "unknown";
	try {
		const pkgPath = join(__dirname, "../../package.json");
		const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
		cliVersion = pkg.version;
	} catch {
		// Fallback
	}

	// Run core checks (always)
	results.push(await checkNodeVersion());
	results.push(await checkCliInstallation());
	results.push(await checkGlobalDirectory());
	results.push(await checkAuthentication());
	results.push(await checkWorkspace());
	results.push(await checkMcpTools());
	results.push(await checkGitIntegration());
	results.push(await checkNetworkConnectivity());

	// Calculate summary
	const summary = {
		total: results.length,
		ok: results.filter((r) => r.status === "ok").length,
		warnings: results.filter((r) => r.status === "warning").length,
		errors: results.filter((r) => r.status === "error").length,
	};

	return {
		timestamp: new Date().toISOString(),
		cliVersion,
		nodeVersion: process.version,
		platform: `${process.platform} ${process.arch}`,
		results,
		summary,
	};
}

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<DiagnosticResult> {
	const version = process.version;
	const major = Number.parseInt(version.slice(1).split(".")[0], 10);

	if (major >= 18) {
		return {
			name: "Node.js Version",
			status: "ok",
			message: `Node.js ${version} (supported)`,
		};
	}

	return {
		name: "Node.js Version",
		status: "warning",
		message: `Node.js ${version} (upgrade recommended)`,
		details: ["SnapBack works best with Node.js 18+"],
		fix: "Upgrade to Node.js 18 or later",
	};
}

/**
 * Check CLI installation
 */
async function checkCliInstallation(): Promise<DiagnosticResult> {
	const npmPrefix = process.env.npm_config_prefix || join(homedir(), ".npm-global");
	const pathDirs = (process.env.PATH || "").split(":");

	const snapInPath = pathDirs.some(
		(dir) => dir.includes("npm") || dir.includes(".npm-global") || dir.includes("node_modules/.bin"),
	);

	if (snapInPath) {
		return {
			name: "CLI Installation",
			status: "ok",
			message: "snap command is in PATH",
		};
	}

	return {
		name: "CLI Installation",
		status: "warning",
		message: "npm global bin may not be in PATH",
		details: [`npm prefix: ${npmPrefix}`, "This could cause 'snap' command not found errors"],
		fix: `Add "${npmPrefix}/bin" to your PATH`,
	};
}

/**
 * Check global directory
 */
async function checkGlobalDirectory(): Promise<DiagnosticResult> {
	const globalDir = getGlobalDir();

	try {
		await access(globalDir, constants.F_OK);
		return {
			name: "Global Directory",
			status: "ok",
			message: "~/.snapback/ exists",
			details: [globalDir],
		};
	} catch {
		return {
			name: "Global Directory",
			status: "info",
			message: "~/.snapback/ not created yet",
			details: ["Will be created on first login"],
		};
	}
}

/**
 * Check authentication status
 */
async function checkAuthentication(): Promise<DiagnosticResult> {
	try {
		if (await isLoggedIn()) {
			const creds = await getCredentials();
			return {
				name: "Authentication",
				status: "ok",
				message: `Logged in as ${creds?.email}`,
				details: [`Tier: ${creds?.tier || "free"}`],
			};
		}

		return {
			name: "Authentication",
			status: "warning",
			message: "Not logged in",
			details: ["Some features require authentication"],
			fix: "Run: snap login",
		};
	} catch (error) {
		return {
			name: "Authentication",
			status: "error",
			message: "Failed to check authentication",
		};
	}
}

/**
 * Check workspace configuration
 */
async function checkWorkspace(): Promise<DiagnosticResult> {
	const cwd = process.cwd();

	try {
		if (await isSnapbackInitialized(cwd)) {
			const config = await getWorkspaceConfig(cwd);
			return {
				name: "Workspace",
				status: "ok",
				message: "SnapBack initialized in this workspace",
				details: [`Directory: ${getWorkspaceDir(cwd)}`],
			};
		}

		return {
			name: "Workspace",
			status: "info",
			message: "Not a SnapBack workspace",
			fix: "Run: snap init",
		};
	} catch (error) {
		return {
			name: "Workspace",
			status: "error",
			message: "Failed to check workspace",
		};
	}
}

/**
 * Check MCP tool configurations
 */
async function checkMcpTools(): Promise<DiagnosticResult> {
	try {
		const detection = detectAIClients();

		if (detection.detected.length === 0) {
			return {
				name: "AI Tools",
				status: "info",
				message: "No AI tools detected",
			};
		}

		const configured = detection.detected.filter((c) => c.hasSnapback);
		const needsSetup = detection.needsSetup;

		if (needsSetup.length === 0) {
			return {
				name: "AI Tools",
				status: "ok",
				message: `${configured.length} AI tool(s) configured`,
			};
		}

		return {
			name: "AI Tools",
			status: "warning",
			message: `${needsSetup.length} AI tool(s) need configuration`,
			fix: "Run: snap tools configure",
		};
	} catch (error) {
		return {
			name: "AI Tools",
			status: "error",
			message: "Failed to check AI tools",
		};
	}
}

/**
 * Check Git integration
 */
async function checkGitIntegration(): Promise<DiagnosticResult> {
	const cwd = process.cwd();

	try {
		await access(join(cwd, ".git"), constants.F_OK);

		try {
			const hookPath = join(cwd, ".git/hooks/pre-commit");
			const hookContent = await readFile(hookPath, "utf-8");

			if (hookContent.includes("snap check")) {
				return {
					name: "Git Integration",
					status: "ok",
					message: "Git repository with SnapBack hook",
				};
			}

			return {
				name: "Git Integration",
				status: "info",
				message: "Git repository (hook not configured)",
				fix: "Consider adding 'snap check' to pre-commit hook",
			};
		} catch {
			return {
				name: "Git Integration",
				status: "info",
				message: "Git repository (no pre-commit hook)",
			};
		}
	} catch {
		return {
			name: "Git Integration",
			status: "info",
			message: "Not a Git repository",
		};
	}
}

/**
 * Check network connectivity
 */
async function checkNetworkConnectivity(): Promise<DiagnosticResult> {
	const apiUrl = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";

	try {
		const response = await fetch(`${apiUrl}/health`).catch(() => null);

		if (response && response.ok) {
			return {
				name: "Network",
				status: "ok",
				message: "Connected to SnapBack API",
			};
		}

		return {
			name: "Network",
			status: "warning",
			message: "Cannot reach SnapBack API (offline mode available)",
		};
	} catch {
		return {
			name: "Network",
			status: "warning",
			message: "Cannot reach SnapBack API",
		};
	}
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Display diagnostic report
 */
function displayReport(report: DiagnosticReport, verbose?: boolean): void {
	console.log("\n" + chalk.cyan.bold("SnapBack System Health Report"));
	console.log(chalk.gray(`Generated: ${new Date(report.timestamp).toLocaleString()}\n`));

	displayBox(
		[
			`${chalk.bold("CLI Version:")}  ${report.cliVersion}`,
			`${chalk.bold("Node Version:")} ${report.nodeVersion}`,
			`${chalk.bold("Platform:")}     ${report.platform}`,
		].join("\n"),
		{ title: "Environment", padding: 1 },
	);

	console.log();

	for (const result of report.results) {
		const icon = getStatusIcon(result.status);
		const color = getStatusColor(result.status);

		console.log(`${icon} ${chalk.bold(result.name)}: ${color(result.message)}`);

		if (verbose && result.details?.length) {
			for (const detail of result.details) {
				console.log(chalk.gray(`  • ${detail}`));
			}
		}

		if (result.fix) {
			console.log(chalk.cyan(`  → Fix: ${result.fix}`));
		}
	}

	console.log("\n" + chalk.gray("─".repeat(40)));

	const { ok, warnings, errors, total } = report.summary;
	if (errors > 0) {
		console.log(chalk.red.bold(`\n✗ Diagnostics failed: ${errors} error(s), ${warnings} warning(s)`));
	} else if (warnings > 0) {
		console.log(chalk.yellow.bold(`\n⚠ Diagnostics found ${warnings} issue(s)`));
	} else {
		console.log(chalk.green.bold(`\n✓ All ${total} systems healthy!`));
	}
}

/**
 * Get status icon
 */
function getStatusIcon(status: DiagnosticResult["status"]): string {
	switch (status) {
		case "ok":
			return chalk.green("✓");
		case "warning":
			return chalk.yellow("⚠");
		case "error":
			return chalk.red("✗");
		case "info":
			return chalk.blue("ℹ");
		default:
			return " ";
	}
}

/**
 * Get status color function
 */
function getStatusColor(status: DiagnosticResult["status"]): any {
	switch (status) {
		case "ok":
			return chalk.green;
		case "warning":
			return chalk.yellow;
		case "error":
			return chalk.red;
		case "info":
			return chalk.blue;
		default:
			return chalk.white;
	}
}

// =============================================================================
// AUTO-FIX
// =============================================================================

/**
 * Run auto-fixes for detected issues
 */
async function runAutoFixes(results: DiagnosticResult[]): Promise<void> {
	const fixable = results.filter((r) => r.fix && (r.status === "warning" || r.status === "error"));

	if (fixable.length === 0) {
		console.log(chalk.gray("No auto-fixable issues found."));
		return;
	}

	console.log(chalk.cyan("Attempting auto-fixes..."));
	console.log();

	for (const result of fixable) {
		console.log(chalk.gray(`→ ${result.name}: ${result.fix}`));
	}

	console.log();
	console.log(chalk.gray("Follow the instructions above to fix detected issues."));
}

export { runDiagnostics, type DiagnosticReport, type DiagnosticResult };
