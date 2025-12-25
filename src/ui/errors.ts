/**
 * Smart Errors Module
 *
 * World-class error handling with actionable suggestions.
 * Inspired by: Rust compiler, GitHub CLI, Vercel CLI
 *
 * Features:
 * - Colored error output with context
 * - Suggested fixes for common errors
 * - Command suggestions for typos
 * - Links to documentation
 * - Error codes for searchability
 *
 * @see https://bettercli.org/design/
 * @module ui/errors
 */

import boxen from "boxen";
import chalk from "chalk";

// =============================================================================
// TYPES
// =============================================================================

export interface SmartError {
	code: string;
	title: string;
	message: string;
	suggestion?: string;
	command?: string;
	docLink?: string;
	context?: Record<string, string>;
}

export interface ErrorSuggestion {
	pattern: RegExp | string;
	suggestion: string;
	command?: string;
}

// =============================================================================
// ERROR CATALOG
// =============================================================================

/**
 * Known error patterns with helpful suggestions
 */
export const ERROR_SUGGESTIONS: ErrorSuggestion[] = [
	// Authentication errors
	{
		pattern: /not logged in|unauthorized|401/i,
		suggestion: "You need to authenticate first",
		command: "snap login",
	},
	{
		pattern: /token expired|session expired/i,
		suggestion: "Your session has expired. Please log in again",
		command: "snap login",
	},
	{
		pattern: /invalid.*api.*key/i,
		suggestion: "Your API key appears to be invalid. Get a new one at snapback.dev/settings",
		command: "snap login --api-key <your-key>",
	},

	// Workspace errors
	{
		pattern: /not initialized|no.*\.snapback/i,
		suggestion: "This workspace hasn't been set up for SnapBack yet",
		command: "snap init",
	},
	{
		pattern: /already initialized/i,
		suggestion: "SnapBack is already configured here. Use --force to reinitialize",
		command: "snap init --force",
	},

	// File errors
	{
		pattern: /ENOENT|file not found|no such file/i,
		suggestion: "The file or directory doesn't exist. Check the path and try again",
	},
	{
		pattern: /EACCES|permission denied/i,
		suggestion: "You don't have permission to access this file. Check file permissions",
	},
	{
		pattern: /EEXIST|already exists/i,
		suggestion: "A file with that name already exists. Use --force to overwrite",
	},

	// Network errors
	{
		pattern: /ECONNREFUSED|connection refused/i,
		suggestion: "Cannot connect to the server. Check your internet connection",
		command: "snap doctor",
	},
	{
		pattern: /ETIMEDOUT|timeout|timed out/i,
		suggestion: "The request timed out. The server may be slow or unreachable",
		command: "snap doctor",
	},
	{
		pattern: /ENOTFOUND|DNS|network/i,
		suggestion: "Network error. Check your internet connection and try again",
		command: "snap doctor",
	},

	// Git errors
	{
		pattern: /not a git repository/i,
		suggestion: "This directory is not a Git repository",
		command: "git init",
	},
	{
		pattern: /git.*not.*installed|git.*not found/i,
		suggestion: "Git is required but not installed. Please install Git first",
	},

	// Config errors
	{
		pattern: /invalid.*config|parse.*error.*json/i,
		suggestion: "The configuration file is malformed. Try resetting it",
		command: "snap config path",
	},

	// MCP errors
	{
		pattern: /mcp.*not configured|no.*ai.*tools/i,
		suggestion: "No AI tools are configured for MCP integration",
		command: "snap tools configure",
	},
];

// =============================================================================
// COMMAND SUGGESTIONS (for typos)
// =============================================================================

