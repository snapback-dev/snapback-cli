/**
 * UI Module Index
 *
 * Exports all UI components for the CLI.
 *
 * @module ui
 */

// =============================================================================
// BRANDING
// =============================================================================

export {
	displayBrandedHeader,
	displayDivider,
	displaySectionHeader,
	displayStatusHeader,
	displayWelcomeMessage,
	getLogo,
	LOGO_COMPACT,
	LOGO_LARGE,
	LOGO_MINIMAL,
	logoCompact,
	logoLarge,
	logoMinimal,
} from "./logo";

// =============================================================================
// SMART ERRORS
// =============================================================================

export {
	createSmartError,
	displaySmartError,
	displayUnknownCommandError,
	ERROR_SUGGESTIONS,
	type ErrorSuggestion,
	findSimilarCommands,
	levenshteinDistance,
	type SmartError,
	withSmartErrors,
} from "./errors";

// =============================================================================
// TERMINAL HYPERLINKS
// =============================================================================

export {
	commandLink,
	docsLink,
	fileLink,
	hyperlink,
	issueLink,
	labeledLink,
	learnMore,
	link,
	reportIssue,
	supportsHyperlinks,
} from "./links";

// =============================================================================
// INTERACTIVE PROMPTS
// =============================================================================

export {
	type ConfirmOptions,
	confirm,
	confirmDangerous,
	type DryRunChange,
	dryRunPreview,
	input,
	type MultiStepOptions,
	type ProgressOptions,
	progressBar,
	prompts,
	type SelectOption,
	type SelectOptions,
	select,
	spinner,
	status,
	stepProgress,
	withSpinner,
} from "./prompts";
