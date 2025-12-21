/**
 * Authentication Commands
 *
 * Implements snap login/logout/whoami with OAuth Device Code Flow
 * for minimal friction user experience.
 *
 * Flow:
 * 1. snap login → Opens browser for OAuth
 * 2. User authenticates in browser
 * 3. CLI receives token via local callback server
 * 4. Credentials stored in ~/.snapback/credentials.json
 *
 * @see implementation_plan.md Section 1.2
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hostname, platform, userInfo } from "node:os";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import {
	clearCredentials,
	createGlobalDirectory,
	type GlobalCredentials,
	getCredentials,
	isLoggedIn,
	saveCredentials,
} from "../services/snapback-dir";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_API_URL = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";
const AUTH_CALLBACK_PORT = 51234;
const AUTH_TIMEOUT_MS = 120000; // 2 minutes

// =============================================================================
// COMMAND DEFINITIONS
// =============================================================================

/**
 * Create the login command
 */
export function createLoginCommand(): Command {
	return new Command("login")
		.description("Login to SnapBack")
		.option("--api-key <key>", "Use API key instead of browser login")
		.option("--no-browser", "Use device code flow instead of browser")
		.action(async (options) => {
			try {
				if (options.apiKey) {
					await loginWithApiKey(options.apiKey);
				} else if (options.browser === false) {
					await loginWithDeviceCode();
				} else {
					await loginWithBrowser();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Login failed:"), message);
				process.exit(1);
			}
		});
}

/**
 * Create the logout command
 */
export function createLogoutCommand(): Command {
	return new Command("logout").description("Logout from SnapBack").action(async () => {
		const spinner = ora("Logging out...").start();

		try {
			const wasLoggedIn = await isLoggedIn();
			await clearCredentials();

			if (wasLoggedIn) {
				spinner.succeed("Logged out successfully");
			} else {
				spinner.info("You were not logged in");
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			spinner.fail("Logout failed");
			console.error(chalk.red("Error:"), message);
			process.exit(1);
		}
	});
}

/**
 * Create the whoami command
 */
export function createWhoamiCommand(): Command {
	return new Command("whoami").description("Show current user").action(async () => {
		try {
			const credentials = await getCredentials();

			if (!credentials) {
				console.log(chalk.yellow("Not logged in"));
				console.log(chalk.gray("Run: snap login"));
				return;
			}

			// Check if token is expired
			if (credentials.expiresAt) {
				const expiresAt = new Date(credentials.expiresAt);
				if (expiresAt < new Date()) {
					console.log(chalk.yellow("Session expired"));
					console.log(chalk.gray("Run: snap login"));
					return;
				}
			}

			console.log(chalk.cyan("Logged in as:"), credentials.email);
			console.log(chalk.cyan("Tier:"), formatTier(credentials.tier));

			if (credentials.expiresAt) {
				const expiresAt = new Date(credentials.expiresAt);
				const now = new Date();
				const hoursRemaining = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

				if (hoursRemaining < 24) {
					console.log(chalk.yellow("Session expires:"), `in ${hoursRemaining} hours`);
				}
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(chalk.red("Error:"), message);
			process.exit(1);
		}
	});
}

// =============================================================================
// LOGIN METHODS
// =============================================================================

/**
 * Login with browser (recommended for local development)
 */
async function loginWithBrowser(): Promise<void> {
	const spinner = ora("Preparing login...").start();

	try {
		// Create global directory if it doesn't exist
		await createGlobalDirectory();

		// Start local callback server
		const { url, waitForCallback } = await startCallbackServer();

		// Generate auth URL
		const authUrl = `${DEFAULT_API_URL}/auth/cli?callback=${encodeURIComponent(url)}`;

		spinner.succeed("Ready to authenticate");
		console.log();
		console.log(chalk.cyan("Opening browser for authentication..."));
		console.log(chalk.gray("If browser doesn't open, visit:"));
		console.log(chalk.underline(authUrl));
		console.log();

		// Try to open browser
		await openBrowser(authUrl);

		spinner.start("Waiting for authentication...");

		// Wait for callback with credentials
		const credentials = await waitForCallback();

		spinner.succeed("Logged in successfully");
		console.log();
		console.log(chalk.green("✓"), "Welcome,", chalk.cyan(credentials.email));
		console.log(chalk.green("✓"), "Tier:", formatTier(credentials.tier));
	} catch (error) {
		spinner.fail("Login failed");
		throw error;
	}
}

/**
 * Login with device code (for remote/headless environments)
 */
async function loginWithDeviceCode(): Promise<void> {
	const spinner = ora("Requesting device code...").start();

	try {
		await createGlobalDirectory();

		// Request device code from server
		const response = await fetch(`${DEFAULT_API_URL}/auth/device`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				clientId: "snapback-cli",
				deviceInfo: getDeviceInfo(),
			}),
		});

		if (!response.ok) {
			throw new Error(`Server returned ${response.status}`);
		}

		const data = (await response.json()) as {
			deviceCode: string;
			userCode: string;
			verificationUri: string;
			expiresIn: number;
			interval: number;
		};

		spinner.succeed("Device code received");
		console.log();
		console.log(chalk.cyan("To complete login:"));
		console.log();
		console.log("  1. Visit:", chalk.underline(data.verificationUri));
		console.log("  2. Enter code:", chalk.bold.yellow(data.userCode));
		console.log();

		spinner.start("Waiting for authorization...");

		// Poll for token
		const credentials = await pollForToken(data.deviceCode, data.interval, data.expiresIn);

		spinner.succeed("Logged in successfully");
		console.log();
		console.log(chalk.green("✓"), "Welcome,", chalk.cyan(credentials.email));
		console.log(chalk.green("✓"), "Tier:", formatTier(credentials.tier));
	} catch (error) {
		spinner.fail("Login failed");
		throw error;
	}
}

