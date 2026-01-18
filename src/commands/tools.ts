/**
 * Tools Command
 *
 * Implements snap tools configure - Auto-setup MCP for Cursor/Claude.
 * Refactored to use shared @snapback/mcp-config package.
 *
 * @see implementation_plan.md Section 1.2
 * @see mcp_companionship.md Part 3 for CLI specification
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { confirm, password } from "@inquirer/prompts";
import {
	type AIClientConfig,
	detectAIClients,
	detectWorkspaceConfig,
	getSnapbackMCPConfig,
	repairClientConfig,
	type ValidationResult,
	validateClientConfig,
	writeClientConfig,
} from "@snapback/mcp-config";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { getCredentials, isLoggedIn } from "../services/snapback-dir";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the tools command with subcommands
 */
export function createToolsCommand(): Command {
	const tools = new Command("tools").description("Configure AI tools");

	tools
		.command("configure")
		.description("Auto-setup MCP for Cursor, Claude, or other AI tools")
		.option("--cursor", "Configure for Cursor only")
		.option("--claude", "Configure for Claude Desktop only")
		.option("--windsurf", "Configure for Windsurf only")
		.option("--continue", "Configure for Continue only")
		.option("--vscode", "Configure for VS Code only")
		.option("--zed", "Configure for Zed only")
		.option("--cline", "Configure for Cline only")
		.option("--gemini", "Configure for Gemini/Antigravity only")
		.option("--aider", "Configure for Aider only")
		.option("--roo-code", "Configure for Roo Code only")
		.option("--qoder", "Configure for Qoder only")
		.option("--list", "List available tools")
		.option("--dry-run", "Show what would be configured without writing")
		.option("--force", "Reconfigure even if already set up")
		.option("-y, --yes", "Skip confirmation prompts (for CI/scripts)")
		.option("--api-key <key>", "API key for Pro features")
		.option("--npm", "Use npm-installed CLI via npx (recommended for npm users)")
		.option("--dev", "Use local development mode (direct node execution with inferred workspace)")
		.option("--workspace <path>", "Override workspace root path")

		.action(async (options) => {
			try {
				if (options.list) {
					await listTools();
					return;
				}

				// Determine which tools to configure
				const toolsToConfig: string[] = [];

				if (options.cursor) {
					toolsToConfig.push("cursor");
				}
				if (options.claude) {
					toolsToConfig.push("claude");
				}
				if (options.windsurf) {
					toolsToConfig.push("windsurf");
				}
				if (options.continue) {
					toolsToConfig.push("continue");
				}
				if (options.vscode) {
					toolsToConfig.push("vscode");
				}
				if (options.zed) {
					toolsToConfig.push("zed");
				}
				if (options.cline) {
					toolsToConfig.push("cline");
				}
				if (options.gemini) {
					toolsToConfig.push("gemini");
				}
				if (options.aider) {
					toolsToConfig.push("aider");
				}
				if (options["roo-code"] || options.rooCode) {
					toolsToConfig.push("roo-code");
				}
				if (options.qoder) {
					toolsToConfig.push("qoder");
				}

				// If no specific tool, auto-detect
				if (toolsToConfig.length === 0) {
					await autoConfigureTools(
						options.dryRun,
						options.force,
						options.yes,
						options.apiKey,
						options.dev,
						options.npm,
						options.workspace,
					);
				} else {
					for (const tool of toolsToConfig) {
						await configureTool(
							tool,
							options.dryRun,
							options.yes,
							options.apiKey,
							options.dev,
							options.npm,
							options.workspace,
						);
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Configuration failed:"), message);
				process.exit(1);
			}
		});

	tools
		.command("status")
		.description("Check MCP configuration status")
		.option("--verbose", "Show detailed validation information")
		.action(async (options) => {
			await checkToolsStatus(options.verbose);
		});

	tools
		.command("validate")
		.description("Validate MCP configurations for all detected AI tools")
		.option("--verbose", "Show detailed validation issues")
		.action(async (options) => {
			await validateTools(options.verbose);
		});

	tools
		.command("repair")
		.description("Repair broken MCP configurations")
		.option("-y, --yes", "Skip confirmation prompts")
		.option("--workspace <path>", "Override workspace root path")
		.option("--api-key <key>", "API key for Pro features")
		.action(async (options) => {
			await repairTools(options.yes, options.workspace, options.apiKey);
		});

	return tools;
}

// =============================================================================
// TOOL CONFIGURATION
// =============================================================================

/**
 * List available tools and their detection status
 */
async function listTools(): Promise<void> {
	const detection = detectAIClients();

	console.log(chalk.cyan("\nAvailable AI Tools:"));
	console.log();

	for (const client of detection.clients) {
		const status = client.exists
			? client.hasSnapback
				? chalk.green("✓ Configured")
				: chalk.yellow("○ Needs setup")
			: chalk.gray("Not installed");

		console.log(`  ${client.displayName.padEnd(20)} ${status}`);
		console.log(chalk.gray(`    Config: ${client.configPath}`));
	}

	console.log();
	console.log(chalk.gray("Use --cursor, --claude, --windsurf, or --continue to configure a specific tool"));
}

/**
 * Auto-configure all detected tools
 */
async function autoConfigureTools(
	dryRun: boolean,
	force: boolean,
	skipPrompts = false,
	providedApiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
): Promise<void> {
	const detection = detectAIClients();

	if (detection.detected.length === 0) {
		console.log(chalk.yellow("\nNo AI tools detected"));
		console.log(chalk.gray("Install one of these to use SnapBack MCP:"));
		console.log(chalk.gray("  • Claude Desktop - https://claude.ai/download"));
		console.log(chalk.gray("  • Cursor - https://cursor.sh"));
		console.log(chalk.gray("  • Windsurf - https://codeium.com/windsurf"));
		console.log(chalk.gray("  • Continue - https://continue.dev"));
		return;
	}

	// Determine what needs configuration
	const needsSetup = force ? detection.detected : detection.needsSetup;

	if (needsSetup.length === 0) {
		console.log(chalk.green("\n✓ All detected AI tools already have SnapBack configured!"));
		console.log(chalk.gray("Use --force to reconfigure."));
		showNextSteps();
		return;
	}

	console.log(chalk.cyan(`\nDetected ${detection.detected.length} AI tool(s):`));
	for (const client of detection.detected) {
		const status = client.hasSnapback ? chalk.green("(configured)") : chalk.yellow("(needs setup)");
		console.log(`  • ${client.displayName} ${status}`);
	}
	console.log();

	// Interactive confirmation (unless --yes flag is set)
	if (!skipPrompts) {
		const clientNames = needsSetup.map((c) => c.displayName).join(", ");
		const proceed = await confirm({
			message: `Configure SnapBack for ${clientNames}?`,
			default: true,
		});

		if (!proceed) {
			console.log("\nSetup cancelled.");
			return;
		}
	}

	// Get API key (from flag, env, login, or prompt)
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts);

	// Configure each tool that needs setup
	for (const client of needsSetup) {
		await configureClient(client, dryRun, apiKey, devMode, npmMode, workspaceOverride);
	}

	showNextSteps();
}

/**
 * Configure a specific tool by name
 */
async function configureTool(
	toolName: string,
	dryRun: boolean,
	skipPrompts = false,
	providedApiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
): Promise<void> {
	const detection = detectAIClients();
	const client = detection.clients.find((c) => c.name === toolName);

	if (!client) {
		console.error(chalk.red(`Unknown tool: ${toolName}`));
		console.log(chalk.gray("Available tools: cursor, claude, windsurf, continue"));
		return;
	}

	if (!client.exists) {
		console.log(chalk.yellow(`${client.displayName} is not installed`));
		console.log(chalk.gray(`Expected config at: ${client.configPath}`));
		return;
	}

	// Get API key (from flag, env, login, or prompt)
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts);

	await configureClient(client, dryRun, apiKey, devMode, npmMode, workspaceOverride);
	showNextSteps();
}

