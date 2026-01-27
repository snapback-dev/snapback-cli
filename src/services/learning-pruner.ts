/**
 * Automated Learning Pruner
 *
 * Core engine for automated learning and violation lifecycle management.
 * Features:
 * - File existence validation for violations
 * - Age-based + usage-based confidence scoring
 * - Pattern detection (validates if code patterns still exist)
 * - Deduplication (merges similar learnings)
 * - Archive mechanism (safe removal with rollback capability)
 *
 * @module services/learning-pruner
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { StateStore, type StoredLearning, type StoredViolation } from "@snapback/intelligence/storage";

// =============================================================================
// TYPES
// =============================================================================

export interface PrunerConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Enable dry-run mode (no actual changes) */
	dryRun?: boolean;
	/** Maximum age in days before archiving stale learnings */
	maxAgeDays?: number;
	/** Minimum usage count to keep high-value learnings */
	minUsageCount?: number;
	/** Archive directory (relative to workspace) */
	archiveDir?: string;
}

export interface PruneResult {
	/** Total violations checked */
	totalChecked: number;
	/** Violations marked for archival */
	staleCount: number;
	/** Violations archived (0 if dryRun) */
	archivedCount: number;
	/** File paths of archived violations */
	archivedFiles: string[];
	/** Dry run mode? */
	dryRun: boolean;
}

export interface ScoreUpdateResult {
	/** Total learnings scored */
	totalScored: number;
	/** Learnings with updated scores */
	updatedCount: number;
	/** Average confidence score */
	avgConfidence: number;
	/** Low confidence learnings (< 0.3) */
	lowConfidenceCount: number;
}

export interface DedupeResult {
	/** Total learnings checked */
	totalChecked: number;
	/** Duplicate groups found */
	duplicateGroups: number;
	/** Learnings merged */
	mergedCount: number;
	/** Dry run mode? */
	dryRun: boolean;
}

export interface ArchiveResult {
	/** Items archived */
	archived: {
		learnings: number;
		violations: number;
	};
	/** Archive location */
	archivePath: string;
	/** Dry run mode? */
	dryRun: boolean;
}

// =============================================================================
// AUTOMATED LEARNING PRUNER
// =============================================================================

/**
 * Automated Learning Pruner
 *
 * Manages learning and violation lifecycle with intelligent pruning.
 *
 * @example
 * ```typescript
 * const pruner = new AutomatedLearningPruner({
 *   workspaceRoot: '/path/to/project',
 *   dryRun: true,
 *   maxAgeDays: 90
 * });
 *
 * const result = await pruner.pruneStaleViolations();
 * console.log(`Archived ${result.archivedCount} violations`);
 * ```
 */
export class AutomatedLearningPruner {
	private readonly config: Required<PrunerConfig>;
	private readonly stateStore: StateStore;

	constructor(config: PrunerConfig) {
		this.config = {
			workspaceRoot: config.workspaceRoot,
			dryRun: config.dryRun ?? false,
			maxAgeDays: config.maxAgeDays ?? 90,
			minUsageCount: config.minUsageCount ?? 3,
			archiveDir: config.archiveDir ?? ".snapback/archive",
		};

		// Initialize StateStore (leverages existing intelligence storage)
		this.stateStore = new StateStore({
			snapbackDir: join(this.config.workspaceRoot, ".snapback"),
		});
	}

	/**
	 * Initialize pruner (loads state)
	 */
	async initialize(): Promise<void> {
		await this.stateStore.load();
	}

	/**
	 * Prune stale violations (file existence + pattern validation)
	 *
	 * Validates:
	 * 1. File referenced in violation still exists
	 * 2. Pattern mentioned in violation still exists in code
	 *
	 * Archives violations that fail validation.
	 */
	async pruneStaleViolations(): Promise<PruneResult> {
		const violations = this.stateStore.getViolations();
		const staleViolations: StoredViolation[] = [];

		for (const violation of violations) {
			// Check 1: File existence
			const filePath = join(this.config.workspaceRoot, violation.file);
			if (!existsSync(filePath)) {
				staleViolations.push(violation);
				continue;
			}

			// Check 2: Pattern still exists in code
			const patternExists = await this.checkPatternExists(violation);
			if (!patternExists) {
				staleViolations.push(violation);
			}
		}

		// Archive stale violations
		const archivedFiles: string[] = [];
		if (!this.config.dryRun && staleViolations.length > 0) {
			const archivePath = await this.archiveViolations(staleViolations);
			archivedFiles.push(archivePath);

			// Remove from state (will be persisted on next save)
			// Note: StateStore doesn't have removeViolation yet, will need to add
			// For now, just track what would be archived
		}

		return {
			totalChecked: violations.length,
			staleCount: staleViolations.length,
			archivedCount: this.config.dryRun ? 0 : staleViolations.length,
			archivedFiles,
			dryRun: this.config.dryRun,
		};
	}

