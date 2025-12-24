/**
 * Tools Command
 *
 * Implements snap tools configure - Auto-setup MCP for Cursor/Claude.
 * Refactored to use shared @snapback/mcp-config package.
 *
 * @see implementation_plan.md Section 1.2
 * @see mcp_companionship.md Part 3 for CLI specification
 */

import { confirm, password } from "@inquirer/prompts";
import { type AIClientConfig, detectAIClients, getSnapbackMCPConfig, writeClientConfig } from "@snapback/mcp-config";
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
		.option("--list", "List available tools")
		.option("--dry-run", "Show what would be configured without writing")
		.option("--force", "Reconfigure even if already set up")
		.option("-y, --yes", "Skip confirmation prompts (for CI/scripts)")
		.option("--api-key <key>", "API key for Pro features")
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

				// If no specific tool, auto-detect
				if (toolsToConfig.length === 0) {
					await autoConfigureTools(options.dryRun, options.force, options.yes, options.apiKey);
				} else {
					for (const tool of toolsToConfig) {
						await configureTool(tool, options.dryRun, options.yes, options.apiKey);
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
		.action(async () => {
			await checkToolsStatus();
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
		await configureClient(client, dryRun, apiKey);
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

	await configureClient(client, dryRun, apiKey);
	showNextSteps();
}

/**
 * Configure a specific AI client
 */
async function configureClient(client: AIClientConfig, dryRun: boolean, apiKey?: string): Promise<void> {
	const spinner = ora(`Configuring ${client.displayName}...`).start();

	try {
		// Build MCP config
		const mcpConfig = getSnapbackMCPConfig({ apiKey });

		if (dryRun) {
			spinner.info(`Would configure ${client.displayName}`);
			console.log(chalk.gray(`  Path: ${client.configPath}`));
			console.log(chalk.gray("  Config:"));
			console.log(JSON.stringify(mcpConfig, null, 2));
			return;
		}

		// Write config using shared module
		const result = writeClientConfig(client, mcpConfig);

		if (result.success) {
			spinner.succeed(`Configured ${client.displayName}`);
			console.log(chalk.gray(`  Config: ${client.configPath}`));
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
async function checkToolsStatus(): Promise<void> {
	const detection = detectAIClients();

	console.log(chalk.cyan("\nMCP Configuration Status:"));
	console.log();

	for (const client of detection.clients) {
		let icon: string;
		let status: string;

		if (!client.exists) {
			icon = chalk.gray("○");
			status = chalk.gray("Not installed");
		} else if (client.hasSnapback) {
			icon = chalk.green("✓");
			status = chalk.green("Configured");
		} else {
			icon = chalk.yellow("○");
			status = chalk.yellow("Detected but not configured");
		}

		console.log(`${icon} ${client.displayName.padEnd(20)} ${status}`);
	}

	console.log();

	if (detection.needsSetup.length > 0) {
		console.log(chalk.yellow(`${detection.needsSetup.length} tool(s) need configuration.`));
		console.log(chalk.gray("Run: snap tools configure"));
	} else if (detection.detected.length > 0) {
		console.log(chalk.green("All detected AI tools are configured!"));
	} else {
		console.log(chalk.gray("Install Claude Desktop or Cursor to get started."));
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

export { listTools, autoConfigureTools, configureTool, checkToolsStatus };
