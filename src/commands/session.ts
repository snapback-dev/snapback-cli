/**
 * Session Command
 *
 * Implements snap session start/status/end - Manage development sessions.
 * Sessions track task context and snapshot count.
 *
 * @see implementation_plan.md Section 1.2
 */

import chalk from "chalk";
import { Command } from "commander";

import {
	appendSnapbackJsonl,
	endCurrentSession,
	generateId,
	getCurrentSession,
	isSnapbackInitialized,
	type SessionState,
	saveCurrentSession,
} from "../services/snapback-dir";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the session command with subcommands
 */
export function createSessionCommand(): Command {
	const session = new Command("session").description("Manage development sessions");

	session
		.command("start")
		.description("Start a new development session")
		.argument("[task]", "Task description")
		.option("-f, --force", "End current session and start a new one")
		.action(async (task: string | undefined, options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized in this workspace"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				// Check for existing session
				const existingSession = await getCurrentSession(cwd);
				if (existingSession && !options.force) {
					console.log(chalk.yellow("A session is already active:"));
					console.log(`  ID: ${chalk.gray(existingSession.id.substring(0, 8))}`);
					if (existingSession.task) {
						console.log(`  Task: ${existingSession.task}`);
					}
					console.log(`  Started: ${formatTimeAgo(existingSession.startedAt)}`);
					console.log(`  Snapshots: ${existingSession.snapshotCount}`);
					console.log();
					console.log(chalk.gray("Use --force to end this session and start a new one"));
					return;
				}

				// End existing session if forcing
				if (existingSession && options.force) {
					await archiveSession(existingSession, cwd);
					console.log(chalk.gray(`Ended previous session: ${existingSession.id.substring(0, 8)}`));
				}

				// Create new session
				const newSession: SessionState = {
					id: generateId("sess"),
					task,
					startedAt: new Date().toISOString(),
					snapshotCount: 0,
				};

				await saveCurrentSession(newSession, cwd);

				console.log(chalk.green("✓"), "Session started");
				console.log(`  ID: ${chalk.gray(newSession.id.substring(0, 8))}`);
				if (task) {
					console.log(`  Task: ${task}`);
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	session
		.command("status")
		.description("Show current session status")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const currentSession = await getCurrentSession(cwd);

				if (!currentSession) {
					if (options.json) {
						console.log(JSON.stringify({ active: false }, null, 2));
					} else {
						console.log(chalk.yellow("No active session"));
						console.log(chalk.gray("Run: snap session start [task]"));
					}
					return;
				}

				if (options.json) {
					console.log(JSON.stringify({ active: true, ...currentSession }, null, 2));
					return;
				}

				console.log(chalk.cyan("Active Session:"));
				console.log();
				console.log(`  ID:        ${chalk.gray(currentSession.id.substring(0, 8))}`);
				if (currentSession.task) {
					console.log(`  Task:      ${currentSession.task}`);
				}
				console.log(`  Started:   ${formatTimeAgo(currentSession.startedAt)}`);
				console.log(`  Snapshots: ${currentSession.snapshotCount}`);
				console.log(`  Duration:  ${formatDuration(currentSession.startedAt)}`);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	session
		.command("end")
		.description("End the current session")
		.option("-m, --message <message>", "Session end message/summary")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const currentSession = await getCurrentSession(cwd);

				if (!currentSession) {
					console.log(chalk.yellow("No active session"));
					return;
				}

				// Archive the session
				await archiveSession(currentSession, cwd, options.message);
				await endCurrentSession(cwd);

				const duration = formatDuration(currentSession.startedAt);

				console.log(chalk.green("✓"), "Session ended");
				console.log(`  ID:        ${chalk.gray(currentSession.id.substring(0, 8))}`);
				console.log(`  Duration:  ${duration}`);
				console.log(`  Snapshots: ${currentSession.snapshotCount}`);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	session
		.command("history")
		.description("Show session history")
		.option("-n, --number <count>", "Number of sessions to show", "10")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isSnapbackInitialized(cwd))) {
					console.log(chalk.yellow("SnapBack not initialized"));
					console.log(chalk.gray("Run: snap init"));
					process.exit(1);
				}

				const { loadSnapbackJsonl } = await import("../services/snapback-dir");
				const history = await loadSnapbackJsonl<ArchivedSession>("session/history.jsonl", cwd);

				const count = Number.parseInt(options.number, 10);
				const recent = history.slice(-count).reverse();

				if (options.json) {
					console.log(JSON.stringify(recent, null, 2));
					return;
				}

				if (recent.length === 0) {
					console.log(chalk.yellow("No session history"));
					return;
				}

				console.log(chalk.cyan("Recent Sessions:"));
				console.log();

				for (const session of recent) {
					const duration = formatDurationFromDates(session.startedAt, session.endedAt);
					console.log(chalk.gray(session.id.substring(0, 8)), session.task || chalk.gray("(no task)"));
					console.log(
						`  ${formatDate(session.startedAt)} • ${duration} • ${session.snapshotCount} snapshots`,
					);
					if (session.endMessage) {
						console.log(chalk.gray(`  "${session.endMessage}"`));
					}
					console.log();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return session;
}

// =============================================================================
// TYPES
// =============================================================================

interface ArchivedSession extends SessionState {
	endedAt: string;
	endMessage?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Archive a session to history
 */
async function archiveSession(session: SessionState, workspaceRoot: string, endMessage?: string): Promise<void> {
	const archived: ArchivedSession = {
		...session,
		endedAt: new Date().toISOString(),
		...(endMessage && { endMessage }),
	};

	await appendSnapbackJsonl("session/history.jsonl", archived, workspaceRoot);
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
function formatTimeAgo(isoDate: string): string {
	const date = new Date(isoDate);
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (seconds < 60) {
		return "just now";
	}
	if (seconds < 3600) {
		return `${Math.floor(seconds / 60)} minutes ago`;
	}
	if (seconds < 86400) {
		return `${Math.floor(seconds / 3600)} hours ago`;
	}
	return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Format duration from start time to now
 */
function formatDuration(startIso: string): string {
	const start = new Date(startIso);
	const now = new Date();
	const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);

	return formatSeconds(seconds);
}

/**
 * Format duration between two dates
 */
function formatDurationFromDates(startIso: string, endIso: string): string {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

	return formatSeconds(seconds);
}

/**
 * Format seconds to human readable
 */
function formatSeconds(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	if (seconds < 3600) {
		return `${Math.floor(seconds / 60)}m`;
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
	const date = new Date(isoDate);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// =============================================================================
// EXPORTS
// =============================================================================

export { archiveSession, formatTimeAgo, formatDuration };
