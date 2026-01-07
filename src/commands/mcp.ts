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
/**
 * Resolve user tier from multiple sources with priority:
 * 1. Explicit CLI flag (--tier)
 * 2. SNAPBACK_TIER environment variable
 * 3. SNAPBACK_API_KEY presence (implies pro)
 * 4. SNAPBACK_WORKSPACE_ID (would require async DB lookup - not implemented here)
 * 5. Default to free
 *
 * Note: For local CLI, we don't have access to the workspace_links database,
 * so workspace ID-based tier resolution is handled by the remote MCP server.
 * The CLI infers tier from API key presence or explicit configuration.
 */
function resolveTier(cliTier?: string): "free" | "pro" | "enterprise" {
	// Priority 1: CLI flag takes precedence
	if (cliTier && ["free", "pro", "enterprise"].includes(cliTier)) {
		return cliTier as "free" | "pro" | "enterprise";
	}

	// Priority 2: Check environment variable
	const envTier = process.env.SNAPBACK_TIER;
	if (envTier && ["free", "pro", "enterprise"].includes(envTier)) {
		return envTier as "free" | "pro" | "enterprise";
	}

	// Priority 3: API key presence implies pro tier
	if (process.env.SNAPBACK_API_KEY) {
		return "pro";
	}

	// Priority 4: Default to free (workspace ID resolution happens server-side)
	return "free";
}

export function createMcpCommand() {
	const cmd = createCommand("mcp");

	cmd.description("Run MCP server for Cursor/Claude integration")
		.option("--stdio", "Use stdio transport (default)")
		.option("--workspace <path>", "Workspace root path (auto-resolved if not provided)")
		.option(
			"--tier <tier>",
			"Override user tier (free|pro|enterprise). Auto-detected from SNAPBACK_API_KEY or SNAPBACK_TIER env var. Defaults to free.",
		)
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
