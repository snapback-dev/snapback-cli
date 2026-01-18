/**
 * SnapBack CLI MCP Command
 *
 * Implements MCP server management:
 * - `snap mcp --stdio` - Launch MCP server for Cursor/Claude integration
 * - `snap mcp scan` - Discover MCP configs across supported clients (§14.1)
 * - `snap mcp link` - Write/update SnapBack entry in client config (§14.1)
 * - `snap mcp unlink` - Remove SnapBack entry from client config (§14.1)
 *
 * @module commands/mcp
 */

import { homedir } from "node:os";
import { type McpServerOptions, runStdioMcpServer } from "@snapback/mcp";
import { resolveWorkspaceRoot } from "@snapback/mcp/middleware";
import {
	type AIClientConfig,
	type AIClientFormat,
	detectAIClients,
	detectWorkspaceConfig,
	getClient,
	getServerKey,
	getSnapbackMCPConfig,
	removeSnapbackConfig,
	validateConfig,
	writeClientConfig,
} from "@snapback/mcp-config";
import chalk from "chalk";
import { createCommand } from "commander";

/**
 * Check if a config path is global (not workspace-specific)
 */
function isGlobalConfigPath(configPath: string): boolean {
	const home = homedir();
	return configPath.includes(home) && !configPath.includes(process.cwd());
}

/**
 * Resolve user tier from multiple sources with priority:
 * 1. Explicit CLI flag (--tier)
 * 2. SNAPBACK_TIER environment variable
 * 3. SNAPBACK_API_KEY presence (implies pro)
 * 4. Default to free
 */
function resolveTier(cliTier?: string): "free" | "pro" | "enterprise" {
	if (cliTier && ["free", "pro", "enterprise"].includes(cliTier)) {
		return cliTier as "free" | "pro" | "enterprise";
	}

	const envTier = process.env.SNAPBACK_TIER;
	if (envTier && ["free", "pro", "enterprise"].includes(envTier)) {
		return envTier as "free" | "pro" | "enterprise";
	}

	if (process.env.SNAPBACK_API_KEY) {
		return "pro";
	}

	return "free";
}