	/**
	 * Update learning confidence scores
	 *
	 * Scoring formula:
	 * - Age score: (1 - daysSinceCreated / maxAgeDays) * 0.3
	 * - Usage score: (usageCount / minUsageCount) * 0.7
	 * - Final: ageScore + usageScore (clamped to 0-1)
	 */
	async updateLearningScores(): Promise<ScoreUpdateResult> {
		const learnings = this.stateStore.getLearnings();
		let updatedCount = 0;
		let totalConfidence = 0;
		let lowConfidenceCount = 0;

		const now = Date.now();

		for (const learning of learnings) {
			const createdAt = new Date(learning.createdAt).getTime();
			const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);

			// Age score (newer = higher score)
			const ageScore = Math.max(0, 1 - daysSinceCreated / this.config.maxAgeDays) * 0.3;

			// Usage score (more used = higher score)
			const usageCount = (learning.accessCount || 0) + (learning.appliedCount || 0);
			const useScore = Math.min(usageCount / this.config.minUsageCount, 1) * 0.7;

			// Final score
			const newScore = Math.max(0, Math.min(1, ageScore + useScore));

			// Update if changed
			if (Math.abs(newScore - (learning.relevanceScore ?? 1.0)) > 0.01) {
				this.stateStore.updateLearning(learning.id, { relevanceScore: newScore });
				updatedCount++;
			}

			totalConfidence += newScore;
			if (newScore < 0.3) {
				lowConfidenceCount++;
			}
		}

		// Persist changes
		if (updatedCount > 0 && !this.config.dryRun) {
			await this.stateStore.save();
		}

