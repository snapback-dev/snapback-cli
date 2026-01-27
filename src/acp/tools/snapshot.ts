/**
 * ACP Snapshot Tools
 *
 * Snapshot tool definitions and handlers for the ACP server.
 * Uses shared SnapshotService from @snapback/mcp for consistency
 * with the VS Code extension and MCP server.
 *
 * @module acp/tools/snapshot
 */

import type { SnapshotManifest } from "@snapback/engine";
import { createSnapshotService, type FileDiff, type SnapshotService } from "@snapback/mcp";
import { z } from "zod";
import type { ToolCallResult, ToolContext, ToolDefinition } from "../handlers/types";

// =============================================================================
// SERVICE CACHE
// =============================================================================

/**
 * Cached SnapshotService instances per workspace
 */
const serviceCache = new Map<string, SnapshotService>();

function getService(workspacePath: string): SnapshotService {
	if (!serviceCache.has(workspacePath)) {
		serviceCache.set(workspacePath, createSnapshotService(workspacePath));
	}
	const service = serviceCache.get(workspacePath);
	if (!service) {
		throw new Error(`Failed to get snapshot service for ${workspacePath}`);
	}
	return service;
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const snapshotTools: ToolDefinition[] = [
	{
		name: "snapshot.create",
		description: "Create a snapshot of one or more files",
		inputSchema: {
			type: "object",
			properties: {
				files: {
					type: "array",
					items: { type: "string" },
					description: "File paths to snapshot (relative to workspace)",
				},
				message: {
					type: "string",
					description: "Optional snapshot message/description",
				},
				metadata: {
					type: "object",
					description: "Optional metadata to attach",
				},
			},
			required: ["files"],
		},
	},
	{
		name: "snapshot.list",
		description: "List available snapshots",
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "Filter by file path (optional)",
				},
				limit: {
					type: "number",
					description: "Maximum number of snapshots to return (default: 20)",
				},
				before: {
					type: "string",
					description: "Return snapshots before this timestamp (ISO 8601)",
				},
			},
		},
	},
	{
		name: "snapshot.restore",
		description: "Restore files from a snapshot",
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: {
					type: "string",
					description: "Snapshot ID to restore from",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Specific files to restore (optional, defaults to all)",
				},
				preview: {
					type: "boolean",
					description: "If true, return diff without applying (default: false)",
				},
			},
			required: ["snapshotId"],
		},
	},
	{
		name: "snapshot.diff",
		description: "Show diff between current state and a snapshot",
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: {
					type: "string",
					description: "Snapshot ID to compare against",
				},
				file: {
					type: "string",
					description: "Specific file to diff (optional)",
				},
				format: {
					type: "string",
					enum: ["unified", "side-by-side", "json"],
					description: "Diff output format (default: unified)",
				},
			},
			required: ["snapshotId"],
		},
	},
];

// =============================================================================
// INPUT SCHEMAS (Zod validation)
// =============================================================================

const SnapshotCreateInputSchema = z.object({
	files: z.array(z.string()).min(1),
	message: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

const SnapshotListInputSchema = z.object({
	file: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
	before: z.string().optional(),
});

const SnapshotRestoreInputSchema = z.object({
	snapshotId: z.string(),
	files: z.array(z.string()).optional(),
	preview: z.boolean().default(false),
});

const SnapshotDiffInputSchema = z.object({
	snapshotId: z.string(),
	file: z.string().optional(),
	format: z.enum(["unified", "side-by-side", "json"]).default("unified"),
});

// =============================================================================
// HANDLERS
// =============================================================================

export const snapshotHandlers = {
	async create(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotCreateInputSchema.parse(params);
			context.auditLogger.log("snapshot.create", { files: input.files, message: input.message });

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.createFromFiles(input.files, {
				description: input.message ?? "ACP snapshot",
				trigger: "manual",
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Failed to create snapshot" }],
					isError: true,
				};
			}

			return {
				content: [
					{
						type: "json",
						json: {
							success: true,
							snapshot: result.reused
								? {
										id: result.reusedSnapshotId,
										reused: true,
										reason: result.reusedReason,
									}
								: {
										id: result.snapshot?.id,
										fileCount: result.snapshot?.fileCount,
										createdAt:
											result.snapshot?.createdAt !== undefined
												? new Date(result.snapshot.createdAt).toISOString()
												: undefined,
									},
							message: result.reused
								? `Reused existing snapshot: ${result.reusedSnapshotId}`
								: `Created snapshot: ${result.snapshot?.id}`,
						},
					},
				],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to create snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async list(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotListInputSchema.parse(params);

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			let snapshots: SnapshotManifest[] = service.listSnapshots(input.limit);

			// Filter by file if specified
			if (input.file) {
				snapshots = snapshots.filter((s) =>
					s.files.some((f) => f.path === input.file || f.path.endsWith(`/${input.file}`)),
				);
			}

			// Filter by before date if specified
			if (input.before) {
				const beforeDate = new Date(input.before).getTime();
				snapshots = snapshots.filter((s) => s.createdAt < beforeDate);
			}

			return {
				content: [
					{
						type: "json",
						json: {
							snapshots: snapshots.map((s) => ({
								id: s.id,
								files: s.files.map((f) => f.path),
								description: s.description,
								createdAt: new Date(s.createdAt).toISOString(),
								trigger: s.trigger ?? "unknown",
							})),
							total: snapshots.length,
						},
					},
				],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to list snapshots: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async restore(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotRestoreInputSchema.parse(params);
			context.auditLogger.log("snapshot.restore", {
				snapshotId: input.snapshotId,
				files: input.files,
				preview: input.preview,
			});

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.restore(input.snapshotId, {
				files: input.files,
				preview: input.preview,
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Restore failed" }],
					isError: true,
				};
			}

			if (result.preview) {
				return {
					content: [
						{
							type: "json",
							json: {
								preview: true,
								snapshotId: input.snapshotId,
								files: result.files,
								message: `Would restore ${result.files?.length ?? 0} file(s)`,
							},
						},
					],
					isError: false,
				};
			}

			return {
				content: [
					{
						type: "json",
						json: {
							success: true,
							restored: result.restoredFiles,
							errors: result.errors,
							message: `Restored ${result.restoredFiles?.length ?? 0} file(s) from snapshot`,
						},
					},
				],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to restore: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async diff(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotDiffInputSchema.parse(params);

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.diff(input.snapshotId, {
				file: input.file,
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Diff failed" }],
					isError: true,
				};
			}

			const diffInfo = {
				snapshotId: result.snapshotId,
				createdAt: result.createdAt ? new Date(result.createdAt).toISOString() : undefined,
				files: result.files,
				summary: result.summary,
			};

			if (input.format === "json") {
				return {
					content: [{ type: "json", json: diffInfo }],
					isError: false,
				};
			}

			// For text formats, return a simple summary
			const lines = [
				`Snapshot: ${result.snapshotId}`,
				`Created: ${diffInfo.createdAt}`,
				`Files (${result.summary?.changed ?? 0} changed, ${result.summary?.unchanged ?? 0} unchanged):`,
				...(result.files?.map((d: FileDiff) => `  ${d.changed ? "M" : " "} ${d.file}`) ?? []),
			];

			return {
				content: [{ type: "text", text: lines.join("\n") }],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to generate diff: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},
};
