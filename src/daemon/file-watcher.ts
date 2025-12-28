/**
 * SnapBack Daemon File Watcher Service
 *
 * Watches for file changes in workspaces and emits events for proactive protection.
 * Uses chokidar for cross-platform file watching.
 *
 * Features:
 * - Per-workspace file watching
 * - Configurable watch patterns
 * - Debounced change events
 * - Risk assessment on file changes
 * - Automatic cleanup on workspace unsubscribe
 *
 * @module daemon/file-watcher
 */

import { EventEmitter } from "node:events";
import { extname } from "node:path";

import type { FSWatcher } from "chokidar";
import { watch } from "chokidar";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Default patterns to watch for source files */
const DEFAULT_WATCH_PATTERNS = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.vue", "**/*.svelte"];

/** Patterns to always ignore */
const IGNORED_PATTERNS = [
	"**/node_modules/**",
	"**/.git/**",
	"**/dist/**",
	"**/build/**",
	"**/.next/**",
	"**/coverage/**",
	"**/*.d.ts",
	"**/.snapback/**",
];

/** Debounce delay for file change events (ms) */
const CHANGE_DEBOUNCE_MS = 100;

/** High-risk file patterns */
const HIGH_RISK_PATTERNS = [
	/auth/i,
	/security/i,
	/payment/i,
	/secret/i,
	/password/i,
	/credential/i,
	/\.env/i,
	/config\.(ts|js|json)$/i,
];

/** Medium-risk file patterns */
const MEDIUM_RISK_PATTERNS = [/middleware/i, /api/i, /route/i, /handler/i, /service/i, /util/i];

// =============================================================================
// TYPES
// =============================================================================

export interface FileChangeEvent {
	workspace: string;
	file: string;
	type: "add" | "change" | "unlink";
	timestamp: number;
	riskLevel: "low" | "medium" | "high";
	riskReason?: string;
}

export interface WatcherConfig {
	patterns?: string[];
	ignored?: string[];
	debounceMs?: number;
}

interface WorkspaceWatcher {
	watcher: FSWatcher;
	patterns: string[];
	debounceTimers: Map<string, NodeJS.Timeout>;
	subscribers: Set<string>;
}

// =============================================================================
// FILE WATCHER SERVICE
// =============================================================================

export class FileWatcherService extends EventEmitter {
	private watchers = new Map<string, WorkspaceWatcher>();

	/**
	 * Subscribe to file changes for a workspace
	 */
	async subscribe(
		workspace: string,
		subscriberId: string,
		config: WatcherConfig = {},
	): Promise<{ subscribed: boolean; patterns: string[] }> {
		const existing = this.watchers.get(workspace);

		if (existing) {
			// Add subscriber to existing watcher
			existing.subscribers.add(subscriberId);
			return { subscribed: true, patterns: existing.patterns };
		}

		// Create new watcher
		const patterns = config.patterns || DEFAULT_WATCH_PATTERNS;
		const ignored = [...IGNORED_PATTERNS, ...(config.ignored || [])];

		const watcher = watch(patterns, {
			cwd: workspace,
			ignored,
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 100,
				pollInterval: 50,
			},
		});

		const workspaceWatcher: WorkspaceWatcher = {
			watcher,
			patterns,
			debounceTimers: new Map(),
			subscribers: new Set([subscriberId]),
		};

		// Set up event handlers
		watcher.on("add", (path) => this.handleFileEvent(workspace, path, "add", workspaceWatcher));
		watcher.on("change", (path) => this.handleFileEvent(workspace, path, "change", workspaceWatcher));
		watcher.on("unlink", (path) => this.handleFileEvent(workspace, path, "unlink", workspaceWatcher));
		watcher.on("error", (error) => {
			this.emit("error", { workspace, error: String(error) });
		});

		this.watchers.set(workspace, workspaceWatcher);

