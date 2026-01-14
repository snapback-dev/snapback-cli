/**
 * Init Command
 *
 * Implements snap init - Initialize SnapBack for a workspace.
 * Creates .snapback/ directory and scans for workspace vitals.
 *
 * Flow:
 * 1. Check if already initialized (by extension OR CLI)
 * 2. Scan workspace for framework, package manager, etc.
 * 3. Create .snapback/ directory structure
 * 4. Detect critical files for protection suggestions
 * 5. If logged in, register workspace with server
 *
 * Philosophy: Extension is the PRIMARY onboarding path for 95% of users.
 * CLI is for automation/scripting (CI/CD, dotfiles).
 * CLI should DETECT and RESPECT extension state.
 *
 * @see implementation_plan.md Section 1.1
 */

import { access, constants, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { seedLearnings } from "@snapback/mcp/services";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import {
	createSnapbackDirectory,
	getCredentials,
	getWorkspaceConfig,
	isLoggedIn,
	isSnapbackInitialized,
	saveWorkspaceConfig,
	saveWorkspaceVitals,
	type WorkspaceConfig,
	type WorkspaceVitals,
} from "../services/snapback-dir";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FrameworkDetection {
	name: string;
	version?: string;
	confidence: number;
}

interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	packageManager?: string;
	scripts?: Record<string, string>;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the init command
 */
export function createInitCommand(): Command {
	return new Command("init")
		.description("Initialize SnapBack for this workspace")
		.option("-f, --force", "Reinitialize even if already initialized")
		.option("--no-sync", "Don't sync with server")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if already initialized (by extension OR CLI)
				const initialized = await isSnapbackInitialized(cwd);
				if (initialized && !options.force) {
					const config = await getWorkspaceConfig(cwd);

					// Detect if initialized by VS Code extension
					const initSource = await detectInitializationSource(cwd);

					if (initSource === "extension") {
						// 🎯 PHILOSOPHY: Extension is the PRIMARY onboarding path
						// CLI should respect and acknowledge extension state
						console.log(chalk.green("✓ SnapBack already initialized by VS Code extension"));
						console.log(chalk.gray(`Workspace ID: ${config?.workspaceId || "local"}`));
						console.log();
						console.log(chalk.cyan("The extension has already set up SnapBack for this workspace."));
						console.log(chalk.cyan("You're good to go! 🚀"));
						return;
					}

					console.log(chalk.yellow("SnapBack already initialized in this workspace"));
					console.log(chalk.gray(`Workspace ID: ${config?.workspaceId || "local"}`));
					console.log(chalk.gray("Use --force to reinitialize"));
					return;
				}

				const spinner = ora("Scanning workspace...").start();

				// Scan workspace for vitals
				const vitals = await scanWorkspaceVitals(cwd);

				spinner.succeed(
					`Detected: ${vitals.framework || "Unknown framework"} + ${vitals.typescript?.enabled ? "TypeScript" : "JavaScript"} + ${vitals.packageManager || "npm"}`,
				);

				// Create .snapback/ directory
				spinner.start("Creating .snapback/ directory...");
				await createSnapbackDirectory(cwd);
				spinner.succeed("Created .snapback/ directory");

				// Save vitals
				await saveWorkspaceVitals(vitals, cwd);

				// Seed tiered learnings
				spinner.start("Seeding learning patterns...");
				const seedResult = seedLearnings(cwd);
				if (seedResult.success && seedResult.filesCreated.length > 0) {
					spinner.succeed(
						`Seeded ${seedResult.learningsSeeded} patterns across ${seedResult.filesCreated.length} files`,
					);
				} else if (seedResult.filesCreated.length === 0) {
					spinner.info("Learning patterns already seeded");
				} else {
					spinner.warn(`Seeding completed with ${seedResult.errors.length} error(s)`);
				}

				// Create workspace config
				let config: WorkspaceConfig = {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				// If logged in and sync enabled, register with server
				if (options.sync && (await isLoggedIn())) {
					spinner.start("Registering workspace with server...");

					try {
						const workspaceId = await registerWorkspace(vitals);
						const credentials = await getCredentials();

						config = {
							...config,
							workspaceId,
							tier: credentials?.tier || "free",
							syncEnabled: true,
						};

						spinner.succeed("Workspace registered");
					} catch (_error) {
						spinner.warn("Could not register workspace (offline mode)");
						config.syncEnabled = false;
					}
				}

				await saveWorkspaceConfig(config, cwd);

				// Display summary
				console.log();
				console.log(chalk.green("✓ SnapBack initialized!"));
				console.log();

				// Show what was learned
				console.log(chalk.cyan("📚 Learned about your workspace:"));
				if (vitals.framework) {
					console.log(`   • Framework: ${vitals.framework}`);
				}
				if (vitals.packageManager) {
					console.log(`   • Package Manager: ${vitals.packageManager}`);
				}
				if (vitals.typescript?.enabled) {
					console.log(`   • TypeScript: ${vitals.typescript.strict ? "strict mode" : "enabled"}`);
				}
				if (vitals.criticalFiles && vitals.criticalFiles.length > 0) {
					console.log(`   • Critical Files: ${vitals.criticalFiles.length} detected`);
				}
				console.log();

				// Suggest next steps
				console.log(chalk.cyan("Next steps:"));
				if (!(await isLoggedIn())) {
					console.log(chalk.gray("  1. snap login       - Connect to SnapBack cloud"));
				}
				console.log(chalk.gray("  2. snap tools configure  - Set up MCP for your AI tools"));
				console.log(chalk.gray("  3. snap status      - View workspace health"));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Initialization failed:"), message);
				process.exit(1);
			}
		});
}

