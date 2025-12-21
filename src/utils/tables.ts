/**
 * CLI-UX-003: CLI-Table3 Integration
 *
 * Table rendering utilities for structured CLI output.
 * Provides formatted tables for risk signals, file summaries, and snapshots.
 *
 * @see ai_dev_utils/resources/new_cli/03-cli-table3-integration.spec.md
 */

import chalk from "chalk";
import Table from "cli-table3";

// =============================================================================
// TYPES (spec lines 102-113)
// =============================================================================

export interface RiskSignal {
	signal: string;
	value: number;
	description?: string;
}

export interface FileRiskSummary {
	file: string;
	riskScore: number;
	riskLevel: string;
	topSignal?: string;
}

// =============================================================================
// HELPER FUNCTIONS (spec lines 115-136, 259-297)
// =============================================================================

/**
 * Render severity as visual indicator
 * @param value - The risk value (0-10)
 * @param maxValue - Maximum possible value (default 10)
 * @returns Visual severity indicator string (e.g., "●●○")
 */
export function renderSeverity(value: number, maxValue = 10): string {
	const normalized = Math.min(value / maxValue, 1);
	const filled = Math.round(normalized * 3);
	const empty = 3 - filled;

	const dot = "●";
	const emptyDot = "○";

	let color: typeof chalk.red;
	if (normalized > 0.7) {
		color = chalk.red;
	} else if (normalized > 0.4) {
		color = chalk.yellow;
	} else {
		color = chalk.green;
	}

	return color(dot.repeat(filled)) + chalk.gray(emptyDot.repeat(empty));
}

/**
 * Helper: truncate file path intelligently
 * @param path - File path to truncate
 * @param maxLength - Maximum length allowed
 * @returns Truncated path
 */
export function truncatePath(path: string, maxLength: number): string {
	if (path.length <= maxLength) return path;

	const parts = path.split("/");
	if (parts.length <= 2) {
		return "..." + path.slice(-(maxLength - 3));
	}

	// Keep filename and first directory
	const filename = parts[parts.length - 1];
	const firstDir = parts[0];

	if (filename.length + firstDir.length + 5 > maxLength) {
		return "..." + filename.slice(-(maxLength - 3));
	}

	return `${firstDir}/.../${filename}`;
}

/**
 * Helper: format timestamp as relative time
 * @param date - Date to format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}

// =============================================================================
// TABLE FUNCTIONS (spec lines 138-257)
// =============================================================================

/**
 * Create a table for risk signals
 * Displays signals sorted by value with severity indicators.
 *
 * @param signals - Array of risk signals to display
 * @returns Formatted table string
 */
export function createRiskSignalTable(signals: RiskSignal[]): string {
	if (signals.length === 0) {
		return chalk.green("No risk signals detected.");
	}

	// Sort by value descending
	const sorted = [...signals].sort((a, b) => b.value - a.value);

	const table = new Table({
		head: [chalk.cyan("Signal"), chalk.cyan("Score"), chalk.cyan("Severity")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [20, 8, 12],
	});

	for (const signal of sorted) {
		// Only show signals with value > 0
		if (signal.value <= 0) continue;

		table.push([signal.signal, signal.value.toFixed(1), renderSeverity(signal.value)]);
	}

	return table.toString();
}

/**
 * Create a summary table for batch file analysis
 * Displays files sorted by risk score with color-coded levels.
 *
 * @param files - Array of file risk summaries
 * @returns Formatted table string
 */
export function createFileSummaryTable(files: FileRiskSummary[]): string {
	if (files.length === 0) {
		return chalk.green("No files analyzed.");
	}

	// Sort by risk score descending
	const sorted = [...files].sort((a, b) => b.riskScore - a.riskScore);

	const table = new Table({
		head: [chalk.cyan("File"), chalk.cyan("Risk"), chalk.cyan("Level"), chalk.cyan("Top Signal")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [40, 8, 10, 15],
		wordWrap: true,
	});

	for (const file of sorted) {
		const levelColor =
			file.riskLevel === "high" ? chalk.red : file.riskLevel === "medium" ? chalk.yellow : chalk.green;

		table.push([
			truncatePath(file.file, 38),
			file.riskScore.toFixed(1),
			levelColor(file.riskLevel.toUpperCase()),
			file.topSignal || "-",
		]);
	}

	return table.toString();
}

/**
 * Create a compact inline table for snapshot listing
 * Displays snapshots with relative timestamps.
 *
 * @param snapshots - Array of snapshot objects
 * @returns Formatted table string
 */
export function createSnapshotTable(
	snapshots: Array<{
		id: string;
		timestamp: Date;
		message?: string;
		fileCount?: number;
	}>,
): string {
	if (snapshots.length === 0) {
		return chalk.yellow("No snapshots found.");
	}

	const table = new Table({
		head: [chalk.cyan("ID"), chalk.cyan("Created"), chalk.cyan("Message"), chalk.cyan("Files")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [12, 22, 30, 8],
		wordWrap: true,
	});

	for (const snap of snapshots) {
		table.push([
			snap.id.substring(0, 8),
			formatRelativeTime(snap.timestamp),
			snap.message || chalk.gray("(none)"),
			snap.fileCount?.toString() || "-",
		]);
	}

	return table.toString();
}

/**
 * Create a staged files table for pre-commit display
 *
 * @param files - Array of staged file info
 * @returns Formatted table string
 */
export function createStagedFilesTable(
	files: Array<{
		path: string;
		status: string;
		riskScore?: number;
	}>,
): string {
	if (files.length === 0) {
		return chalk.yellow("No staged files.");
	}

	const table = new Table({
		head: [chalk.cyan("File"), chalk.cyan("Status"), chalk.cyan("Risk")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [50, 12, 10],
	});

	for (const file of files) {
		const statusColor =
			file.status === "added"
				? chalk.green
				: file.status === "deleted"
					? chalk.red
					: file.status === "renamed"
						? chalk.blue
						: chalk.yellow;

		const riskDisplay = file.riskScore !== undefined ? renderSeverity(file.riskScore) : chalk.gray("-");

		table.push([truncatePath(file.path, 48), statusColor(file.status), riskDisplay]);
	}

	return table.toString();
}
