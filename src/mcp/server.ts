/**
 * CLI MCP Server Factory
 *
 * Creates and starts an MCP server for the CLI.
 * This is a simplified version of apps/mcp-server/src/index.ts
 * designed for embedding in the CLI.
 *
 * @module cli/mcp/server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
	CheckPatternsSchema,
	GetContextSchema,
	handleCheckPatterns,
	handleGetContext,
	handleRecordLearning,
	handleValidateCode,
	RecordLearningSchema,
	ValidateCodeSchema,
} from "./tools/context-tools.js";
import { createErrorResult, learningToolDefinitions, snapbackToolDefinitions } from "./tools/definitions.js";
import {
	EndSessionSchema,
	GetRecommendationsSchema,
	handleEndSession,
	handleGetRecommendations,
	handleSessionStats,
	handleStartSession,
	SessionStatsSchema,
	StartSessionSchema,
} from "./tools/learning-tools.js";

// =============================================================================
// QUIET MODE HELPERS
// =============================================================================

/**
 * Quiet mode for MCP clients that treat stderr output as errors.
 * Set MCP_QUIET=1 to suppress all startup/info logs.
 */
const MCP_QUIET = process.env.MCP_QUIET === "1" || process.env.MCP_QUIET === "true";

/**
 * Log helper - only logs if not in quiet mode
 */
export function mcpLog(message: string, ...args: unknown[]): void {
	if (!MCP_QUIET) {
		console.error(message, ...args);
	}
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Sanitize errors for production
 */
function sanitizeError(error: unknown, context: string): { message: string; code: string; logId: string } {
	const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
	const logId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	console.error(`[Error ${logId}] ${context}:`, error);

	if (isDevelopment) {
		return {
			message: error instanceof Error ? error.message : String(error),
			code: "INTERNAL_ERROR",
			logId,
		};
	}

	return {
		message: "An internal error occurred. Contact support with log ID.",
		code: "INTERNAL_ERROR",
		logId,
	};
}

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

export interface MCPServerConfig {
	/** Server name */
	name?: string;
	/** Server version */
	version?: string;
	/** Workspace root directory */
	workspaceRoot?: string;
	/** Optional API key for Pro features */
	apiKey?: string;
}

// =============================================================================
// SERVER FACTORY
// =============================================================================

/**
 * Create and start an MCP server
 */
export async function createMCPServer(config: MCPServerConfig = {}): Promise<{
	server: Server;
	transport: StdioServerTransport;
}> {
	const {
		name = "snapback-cli-mcp",
		version = "1.0.0",
		workspaceRoot = process.cwd(),
		apiKey = process.env.SNAPBACK_API_KEY,
	} = config;

	mcpLog(`[SnapBack CLI MCP] Starting server v${version}`);
	mcpLog(`[SnapBack CLI MCP] Workspace: ${workspaceRoot}`);

	// Create server instance
	const server = new Server(
		{ name, version },
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Register tools listing
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			...snapbackToolDefinitions.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				...(tool.annotations && { annotations: tool.annotations }),
			})),
			...learningToolDefinitions.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			})),
		],
	}));

	// Handle tool calls
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name: toolName } = request.params;
		const { arguments: args } = request.params;

		try {
			// Intelligence context tools
			if (toolName === "snapback.get_context") {
				const parsed = GetContextSchema.parse(args);
				const result = await handleGetContext(parsed, workspaceRoot);
				return {
					content: [
						{ type: "text", text: JSON.stringify(result, null, 2) },
						{ type: "text", text: result.hint },
					],
				};
			}

			if (toolName === "snapback.check_patterns") {
				const parsed = CheckPatternsSchema.parse(args);
				const result = await handleCheckPatterns(parsed, workspaceRoot);
				return {
					content: [
						{ type: "text", text: JSON.stringify(result, null, 2) },
						{ type: "text", text: result.suggestion },
					],
				};
			}

			if (toolName === "snapback.validate_code") {
				const parsed = ValidateCodeSchema.parse(args);
				const result = await handleValidateCode(parsed, workspaceRoot);
				return {
					content: [
						{ type: "text", text: JSON.stringify(result, null, 2) },
						{ type: "text", text: result.suggestion },
					],
				};
			}

			if (toolName === "snapback.record_learning") {
				const parsed = RecordLearningSchema.parse(args);
				const result = await handleRecordLearning(parsed, workspaceRoot);
				return {
					content: [
						{ type: "text", text: JSON.stringify(result, null, 2) },
						{ type: "text", text: result.message },
					],
				};
			}

			// Session/learning tools
			if (toolName === "snapback.start_session") {
				const parsed = StartSessionSchema.parse(args);
				return await handleStartSession(parsed, undefined, workspaceRoot);
			}

			if (toolName === "snapback.get_recommendations") {
				const parsed = GetRecommendationsSchema.parse(args);
				return await handleGetRecommendations(parsed, undefined, workspaceRoot);
			}

			if (toolName === "snapback.session_stats") {
				const parsed = SessionStatsSchema.parse(args);
				return await handleSessionStats(parsed, undefined, workspaceRoot);
			}

			if (toolName === "snapback.end_session") {
				const parsed = EndSessionSchema.parse(args);
				return await handleEndSession(parsed, undefined, workspaceRoot);
			}

			// Snapshot tools (Pro tier - require backend)
			if (toolName === "snapback.list_snapshots" || toolName === "snapback.restore_snapshot") {
				return createErrorResult(
					"Snapshot tools require Pro tier with backend connectivity.",
					"Run 'snap mcp configure' to set up your API key.",
				);
			}

			throw new Error(`Unknown tool: ${toolName}`);
		} catch (error: unknown) {
			const sanitized = sanitizeError(error, `tool_call_${toolName}`);
			return {
				content: [
					{
						type: "text",
						text: `${sanitized.message} (Log ID: ${sanitized.logId})`,
					},
				],
				isError: true,
				error: {
					message: sanitized.message,
					code: sanitized.code,
				},
			};
		}
	});

	// Create transport
	const transport = new StdioServerTransport();

	// Connect
	await server.connect(transport);

	mcpLog("[SnapBack CLI MCP] Server started");

	return { server, transport };
}

/**
 * Start the MCP server (entry point for CLI command)
 */
export async function startMCPServer(config: MCPServerConfig = {}): Promise<void> {
	try {
		await createMCPServer(config);
		// Server runs until stdin closes
	} catch (error) {
		console.error("[SnapBack CLI MCP] Fatal error:", error);
		process.exit(1);
	}
}