/**
 * Check if a config path is global (not workspace-specific)
 */
function isGlobalConfig(configPath: string): boolean {
	const home = homedir();
	return configPath.includes(home) && !configPath.includes(process.cwd());
}

/**
 * Configure a specific AI client
 */
async function configureClient(
	client: AIClientConfig,
	dryRun: boolean,
	apiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
): Promise<void> {
	const spinner = ora(`Configuring ${client.displayName}...`).start();

	try {
		// =========================================================================
		// CONFLICT DETECTION: Check for workspace-specific configs
		// =========================================================================
		const workspaceRoot = workspaceOverride || findWorkspaceRoot(process.cwd());
		const workspaceConfig = detectWorkspaceConfig(workspaceRoot);

		// If workspace config exists and this is a global client config,
		// skip to prevent conflicts (workspace takes precedence)
		if (workspaceConfig && isGlobalConfig(client.configPath)) {
			spinner.info(`${client.displayName} workspace config detected`);
			console.log(chalk.gray(`  Workspace: ${workspaceConfig.path}`));
			console.log(chalk.gray(`  Type: ${workspaceConfig.type}`));
			console.log();
			console.log(chalk.cyan("  Skipping global config to prevent conflicts"));
			console.log(chalk.gray("  Workspace configurations take precedence over global"));
			console.log();
			return;
		}

		// Resolve workspace root for dev mode or npm mode
		let localCliPath: string | undefined;

		if (devMode) {
			// Find CLI dist path relative to workspace
			localCliPath = findCliDistPath(workspaceRoot);

			if (!localCliPath) {
				spinner.fail("Could not find CLI dist. Run 'pnpm build' first.");
				return;
			}

			spinner.text = `Configuring ${client.displayName} (dev mode)...`;
		} else if (npmMode) {
			spinner.text = `Configuring ${client.displayName} (npm/npx mode)...`;
		}

		// Pre-flight validation: Check existing config for issues
		if (client.hasSnapback) {
			spinner.text = `Validating existing config for ${client.displayName}...`;
			const validation = validateClientConfig(client);

			if (!validation.valid) {
				const errors = validation.issues.filter((i) => i.severity === "error");
				if (errors.length > 0) {
					spinner.warn("Existing config has issues, will be replaced");
					for (const issue of errors) {
						console.log(chalk.yellow(`  ⚠ ${issue.message}`));
					}
				}
			}
		}

		// Build MCP config
		const mcpConfig = getSnapbackMCPConfig({
			apiKey,
			useNpx: npmMode,
			useLocalDev: devMode,
			localCliPath,
			workspaceRoot,
		});

		if (dryRun) {
			spinner.info(`Would configure ${client.displayName}`);
			console.log(chalk.gray(`  Path: ${client.configPath}`));
			if (devMode) {
				console.log(chalk.gray("  Mode: Local development"));
				console.log(chalk.gray(`  Workspace: ${workspaceRoot}`));
				console.log(chalk.gray(`  CLI Path: ${localCliPath}`));
			} else if (npmMode) {
				console.log(chalk.gray("  Mode: npm (npx @snapback/cli)"));
				console.log(chalk.gray(`  Workspace: ${workspaceRoot}`));
			} else {
				console.log(chalk.gray("  Mode: Remote server (https://snapback-mcp.fly.dev)"));
			}
			console.log(chalk.gray("  Config:"));
			console.log(JSON.stringify(mcpConfig, null, 2));
			return;
		}

		// Write config using shared module
		const result = writeClientConfig(client, mcpConfig);

		if (result.success) {
			// Post-write validation to ensure config was written correctly
			const postValidation = validateClientConfig({ ...client, hasSnapback: true });
			const modeLabel = devMode ? " (dev mode)" : npmMode ? " (npm mode)" : "";
			if (postValidation.valid) {
				spinner.succeed(`Configured ${client.displayName}${modeLabel}`);
			} else {
				const warnings = postValidation.issues.filter((i) => i.severity === "warning");
				if (warnings.length > 0) {
					spinner.succeed(`Configured ${client.displayName} (with warnings)`);
					for (const warning of warnings) {
						console.log(chalk.yellow(`  ⚠ ${warning.message}`));
					}
				} else {
					spinner.succeed(`Configured ${client.displayName}${modeLabel}`);
				}
			}
			console.log(chalk.gray(`  Config: ${client.configPath}`));
			if (devMode || npmMode) {
				console.log(chalk.gray(`  Workspace: ${workspaceRoot}`));
			}
			if (result.backup) {
				console.log(chalk.gray(`  Backup: ${result.backup}`));
			}
		} else {
			spinner.fail(`Failed to configure ${client.displayName}`);
			console.error(chalk.red(`  Error: ${result.error}`));
		}
	} catch (error) {
		spinner.fail(`Failed to configure ${client.displayName}`);
		throw error;
	}
}

