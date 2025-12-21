/**
 * CLI-UX-001: Boxen Integration
 *
 * Box rendering utilities for screenshot-worthy CLI output.
 * Critical moments like snapshot creation, risk detection, and recovery
 * operations are displayed in visually distinct boxes.
 *
 * @see ai_dev_utils/resources/new_cli/01-boxen-integration.spec.md
 */

import boxen, { type Options as BoxenOptions } from "boxen";
import chalk from "chalk";

// =============================================================================
// TYPES (spec lines 86-93)
// =============================================================================

export type BoxType = "success" | "warning" | "error" | "info" | "save-story";

interface DisplayBoxOptions {
	title?: string;
	type?: BoxType;
	padding?: number;
	margin?: number;
}

// =============================================================================
// BOX STYLES (spec lines 95-118)
// =============================================================================

const BOX_STYLES: Record<BoxType, Partial<BoxenOptions>> = {
	success: {
		borderColor: "green",
		borderStyle: "round",
	},
	warning: {
		borderColor: "yellow",
		borderStyle: "round",
	},
	error: {
		borderColor: "red",
		borderStyle: "round",
	},
	info: {
		borderColor: "cyan",
		borderStyle: "round",
	},
	"save-story": {
		borderColor: "green",
		borderStyle: "double",
		padding: 1,
		margin: 1,
	},
};

// =============================================================================
// CORE DISPLAY FUNCTIONS (spec lines 120-132)
// =============================================================================

/**
 * Display content in a styled box
 *
 * @param content - Text content to display
 * @param options - Display options (title, type, padding, margin)
 * @returns Formatted box string
 */
export function displayBox(content: string, options: DisplayBoxOptions = {}): string {
	const { title, type = "info", padding = 1, margin = 0 } = options;

	// Handle unknown type gracefully by defaulting to 'info'
	const styleType = type in BOX_STYLES ? type : "info";

	return boxen(content, {
		...BOX_STYLES[styleType],
		padding,
		margin,
		...(title && { title, titleAlignment: "center" as const }),
	});
}

// =============================================================================
// SPECIALIZED DISPLAY FUNCTIONS (spec lines 180-198)
// =============================================================================

/**
 * Display a "save story" box when SnapBack prevents a disaster
 * Used for Pioneer Program gamification and screenshot-worthy moments.
 *
 * @param riskScore - The risk score that was detected (0-10)
 * @param affectedFiles - Array of file paths that were protected
 * @param snapshotId - The snapshot ID that was created
 * @returns Formatted save story box string
 */
export function displaySaveStory(riskScore: number, affectedFiles: string[], snapshotId: string): string {
	return displayBox(
		`${chalk.bold("🛡️ SnapBack just protected you!")}\n\n` +
			`${chalk.cyan("Risk Score:")} ${chalk.red(riskScore.toFixed(1) + "/10")}\n` +
			`${chalk.cyan("Files Protected:")} ${chalk.green(affectedFiles.length.toString())}\n` +
			`${chalk.cyan("Snapshot:")} ${snapshotId.substring(0, 8)}\n\n` +
			chalk.dim("Share your save story: snapback.dev/stories"),
		{
			type: "save-story",
		},
	);
}

// =============================================================================
// SNAPSHOT DISPLAY HELPERS (spec lines 139-155)
// =============================================================================

/**
 * Display snapshot creation success box
 *
 * @param snapshotId - The created snapshot ID
 * @param message - Optional snapshot message
 * @param fileCount - Number of files protected
 * @returns Formatted success box string
 */
export function displaySnapshotSuccess(snapshotId: string, message: string | undefined, fileCount: number): string {
	return displayBox(
		`${chalk.green("✓")} Snapshot created\n` +
			`${chalk.cyan("ID:")} ${snapshotId.substring(0, 8)}\n` +
			`${chalk.cyan("Message:")} ${message || "(none)"}\n` +
			`${chalk.cyan("Files:")} ${fileCount} protected`,
		{
			title: "🛡️ SnapBack Protection Active",
			type: "success",
		},
	);
}

// =============================================================================
// RISK DISPLAY HELPERS (spec lines 160-175)
// =============================================================================

/**
 * Display high-risk detection warning box
 *
 * @param file - The file that was analyzed
 * @param riskScore - The risk score (0-10)
 * @returns Formatted warning box string
 */
export function displayHighRiskWarning(file: string, riskScore: number): string {
	return displayBox(
		`${chalk.red("⚠ High Risk Detected")}\n\n` +
			`${chalk.cyan("File:")} ${file}\n` +
			`${chalk.cyan("Risk Score:")} ${chalk.red(riskScore.toFixed(1) + "/10")}\n\n` +
			`${chalk.yellow("Recommendation:")} Create a snapshot before proceeding`,
		{
			title: "🚨 Risk Analysis",
			type: "warning",
		},
	);
}

/**
 * Display error box
 *
 * @param title - Error title
 * @param message - Error message
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Formatted error box string
 */
export function displayError(title: string, message: string, suggestion?: string): string {
	let content = `${chalk.red("✖")} ${title}\n\n${message}`;

	if (suggestion) {
		content += `\n\n${chalk.dim("Suggestion:")} ${suggestion}`;
	}

	return displayBox(content, {
		type: "error",
	});
}

/**
 * Display info box
 *
 * @param title - Box title
 * @param content - Content to display
 * @returns Formatted info box string
 */
export function displayInfo(title: string, content: string): string {
	return displayBox(content, {
		title,
		type: "info",
	});
}
