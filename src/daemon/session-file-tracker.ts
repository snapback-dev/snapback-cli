/**
 * Session File Tracker
 *
 * Tracks file changes during a session for accurate change reporting.
 * Fixes dogfooding issues where what_changed missed edits due to
 * relying on git baseline instead of session tracking.
 *
 * @see stress_test_remediation.md Section "Session File Tracking"
 * @module daemon/session-file-tracker
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * File access record
 */
export interface FileAccess {
	/** File path (relative to workspace) */
	path: string;
	/** First access timestamp */
	firstAccess: number;
	/** Last access timestamp */
	lastAccess: number;
	/** Access type */
	type: "read" | "modified" | "created" | "deleted";
	/** Number of changes */
	changeCount: number;
	/** Content hash at session start (for diff) */
	initialHash?: string;
}

/**
 * Session summary
 */
export interface SessionSummary {
	/** Number of files touched */
	files: number;
	/** Lines added */
	linesAdded: number;
	/** Lines removed */
	linesRemoved: number;
	/** Session duration in ms */
	duration: number;
}

// =============================================================================
// SessionFileTracker
// =============================================================================

/**
 * Tracks file changes during a session
 */
export class SessionFileTracker {
	private files: Map<string, FileAccess> = new Map();
	private sessionStart: number;
	private workspaceRoot: string;
	private persistPath: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.sessionStart = Date.now();
		this.persistPath = join(workspaceRoot, ".snapback", "session", "tracker.json");
	}

	/**
	 * Record a file change
	 */
	recordChange(path: string, type: FileAccess["type"]): void {
		const existing = this.files.get(path);

		if (existing) {
			existing.lastAccess = Date.now();
			existing.changeCount++;
			// Upgrade type if needed (read -> modified)
			if (type !== "read" && existing.type === "read") {
				existing.type = type;
			}
		} else {
			this.files.set(path, {
				path,
				firstAccess: Date.now(),
				lastAccess: Date.now(),
				type,
				changeCount: 1,
				initialHash: this.getFileHash(path),
			});
		}

		// Auto-persist after each change
		this.persist();
	}

	/**
	 * Get all session files
	 */
	getSessionFiles(): FileAccess[] {
		return Array.from(this.files.values());
	}

	/**
	 * Get only modified files (not just read)
	 */
	getModifiedFiles(): string[] {
		return this.getSessionFiles()
			.filter((f) => f.type !== "read")
			.map((f) => f.path);
	}

	/**
	 * Get files by type
	 */
	getFilesByType(type: FileAccess["type"]): string[] {
		return this.getSessionFiles()
			.filter((f) => f.type === type)
			.map((f) => f.path);
	}

	/**
	 * Get session summary with line counts
	 */
	async getSummary(): Promise<SessionSummary> {
		const modified = this.getModifiedFiles();
		let linesAdded = 0;
		let linesRemoved = 0;

		for (const file of modified) {
			const changes = await this.calculateLineChanges(file);
			linesAdded += changes.added;
			linesRemoved += changes.removed;
		}

		return {
			files: modified.length,
			linesAdded,
			linesRemoved,
			duration: Date.now() - this.sessionStart,
		};
	}

	/**
	 * Calculate line changes for a file
	 */
	private async calculateLineChanges(path: string): Promise<{ added: number; removed: number }> {
		const access = this.files.get(path);
		if (!access) {
			return { added: 0, removed: 0 };
		}

		const fullPath = join(this.workspaceRoot, path);

		// File was deleted
		if (!existsSync(fullPath)) {
			return { added: 0, removed: access.initialHash ? 50 : 0 }; // Estimate
		}

		// File was created
		if (!access.initialHash) {
			try {
				const content = readFileSync(fullPath, "utf8");
				return { added: content.split("\n").length, removed: 0 };
			} catch {
				return { added: 0, removed: 0 };
			}
		}

		// File was modified - estimate based on change count
		// More accurate diff would require storing initial content
		return {
			added: access.changeCount * 5, // Rough estimate
			removed: access.changeCount * 2,
		};
	}

	/**
	 * Get simple hash of file content
	 */
	private getFileHash(path: string): string | undefined {
		const fullPath = join(this.workspaceRoot, path);
		if (!existsSync(fullPath)) {
			return undefined;
		}

		try {
			const stat = statSync(fullPath);
			// Use mtime + size as simple hash
			return `${stat.mtime.getTime()}-${stat.size}`;
		} catch {
			return undefined;
		}
	}

	/**
	 * Persist tracker state to disk
	 */
	persist(): void {
		try {
			const data = {
				sessionStart: this.sessionStart,
				files: Array.from(this.files.entries()),
			};
			writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
		} catch {
			// Silent fail - persistence is best-effort
		}
	}

	/**
	 * Restore from persisted state
	 */
	restore(): boolean {
		try {
			if (!existsSync(this.persistPath)) {
				return false;
			}

			const content = readFileSync(this.persistPath, "utf8");
			const data = JSON.parse(content);

			this.sessionStart = data.sessionStart || Date.now();
			this.files = new Map(data.files || []);

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Clear all tracking data
	 */
	clear(): void {
		this.files.clear();
		this.sessionStart = Date.now();
		this.persist();
	}

	/**
	 * Get session start time
	 */
	getSessionStart(): number {
		return this.sessionStart;
	}

	/**
	 * Check if a file was touched in this session
	 */
	wasTouched(path: string): boolean {
		return this.files.has(path);
	}
}

// =============================================================================
// Factory & Singleton
// =============================================================================

const trackers = new Map<string, SessionFileTracker>();

/**
 * Get or create tracker for workspace
 */
export function getSessionTracker(workspaceRoot: string): SessionFileTracker {
	let tracker = trackers.get(workspaceRoot);

	if (!tracker) {
		tracker = new SessionFileTracker(workspaceRoot);
		tracker.restore(); // Try to restore previous session
		trackers.set(workspaceRoot, tracker);
	}

	return tracker;
}

/**
 * Clear tracker for workspace
 */
export function clearSessionTracker(workspaceRoot: string): void {
	const tracker = trackers.get(workspaceRoot);
	if (tracker) {
		tracker.clear();
	}
	trackers.delete(workspaceRoot);
}