/**
 * Find the workspace root by looking for markers (.git, package.json, .snapback)
 */
function findWorkspaceRoot(startDir: string): string {
	let dir = startDir;
	const root = "/";

	while (dir !== root) {
		// Check for workspace markers
		if (
			existsSync(join(dir, ".git")) ||
			existsSync(join(dir, "package.json")) ||
			existsSync(join(dir, ".snapback"))
		) {
			return dir;
		}
		dir = join(dir, "..");
	}

	// Fallback to cwd
	return startDir;
}

/**
 * Find the CLI dist path relative to workspace
 */
function findCliDistPath(workspaceRoot: string): string | undefined {
	const possiblePaths = [
		join(workspaceRoot, "apps", "cli", "dist", "index.js"),
		join(workspaceRoot, "dist", "index.js"),
	];

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return undefined;
}

/**
 * Resolve API key from multiple sources
 * Priority: --api-key flag > SNAPBACK_API_KEY env > logged in credentials > interactive prompt
 */
async function resolveApiKey(providedApiKey?: string, skipPrompts = false): Promise<string | undefined> {
	// 1. Check provided flag
	if (providedApiKey) {
		return providedApiKey;
	}

	// 2. Check environment variable
	const envKey = process.env.SNAPBACK_API_KEY;
	if (envKey) {
		return envKey;
	}

	// 3. Check logged in credentials
	if (await isLoggedIn()) {
		const credentials = await getCredentials();
		if (credentials?.accessToken) {
			return credentials.accessToken;
		}
	}

	// 4. Interactive prompt (unless --yes flag is set)
	if (!skipPrompts) {
		const wantApiKey = await confirm({
			message: "Do you have a SnapBack API key for Pro features?",
			default: false,
		});

		if (wantApiKey) {
			const key = await password({
				message: "Enter your API key:",
				mask: "*",
			});
			return key || undefined;
		}
	}

	return undefined;
}

