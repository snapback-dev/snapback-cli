/**
 * Init Command
 *
 * Implements snap init - Initialize SnapBack for a workspace.
 * Creates .snapback/ directory and scans for workspace vitals.
 *
 * Flow:
 * 1. Check if already initialized
 * 2. Scan workspace for framework, package manager, etc.
 * 3. Create .snapback/ directory structure
 * 4. Detect critical files for protection suggestions
 * 5. If logged in, register workspace with server
 *
 * @see implementation_plan.md Section 1.1
 */

import { access, constants, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
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
				// Check if already initialized
				const initialized = await isSnapbackInitialized(cwd);
				if (initialized && !options.force) {
					const config = await getWorkspaceConfig(cwd);
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
					} catch (error) {
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
		if (packageJson.packageManager.startsWith("pnpm")) return "pnpm";
		if (packageJson.packageManager.startsWith("yarn")) return "yarn";
		if (packageJson.packageManager.startsWith("bun")) return "bun";
		if (packageJson.packageManager.startsWith("npm")) return "npm";
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
	const criticalPatterns = [
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
// EXPORTS
// =============================================================================

export { scanWorkspaceVitals, detectFramework, detectPackageManager, detectTypeScript, detectCriticalFiles };
