/**
 * Context Writer
 *
 * Maintains `.snapback/ctx` file that LLMs read automatically.
 * This is the "push" part of the push-based architecture.
 *
 * The daemon updates this file on:
 * - File saves
 * - Git changes
 * - Validation results
 * - Error detection
 *
 * LLMs (Cursor, Claude, etc.) read this file via rules/project instructions.
 *
 * @see stress_test_remediation.md Section "Push Architecture"
 * @module daemon/context-writer
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * Compact context file format
 * Designed for minimal token usage (~100 tokens)
 */
export interface CtxFile {
	/** Version */
	v: 1;
	/** Timestamp (unix ms) */
	t: number;
	/** Risk: L/M/H */
	r: "L" | "M" | "H";
	/** Protection score 0-100 */
	p: number;
	/** Dirty file count */
	d: number;
	/** Top learnings (truncated) */
	l: string[];
	/** Warnings (top 2) */
	w: string[];
	/** Hotspots (files with violations) */
	h: string[];
	/** Recent errors */
	e: string[];
	/** Constraints */
	c: { b: string; a: string };
}

/**
 * Workspace state for context generation
 */
export interface WorkspaceState {
	risk: "low" | "medium" | "high";
	protectionScore: number;
	dirtyFiles: string[];
	learnings: Array<{ action: string }>;
	warnings: string[];
	hotspots: Array<{ file: string; violations: number }>;
	recentErrors: string[];
	constraints: {
		bundleSize?: string;
		activation?: string;
	};
}

// =============================================================================
// ContextWriter
// =============================================================================

/**
 * Writes compact context file for LLM consumption
 */
export class ContextWriter {
	private ctxPath: string;

	constructor(workspaceRoot: string) {
		this.ctxPath = join(workspaceRoot, ".snapback", "ctx");
	}

	/**
	 * Write context file
	 */
	async write(state: WorkspaceState): Promise<void> {
		const ctx: CtxFile = {
			v: 1,
			t: Date.now(),
			r: this.mapRisk(state.risk),
			p: state.protectionScore,
			d: state.dirtyFiles.length,
			l: state.learnings.slice(0, 3).map((l) => this.compress(l.action, 50)),
			w: state.warnings.slice(0, 2),
			h: state.hotspots.slice(0, 3).map((h) => `${this.basename(h.file)}:${h.violations}v`),
			e: state.recentErrors.slice(0, 3),
			c: {
				b: state.constraints.bundleSize || "2M",
				a: state.constraints.activation || "500ms",
			},
		};

		// Ensure directory exists
		const dir = dirname(this.ctxPath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		// Write as single line JSON (no whitespace, <500 bytes)
		writeFileSync(this.ctxPath, JSON.stringify(ctx));
	}

	/**
	 * Get current context if exists
	 */
	getCurrent(): CtxFile | null {
		if (!existsSync(this.ctxPath)) {
			return null;
		}

		try {
			const content = require("node:fs").readFileSync(this.ctxPath, "utf8");
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	/**
	 * Map risk level to short form
	 */
	private mapRisk(risk: string): "L" | "M" | "H" {
		switch (risk.toLowerCase()) {
			case "high":
				return "H";
			case "medium":
				return "M";
			default:
				return "L";
		}
	}

	/**
	 * Compress string for wire format
	 */
	private compress(s: string, max: number): string {
		if (s.length <= max) {
			return s;
		}
		return `${s.slice(0, max - 1)}…`;
	}

	/**
	 * Get basename of path
	 */
	private basename(path: string): string {
		const parts = path.split(/[/\\]/);
		return parts[parts.length - 1] || path;
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a ContextWriter instance
 */
export function createContextWriter(workspaceRoot: string): ContextWriter {
	return new ContextWriter(workspaceRoot);
}