/**
 * Check status of all tool configurations
 */
async function checkToolsStatus(verbose = false): Promise<void> {
	const detection = detectAIClients();

	console.log(chalk.cyan("\nMCP Configuration Status:"));
	console.log();

	let hasIssues = false;

	for (const client of detection.clients) {
		let icon: string;
		let status: string;

		if (!client.exists) {
			icon = chalk.gray("○");
			status = chalk.gray("Not installed");
		} else if (client.hasSnapback) {
			// Deep validation for configured clients
			const validation = validateClientConfig(client);
			if (validation.valid) {
				icon = chalk.green("✓");
				status = chalk.green("Configured");
			} else {
				const errors = validation.issues.filter((i) => i.severity === "error");
				const warnings = validation.issues.filter((i) => i.severity === "warning");
				if (errors.length > 0) {
					icon = chalk.red("✗");
					status = chalk.red(`Invalid (${errors.length} error(s))`);
					hasIssues = true;
				} else if (warnings.length > 0) {
					icon = chalk.yellow("⚠");
					status = chalk.yellow(`Configured (${warnings.length} warning(s))`);
				} else {
					icon = chalk.green("✓");
					status = chalk.green("Configured");
				}
			}

			// Show validation details in verbose mode (reuse validation from above)
			if (verbose && validation.issues.length > 0) {
				console.log(`${icon} ${client.displayName.padEnd(20)} ${status}`);
				for (const issue of validation.issues) {
					const issueIcon =
						issue.severity === "error"
							? chalk.red("✗")
							: issue.severity === "warning"
								? chalk.yellow("⚠")
								: chalk.blue("ℹ");
					console.log(`    ${issueIcon} ${issue.message}`);
					if (issue.fix) {
						console.log(chalk.gray(`      Fix: ${issue.fix}`));
					}
				}
				continue;
			}
		} else {
			icon = chalk.yellow("○");
			status = chalk.yellow("Detected but not configured");
		}

		console.log(`${icon} ${client.displayName.padEnd(20)} ${status}`);
	}

	console.log();

	if (hasIssues) {
		console.log(chalk.red("Some configurations have issues."));
		console.log(chalk.gray("Run: snap tools repair"));
	} else if (detection.needsSetup.length > 0) {
		console.log(chalk.yellow(`${detection.needsSetup.length} tool(s) need configuration.`));
		console.log(chalk.gray("Run: snap tools configure"));
	} else if (detection.detected.length > 0) {
		console.log(chalk.green("All detected AI tools are configured!"));
	} else {
		console.log(chalk.gray("Install Claude Desktop or Cursor to get started."));
	}
}

