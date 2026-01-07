/**
 * SnapBack CLI MCP Command
 *
 * Implements `snap mcp --stdio` for launching the MCP server from the CLI.
 * This command is invoked by Cursor, Claude Desktop, and other MCP clients.
 *
 * Usage:
 *   snap mcp --stdio [--workspace <path>]
 *
 * @module commands/mcp
 */

import { type McpServerOptions, runStdioMcpServer } from "@snapback/mcp";
import { resolveWorkspaceRoot } from "@snapback/mcp/middleware";
import { createCommand } from "commander";

/**
 * Resolve tier from environment or CLI flag
 * Priority: CLI flag > SNAPBACK_TIER env > default
 */
function resolveTier(cliTier?: string): "free" | "pro" | "enterprise" {
	// CLI flag takes priority
	if (cliTier && ["free", "pro", "enterprise"].includes(cliTier)) {
		return cliTier as "free" | "pro" | "enterprise";
	}

	// Check environment variable
	const envTier = process.env.SNAPBACK_TIER;
	if (envTier && ["free", "pro", "enterprise"].includes(envTier)) {
		return envTier as "free" | "pro" | "enterprise";
	}

	// Check for dev mode (API key present = pro)
	if (process.env.SNAPBACK_API_KEY) {
		return "pro";
	}

	return "free";
}

export function createMcpCommand() {
	const cmd = createCommand("mcp");

	cmd.description("Run MCP server for Cursor/Claude integration")
		.option("--stdio", "Use stdio transport (default)")
		.option("--workspace <path>", "Workspace root path (auto-resolved if not provided)")
		.option("--tier <tier>", "User tier (free|pro|enterprise). Can also set via SNAPBACK_TIER env var")
		.action(async (options) => {
			try {
				// Resolve workspace root with validation
				const workspaceValidation = resolveWorkspaceRoot(options.workspace);

				if (!workspaceValidation.valid) {
					console.error(`[SnapBack MCP] Workspace validation failed: ${workspaceValidation.error}`);
					process.exit(1);
				}

				// Resolve tier from CLI flag, env var, or default
				const tier = resolveTier(options.tier);

				// Build server options
				const serverOptions: McpServerOptions = {
					workspaceRoot: workspaceValidation.root,
					tier,
					// CLI invocation is always local with write permissions
					storageMode: "local",
				};

				// Launch MCP server with stdio transport
				await runStdioMcpServer(serverOptions);
			} catch (error) {
				console.error("[SnapBack MCP] Server error:", error);
				process.exit(1);
			}
		});

	return cmd;
}

/**
 * Export for CLI integration
 */
export const mcpCommand = createMcpCommand();