		return { subscribed: true, patterns };
	}

	/**
	 * Unsubscribe from file changes
	 */
	async unsubscribe(workspace: string, subscriberId: string): Promise<{ unsubscribed: boolean }> {
		const workspaceWatcher = this.watchers.get(workspace);

		if (!workspaceWatcher) {
			return { unsubscribed: false };
		}

		workspaceWatcher.subscribers.delete(subscriberId);

		// If no more subscribers, close the watcher
		if (workspaceWatcher.subscribers.size === 0) {
			await this.closeWatcher(workspace, workspaceWatcher);
		}

		return { unsubscribed: true };
	}

	/**
	 * Get active subscriptions for a workspace
	 */
	getSubscribers(workspace: string): string[] {
		const workspaceWatcher = this.watchers.get(workspace);
		return workspaceWatcher ? Array.from(workspaceWatcher.subscribers) : [];
	}

	/**
	 * Check if workspace is being watched
	 */
	isWatching(workspace: string): boolean {
		return this.watchers.has(workspace);
	}

	/**
	 * Close all watchers
	 */
	async closeAll(): Promise<void> {
		await Promise.all(
			Array.from(this.watchers.entries()).map(([workspace, watcher]) => this.closeWatcher(workspace, watcher)),
		);
		this.watchers.clear();
	}

	/**
	 * Handle file event with debouncing
	 */
	private handleFileEvent(
		workspace: string,
		filePath: string,
		type: "add" | "change" | "unlink",
		workspaceWatcher: WorkspaceWatcher,
	): void {
		// Clear existing debounce timer for this file
		const existingTimer = workspaceWatcher.debounceTimers.get(filePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new debounce timer
		const timer = setTimeout(() => {
			workspaceWatcher.debounceTimers.delete(filePath);
			this.emitFileChange(workspace, filePath, type);
		}, CHANGE_DEBOUNCE_MS);

		workspaceWatcher.debounceTimers.set(filePath, timer);
	}

	/**
	 * Emit file change event with risk assessment
	 */
	private emitFileChange(workspace: string, filePath: string, type: "add" | "change" | "unlink"): void {
		const riskAssessment = this.assessRisk(filePath);

		const event: FileChangeEvent = {
			workspace,
			file: filePath,
			type,
			timestamp: Date.now(),
			riskLevel: riskAssessment.level,
			riskReason: riskAssessment.reason,
		};

		this.emit("file_changed", event);
	}

	/**
	 * Assess risk level for a file path
	 */
	private assessRisk(filePath: string): { level: "low" | "medium" | "high"; reason?: string } {
		const lowerPath = filePath.toLowerCase();

		// Check high-risk patterns
		for (const pattern of HIGH_RISK_PATTERNS) {
			if (pattern.test(lowerPath)) {
				return {
					level: "high",
					reason: `File matches high-risk pattern: ${pattern.source}`,
				};
			}
		}

		// Check medium-risk patterns
		for (const pattern of MEDIUM_RISK_PATTERNS) {
			if (pattern.test(lowerPath)) {
				return {
					level: "medium",
					reason: `File matches medium-risk pattern: ${pattern.source}`,
				};
			}
		}

		// Check file extension for additional risk
		const ext = extname(filePath).toLowerCase();
		if ([".env", ".pem", ".key", ".cert"].includes(ext)) {
			return {
				level: "high",
				reason: `Sensitive file extension: ${ext}`,
			};
		}

		return { level: "low" };
	}

	/**
	 * Close watcher for a workspace
	 */
	private async closeWatcher(workspace: string, workspaceWatcher: WorkspaceWatcher): Promise<void> {
		// Clear all debounce timers
		for (const timer of workspaceWatcher.debounceTimers.values()) {
			clearTimeout(timer);
		}
		workspaceWatcher.debounceTimers.clear();

		// Close the watcher
		await workspaceWatcher.watcher.close();
		this.watchers.delete(workspace);
	}
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let fileWatcherInstance: FileWatcherService | null = null;

/**
 * Get the singleton file watcher service instance
 */
export function getFileWatcherService(): FileWatcherService {
	if (!fileWatcherInstance) {
		fileWatcherInstance = new FileWatcherService();
	}
	return fileWatcherInstance;
}

/**
 * Dispose the file watcher service
 */
export async function disposeFileWatcherService(): Promise<void> {
	if (fileWatcherInstance) {
		await fileWatcherInstance.closeAll();
		fileWatcherInstance = null;
	}
}