// =============================================================================
// WORKSPACE SCANNING
// =============================================================================

/**
 * Scan workspace to detect framework, package manager, and other vitals
 */
async function scanWorkspaceVitals(workspaceRoot: string): Promise<WorkspaceVitals> {
	const vitals: WorkspaceVitals = {
		detectedAt: new Date().toISOString(),
	};

	// Read package.json if it exists
	const packageJson = await readPackageJson(workspaceRoot);

	if (packageJson) {
		// Detect package manager
		vitals.packageManager = await detectPackageManager(workspaceRoot, packageJson);

		// Detect framework
		const framework = detectFramework(packageJson);
		if (framework) {
			vitals.framework = framework.name;
			vitals.frameworkConfidence = framework.confidence;
		}
	}

	// Detect TypeScript
	vitals.typescript = await detectTypeScript(workspaceRoot);

	// Detect critical files
	vitals.criticalFiles = await detectCriticalFiles(workspaceRoot);

	return vitals;
}

/**
 * Read package.json
 */
async function readPackageJson(workspaceRoot: string): Promise<PackageJson | null> {
	try {
		const content = await readFile(join(workspaceRoot, "package.json"), "utf-8");
		return JSON.parse(content) as PackageJson;
	} catch {
		return null;
	}
}

/**
 * Detect package manager from lockfiles and package.json
 */
async function detectPackageManager(
	workspaceRoot: string,
	packageJson: PackageJson,
): Promise<"npm" | "pnpm" | "yarn" | "bun"> {
	// Check packageManager field in package.json
	if (packageJson.packageManager) {
		if (packageJson.packageManager.startsWith("pnpm")) {
			return "pnpm";
		}
		if (packageJson.packageManager.startsWith("yarn")) {
			return "yarn";
		}
		if (packageJson.packageManager.startsWith("bun")) {
			return "bun";
		}
		if (packageJson.packageManager.startsWith("npm")) {
			return "npm";
		}
	}

	// Check for lockfiles
	const lockfiles: Array<{ file: string; manager: "npm" | "pnpm" | "yarn" | "bun" }> = [
		{ file: "pnpm-lock.yaml", manager: "pnpm" },
		{ file: "yarn.lock", manager: "yarn" },
		{ file: "bun.lockb", manager: "bun" },
		{ file: "package-lock.json", manager: "npm" },
	];

	for (const { file, manager } of lockfiles) {
		try {
			await access(join(workspaceRoot, file), constants.F_OK);
			return manager;
		} catch {
			// Continue to next lockfile
		}
	}

	return "npm"; // Default
}

/**
 * Detect framework from dependencies
 */
function detectFramework(packageJson: PackageJson): FrameworkDetection | null {
	const deps = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};

	// Framework detection priority (more specific first)
	const frameworks: Array<{
		name: string;
		indicators: string[];
		confidence: number;
	}> = [
		{ name: "Next.js", indicators: ["next"], confidence: 0.95 },
		{ name: "Nuxt", indicators: ["nuxt"], confidence: 0.95 },
		{ name: "Remix", indicators: ["@remix-run/react", "@remix-run/node"], confidence: 0.95 },
		{ name: "Astro", indicators: ["astro"], confidence: 0.95 },
		{ name: "SvelteKit", indicators: ["@sveltejs/kit"], confidence: 0.95 },
		{ name: "Svelte", indicators: ["svelte"], confidence: 0.85 },
		{ name: "Vue", indicators: ["vue"], confidence: 0.85 },
		{ name: "React", indicators: ["react"], confidence: 0.8 },
		{ name: "Angular", indicators: ["@angular/core"], confidence: 0.9 },
		{ name: "Express", indicators: ["express"], confidence: 0.7 },
		{ name: "Fastify", indicators: ["fastify"], confidence: 0.7 },
		{ name: "Hono", indicators: ["hono"], confidence: 0.7 },
		{ name: "Nest.js", indicators: ["@nestjs/core"], confidence: 0.9 },
	];

	for (const fw of frameworks) {
		const hasIndicator = fw.indicators.some((indicator) => indicator in deps);
		if (hasIndicator) {
			return {
				name: fw.name,
				version: deps[fw.indicators[0]],
				confidence: fw.confidence,
			};
		}
	}

	return null;
}

/**
 * Detect TypeScript configuration
 */
