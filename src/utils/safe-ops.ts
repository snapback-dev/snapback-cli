/**
 * Safe Operations Module
 *
 * Utilities for making destructive CLI operations safer.
 * Includes dry-run mode, confirmation prompts, and undo support.
 *
 * Patterns from: Terraform, Git, GitHub CLI
 *
 * @module utils/safe-ops
 */

import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { confirm, confirmDangerous, type DryRunChange, dryRunPreview } from "../ui/prompts";

// =============================================================================
// TYPES
// =============================================================================

export interface SafeOperationOptions {
	dryRun?: boolean;
	force?: boolean;
	verbose?: boolean;
}

export interface UndoableOperation {
	id: string;
	description: string;
	timestamp: Date;
	changes: OperationChange[];
	canUndo: boolean;
}

export interface OperationChange {
	type: "create" | "update" | "delete";
	path: string;
	before?: string;
	after?: string;
}

// =============================================================================
// OPERATION HISTORY (for undo support)
// =============================================================================

const HISTORY_FILE = ".snapback/operation-history.json";
const MAX_HISTORY_SIZE = 50;

interface OperationHistory {
	operations: UndoableOperation[];
}

/**
 * Get the operations history file path
 */
function getHistoryPath(): string {
	const homeDir = process.env.HOME || process.env.USERPROFILE || "";
	return path.join(homeDir, HISTORY_FILE);
}

/**
 * Load operation history
 */
function loadHistory(): OperationHistory {
	try {
		const historyPath = getHistoryPath();
		if (fs.existsSync(historyPath)) {
			return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
		}
	} catch {
		// Ignore errors
	}
	return { operations: [] };
}

/**
 * Save operation history
 */
function saveHistory(history: OperationHistory): void {
	try {
		const historyPath = getHistoryPath();
		const dir = path.dirname(historyPath);
		fs.mkdirSync(dir, { recursive: true });

		// Trim to max size
		if (history.operations.length > MAX_HISTORY_SIZE) {
			history.operations = history.operations.slice(-MAX_HISTORY_SIZE);
		}

		fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
	} catch {
		// Ignore errors - history is best-effort
	}
}

/**
 * Record an operation for potential undo
 */
export function recordOperation(operation: UndoableOperation): void {
	const history = loadHistory();
	history.operations.push(operation);
	saveHistory(history);
}

/**
 * Get the most recent undoable operation
 */
export function getLastOperation(): UndoableOperation | undefined {
	const history = loadHistory();
	return history.operations.filter((op) => op.canUndo).pop();
}

/**
 * Get recent operations
 */
export function getRecentOperations(count = 10): UndoableOperation[] {
	const history = loadHistory();
	return history.operations.slice(-count).reverse();
}

/**
 * Remove an operation from history (after undo)
 */
export function removeOperation(id: string): void {
	const history = loadHistory();
	history.operations = history.operations.filter((op) => op.id !== id);
	saveHistory(history);
}

// =============================================================================
// DRY RUN MODE
// =============================================================================

/**
 * Check if dry-run mode is enabled and display preview
 */
export function handleDryRun(options: SafeOperationOptions, changes: DryRunChange[]): boolean {
	if (!options.dryRun) {
		return false; // Not a dry run, proceed with actual operation
	}

	dryRunPreview(changes);
	return true; // Was a dry run, operation should be skipped
}

/**
 * Create a diff for display
 */
export function createDiff(before: string, after: string): string[] {
	const beforeLines = before.split("\n");
	const afterLines = after.split("\n");
	const diff: string[] = [];

	// Simple line-by-line diff
	const maxLines = Math.max(beforeLines.length, afterLines.length);

	for (let i = 0; i < maxLines; i++) {
		const beforeLine = beforeLines[i];
		const afterLine = afterLines[i];

		if (beforeLine === undefined && afterLine !== undefined) {
			diff.push(`+ ${afterLine}`);
		} else if (afterLine === undefined && beforeLine !== undefined) {
			diff.push(`- ${beforeLine}`);
		} else if (beforeLine !== afterLine) {
			diff.push(`- ${beforeLine}`);
			diff.push(`+ ${afterLine}`);
		}
	}

	return diff;
}

