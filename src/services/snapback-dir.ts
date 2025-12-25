/**
 * SnapBack Directory Service
 *
 * Manages .snapback/ workspace directory and ~/.snapback/ global directory.
 * This is the foundation for CLI commands that need persistent storage.
 *
 * Storage Architecture:
 * - ~/.snapback/ (GLOBAL) - credentials, user config, MCP configs
 * - .snapback/ (WORKSPACE) - patterns, learnings, session, snapshots
 *
 * @see implementation_plan.md Section 1.3
 */

import { access, appendFile, constants, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// =============================================================================
// CONSTANTS
// =============================================================================

const SNAPBACK_DIR = ".snapback";
const GLOBAL_SNAPBACK_DIR = ".snapback";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface WorkspaceConfig {
	workspaceId?: string;
	tier?: "free" | "pro";
	protectionLevel?: "standard" | "strict";
	syncEnabled?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface WorkspaceVitals {
	framework?: string;
	frameworkConfidence?: number;
	packageManager?: "npm" | "pnpm" | "yarn" | "bun";
	typescript?: {
		enabled: boolean;
		strict?: boolean;
		version?: string;
	};
	criticalFiles?: string[];
	detectedAt: string;
}

export interface ProtectedFile {
	pattern: string;
	addedAt: string;
	reason?: string;
}

export interface SessionState {
	id: string;
	task?: string;
	startedAt: string;
	snapshotCount: number;
	filesModified?: number;
}

export interface LearningEntry {
	id: string;
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	action: string;
	source: string;
	createdAt: string;
}

export interface ViolationEntry {
	type: string;
	file: string;
	message: string;
	count?: number;
	date: string;
	prevention?: string;
}

export interface GlobalCredentials {
	accessToken: string;
	refreshToken?: string;
	email: string;
	tier: "free" | "pro";
	expiresAt?: string;
}

export interface GlobalConfig {
	apiUrl?: string;
	defaultWorkspace?: string;
	analytics?: boolean;
}

// =============================================================================
// PATH HELPERS
// =============================================================================

/**
 * Get global snapback directory path (~/.snapback/)
 */
export function getGlobalDir(): string {
	return join(homedir(), GLOBAL_SNAPBACK_DIR);
}

/**
 * Get workspace snapback directory path
 */
export function getWorkspaceDir(workspaceRoot?: string): string {
	return join(workspaceRoot || process.cwd(), SNAPBACK_DIR);
}

/**
 * Get path to a file in the global directory
 */
export function getGlobalPath(relativePath: string): string {
	return join(getGlobalDir(), relativePath);
}

/**
 * Get path to a file in the workspace directory
 */
export function getWorkspacePath(relativePath: string, workspaceRoot?: string): string {
	return join(getWorkspaceDir(workspaceRoot), relativePath);
}

// =============================================================================
// DIRECTORY MANAGEMENT
// =============================================================================

/**
 * Create the .snapback/ directory structure in a workspace
 * Mirrors the structure expected by MCP server (context-tools.ts)
 */
export async function createSnapbackDirectory(workspaceRoot?: string): Promise<void> {
	const baseDir = getWorkspaceDir(workspaceRoot);

	const dirs = ["", "patterns", "learnings", "session", "snapshots"];

	for (const dir of dirs) {
		await mkdir(join(baseDir, dir), { recursive: true });
	}

	// Create .gitignore to exclude snapshots but keep patterns
	const gitignore = `# SnapBack Directory
# Ignore snapshot content (large binary data)
snapshots/
embeddings.db

# Keep these for team sharing
!patterns/
!learnings/
!vitals.json
!config.json
!protected.json
`.trim();

	await writeFile(join(baseDir, ".gitignore"), gitignore);
}

/**
 * Create the global ~/.snapback/ directory structure
 */
export async function createGlobalDirectory(): Promise<void> {
	const baseDir = getGlobalDir();

	const dirs = ["", "cache", "mcp-configs"];

	for (const dir of dirs) {
		await mkdir(join(baseDir, dir), { recursive: true });
	}
}

/**
 * Check if .snapback/ directory exists in workspace
 */
export async function isSnapbackInitialized(workspaceRoot?: string): Promise<boolean> {
	try {
		const configPath = getWorkspacePath("config.json", workspaceRoot);
		await access(configPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if user is logged in (has credentials)
 */
export async function isLoggedIn(): Promise<boolean> {
	try {
		const credentials = await readGlobalJson<GlobalCredentials>("credentials.json");
		if (!credentials?.accessToken) return false;

		// Check if token is expired
		if (credentials.expiresAt) {
			const expiresAt = new Date(credentials.expiresAt);
			if (expiresAt < new Date()) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// JSON FILE OPERATIONS - WORKSPACE
// =============================================================================

/**
 * Read JSON file from .snapback/
 */
export async function readSnapbackJson<T>(relativePath: string, workspaceRoot?: string): Promise<T | null> {
	try {
		const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Write JSON file to .snapback/
 */
export async function writeSnapbackJson<T>(relativePath: string, data: T, workspaceRoot?: string): Promise<void> {
	const fullPath = getWorkspacePath(relativePath, workspaceRoot);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, JSON.stringify(data, null, 2));
}

/**
 * Append to JSONL file in .snapback/
 */
export async function appendSnapbackJsonl<T extends object>(
	relativePath: string,
	data: T,
	workspaceRoot?: string,
): Promise<void> {
	const fullPath = getWorkspacePath(relativePath, workspaceRoot);
	await mkdir(dirname(fullPath), { recursive: true });
	await appendFile(fullPath, JSON.stringify(data) + "\n");
}

/**
 * Load JSONL file from .snapback/
 */
export async function loadSnapbackJsonl<T>(relativePath: string, workspaceRoot?: string): Promise<T[]> {
	try {
		const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
		return content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as T);
	} catch {
		return [];
	}
}

// =============================================================================
// JSON FILE OPERATIONS - GLOBAL
// =============================================================================

/**
 * Read JSON file from ~/.snapback/
 */
export async function readGlobalJson<T>(relativePath: string): Promise<T | null> {
	try {
		const content = await readFile(getGlobalPath(relativePath), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Write JSON file to ~/.snapback/
 */
export async function writeGlobalJson<T>(relativePath: string, data: T): Promise<void> {
	const fullPath = getGlobalPath(relativePath);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, JSON.stringify(data, null, 2));
}

/**
 * Delete JSON file from ~/.snapback/
 */
export async function deleteGlobalJson(relativePath: string): Promise<void> {
	const fullPath = getGlobalPath(relativePath);
	try {
		const { unlink } = await import("node:fs/promises");
		await unlink(fullPath);
	} catch {
		// File doesn't exist, that's fine
	}
}

// =============================================================================
// TYPED ACCESSORS
// =============================================================================

/**
 * Get workspace configuration
 */
export async function getWorkspaceConfig(workspaceRoot?: string): Promise<WorkspaceConfig | null> {
	return readSnapbackJson<WorkspaceConfig>("config.json", workspaceRoot);
}

/**
 * Save workspace configuration
 */
export async function saveWorkspaceConfig(config: WorkspaceConfig, workspaceRoot?: string): Promise<void> {
	await writeSnapbackJson("config.json", config, workspaceRoot);
}

/**
 * Get workspace vitals
 */
export async function getWorkspaceVitals(workspaceRoot?: string): Promise<WorkspaceVitals | null> {
	return readSnapbackJson<WorkspaceVitals>("vitals.json", workspaceRoot);
}

/**
 * Save workspace vitals
 */
export async function saveWorkspaceVitals(vitals: WorkspaceVitals, workspaceRoot?: string): Promise<void> {
	await writeSnapbackJson("vitals.json", vitals, workspaceRoot);
}

/**
 * Get protected files list
 */
export async function getProtectedFiles(workspaceRoot?: string): Promise<ProtectedFile[]> {
	return (await readSnapbackJson<ProtectedFile[]>("protected.json", workspaceRoot)) ?? [];
}

/**
 * Save protected files list
 */
export async function saveProtectedFiles(files: ProtectedFile[], workspaceRoot?: string): Promise<void> {
	await writeSnapbackJson("protected.json", files, workspaceRoot);
}

/**
 * Get current session state
 */
export async function getCurrentSession(workspaceRoot?: string): Promise<SessionState | null> {
	return readSnapbackJson<SessionState>("session/current.json", workspaceRoot);
}

/**
 * Save current session state
 */
export async function saveCurrentSession(session: SessionState, workspaceRoot?: string): Promise<void> {
	await writeSnapbackJson("session/current.json", session, workspaceRoot);
}

/**
 * End current session (delete current.json)
 */
export async function endCurrentSession(workspaceRoot?: string): Promise<void> {
	const fullPath = getWorkspacePath("session/current.json", workspaceRoot);
	try {
		const { unlink } = await import("node:fs/promises");
		await unlink(fullPath);
	} catch {
		// File doesn't exist, that's fine
	}
}

/**
 * Record a learning
 */
export async function recordLearning(learning: LearningEntry, workspaceRoot?: string): Promise<void> {
	await appendSnapbackJsonl("learnings/user-learnings.jsonl", learning, workspaceRoot);
}

/**
 * Get all learnings
 */
export async function getLearnings(workspaceRoot?: string): Promise<LearningEntry[]> {
	return loadSnapbackJsonl<LearningEntry>("learnings/user-learnings.jsonl", workspaceRoot);
}

/**
 * Record a violation
 */
export async function recordViolation(violation: ViolationEntry, workspaceRoot?: string): Promise<void> {
	await appendSnapbackJsonl("patterns/violations.jsonl", violation, workspaceRoot);
}

/**
 * Get all violations
 */
export async function getViolations(workspaceRoot?: string): Promise<ViolationEntry[]> {
	return loadSnapbackJsonl<ViolationEntry>("patterns/violations.jsonl", workspaceRoot);
}

/**
 * Get credentials
 */
export async function getCredentials(): Promise<GlobalCredentials | null> {
	return readGlobalJson<GlobalCredentials>("credentials.json");
}

/**
 * Save credentials
 */
export async function saveCredentials(credentials: GlobalCredentials): Promise<void> {
	await createGlobalDirectory();
	await writeGlobalJson("credentials.json", credentials);
}

/**
 * Clear credentials (logout)
 */
export async function clearCredentials(): Promise<void> {
	await deleteGlobalJson("credentials.json");
}

/**
 * Get global config
 */
export async function getGlobalConfig(): Promise<GlobalConfig | null> {
	return readGlobalJson<GlobalConfig>("config.json");
}

/**
 * Save global config
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
	await createGlobalDirectory();
	await writeGlobalJson("config.json", config);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Re-export generateId from @snapback/contracts for backwards compatibility
export { generateId } from "@snapback/contracts/id-generator";

/**
 * Get workspace root by searching for .snapback/ or package.json
 */
export async function findWorkspaceRoot(startDir?: string): Promise<string | null> {
	let currentDir = startDir || process.cwd();

	// Limit search depth to prevent infinite loops
	const maxDepth = 10;
	let depth = 0;

	while (depth < maxDepth) {
		// Check for .snapback directory
		try {
			await access(join(currentDir, SNAPBACK_DIR), constants.F_OK);
			return currentDir;
		} catch {
			// Not found, continue
		}

		// Check for package.json (workspace root indicator)
		try {
			await access(join(currentDir, "package.json"), constants.F_OK);
			return currentDir;
		} catch {
			// Not found, continue
		}

		// Move up one directory
		const parentDir = dirname(currentDir);
		if (parentDir === currentDir) {
			// Reached root
			break;
		}
		currentDir = parentDir;
		depth++;
	}

	return null;
}

/**
 * Check if a path exists
 */
export async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get file stats
 */
export async function getStats(path: string): Promise<{ size: number; modifiedAt: Date } | null> {
	try {
		const stats = await stat(path);
		return {
			size: stats.size,
			modifiedAt: stats.mtime,
		};
	} catch {
		return null;
	}
}