/**
 * Login with API key (for CI/CD)
 */
async function loginWithApiKey(apiKey: string): Promise<void> {
	const spinner = ora("Validating API key...").start();

	try {
		await createGlobalDirectory();

		// Validate API key with server
		const response = await fetch(`${DEFAULT_API_URL}/auth/verify`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Invalid API key");
			}
			throw new Error(`Server returned ${response.status}`);
		}

		const data = (await response.json()) as {
			email: string;
			tier: "free" | "pro";
		};

		// Save credentials
		const credentials: GlobalCredentials = {
			accessToken: apiKey,
			email: data.email,
			tier: data.tier,
		};

		await saveCredentials(credentials);

		spinner.succeed("Logged in with API key");
		console.log();
		console.log(chalk.green("✓"), "Account:", chalk.cyan(data.email));
		console.log(chalk.green("✓"), "Tier:", formatTier(data.tier));
	} catch (error) {
		spinner.fail("Login failed");
		throw error;
	}
}

// =============================================================================
// CALLBACK SERVER
// =============================================================================

interface CallbackResult {
	url: string;
	waitForCallback: () => Promise<GlobalCredentials>;
}

/**
 * Start a local HTTP server to receive OAuth callback
 */
async function startCallbackServer(): Promise<CallbackResult> {
	return new Promise((resolve, reject) => {
		let resolved = false;
		let callbackResolver: ((credentials: GlobalCredentials) => void) | null = null;
		let callbackRejecter: ((error: Error) => void) | null = null;

		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			// Only handle /callback endpoint
			if (!req.url?.startsWith("/callback")) {
				res.writeHead(404);
				res.end("Not found");
				return;
			}

			try {
				// Parse query parameters
				const url = new URL(req.url, `http://localhost:${AUTH_CALLBACK_PORT}`);
				const token = url.searchParams.get("token");
				const email = url.searchParams.get("email");
				const tier = url.searchParams.get("tier") as "free" | "pro";
				const error = url.searchParams.get("error");

				if (error) {
					res.writeHead(400, { "Content-Type": "text/html" });
					res.end(errorPage(error));
					callbackRejecter?.(new Error(error));
					server.close();
					return;
				}

				if (!token || !email) {
					res.writeHead(400, { "Content-Type": "text/html" });
					res.end(errorPage("Missing credentials"));
					callbackRejecter?.(new Error("Missing credentials"));
					server.close();
					return;
				}

				// Save credentials
				const credentials: GlobalCredentials = {
					accessToken: token,
					email,
					tier: tier || "free",
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
				};

				saveCredentials(credentials)
					.then(() => {
						res.writeHead(200, { "Content-Type": "text/html" });
						res.end(successPage(email));
						callbackResolver?.(credentials);
						server.close();
					})
					.catch((err) => {
						res.writeHead(500, { "Content-Type": "text/html" });
						res.end(errorPage("Failed to save credentials"));
						callbackRejecter?.(err);
						server.close();
					});
			} catch (err) {
				res.writeHead(500, { "Content-Type": "text/html" });
				res.end(errorPage("Server error"));
				callbackRejecter?.(err instanceof Error ? err : new Error(String(err)));
				server.close();
			}
		});

		server.on("error", (error) => {
			if (!resolved) {
				reject(error);
			}
		});

		server.listen(AUTH_CALLBACK_PORT, "127.0.0.1", () => {
			resolved = true;
			resolve({
				url: `http://127.0.0.1:${AUTH_CALLBACK_PORT}/callback`,
				waitForCallback: () => {
					return new Promise<GlobalCredentials>((res, rej) => {
						callbackResolver = res;
						callbackRejecter = rej;

						// Set timeout
						setTimeout(() => {
							rej(new Error("Authentication timed out"));
							server.close();
						}, AUTH_TIMEOUT_MS);
					});
				},
			});
		});
	});
}