export function createMcpCommand() {
	const cmd = createCommand("mcp");

	cmd.description("MCP server management for Cursor/Claude/VS Code integration");

	// ==========================================================================
	// Default action: Run MCP server with stdio transport
	// ==========================================================================
	cmd.option("--stdio", "Use stdio transport (default)")
		.option("--workspace <path>", "Workspace root path (auto-resolved if not provided)")
		.option(
			"--tier <tier>",
			"Override user tier (free|pro|enterprise). Auto-detected from SNAPBACK_API_KEY or SNAPBACK_TIER env var.",
		)
		.action(async (options) => {
			// If --stdio is set, run the MCP server
			if (options.stdio) {
				try {
					const workspaceValidation = resolveWorkspaceRoot(options.workspace);

					if (!workspaceValidation.valid) {
						console.error(`[SnapBack MCP] Workspace validation failed: ${workspaceValidation.error}`);
						process.exit(1);
					}

					const tier = resolveTier(options.tier);
					const serverOptions: McpServerOptions = {
						workspaceRoot: workspaceValidation.root,
						tier,
						storageMode: "local",
					};

					await runStdioMcpServer(serverOptions);
				} catch (error) {
					console.error("[SnapBack MCP] Server error:", error);
					process.exit(1);
				}
			} else {
				// Show help if no subcommand and no --stdio
				cmd.outputHelp();
			}
		});

	// ==========================================================================
	// §14.1: mcp scan - Discover MCP configs across supported clients
	// ==========================================================================
	cmd.command("scan")
		.description("Discover MCP configs across supported AI clients")
		.action(async () => {
			try {
				const result = detectAIClients();

				console.log(chalk.bold("\nSnapBack MCP Configuration Scan"));
				console.log(chalk.gray("=".repeat(40)));

				// Detected clients
				if (result.detected.length === 0) {
					console.log(chalk.yellow("\nNo supported AI clients detected."));
				} else {
					console.log(chalk.cyan(`\nDetected ${result.detected.length} client(s):`));
					for (const client of result.detected) {
						const serverKey = getServerKey(client.format);
						const status = client.hasSnapback
							? chalk.green("✓ Configured")
							: chalk.yellow("✗ Not configured");
						console.log(`  ${chalk.bold(client.displayName)}: ${status}`);
						console.log(chalk.gray(`    Path: ${client.configPath}`));
						console.log(chalk.gray(`    Key: ${serverKey}`));
					}
				}

				// Clients that need setup
				if (result.needsSetup.length > 0) {
					console.log(chalk.yellow(`\n${result.needsSetup.length} client(s) need SnapBack setup:`));
					for (const client of result.needsSetup) {
						console.log(`  - ${client.displayName}`);
					}
					console.log(chalk.gray("\nRun: snap mcp link --client <name>"));
				}

				// Summary
				const configured = result.detected.filter((c) => c.hasSnapback).length;
				console.log(chalk.gray(`\nSummary: ${configured}/${result.detected.length} clients configured`));
			} catch (error) {
				console.error(chalk.red("Scan failed:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.1: mcp link - Write/update SnapBack entry in client config
	// ==========================================================================
	cmd.command("link")
		.description("Configure SnapBack MCP server in an AI client")
		.requiredOption("--client <client>", "Target client (claude, cursor, vscode, qoder, windsurf, etc.)")
		.option("--workspace <path>", "Workspace root path")
		.option("--api-key <key>", "API key for Pro features")
		.option("--workspace-id <id>", "Workspace ID")
		.action(async (options) => {
			try {
				const clientName = options.client.toLowerCase() as AIClientFormat;
				const client = getClient(clientName);

				if (!client) {
					console.error(
						chalk.red(`Unknown client: ${options.client}`),
						chalk.gray("\nSupported: claude, cursor, vscode, qoder, windsurf, cline, zed, continue"),
					);
					process.exit(1);
				}

				// Resolve workspace
				const workspaceValidation = resolveWorkspaceRoot(options.workspace);
				const workspaceRoot = workspaceValidation.valid ? workspaceValidation.root : process.cwd();

				// Generate config
				const mcpConfig = getSnapbackMCPConfig({
					client: clientName,
					apiKey: options.apiKey,
					workspaceId: options.workspaceId,
					workspaceRoot,
					useLocalDev: true,
					localCliPath: process.argv[1], // Use current CLI as the path
				});

				// Write config
				console.log(chalk.cyan(`Configuring SnapBack for ${client.displayName}...`));
				const result = writeClientConfig(client, mcpConfig);

				if (result.success) {
					const serverKey = getServerKey(clientName);
					console.log(chalk.green(`✓ SnapBack configured for ${client.displayName}`));
					console.log(chalk.gray(`  Server key: ${serverKey}`));
					console.log(chalk.gray(`  Config: ${client.configPath}`));
					if (result.backup) {
						console.log(chalk.gray(`  Backup: ${result.backup}`));
					}

					// Validate
					if (validateConfig(client)) {
						console.log(chalk.green("✓ Configuration validated"));
					}
				} else {
					console.error(chalk.red(`✗ Failed to configure: ${result.error}`));
					process.exit(1);
				}
			} catch (error) {
				console.error(chalk.red("Link failed:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.1: mcp unlink - Remove SnapBack entry from client config
	// ==========================================================================
	cmd.command("unlink")
		.description("Remove SnapBack MCP server from an AI client")
		.requiredOption("--client <client>", "Target client (claude, cursor, vscode, qoder, windsurf, etc.)")
		.action(async (options) => {
			try {
				const clientName = options.client.toLowerCase() as AIClientFormat;
				const client = getClient(clientName);

				if (!client) {
					console.error(
						chalk.red(`Unknown client: ${options.client}`),
						chalk.gray("\nSupported: claude, cursor, vscode, qoder, windsurf, cline, zed, continue"),
					);
					process.exit(1);
				}

				if (!client.exists) {
					console.log(chalk.yellow(`${client.displayName} config not found.`));
					return;
				}

				console.log(chalk.cyan(`Removing SnapBack from ${client.displayName}...`));
				const result = removeSnapbackConfig(client);

				if (result.success) {
					console.log(chalk.green(`✓ SnapBack removed from ${client.displayName}`));
				} else {
					console.error(chalk.red(`✗ Failed to remove: ${result.error}`));
					process.exit(1);
				}
			} catch (error) {
				console.error(chalk.red("Unlink failed:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.2: mcp fix-conflicts - Resolve configuration conflicts
	// ==========================================================================
	cmd.command("fix-conflicts")
		.description("Resolve MCP configuration conflicts (workspace vs global)")
		.option("--auto", "Automatically resolve conflicts (prefer workspace configs)", false)
		.action(async (options) => {
			try {
				const result = detectAIClients();
				const conflicts: Array<{
					client: AIClientConfig;
					globalPath: string;
					workspacePath: string;
					workspaceType: string;
				}> = [];

				// Detect conflicts: both workspace and global configs exist
				for (const client of result.detected) {
					if (client.hasSnapback) {
						const workspaceConfig = detectWorkspaceConfig();
						if (workspaceConfig && isGlobalConfigPath(client.configPath)) {
							conflicts.push({
								client,
								globalPath: client.configPath,
								workspacePath: workspaceConfig.path,
								workspaceType: workspaceConfig.type,
							});
						}
					}
				}

				if (conflicts.length === 0) {
					console.log(chalk.green("\n✓ No MCP configuration conflicts detected"));
					console.log(chalk.gray("  All configurations are properly scoped\n"));
					return;
				}

				console.log(chalk.bold("\n🔍 MCP Configuration Conflicts\n"));
				console.log(
					chalk.yellow(`Found ${conflicts.length} conflict(s) - multiple configs for the same client\n`),
				);

				for (const conflict of conflicts) {
					console.log(chalk.cyan(`${conflict.client.displayName}:`));
					console.log(chalk.gray(`  Global:    ${conflict.globalPath}`));
					console.log(chalk.gray(`  Workspace: ${conflict.workspacePath} (${conflict.workspaceType})`));
					console.log();

					if (options.auto) {
						// Auto-resolve: remove global config, keep workspace
						const result = removeSnapbackConfig(conflict.client);
						if (result.success) {
							console.log(chalk.green("  ✓ Removed global config (workspace takes precedence)"));
						} else {
							console.log(chalk.red(`  ✗ Failed to remove: ${result.error}`));
						}
					} else {
						// Interactive mode - ask user
						console.log(
							chalk.yellow("  Recommendation: Keep workspace config, remove global to prevent conflicts"),
						);
					}

					console.log();
				}

				if (options.auto) {
					console.log(chalk.green("\n✓ All conflicts resolved"));
					console.log(chalk.gray("  Restart your IDE/editor to apply changes\n"));
				} else {
					console.log(chalk.cyan("\nTo auto-resolve all conflicts, run:"));
					console.log(chalk.gray("  snap mcp fix-conflicts --auto\n"));
				}
			} catch (error) {
				console.error(
					chalk.red("Fix conflicts failed:"),
					error instanceof Error ? error.message : String(error),
				);
				process.exit(1);
			}
		});

	return cmd;
}

/**
 * Export for CLI integration
 */
export const mcpCommand = createMcpCommand();