/**
 * Validate all detected AI tool configurations
 */
async function validateTools(verbose = false): Promise<void> {
	const detection = detectAIClients();
	const configured = detection.detected.filter((c) => c.hasSnapback);

	if (configured.length === 0) {
		console.log(chalk.yellow("\nNo AI tools with SnapBack configured."));
		console.log(chalk.gray("Run: snap tools configure"));
		return;
	}

	console.log(chalk.cyan("\nValidating MCP Configurations:"));
	console.log();

	let totalErrors = 0;
	let totalWarnings = 0;

	for (const client of configured) {
		const validation = validateClientConfig(client);
		const errors = validation.issues.filter((i) => i.severity === "error");
		const warnings = validation.issues.filter((i) => i.severity === "warning");
		const infos = validation.issues.filter((i) => i.severity === "info");

		totalErrors += errors.length;
		totalWarnings += warnings.length;

		if (validation.valid && errors.length === 0 && warnings.length === 0) {
			console.log(`${chalk.green("✓")} ${client.displayName}: ${chalk.green("Valid")}`);
		} else if (errors.length > 0) {
			console.log(`${chalk.red("✗")} ${client.displayName}: ${chalk.red("Invalid")}`);
		} else {
			console.log(`${chalk.yellow("⚠")} ${client.displayName}: ${chalk.yellow("Valid with warnings")}`);
		}

		if (verbose || errors.length > 0) {
			for (const issue of [...errors, ...warnings, ...(verbose ? infos : [])]) {
				const icon =
					issue.severity === "error"
						? chalk.red("  ✗")
						: issue.severity === "warning"
							? chalk.yellow("  ⚠")
							: chalk.blue("  ℹ");
				console.log(`${icon} ${issue.message}`);
				if (issue.fix) {
					console.log(chalk.gray(`    Fix: ${issue.fix}`));
				}
			}
		}
	}

	console.log();

	if (totalErrors > 0) {
		console.log(chalk.red(`Found ${totalErrors} error(s) and ${totalWarnings} warning(s).`));
		console.log(chalk.gray("Run: snap tools repair"));
		process.exit(1);
	} else if (totalWarnings > 0) {
		console.log(chalk.yellow(`Found ${totalWarnings} warning(s). Configurations are functional.`));
	} else {
		console.log(chalk.green("All configurations are valid!"));
	}
}

/**
 * Repair broken MCP configurations
 */