async function detectTypeScript(
	workspaceRoot: string,
): Promise<{ enabled: boolean; strict?: boolean; version?: string }> {
	try {
		// Check for tsconfig.json
		const tsconfigPath = join(workspaceRoot, "tsconfig.json");
		await access(tsconfigPath, constants.F_OK);

		const content = await readFile(tsconfigPath, "utf-8");
		// Parse JSON with comments support (strip comments first)
		const stripped = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
		const tsconfig = JSON.parse(stripped) as {
			compilerOptions?: { strict?: boolean };
		};

		// Check for strict mode
		const strict = tsconfig.compilerOptions?.strict === true;

		// Check for typescript version in package.json
		const packageJson = await readPackageJson(workspaceRoot);
		const version = packageJson?.devDependencies?.typescript || packageJson?.dependencies?.typescript;

		return { enabled: true, strict, version };
	} catch {
		return { enabled: false };
	}
}

/**
 * Detect critical files that should be protected
 */
async function detectCriticalFiles(workspaceRoot: string): Promise<string[]> {
	const _criticalPatterns = [
		// Configuration files
		".env",
		".env.local",
		".env.production",
		"*.config.js",
		"*.config.ts",
		"tsconfig.json",
		"package.json",
		// Auth-related
		"**/auth/**",
		"**/middleware/**",
		// Database
		"**/schema.*",
		"**/migrations/**",
		"**/prisma/schema.prisma",
		"**/drizzle/**",
		// Security
		"**/secrets/**",
		"**/keys/**",
	];

	const criticalFiles: string[] = [];

	// Check root-level critical files
	const rootCritical = [".env", ".env.local", ".env.production", "tsconfig.json", "package.json"];

	for (const file of rootCritical) {
		try {
			await access(join(workspaceRoot, file), constants.F_OK);
			criticalFiles.push(file);
		} catch {
			// File doesn't exist
		}
	}

	// Check for common directories
	const criticalDirs = [
		{ dir: "src/auth", pattern: "src/auth/**" },
		{ dir: "src/lib/auth", pattern: "src/lib/auth/**" },
		{ dir: "app/api", pattern: "app/api/**" },
		{ dir: "prisma", pattern: "prisma/**" },
		{ dir: "drizzle", pattern: "drizzle/**" },
	];

	for (const { dir, pattern } of criticalDirs) {
		try {
			await access(join(workspaceRoot, dir), constants.F_OK);
			criticalFiles.push(pattern);
		} catch {
			// Directory doesn't exist
		}
	}

	return criticalFiles;
}

// =============================================================================
// SERVER INTEGRATION
// =============================================================================

const DEFAULT_API_URL = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";

/**
 * Register workspace with server
 */
async function registerWorkspace(vitals: WorkspaceVitals): Promise<string> {
	const credentials = await getCredentials();
	if (!credentials) {
		throw new Error("Not logged in");
	}

	const response = await fetch(`${DEFAULT_API_URL}/api/workspaces`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${credentials.accessToken}`,
		},
		body: JSON.stringify({
			name: basename(process.cwd()),
			vitals: {
				framework: vitals.framework,
				packageManager: vitals.packageManager,
				typescript: vitals.typescript?.enabled,
				typescriptStrict: vitals.typescript?.strict,
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Server returned ${response.status}`);
	}

	const data = (await response.json()) as { id: string };
	return data.id;
}

// =============================================================================
// INITIALIZATION SOURCE DETECTION
// =============================================================================

/**
 * Detect if .snapback/ was initialized by VS Code extension or CLI
 *
 * Philosophy: Extension is the PRIMARY onboarding path.
 * CLI should detect and respect extension state.
 *
 * Detection heuristics:
 * - Extension creates specific markers in config.json
 * - Extension-initialized workspaces have different file patterns
 */
async function detectInitializationSource(workspaceRoot: string): Promise<"extension" | "cli" | "unknown"> {
	try {
		const configPath = join(workspaceRoot, ".snapback", "config.json");
		const content = await readFile(configPath, "utf-8");
		const config = JSON.parse(content) as Record<string, unknown>;

		// Extension sets specific markers
		if (config.initSource === "vscode-extension" || config.source === "extension") {
			return "extension";
		}

		// CLI sets its own marker
		if (config.initSource === "cli" || config.source === "cli") {
			return "cli";
		}

		// Check for extension-specific files
		try {
			// Extension creates activation state in globalState, but we can check for patterns
			const vitalsPath = join(workspaceRoot, ".snapback", "vitals.json");
			const vitalsContent = await readFile(vitalsPath, "utf-8");
			const vitals = JSON.parse(vitalsContent) as Record<string, unknown>;

			// If vitals has detectedAt with specific extension-style timestamp format
			if (vitals.detectedAt && typeof vitals.detectedAt === "string") {
				// Both could have this, so check for extension-specific markers
				if (vitals.source === "extension" || vitals.extensionVersion) {
					return "extension";
				}
			}
		} catch {
			// vitals.json doesn't exist or is invalid
		}

		return "unknown";
	} catch {
		return "unknown";
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export { scanWorkspaceVitals, detectFramework, detectPackageManager, detectTypeScript, detectCriticalFiles };