const KNOWN_COMMANDS = [
	"login",
	"logout",
	"whoami",
	"init",
	"status",
	"fix",
	"protect",
	"session",
	"context",
	"validate",
	"stats",
	"learn",
	"patterns",
	"watch",
	"tools",
	"mcp",
	"config",
	"doctor",
	"upgrade",
	"analyze",
	"snapshot",
	"list",
	"check",
	"interactive",
	"help",
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
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
 * Find similar commands for typo suggestions
 */
export function findSimilarCommands(input: string, maxSuggestions = 3): string[] {
	const inputLower = input.toLowerCase();

	// Calculate distances and filter
	const suggestions = KNOWN_COMMANDS.map((cmd) => ({
		command: cmd,
		distance: levenshteinDistance(inputLower, cmd),
	}))
		.filter((s) => s.distance <= 3) // Only suggest if within 3 edits
		.sort((a, b) => a.distance - b.distance)
		.slice(0, maxSuggestions)
		.map((s) => s.command);

	return suggestions;
}

// =============================================================================
// ERROR DISPLAY
// =============================================================================

/**
 * Display a smart error with suggestions
 */
export function displaySmartError(error: Error | SmartError | string): void {
	const errorData = normalizeError(error);

	// Build error content
	const lines: string[] = [];

	// Error code and title
	if (errorData.code) {
		lines.push(`${chalk.red.bold(`[${errorData.code}]`)} ${chalk.red.bold(errorData.title)}`);
	} else {
		lines.push(chalk.red.bold(errorData.title));
	}

	lines.push("");
	lines.push(errorData.message);

	// Context information
	if (errorData.context && Object.keys(errorData.context).length > 0) {
		lines.push("");
		for (const [key, value] of Object.entries(errorData.context)) {
			lines.push(chalk.gray(`${key}: ${value}`));
		}
	}

	// Suggestion
	if (errorData.suggestion) {
		lines.push("");
		lines.push(chalk.yellow("💡 Suggestion:"));
		lines.push(chalk.yellow(`   ${errorData.suggestion}`));
	}

	// Command to fix
	if (errorData.command) {
		lines.push("");
		lines.push(chalk.cyan("📋 Try running:"));
		lines.push(chalk.cyan(`   $ ${errorData.command}`));
	}

	// Documentation link
	if (errorData.docLink) {
		lines.push("");
		lines.push(chalk.gray(`📚 More info: ${errorData.docLink}`));
	}

	// Display in box
	console.error(
		boxen(lines.join("\n"), {
			borderColor: "red",
			borderStyle: "round",
			padding: 1,
			margin: { top: 1, bottom: 1, left: 0, right: 0 },
		}),
	);
}

/**
 * Display unknown command error with suggestions
 */
export function displayUnknownCommandError(command: string): void {
	const suggestions = findSimilarCommands(command);

	const lines: string[] = [];
	lines.push(chalk.red.bold(`Unknown command: ${command}`));
	lines.push("");

	if (suggestions.length > 0) {
		lines.push(chalk.yellow("Did you mean:"));
		for (const suggestion of suggestions) {
			lines.push(chalk.cyan(`  $ snap ${suggestion}`));
		}
	} else {
		lines.push(chalk.gray("Run 'snap --help' to see available commands"));
	}

	console.error(
		boxen(lines.join("\n"), {
			borderColor: "yellow",
			borderStyle: "round",
			padding: 1,
		}),
	);
}

/**
 * Normalize various error types to SmartError
 */
function normalizeError(error: Error | SmartError | string): SmartError {
	// Already a SmartError
	if (typeof error === "object" && "code" in error && "title" in error) {
		return error;
	}

	// String error
	if (typeof error === "string") {
		return {
			code: "ERR_UNKNOWN",
			title: "Error",
			message: error,
			...findErrorSuggestion(error),
		};
	}

	// Standard Error object
	const message = error.message;
	const suggestion = findErrorSuggestion(message);

	return {
		code: extractErrorCode(error) || "ERR_UNKNOWN",
		title: error.name || "Error",
		message,
		...suggestion,
	};
}

/**
 * Find a suggestion for an error message
 */
function findErrorSuggestion(message: string): Partial<SmartError> {
	for (const { pattern, suggestion, command } of ERROR_SUGGESTIONS) {
		const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
		if (regex.test(message)) {
			return { suggestion, command };
		}
	}
	return {};
}

/**
 * Extract error code from error object
 */
function extractErrorCode(error: Error & { code?: string }): string | undefined {
	if (error.code) return error.code;

	// Extract from error name
	if (error.name && error.name !== "Error") {
		return error.name
			.toUpperCase()
			.replace(/ERROR$/, "")
			.replace(/\s+/g, "_");
	}

	return undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a SmartError with full context
 */
export function createSmartError(
	code: string,
	title: string,
	message: string,
	options?: {
		suggestion?: string;
		command?: string;
		docLink?: string;
		context?: Record<string, string>;
	},
): SmartError {
	return {
		code,
		title,
		message,
		...options,
	};
}

/**
 * Wrap a function to display smart errors on failure
 */
export function withSmartErrors<T extends (...args: unknown[]) => Promise<unknown>>(
	fn: T,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
		try {
			return (await fn(...args)) as ReturnType<T>;
		} catch (error) {
			displaySmartError(error instanceof Error ? error : String(error));
			process.exit(1);
		}
	};
}

// =============================================================================
// EXPORTS
// =============================================================================

export { levenshteinDistance };