// =============================================================================
// CONFIRMATION PROMPTS
// =============================================================================

/**
 * Prompt for confirmation based on operation risk level
 */
export async function confirmOperation(
	description: string,
	options: SafeOperationOptions & { riskLevel?: "low" | "medium" | "high" },
): Promise<boolean> {
	// Skip confirmation if --force is set
	if (options.force) {
		return true;
	}

	const { riskLevel = "low" } = options;

	if (riskLevel === "high") {
		// For dangerous operations, require typing confirmation
		console.log(chalk.red.bold("\n⚠️  DANGEROUS OPERATION"));
		console.log(chalk.white(description));
		console.log();

		return confirmDangerous("This action cannot be undone.", "yes, delete");
	}

	if (riskLevel === "medium") {
		// For medium-risk operations, use standard confirmation
		console.log(chalk.yellow("\n⚠️  This operation may modify files"));
		return confirm({
			message: description,
			default: false,
		});
	}

	// For low-risk operations, use simple confirmation
	return confirm({
		message: description,
		default: true,
	});
}

/**
 * Display what will be affected before an operation
 */
export function showAffectedFiles(files: string[], action: string): void {
	console.log(chalk.cyan(`\nFiles that will be ${action}:`));

	if (files.length > 10) {
		// Show first 10 and summarize
		for (const file of files.slice(0, 10)) {
			console.log(chalk.gray(`  • ${file}`));
		}
		console.log(chalk.gray(`  ... and ${files.length - 10} more files`));
	} else {
		for (const file of files) {
			console.log(chalk.gray(`  • ${file}`));
		}
	}
	console.log();
}

// =============================================================================
// UNDO CAPABILITY
// =============================================================================

/**
 * Attempt to undo the last operation
 */
export async function undoLastOperation(): Promise<boolean> {
	const lastOp = getLastOperation();

	if (!lastOp) {
		console.log(chalk.yellow("No undoable operations found"));
		return false;
	}

	if (!lastOp.canUndo) {
		console.log(chalk.yellow("The last operation cannot be undone"));
		return false;
	}

	console.log(chalk.cyan("\nLast operation:"));
	console.log(chalk.white(`  ${lastOp.description}`));
	console.log(chalk.gray(`  ${lastOp.timestamp}`));
	console.log(chalk.gray(`  Changes: ${lastOp.changes.length} files`));
	console.log();

	const shouldUndo = await confirm({
		message: "Undo this operation?",
		default: false,
	});

	if (!shouldUndo) {
		return false;
	}

	// Perform undo
	let success = true;

	for (const change of lastOp.changes) {
		try {
			switch (change.type) {
				case "create":
					// Undo create = delete the file
					if (change.path && fs.existsSync(change.path)) {
						fs.unlinkSync(change.path);
						console.log(chalk.red(`  - Removed ${change.path}`));
					}
					break;

				case "delete":
					// Undo delete = restore the file
					if (change.before !== undefined) {
						fs.writeFileSync(change.path, change.before);
						console.log(chalk.green(`  + Restored ${change.path}`));
					}
					break;

				case "update":
					// Undo update = restore previous content
					if (change.before !== undefined) {
						fs.writeFileSync(change.path, change.before);
						console.log(chalk.yellow(`  ~ Reverted ${change.path}`));
					}
					break;
			}
		} catch (error) {
			console.log(chalk.red(`  ✗ Failed to undo ${change.path}`));
			success = false;
		}
	}

	if (success) {
		removeOperation(lastOp.id);
		console.log(chalk.green("\n✓ Operation undone successfully"));
	} else {
		console.log(chalk.yellow("\n! Some changes could not be undone"));
	}

	return success;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const safeOps = {
	handleDryRun,
	confirmOperation,
	showAffectedFiles,
	recordOperation,
	getLastOperation,
	getRecentOperations,
	undoLastOperation,
	createDiff,
};
