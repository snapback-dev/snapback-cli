/**
 * Tools Command
 *
 * Implements snap tools configure - Auto-setup MCP for Cursor/Claude.
 * Writes to ~/.cursor/mcp.json or ~/.config/claude/mcp.json
 *
 * @see implementation_plan.md Section 1.2
 */

import { access, constants, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { getCredentials, isLoggedIn } from "../services/snapback-dir";

// =============================================================================
// TYPES
// =============================================================================

interface MCPServerConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

interface MCPConfig {
	mcpServers: Record<string, MCPServerConfig>;
}

interface ToolConfig {
	name: string;
	displayName: string;
	configPath: string;
	detected: boolean;
}

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
		.option("--list", "List available tools")
		.option("--dry-run", "Show what would be configured without writing")
		.action(async (options) => {
			try {
				if (options.list) {
					await listTools();
					return;
				}

				// Determine which tools to configure
				const toolsToConfig: string[] = [];

				if (options.cursor) toolsToConfig.push("cursor");
				if (options.claude) toolsToConfig.push("claude");
				if (options.windsurf) toolsToConfig.push("windsurf");

				// If no specific tool, auto-detect
				if (toolsToConfig.length === 0) {
					await autoConfigureTools(options.dryRun);
				} else {
					for (const tool of toolsToConfig) {
						await configureTool(tool, options.dryRun);
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
 * Get known tool configurations
 */
function getKnownTools(): ToolConfig[] {
	const home = homedir();

	return [
		{
			name: "cursor",
			displayName: "Cursor",
			configPath: join(home, ".cursor", "mcp.json"),
			detected: false,
		},
		{
			name: "claude",
			displayName: "Claude Desktop",
			configPath: join(home, ".config", "claude", "mcp.json"),
			detected: false,
		},
		{
			name: "windsurf",
			displayName: "Windsurf",
			configPath: join(home, ".windsurf", "mcp.json"),
			detected: false,
		},
	];
}

/**
 * Detect which tools are installed
 */
async function detectInstalledTools(): Promise<ToolConfig[]> {
	const tools = getKnownTools();

	for (const tool of tools) {
		try {
			// Check if config directory exists or if tool is likely installed
			const configDir = dirname(tool.configPath);
			await access(configDir, constants.F_OK);
			tool.detected = true;
		} catch {
			// Directory doesn't exist
		}
	}

	return tools;
}

/**
 * List available tools
 */
async function listTools(): Promise<void> {
	const tools = await detectInstalledTools();

	console.log(chalk.cyan("Available AI Tools:"));
	console.log();

	for (const tool of tools) {
		const status = tool.detected ? chalk.green("✓ Detected") : chalk.gray("Not detected");
		console.log(`  ${tool.displayName.padEnd(20)} ${status}`);
		console.log(chalk.gray(`    Config: ${tool.configPath}`));
	}

	console.log();
	console.log(chalk.gray("Use --cursor, --claude, or --windsurf to configure a specific tool"));
}

/**
 * Auto-configure all detected tools
 */
async function autoConfigureTools(dryRun: boolean): Promise<void> {
	const tools = await detectInstalledTools();
	const detected = tools.filter((t) => t.detected);

	if (detected.length === 0) {
		console.log(chalk.yellow("No AI tools detected"));
		console.log(chalk.gray("Install Cursor, Claude Desktop, or Windsurf to use MCP"));
		return;
	}

	console.log(chalk.cyan(`Detected ${detected.length} AI tool(s):`));
	for (const tool of detected) {
		console.log(`  • ${tool.displayName}`);
	}
	console.log();

	for (const tool of detected) {
		await configureTool(tool.name, dryRun);
	}
}

/**
 * Configure a specific tool
 */
async function configureTool(toolName: string, dryRun: boolean): Promise<void> {
	const tools = getKnownTools();
	const tool = tools.find((t) => t.name === toolName);

	if (!tool) {
		console.error(chalk.red(`Unknown tool: ${toolName}`));
		return;
	}

	const spinner = ora(`Configuring ${tool.displayName}...`).start();

	try {
		// Build MCP config
		const mcpConfig = await buildMCPConfig();

		if (dryRun) {
			spinner.info(`Would configure ${tool.displayName}`);
			console.log(chalk.gray(`Path: ${tool.configPath}`));
			console.log(chalk.gray("Config:"));
			console.log(JSON.stringify(mcpConfig, null, 2));
			return;
		}

		// Read existing config if it exists
		let existingConfig: MCPConfig = { mcpServers: {} };
		try {
			const content = await readFile(tool.configPath, "utf-8");
			existingConfig = JSON.parse(content) as MCPConfig;
		} catch {
			// No existing config, start fresh
		}

		// Merge configs (preserve existing servers)
		const mergedConfig: MCPConfig = {
			...existingConfig,
			mcpServers: {
				...existingConfig.mcpServers,
				...mcpConfig.mcpServers,
			},
		};

		// Write config
		await mkdir(dirname(tool.configPath), { recursive: true });
		await writeFile(tool.configPath, JSON.stringify(mergedConfig, null, 2));

		spinner.succeed(`Configured ${tool.displayName}`);
		console.log(chalk.gray(`  Config: ${tool.configPath}`));
	} catch (error) {
		spinner.fail(`Failed to configure ${tool.displayName}`);
		throw error;
	}
}

/**
 * Build MCP configuration for SnapBack
 */
async function buildMCPConfig(): Promise<MCPConfig> {
	const env: Record<string, string> = {};

	// Add API key if logged in
	if (await isLoggedIn()) {
		const credentials = await getCredentials();
		if (credentials?.accessToken) {
			env.SNAPBACK_API_KEY = credentials.accessToken;
		}
	}

	return {
		mcpServers: {
			snapback: {
				command: "npx",
				args: ["-y", "@snapback/mcp-server"],
				...(Object.keys(env).length > 0 && { env }),
			},
		},
	};
}

/**
 * Check status of all tool configurations
 */
async function checkToolsStatus(): Promise<void> {
	const tools = await detectInstalledTools();

	console.log(chalk.cyan("MCP Configuration Status:"));
	console.log();

	for (const tool of tools) {
		if (!tool.detected) {
			console.log(`${chalk.gray("○")} ${tool.displayName.padEnd(20)} ${chalk.gray("Not detected")}`);
			continue;
		}

		// Check if snapback is configured
		try {
			const content = await readFile(tool.configPath, "utf-8");
			const config = JSON.parse(content) as MCPConfig;

			if (config.mcpServers?.snapback) {
				console.log(`${chalk.green("✓")} ${tool.displayName.padEnd(20)} ${chalk.green("Configured")}`);
			} else {
				console.log(
					`${chalk.yellow("○")} ${tool.displayName.padEnd(20)} ${chalk.yellow("Detected but not configured")}`,
				);
			}
		} catch {
			console.log(
				`${chalk.yellow("○")} ${tool.displayName.padEnd(20)} ${chalk.yellow("Detected but not configured")}`,
			);
		}
	}

	console.log();
	console.log(chalk.gray("Run: snap tools configure"));
}

// =============================================================================
// EXPORTS
// =============================================================================

export { detectInstalledTools, configureTool, buildMCPConfig, checkToolsStatus };