// =============================================================================
// DEVICE CODE POLLING
// =============================================================================

/**
 * Poll the server for token after device code auth
 */
async function pollForToken(deviceCode: string, interval: number, expiresIn: number): Promise<GlobalCredentials> {
	const endTime = Date.now() + expiresIn * 1000;
	const pollInterval = Math.max(interval, 5) * 1000; // Minimum 5 seconds

	while (Date.now() < endTime) {
		await sleep(pollInterval);

		const response = await fetch(`${DEFAULT_API_URL}/auth/device/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ deviceCode }),
		});

		if (response.ok) {
			const data = (await response.json()) as {
				accessToken: string;
				refreshToken?: string;
				email: string;
				tier: "free" | "pro";
				expiresIn: number;
			};

			const credentials: GlobalCredentials = {
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
				email: data.email,
				tier: data.tier,
				expiresAt: new Date(Date.now() + data.expiresIn * 1000).toISOString(),
			};

			await saveCredentials(credentials);
			return credentials;
		}

		if (response.status === 400) {
			const error = (await response.json()) as { error: string };
			if (error.error === "authorization_pending") {
				// Continue polling
				continue;
			}
			if (error.error === "slow_down") {
				// Increase interval
				await sleep(5000);
				continue;
			}
			throw new Error(error.error);
		}

		throw new Error(`Server returned ${response.status}`);
	}

	throw new Error("Authorization timed out");
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Open URL in browser
 */
async function openBrowser(url: string): Promise<void> {
	const { exec } = await import("node:child_process");

	const command =
		platform() === "darwin" ? `open "${url}"` : platform() === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;

	return new Promise((resolve) => {
		exec(command, (_error) => {
			// Don't fail if browser doesn't open
			resolve();
		});
	});
}

/**
 * Get device info for device code auth
 */
function getDeviceInfo(): {
	hostname: string;
	platform: string;
	user: string;
} {
	return {
		hostname: hostname(),
		platform: platform(),
		user: userInfo().username,
	};
}

/**
 * Format tier for display
 */
function formatTier(tier: "free" | "pro"): string {
	return tier === "pro" ? chalk.magenta.bold("Pro ⭐") : chalk.gray("Free");
}

/**
 * Sleep for a number of milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Success HTML page for browser callback
 */
function successPage(email: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <title>SnapBack - Login Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fafafa; }
    .success { color: #22c55e; font-size: 48px; margin-bottom: 20px; }
    h1 { margin-bottom: 10px; }
    p { color: #a1a1aa; }
    .close { margin-top: 30px; color: #71717a; font-size: 14px; }
  </style>
</head>
<body>
  <div class="success">✓</div>
  <h1>Welcome to SnapBack!</h1>
  <p>Logged in as ${email}</p>
  <p class="close">You can close this window and return to your terminal.</p>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>
`;
}

/**
 * Error HTML page for browser callback
 */
function errorPage(error: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <title>SnapBack - Login Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fafafa; }
    .error { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
    h1 { margin-bottom: 10px; }
    p { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="error">✗</div>
  <h1>Login Failed</h1>
  <p>${error}</p>
  <p>Please try again in your terminal.</p>
</body>
</html>
`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { loginWithApiKey, loginWithBrowser, loginWithDeviceCode };