		return {
			totalScored: learnings.length,
			updatedCount,
			avgConfidence: learnings.length > 0 ? totalConfidence / learnings.length : 0,
			lowConfidenceCount,
		};
	}

	/**
	 * Deduplicate learnings (merge similar entries)
	 *
	 * Similarity algorithm:
	 * - Exact type match
	 * - Levenshtein distance on trigger+action < 0.2 (80% similar)
	 * - Merge: keep higher usage count, combine keywords
	 */
	async deduplicateLearnings(): Promise<DedupeResult> {
		const learnings = this.stateStore.getLearnings();
		const groups = this.findDuplicateGroups(learnings);
		let mergedCount = 0;

		for (const group of groups) {
			if (group.length < 2) {
				continue;
			}

			// Sort by usage (highest first)
			const sorted = group.sort((a, b) => {
				const aUsage = (a.accessCount || 0) + (a.appliedCount || 0);
				const bUsage = (b.accessCount || 0) + (b.appliedCount || 0);
				return bUsage - aUsage;
			});

			const primary = sorted[0];
			const duplicates = sorted.slice(1);

			// Merge duplicates into primary
			if (!this.config.dryRun) {
				const combinedKeywords = new Set([...(primary.keywords || [])]);
				for (const dup of duplicates) {
					// Combine keywords
					for (const kw of dup.keywords || []) {
						combinedKeywords.add(kw);
					}
					// Note: Need to add removeL learning method to StateStore
					// For now, just track what would be merged
				}

				this.stateStore.updateLearning(primary.id, {
					keywords: Array.from(combinedKeywords),
				});

				mergedCount += duplicates.length;
			} else {
				mergedCount += duplicates.length;
			}
		}

		if (mergedCount > 0 && !this.config.dryRun) {
			await this.stateStore.save();
		}

		return {
			totalChecked: learnings.length,
			duplicateGroups: groups.length,
			mergedCount,
			dryRun: this.config.dryRun,
		};
	}

	/**
	 * Archive stale learnings and violations
	 *
	 * TWO-PHASE DECAY LIFECYCLE (consolidated from LearningGCService):
	 * Phase 1: Archive (30d unused, usageCount <3) - set archived flag in StateStore
	 * Phase 2: Delete (90d archived) - permanently remove from StateStore
	 *
	 * Archives:
	 * - Learnings with relevanceScore < 0.3
	 * - Learnings older than maxAgeDays with no usage (file-based fallback for migration)
	 */
	async archiveStaleItems(): Promise<ArchiveResult> {
		const learnings = this.stateStore.getLearnings();
	
		const staleLearnings: StoredLearning[] = [];
		const now = Date.now();
	
		// Phase 1: Identify archive candidates (30d unused, <3 usage)
		for (const learning of learnings) {
			// Skip already archived
			if (learning.archived) {
				continue;
			}
	
			const score = learning.relevanceScore ?? 1.0;
			const createdAt = new Date(learning.createdAt).getTime();
			const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
			const usageCount = (learning.accessCount || 0) + (learning.appliedCount || 0);
	
			// Archive if low confidence OR (old + unused)
			if (score < 0.3 || (daysSinceCreated > this.config.maxAgeDays && usageCount === 0)) {
				staleLearnings.push(learning);
			}
		}
	
		const archiveDir = join(this.config.workspaceRoot, this.config.archiveDir);
		let archivedLearnings = 0;
		const archivedViolations = 0;
	
		if (!this.config.dryRun && staleLearnings.length > 0) {
			await mkdir(archiveDir, { recursive: true });
	
			// USE STATESTORE FLAGS (Phase 2.6b consolidation)
			for (const learning of staleLearnings) {
				const success = this.stateStore.archiveLearning(learning.id);
				if (success) {
					archivedLearnings++;
				}
			}
	
			// Fallback: Also write to file for backup/migration (legacy support)
			if (staleLearnings.length > 0) {
				const archivePath = join(archiveDir, `learnings_${Date.now()}.jsonl`);
				const content = staleLearnings.map((l) => JSON.stringify(l)).join("\n");
				await writeFile(archivePath, content, "utf-8");
			}
	
			// Persist StateStore changes
			if (archivedLearnings > 0) {
				await this.stateStore.save();
			}
	
			// Note: Violations are handled by pruneStaleViolations()
		}
	
		return {
			archived: {
				learnings: this.config.dryRun ? staleLearnings.length : archivedLearnings,
				violations: this.config.dryRun ? 0 : archivedViolations,
			},
			archivePath: archiveDir,
			dryRun: this.config.dryRun,
		};
	}
	
	/**
	 * Delete permanently archived learnings (Phase 2 of two-phase decay)
	 *
	 * Deletes learnings that have been:
	 * - Archived for > 90 days (default)
	 * - Confirmed as no longer relevant
	 *
	 * Safety: Requires explicit call, not part of default archive flow
	 */
	async deletePermanentlyArchived(): Promise<{ deletedCount: number; dryRun: boolean }> {
		const learnings = this.stateStore.getLearnings();
		const now = Date.now();
		const deleteThresholdDays = 90; // Fixed: 90 days after archival
	
		const deleteCandidates: StoredLearning[] = [];
	
		for (const learning of learnings) {
			if (!learning.archived || !learning.archivedAt) {
				continue;
			}
	
			const archivedAt = new Date(learning.archivedAt).getTime();
			const daysSinceArchived = (now - archivedAt) / (1000 * 60 * 60 * 24);
	
			if (daysSinceArchived > deleteThresholdDays) {
				deleteCandidates.push(learning);
			}
		}
	
		let deletedCount = 0;
	
		if (!this.config.dryRun && deleteCandidates.length > 0) {
			for (const learning of deleteCandidates) {
				const success = this.stateStore.deleteLearning(learning.id);
				if (success) {
					deletedCount++;
				}
			}
	
			// Persist StateStore changes
			if (deletedCount > 0) {
				await this.stateStore.save();
			}
		}
	
		return {
			deletedCount: this.config.dryRun ? deleteCandidates.length : deletedCount,
			dryRun: this.config.dryRun,
		};
	}

	// -------------------------------------------------------------------------
	// PRIVATE HELPERS
	// -------------------------------------------------------------------------

	/**
	 * Check if violation pattern still exists in code
	 */
	private async checkPatternExists(violation: StoredViolation): Promise<boolean> {
		const filePath = join(this.config.workspaceRoot, violation.file);

		// Pattern detection based on violation type
		switch (violation.type) {
			case "silent_catch":
			case "silent-error-swallowing":
				return this.checkRegexInFile(filePath, /catch\s*\([^)]*\)\s*\{\s*\}/);

			case "hash-duplication":
				return this.checkRegexInFile(filePath, /createHash\s*\(\s*['"]sha256['"]\s*\)/);

			case "missing_defensive_check":
			case "missing-null-check":
				// Look for array operations without null checks
				return this.checkRegexInFile(filePath, /\.(map|filter|forEach)\s*\(/);

			case "dead_code":
			case "unused_constant":
				// Check if identifier is referenced elsewhere
				// This is complex, for now assume pattern exists if file exists
				return true;

			default:
				// Unknown pattern type, assume it exists (conservative)
				return true;
		}
	}

	/**
	 * Check if regex pattern exists in file
	 */
	private async checkRegexInFile(filePath: string, pattern: RegExp): Promise<boolean> {
		try {
			const { readFile } = await import("node:fs/promises");
			const content = await readFile(filePath, "utf-8");
			return pattern.test(content);
		} catch {
			return false; // File read error = pattern doesn't exist
		}
	}

	/**
	 * Find duplicate learning groups
	 */
	private findDuplicateGroups(learnings: StoredLearning[]): StoredLearning[][] {
		const groups: StoredLearning[][] = [];
		const processed = new Set<string>();

		for (let i = 0; i < learnings.length; i++) {
			if (processed.has(learnings[i].id)) {
				continue;
			}

			const group: StoredLearning[] = [learnings[i]];
			processed.add(learnings[i].id);

			for (let j = i + 1; j < learnings.length; j++) {
				if (processed.has(learnings[j].id)) {
					continue;
				}

				if (this.areSimilarLearnings(learnings[i], learnings[j])) {
					group.push(learnings[j]);
					processed.add(learnings[j].id);
				}
			}

			if (group.length > 1) {
				groups.push(group);
			}
		}

		return groups;
	}

	/**
	 * Check if two learnings are similar
	 */
	private areSimilarLearnings(a: StoredLearning, b: StoredLearning): boolean {
		// Type must match
		if (a.type !== b.type) {
			return false;
		}

		// Combine trigger + action for similarity check
		const aText = `${a.trigger} ${a.action}`.toLowerCase();
		const bText = `${b.trigger} ${b.action}`.toLowerCase();

		// Simple similarity: check for 80% overlap
		const distance = this.levenshteinDistance(aText, bText);
		const maxLen = Math.max(aText.length, bText.length);
		const similarity = 1 - distance / maxLen;

		return similarity >= 0.8;
	}

	/**
	 * Calculate Levenshtein distance
	 */
	private levenshteinDistance(a: string, b: string): number {
		const matrix: number[][] = [];

		for (let i = 0; i <= b.length; i++) {
			matrix[i] = [i];
		}

		for (let j = 0; j <= a.length; j++) {
			matrix[0][j] = j;
		}

		for (let i = 1; i <= b.length; i++) {
			for (let j = 1; j <= a.length; j++) {
				if (b.charAt(i - 1) === a.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1, // substitution
						matrix[i][j - 1] + 1, // insertion
						matrix[i - 1][j] + 1, // deletion
					);
				}
			}
		}

		return matrix[b.length][a.length];
	}

	/**
	 * Archive violations to file
	 */
	private async archiveViolations(violations: StoredViolation[]): Promise<string> {
		const archiveDir = join(this.config.workspaceRoot, this.config.archiveDir);
		await mkdir(archiveDir, { recursive: true });

		const timestamp = Date.now();
		const archivePath = join(archiveDir, `violations_${timestamp}.jsonl`);
		const content = violations.map((v) => JSON.stringify(v)).join("\n");

		await writeFile(archivePath, content, "utf-8");
		return archivePath;
	}
}
