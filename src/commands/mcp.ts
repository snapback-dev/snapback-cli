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

export function createMcpCommand() {
	const cmd = createCommand("mcp");

	cmd.description("Run MCP server for Cursor/Claude integration")
		.option("--stdio", "Use stdio transport (default)")
		.option("--workspace <path>", "Workspace root path (auto-resolved if not provided)")
		.option("--tier <tier>", "User tier (free|pro|enterprise)", "free")
		.action(async (options) => {
			try {
				// Resolve workspace root with validation
				const workspaceValidation = resolveWorkspaceRoot(options.workspace);

				if (!workspaceValidation.valid) {
					console.error(`[SnapBack MCP] Workspace validation failed: ${workspaceValidation.error}`);
					process.exit(1);
				}

				// Build server options
				const serverOptions: McpServerOptions = {
					workspaceRoot: workspaceValidation.root,
					tier: (options.tier || "free") as "free" | "pro" | "enterprise",
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
