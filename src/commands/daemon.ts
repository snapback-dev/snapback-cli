/**
 * Daemon CLI Commands
 *
 * Commands for managing the SnapBack daemon lifecycle.
 *
 * Usage:
 *   snapback daemon start [--detach] [--idle-timeout <minutes>]
 *   snapback daemon stop
 *   snapback daemon status
 *   snapback daemon restart
 *
 * @module commands/daemon
 */

import { spawn } from "node:child_process";
import type { Command } from "commander";
import { DaemonClient } from "../daemon/client.js";
import {
	formatBytes,
	formatDuration,
	getDefaultConfig,
	getPidPath,
	getSocketPath,
	isDaemonRunning,
} from "../daemon/platform.js";
import { SnapBackDaemon } from "../daemon/server.js";

/**
 * Register daemon commands
 */
export function registerDaemonCommands(program: Command): void {
	const daemon = program.command("daemon").description("Manage SnapBack daemon");

	// ==========================================================================
	// daemon start
	// ==========================================================================
	daemon
		.command("start")
		.description("Start the SnapBack daemon")
		.option("-d, --detach", "Run daemon in background (detached mode)")
		.option("-t, --idle-timeout <minutes>", "Shutdown after idle (default: 15)", "15")
		.action(async (options) => {
			// Check if already running
			if (isDaemonRunning()) {
				console.log("✓ Daemon is already running");
				return;
			}

			const idleTimeoutMs = Number.parseInt(options.idleTimeout, 10) * 60 * 1000;

			if (options.detach) {
				// Fork and run in background
				console.log("Starting daemon in background...");

				const child = spawn(
					process.execPath,
					[process.argv[1], "daemon", "start", "--idle-timeout", options.idleTimeout],
					{
						detached: true,
						stdio: "ignore",
					},
				);

				child.unref();

				// Wait for socket to appear
				const maxWait = 5000;
				const start = Date.now();

				await new Promise<void>((resolve, reject) => {
					const check = () => {
						if (isDaemonRunning()) {
							console.log(`✓ Daemon started (PID: ${child.pid})`);
							resolve();
						} else if (Date.now() - start > maxWait) {
							reject(new Error("Daemon failed to start within timeout"));
						} else {
							setTimeout(check, 100);
						}
					};
					setTimeout(check, 100);
				});

				return;
			}

			// Run in foreground
			console.log("Starting SnapBack daemon...");
			console.log(`  Socket: ${getSocketPath()}`);
			console.log(`  Idle timeout: ${options.idleTimeout} minutes`);
			console.log("");
			console.log("Press Ctrl+C to stop");
			console.log("");

			const config = {
				...getDefaultConfig(),
				idleTimeoutMs,
			};

			const daemonInstance = new SnapBackDaemon(config);

			// Register signal handlers
			process.on("SIGTERM", async () => {
				console.log("\nReceived SIGTERM, shutting down...");
				await daemonInstance.shutdown();
				process.exit(0);
			});

			process.on("SIGINT", async () => {
				console.log("\nReceived SIGINT, shutting down...");
				await daemonInstance.shutdown();
				process.exit(0);
			});

			// Event handlers
			daemonInstance.on("connection", () => {
				console.log("[daemon] New connection");
			});

			daemonInstance.on("disconnection", () => {
				console.log("[daemon] Connection closed");
			});

			daemonInstance.on("idle_timeout", () => {
				console.log("[daemon] Idle timeout reached, shutting down...");
			});

			try {
				await daemonInstance.start();
				console.log(`✓ Daemon started (PID: ${process.pid})`);

				// Keep process running
				await new Promise(() => {});
			} catch (err) {
				console.error("✗ Failed to start daemon:", err instanceof Error ? err.message : err);
				process.exit(1);
			}
		});

	// ==========================================================================
	// daemon stop
	// ==========================================================================
	daemon
		.command("stop")
		.description("Stop the SnapBack daemon")
		.action(async () => {
			if (!isDaemonRunning()) {
				console.log("Daemon is not running");
				return;
			}

			console.log("Stopping daemon...");

			try {
				const client = new DaemonClient({
					socketPath: getSocketPath(),
					pidPath: getPidPath(),
					autoStart: false,
				});

				await client.connect();
				await client.shutdown();

				console.log("✓ Daemon stopped");
			} catch (err) {
				console.error("✗ Failed to stop daemon:", err instanceof Error ? err.message : err);

				// Try to kill by PID as fallback
				try {
					const { readFileSync } = await import("node:fs");
					const pid = Number.parseInt(readFileSync(getPidPath(), "utf-8").trim(), 10);
					process.kill(pid, "SIGTERM");
					console.log("✓ Sent SIGTERM to daemon");
				} catch {
					console.error("Could not stop daemon by PID");
				}
			}
		});

	// ==========================================================================
	// daemon status
	// ==========================================================================
	daemon
		.command("status")
		.description("Show daemon status")
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			if (!isDaemonRunning()) {
				if (options.json) {
					console.log(JSON.stringify({ running: false }));
				} else {
					console.log("Daemon is not running");
				}
				return;
			}

			try {
				const client = new DaemonClient({
					socketPath: getSocketPath(),
					pidPath: getPidPath(),
					autoStart: false,
				});

				await client.connect();
				const status = await client.status();
				await client.disconnect();

				if (options.json) {
					console.log(JSON.stringify({ running: true, ...status }, null, 2));
				} else {
					console.log("Daemon Status:");
					console.log("  Status:       ✓ Running");
					console.log(`  PID:          ${status.pid}`);
					console.log(`  Version:      ${status.version}`);
					console.log(`  Uptime:       ${formatDuration(status.uptime)}`);
					console.log(`  Started:      ${status.startedAt}`);
					console.log(`  Workspaces:   ${status.workspaces}`);
					console.log(`  Connections:  ${status.connections}`);
					console.log(`  Memory:       ${formatBytes(status.memoryUsage.heapUsed)}`);
					console.log(`  Idle timeout: ${formatDuration(status.idleTimeout)}`);
				}
			} catch (err) {
				if (options.json) {
					console.log(
						JSON.stringify({ running: false, error: err instanceof Error ? err.message : String(err) }),
					);
				} else {
					console.error("✗ Failed to get status:", err instanceof Error ? err.message : err);
				}
			}
		});

	// ==========================================================================
	// daemon restart
	// ==========================================================================
	daemon
		.command("restart")
		.description("Restart the SnapBack daemon")
		.option("-t, --idle-timeout <minutes>", "Shutdown after idle (default: 15)", "15")
		.action(async (options) => {
			console.log("Restarting daemon...");

			// Stop if running
			if (isDaemonRunning()) {
				try {
					const client = new DaemonClient({
						socketPath: getSocketPath(),
						pidPath: getPidPath(),
						autoStart: false,
					});

					await client.connect();
					await client.shutdown();
					console.log("✓ Stopped existing daemon");

					// Wait for cleanup
					await new Promise((r) => setTimeout(r, 500));
				} catch {
					// Ignore stop errors
				}
			}

			// Start in detached mode
			const child = spawn(
				process.execPath,
				[process.argv[1], "daemon", "start", "--idle-timeout", options.idleTimeout],
				{
					detached: true,
					stdio: "ignore",
				},
			);

			child.unref();

			// Wait for startup
			const maxWait = 5000;
			const start = Date.now();

			await new Promise<void>((resolve, reject) => {
				const check = () => {
					if (isDaemonRunning()) {
						console.log(`✓ Daemon restarted (PID: ${child.pid})`);
						resolve();
					} else if (Date.now() - start > maxWait) {
						reject(new Error("Daemon failed to restart within timeout"));
					} else {
						setTimeout(check, 100);
					}
				};
				setTimeout(check, 100);
			});
		});

	// ==========================================================================
	// daemon ping
	// ==========================================================================
	daemon
		.command("ping")
		.description("Ping the daemon")
		.action(async () => {
			if (!isDaemonRunning()) {
				console.log("Daemon is not running");
				return;
			}

			try {
				const client = new DaemonClient({
					socketPath: getSocketPath(),
					pidPath: getPidPath(),
					autoStart: false,
				});

				const start = Date.now();
				await client.connect();
				const result = await client.ping();
				const elapsed = Date.now() - start;
				await client.disconnect();

				console.log(`pong! (${elapsed}ms, uptime: ${formatDuration(result.uptime)})`);
			} catch (err) {
				console.error("✗ Ping failed:", err instanceof Error ? err.message : err);
			}
		});
}
