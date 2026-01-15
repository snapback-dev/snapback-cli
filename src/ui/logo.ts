/**
 * CLI Branding & Logo
 *
 * ASCII art logo and branding utilities for the SnapBack CLI.
 * Used for first-time experience and welcome screens.
 *
 * @see cli_ui_imp.md for design spec
 * @module ui/logo
 */

import chalk from "chalk";

// =============================================================================
// ASCII LOGO
// =============================================================================

/**
 * SnapBack ASCII art logo (large)
 * Note: No leading newline - prevents terminal scroll issues
 */
export const LOGO_LARGE = `███████╗███╗   ██╗ █████╗ ██████╗ ██████╗  █████╗  ██████╗██╗  ██╗
██╔════╝████╗  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
███████╗██╔██╗ ██║███████║██████╔╝██████╔╝███████║██║     █████╔╝
╚════██║██║╚██╗██║██╔══██║██╔═══╝ ██╔══██╗██╔══██║██║     ██╔═██╗
███████║██║ ╚████║██║  ██║██║     ██████╔╝██║  ██║╚██████╗██║  ██╗
╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝`;

/**
 * SnapBack ASCII art logo (compact)
 * Note: No leading newline - prevents terminal scroll issues
 */
export const LOGO_COMPACT = ` ____                   ____             _
/ ___| _ __   __ _ _ __|  _ \\ __ _  ___| | __
\\___ \\| '_ \\ / _\` | '_ \\ |_) / _\` |/ __| |/ /
 ___) | | | | (_| | |_) |  _ < (_| | (__|   <
|____/|_| |_|\\__,_| .__/|_| \\_\\__,_|\\___|_|\\_\\
                  |_|`;

/**
 * Minimal logo for narrow terminals
 * Note: No leading newline - prevents terminal scroll issues
 */
export const LOGO_MINIMAL = `╔═╗┌┐┌┌─┐┌─┐╔╗ ┌─┐┌─┐┬┌─
╚═╗│││├─┤├─┘╠╩╗├─┤│  ├┴┐
╚═╝┘└┘┴ ┴┴  ╚═╝┴ ┴└─┘┴ ┴`;

// =============================================================================
// BRANDING FUNCTIONS
// =============================================================================

/**
 * Get the appropriate logo based on terminal width
 */
export function getLogo(terminalWidth?: number): string {
	const width = terminalWidth ?? process.stdout.columns ?? 80;

	if (width >= 72) {
		return LOGO_LARGE;
	}
	if (width >= 50) {
		return LOGO_COMPACT;
	}
	return LOGO_MINIMAL;
}

/**
 * Display the branded header with logo and tagline
 */
export function displayBrandedHeader(
	options: { version?: string; showTagline?: boolean; color?: boolean } = {},
): string {
	const { version, showTagline = true, color = true } = options;

	const logo = getLogo();
	const coloredLogo = color ? chalk.cyan(logo) : logo;

	const lines: string[] = [coloredLogo];

	if (showTagline) {
		lines.push("");
		lines.push(
			color
				? `    ${chalk.blue("🧢")}  ${chalk.bold("Code Protection for AI-Native Development")}`
				: "    🧢  Code Protection for AI-Native Development",
		);
	}

	if (version) {
		lines.push(color ? chalk.gray(`    v${version}`) : `    v${version}`);
	}

	return lines.join("\n");
}

/**
 * Display a welcome message for first-time users
 */
export function displayWelcomeMessage(): string {
	const logo = displayBrandedHeader({ showTagline: true });

	const message = `
${logo}

${chalk.bold("Welcome to SnapBack!")}

SnapBack protects your code from AI coding assistant mistakes.
When things go wrong, restore in seconds.

${chalk.cyan("Quick Start:")}
  ${chalk.gray("1.")} ${chalk.cyan("snap login")}      ${chalk.gray("Connect your account")}
  ${chalk.gray("2.")} ${chalk.cyan("snap init")}       ${chalk.gray("Initialize workspace")}
  ${chalk.gray("3.")} ${chalk.cyan("snap tools configure")} ${chalk.gray("Set up AI tools")}

${chalk.dim("Learn more: https://docs.snapback.dev")}
`;

	return message;
}

/**
 * Display a compact status header
 */
export function displayStatusHeader(
	options: { user?: string; tier?: "free" | "pro"; pioneerNumber?: number } = {},
): string {
	const { user, tier, pioneerNumber } = options;

	const parts: string[] = [];

	if (user) {
		parts.push(chalk.cyan(`@${user}`));
	}

	if (pioneerNumber) {
		parts.push(chalk.yellow(`Pioneer #${pioneerNumber.toLocaleString()}`));
	}

	if (tier) {
		parts.push(tier === "pro" ? chalk.magenta("Pro ⭐") : chalk.gray("Free"));
	}

	if (parts.length === 0) {
		return "";
	}

	return parts.join(chalk.gray(" • "));
}

/**
 * Display a divider line
 */
export function displayDivider(width?: number, char = "─"): string {
	const w = width ?? Math.min(process.stdout.columns ?? 60, 60);
	return chalk.gray(char.repeat(w));
}

/**
 * Display a section header
 */
export function displaySectionHeader(title: string): string {
	return `\n${chalk.cyan.bold(title)}\n${displayDivider(title.length + 4)}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { LOGO_LARGE as logoLarge, LOGO_COMPACT as logoCompact, LOGO_MINIMAL as logoMinimal };
