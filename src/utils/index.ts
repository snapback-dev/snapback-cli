/**
 * CLI Utilities
 *
 * Barrel export for all CLI UX utilities.
 * These utilities implement the CLI-UX-001 through CLI-UX-004 specifications.
 *
 * @see ai_dev_utils/resources/new_cli/00-overview.md
 */

// CLI-UX-001: Boxen Integration - Visual box output
export {
	type BoxType,
	displayBox,
	displayError,
	displayHighRiskWarning,
	displayInfo,
	displaySaveStory,
	displaySnapshotSuccess,
} from "./display";
// CLI-UX-004: Log-Update Integration - Progress tracking
export {
	createLiveLogger,
	formatDuration,
	formatProgressLine,
	ProgressTracker,
	type ProgressTrackerOptions,
	renderProgressBar,
} from "./progress";
// CLI-UX-003: CLI-Table3 Integration - Table rendering
export {
	createFileSummaryTable,
	createRiskSignalTable,
	createSnapshotTable,
	createStagedFilesTable,
	type FileRiskSummary,
	formatRelativeTime,
	type RiskSignal,
	renderSeverity,
	truncatePath,
} from "./tables";