async function repairTools(skipPrompts = false, workspaceOverride?: string, providedApiKey?: string): Promise<void> {
	const detection = detectAIClients();
	const configured = detection.detected.filter((c) => c.hasSnapback);

	if (configured.length === 0) {
		console.log(chalk.yellow("\nNo AI tools with SnapBack configured."));
		console.log(chalk.gray("Run: snap tools configure"));
		return;
	}

	// Find clients with issues
	const clientsWithIssues: Array<{ client: AIClientConfig; validation: ValidationResult }> = [];

	for (const client of configured) {
		const validation = validateClientConfig(client);
		if (!validation.valid || validation.issues.some((i) => i.severity === "error" || i.severity === "warning")) {
			clientsWithIssues.push({ client, validation });
		}
	}

	if (clientsWithIssues.length === 0) {
		console.log(chalk.green("\nAll configurations are healthy! No repairs needed."));
		return;
	}

	console.log(chalk.cyan("\nMCP Configuration Repair:"));
	console.log();

	// Show what needs repair
	for (const { client, validation } of clientsWithIssues) {
		const errors = validation.issues.filter((i) => i.severity === "error");
		const warnings = validation.issues.filter((i) => i.severity === "warning");

		console.log(`${chalk.yellow("⚠")} ${client.displayName}:`);
		for (const issue of [...errors, ...warnings]) {
			const icon = issue.severity === "error" ? chalk.red("  ✗") : chalk.yellow("  ⚠");
			console.log(`${icon} ${issue.message}`);
		}
	}

	console.log();

	// Confirm repair
	if (!skipPrompts) {
		const proceed = await confirm({
			message: `Repair ${clientsWithIssues.length} configuration(s)?`,
			default: true,
		});

		if (!proceed) {
			console.log("\nRepair cancelled.");
			return;
		}
	}

	// Get API key for repair
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts);

	// Perform repairs
	const spinner = ora("Repairing configurations...").start();

	let repaired = 0;
	let failed = 0;

	for (const { client } of clientsWithIssues) {
		spinner.text = `Repairing ${client.displayName}...`;

		const result = repairClientConfig(client, {
			apiKey,
			workspaceRoot: workspaceOverride || findWorkspaceRoot(process.cwd()),
			force: true,
		});

		if (result.success) {
			repaired++;
		} else {
			failed++;
			spinner.warn(`Failed to repair ${client.displayName}: ${result.error}`);
		}
	}

	spinner.stop();

	console.log();
	if (repaired > 0) {
		console.log(chalk.green(`✓ Repaired ${repaired} configuration(s).`));
	}
	if (failed > 0) {
		console.log(chalk.red(`✗ Failed to repair ${failed} configuration(s).`));
		console.log(chalk.gray("Try: snap tools configure --force"));
	}

	if (repaired > 0) {
		console.log();
		console.log(chalk.bold("Next: Restart your AI assistant to apply changes."));
	}
}

/**
 * Show next steps after configuration
 */
function showNextSteps(): void {
	console.log();
	console.log(chalk.bold("Next Steps:"));
	console.log();
	console.log("  1. Restart your AI assistant (Claude Desktop, Cursor, etc.)");
	console.log('  2. Ask your AI: "What does SnapBack know about this project?"');
	console.log('  3. Before risky changes, ask: "Create a SnapBack checkpoint"');
	console.log();

	console.log(chalk.dim("Available tools your AI can now use:"));
	console.log(chalk.dim("  • snapback.get_context      - Understand your codebase"));
	console.log(chalk.dim("  • snapback.analyze_risk     - Assess change risks"));
	console.log(chalk.dim("  • snapback.create_checkpoint - Create safety snapshots (Pro)"));
	console.log(chalk.dim("  • snapback.restore_checkpoint - Recover from mistakes (Pro)"));
	console.log();

	console.log(chalk.blue("Get an API key: https://console.snapback.dev/settings/api-keys"));
	console.log();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { listTools, autoConfigureTools, configureTool, checkToolsStatus, validateTools, repairTools };
