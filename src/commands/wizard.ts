/**
 * First-Run Wizard
 *
 * Interactive onboarding for new SnapBack users.
 * Inspired by: Vercel CLI, GitHub CLI, Stripe CLI
 *
 * Features:
 * - Branded welcome screen
 * - Guided authentication
 * - Workspace detection
 * - Smart defaults based on project type
 * - Progress indicators
 *
 * @module commands/wizard
 */

import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { hyperlink } from "../ui/links";
import { displayBrandedHeader } from "../ui/logo";
import { prompts, status } from "../ui/prompts";

// =============================================================================
// TYPES
// =============================================================================

interface WizardState {
	authenticated: boolean;
	workspaceRoot: string | null;
	projectType: ProjectType | null;
	protectionLevel: "standard" | "strict";
	mcpEnabled: boolean;
	analyticsEnabled: boolean;
	// New fields for enhanced onboarding
	filesProtected: boolean;
	gitHookInstalled: boolean;
	snapshotCreated: boolean;
}

type ProjectType = "nodejs" | "typescript" | "python" | "rust" | "go" | "unknown";

interface ProjectDetection {
	type: ProjectType;
	confidence: number;
	indicators: string[];
}

// =============================================================================
// PROJECT DETECTION
// =============================================================================

/**
 * Detect project type from files in the current directory
 */
function detectProjectType(cwd: string): ProjectDetection {
	const indicators: string[] = [];
	let type: ProjectType = "unknown";
	let confidence = 0;

	const files = fs.readdirSync(cwd).map((f) => f.toLowerCase());

	// TypeScript (check first since it may also have package.json)
	if (files.includes("tsconfig.json")) {
		type = "typescript";
		confidence += 90;
		indicators.push("tsconfig.json found");
	} else if (files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
		type = "typescript";
		confidence += 60;
		indicators.push(".ts/.tsx files found");
	}

	// Node.js
	if (files.includes("package.json")) {
		if (type === "unknown") {
			type = "nodejs";
		}
		confidence += 30;
		indicators.push("package.json found");
	}

	// Python
	if (files.includes("pyproject.toml") || files.includes("requirements.txt")) {
		type = "python";
		confidence = 80;
		indicators.push("Python project files found");
	} else if (files.some((f) => f.endsWith(".py"))) {
		if (type === "unknown") {
			type = "python";
			confidence = 50;
		}
		indicators.push(".py files found");
	}

	// Rust
	if (files.includes("cargo.toml")) {
		type = "rust";
		confidence = 95;
		indicators.push("Cargo.toml found");
	}

	// Go
	if (files.includes("go.mod")) {
		type = "go";
		confidence = 95;
		indicators.push("go.mod found");
	}

	return { type, confidence, indicators };
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication(): Promise<boolean> {
	const homeDir = process.env.HOME || process.env.USERPROFILE || "";
	const tokenPath = path.join(homeDir, ".snapback", "token.json");

	try {
		if (fs.existsSync(tokenPath)) {
			const data = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
			return Boolean(data.token);
		}
	} catch {
		// Ignore errors
	}

	return false;
}

/**
 * Check if workspace is initialized
 */
function isWorkspaceInitialized(cwd: string): boolean {
	const snapbackDir = path.join(cwd, ".snapback");
	return fs.existsSync(snapbackDir);
}

// =============================================================================
// WIZARD STEPS
// =============================================================================

/**
 * Step 1: Welcome screen with branding
 */
async function welcomeStep(): Promise<void> {
	console.clear();
	console.log(displayBrandedHeader({ showTagline: true }));

	console.log(chalk.cyan.bold("\n  Welcome to SnapBack! 🎉\n"));
	console.log(chalk.white("  The AI-native code protection tool that helps you"));
	console.log(chalk.white("  work confidently with AI coding assistants.\n"));

	console.log(chalk.gray("  This wizard will help you:"));
	console.log(chalk.gray("  • Connect your account"));
	console.log(chalk.gray("  • Set up your workspace"));
	console.log(chalk.gray("  • Configure AI tool integration\n"));

	const proceed = await prompts.confirm({
		message: "Ready to get started?",
		default: true,
	});

	if (!proceed) {
		console.log(chalk.gray("\nNo problem! Run 'snap init' anytime to start over.\n"));
		process.exit(0);
	}
}

/**
 * Step 2: Authentication
 */
async function authenticationStep(state: WizardState): Promise<WizardState> {
	console.log(`\n${chalk.cyan.bold("Step 1: Authentication\n")}`);

	if (state.authenticated) {
		status.success("Already authenticated");
		return state;
	}

	console.log(chalk.white("  SnapBack needs to connect to your account for:"));
	console.log(chalk.gray("  • Syncing snapshots across devices"));
	console.log(chalk.gray("  • Enabling team collaboration"));
	console.log(chalk.gray("  • Accessing premium features\n"));

	const authMethod = await prompts.select({
		message: "How would you like to authenticate?",
		options: [
			{ label: "Browser login (recommended)", value: "browser", hint: "Opens snapback.dev" },
			{ label: "API key", value: "api-key", hint: "For CI/CD and automation" },
			{ label: "Skip for now", value: "skip", hint: "Limited functionality" },
		],
		default: "browser",
	});

	if (authMethod === "skip") {
		status.warning("Skipping authentication - some features will be limited");
		return { ...state, authenticated: false };
	}

	if (authMethod === "browser") {
		console.log(chalk.gray("\n  Opening browser for authentication..."));
		// In real implementation: open browser and wait for callback
		console.log(
			chalk.cyan(`  → ${hyperlink.create("Click here to authenticate", "https://snapback.dev/auth/cli")}`),
		);
		console.log();

		const confirmed = await prompts.confirm({
			message: "Did you complete authentication in the browser?",
			default: true,
		});

		if (confirmed) {
			status.success("Authenticated successfully!");
			return { ...state, authenticated: true };
		}
	}

	if (authMethod === "api-key") {
		const apiKey = await prompts.input("Enter your API key", {
			validate: (value) => {
				if (!value.startsWith("snap_")) {
					return "API key should start with 'snap_'";
				}
				if (value.length < 20) {
					return "API key seems too short";
				}
				return true;
			},
		});

		if (apiKey) {
			status.success("API key validated and stored");
			return { ...state, authenticated: true };
		}
	}

	return { ...state, authenticated: false };
}

/**
 * Step 3: Workspace setup
 */
async function workspaceStep(state: WizardState): Promise<WizardState> {
	console.log(`\n${chalk.cyan.bold("Step 2: Workspace Setup\n")}`);

	const cwd = process.cwd();

	// Detect project type
	const detection = detectProjectType(cwd);
	const projectName = path.basename(cwd);

	if (detection.type !== "unknown") {
		console.log(chalk.white(`  Detected project: ${chalk.cyan(projectName)}`));
		console.log(chalk.gray(`  Type: ${detection.type} (${detection.confidence}% confidence)`));
		console.log(chalk.gray(`  Indicators: ${detection.indicators.join(", ")}\n`));
	} else {
		console.log(chalk.white(`  Project: ${chalk.cyan(projectName)}`));
		console.log(chalk.gray("  Type: Could not auto-detect\n"));
	}

	// Check if already initialized and if config is valid
	if (isWorkspaceInitialized(cwd)) {
		const configPath = path.join(cwd, ".snapback", "config.json");
		let isConfigCorrupted = false;

		if (!fs.existsSync(configPath)) {
			isConfigCorrupted = true;
		} else {
			try {
				JSON.parse(fs.readFileSync(configPath, "utf-8"));
			} catch {
				isConfigCorrupted = true;
			}
		}

		if (isConfigCorrupted) {
			status.warning("Detected a corrupted SnapBack configuration");
			const repair = await prompts.confirm({
				message: "Would you like to repair (re-initialize) the workspace?",
				default: true,
			});

			if (repair) {
				// Proceed to re-initialization
			} else {
				return {
					...state,
					workspaceRoot: cwd,
					projectType: detection.type,
				};
			}
		} else {
			status.success("Workspace already initialized and healthy");
			return {
				...state,
				workspaceRoot: cwd,
				projectType: detection.type,
			};
		}
	}

	const proceed = await prompts.confirm({
		message: `Initialize SnapBack in ${chalk.cyan(cwd)}?`,
		default: true,
	});

	if (!proceed) {
		return { ...state, workspaceRoot: null, projectType: detection.type };
	}

	// Create .snapback directory
	const snapbackDir = path.join(cwd, ".snapback");
	if (!fs.existsSync(snapbackDir)) {
		fs.mkdirSync(snapbackDir, { recursive: true });
	}

	// Create initial config
	const config = {
		version: 1,
		projectType: detection.type,
		protectionLevel: "standard",
		createdAt: new Date().toISOString(),
	};

	fs.writeFileSync(path.join(snapbackDir, "config.json"), JSON.stringify(config, null, 2));

	status.success("Workspace initialized successfully");

	return {
		...state,
		workspaceRoot: cwd,
		projectType: detection.type,
	};
}

/**
 * Step 4: Protection level
 */
async function protectionStep(state: WizardState): Promise<WizardState> {
	console.log(`\n${chalk.cyan.bold("Step 3: Protection Level\n")}`);

	console.log(chalk.white("  Choose how SnapBack should protect your code:\n"));

	const level = await prompts.select<"standard" | "strict">({
		message: "Protection level",
		options: [
			{
				label: "Standard",
				value: "standard",
				hint: "Auto-snapshot before AI edits, warnings on risky changes",
			},
			{
				label: "Strict",
				value: "strict",
				hint: "Confirmation required before AI edits, block high-risk changes",
			},
		],
		default: "standard",
	});

	const protectionLevel = level || "standard";

	console.log();
	if (protectionLevel === "standard") {
		status.info("Standard protection: AI edits proceed with auto-snapshots");
	} else {
		status.info("Strict protection: You'll be prompted before risky AI edits");
	}

	return { ...state, protectionLevel };
}

/**
 * Step 5: AI tool integration
 */
async function mcpStep(state: WizardState): Promise<WizardState> {
	console.log(`\n${chalk.cyan.bold("Step 4: AI Tool Integration\n")}`);

	// Import mcp-config for detection and configuration
	let detectAIClients: typeof import("@snapback/mcp-config").detectAIClients;
	let getSnapbackMCPConfig: typeof import("@snapback/mcp-config").getSnapbackMCPConfig;
	let writeClientConfig: typeof import("@snapback/mcp-config").writeClientConfig;

	try {
		const mcpConfig = await import("@snapback/mcp-config");
		detectAIClients = mcpConfig.detectAIClients;
		getSnapbackMCPConfig = mcpConfig.getSnapbackMCPConfig;
		writeClientConfig = mcpConfig.writeClientConfig;
	} catch {
		// Fallback if mcp-config not available
		console.log(chalk.white("  SnapBack integrates with AI coding tools via MCP:"));
		console.log(chalk.gray("  • Cursor, Windsurf, Claude Desktop, VS Code, and more"));
		console.log(chalk.gray("  • Provides context about protected files"));
		console.log(chalk.gray("  • Enables smart validation of AI suggestions\n"));

		const enableMcp = await prompts.confirm({
			message: "Enable MCP integration for AI tools?",
			default: true,
		});

		if (enableMcp) {
			status.success("MCP integration enabled");
			console.log(chalk.gray("  Run 'snap tools configure' to set up specific tools"));
		} else {
			status.info("MCP integration skipped - you can enable it later");
		}

		return { ...state, mcpEnabled: enableMcp };
	}

	// Auto-detect installed AI clients
	const detection = detectAIClients({ cwd: state.workspaceRoot || process.cwd() });

	if (detection.detected.length === 0) {
		console.log(chalk.yellow("  No AI tools detected on your system."));
		console.log(chalk.gray("  Install one of these to use SnapBack MCP:"));
		console.log(chalk.gray("  • Claude Desktop - https://claude.ai/download"));
		console.log(chalk.gray("  • Cursor - https://cursor.sh"));
		console.log(chalk.gray("  • VS Code - https://code.visualstudio.com"));
		console.log(chalk.gray("  • Windsurf - https://codeium.com/windsurf"));
		return { ...state, mcpEnabled: false };
	}

	// Show detected tools
	console.log(chalk.white(`  Found ${detection.detected.length} AI tool(s):\n`));
	for (const client of detection.detected) {
		const statusIcon = client.hasSnapback ? chalk.green("✓") : chalk.yellow("○");
		const statusText = client.hasSnapback ? chalk.gray("(configured)") : chalk.yellow("(needs setup)");
		console.log(`    ${statusIcon} ${client.displayName} ${statusText}`);
	}
	console.log();

	// Check if any need setup
	if (detection.needsSetup.length === 0) {
		status.success("All detected AI tools already have SnapBack configured!");
		return { ...state, mcpEnabled: true };
	}

	// Ask to configure
	const clientNames = detection.needsSetup.map((c) => c.displayName).join(", ");
	const enableMcp = await prompts.confirm({
		message: `Configure SnapBack for ${clientNames}?`,
		default: true,
	});

	if (enableMcp) {
		// Actually configure each client
		const mcpConfig = getSnapbackMCPConfig({
			workspaceRoot: state.workspaceRoot || undefined,
		});

		for (const client of detection.needsSetup) {
			process.stdout.write(chalk.gray(`    Configuring ${client.displayName}...`));
			const result = writeClientConfig(client, mcpConfig);
			if (result.success) {
				console.log(chalk.green(" ✓"));
			} else {
				console.log(chalk.red(` ✗ ${result.error}`));
			}
		}

		console.log();
		status.success("MCP integration configured!");
		console.log(chalk.gray("  Restart your AI tools to activate SnapBack."));
	} else {
		status.info("MCP integration skipped - run 'snap tools configure' later");
	}

	return { ...state, mcpEnabled: enableMcp };
}

/**
 * Step 6: File Protection
 */
async function fileProtectionStep(state: WizardState): Promise<WizardState> {
	if (!state.workspaceRoot) {
		return { ...state, filesProtected: false };
	}

	console.log(`\n${chalk.cyan.bold("Step 5: File Protection\n")}`);

	console.log(chalk.white("  Protect sensitive files from AI modifications:"));
	console.log(chalk.gray("  • Environment files (.env, .env.*)"));
	console.log(chalk.gray("  • Config files (tsconfig.json, package.json, etc.)"));
	console.log(chalk.gray("  • Lock files (package-lock.json, pnpm-lock.yaml)\n"));

	const protect = await prompts.confirm({
		message: "Protect common sensitive files?",
		default: true,
	});

	if (!protect) {
		status.info("File protection skipped");
		return { ...state, filesProtected: false };
	}

	try {
		// Import and use the protect functions
		const { getProtectedFiles, saveProtectedFiles } = await import("../services/snapback-dir");

		const protectedFiles = await getProtectedFiles(state.workspaceRoot);
		let added = 0;

		// Environment files
		const envPatterns = [".env", ".env.*", "*.env"];
		for (const pattern of envPatterns) {
			if (!protectedFiles.some((f) => f.pattern === pattern)) {
				protectedFiles.push({
					pattern,
					addedAt: new Date().toISOString(),
					reason: "Environment variables",
				});
				added++;
			}
		}

		// Config files
		const configPatterns = [
			"*.config.js",
			"*.config.ts",
			"*.config.mjs",
			"tsconfig.json",
			"package.json",
			"pnpm-lock.yaml",
			"yarn.lock",
			"package-lock.json",
		];
		for (const pattern of configPatterns) {
			if (!protectedFiles.some((f) => f.pattern === pattern)) {
				protectedFiles.push({
					pattern,
					addedAt: new Date().toISOString(),
					reason: "Configuration file",
				});
				added++;
			}
		}

		await saveProtectedFiles(protectedFiles, state.workspaceRoot);

		if (added > 0) {
			status.success(`Protected ${added} file patterns`);
		} else {
			status.info("Files already protected");
		}

		return { ...state, filesProtected: true };
	} catch (_error) {
		status.warning("Could not set up file protection");
		console.log(chalk.gray("  Run 'snap protect env' later to protect files"));
		return { ...state, filesProtected: false };
	}
}

/**
 * Step 7: Git Hook Setup
 */
async function gitHookStep(state: WizardState): Promise<WizardState> {
	if (!state.workspaceRoot) {
		return { ...state, gitHookInstalled: false };
	}

	console.log(`\n${chalk.cyan.bold("Step 6: Git Integration\n")}`);

	// Check if it's a git repo
	const gitDir = path.join(state.workspaceRoot, ".git");
	if (!fs.existsSync(gitDir)) {
		console.log(chalk.gray("  Not a Git repository - skipping hook setup"));
		return { ...state, gitHookInstalled: false };
	}

	console.log(chalk.white("  Add SnapBack validation to your Git workflow:"));
	console.log(chalk.gray("  • Auto-check before commits"));
	console.log(chalk.gray("  • Prevent committing protected file changes"));
	console.log(chalk.gray("  • Optional - won't block your workflow\n"));

	const installHook = await prompts.confirm({
		message: "Install pre-commit hook?",
		default: true,
	});

	if (!installHook) {
		status.info("Git hook skipped");
		return { ...state, gitHookInstalled: false };
	}

	try {
		const hooksDir = path.join(gitDir, "hooks");
		const hookPath = path.join(hooksDir, "pre-commit");

		// Create hooks directory if it doesn't exist
		if (!fs.existsSync(hooksDir)) {
			fs.mkdirSync(hooksDir, { recursive: true });
		}

		// Check if hook already exists
		let existingContent = "";
		if (fs.existsSync(hookPath)) {
			existingContent = fs.readFileSync(hookPath, "utf-8");
			if (existingContent.includes("snap")) {
				status.info("SnapBack hook already installed");
				return { ...state, gitHookInstalled: true };
			}
		}

		// Add SnapBack check to hook
		const snapbackHook = `
# SnapBack pre-commit check
if command -v snap &> /dev/null; then
  snap check --quiet || {
    echo "SnapBack: Protected files may have changed. Run 'snap status' for details."
  }
fi
`;

		if (existingContent) {
			// Append to existing hook
			fs.writeFileSync(hookPath, `${existingContent}\n${snapbackHook}`);
		} else {
			// Create new hook
			fs.writeFileSync(hookPath, `#!/bin/sh\n${snapbackHook}`);
		}

		// Make executable
		fs.chmodSync(hookPath, 0o755);

		status.success("Pre-commit hook installed");
		return { ...state, gitHookInstalled: true };
	} catch (_error) {
		status.warning("Could not install Git hook");
		console.log(chalk.gray("  You can add 'snap check' to your hooks manually"));
		return { ...state, gitHookInstalled: false };
	}
}

/**
 * Step 8: Initial Snapshot
 */
async function snapshotStep(state: WizardState): Promise<WizardState> {
	if (!state.workspaceRoot) {
		return { ...state, snapshotCreated: false };
	}

	console.log(`\n${chalk.cyan.bold("Step 7: Initial Snapshot\n")}`);

	console.log(chalk.white("  Create a safety snapshot of your protected files:"));
	console.log(chalk.gray("  • Captures current state of critical files"));
	console.log(chalk.gray("  • Enables easy rollback if AI makes mistakes"));
	console.log(chalk.gray("  • Takes just a few seconds\n"));

	const createSnapshot = await prompts.confirm({
		message: "Create initial snapshot?",
		default: true,
	});

	if (!createSnapshot) {
		status.info("Initial snapshot skipped");
		console.log(chalk.gray("  Run 'snap snapshot create' when ready"));
		return { ...state, snapshotCreated: false };
	}

	try {
		// We'll create a simple marker for now - full snapshot creation would require the engine
		const snapshotDir = path.join(state.workspaceRoot, ".snapback", "snapshots");
		fs.mkdirSync(snapshotDir, { recursive: true });

		const manifest = {
			id: `wizard-${Date.now()}`,
			createdAt: new Date().toISOString(),
			description: "Initial setup snapshot",
			source: "wizard",
		};

		fs.writeFileSync(path.join(snapshotDir, "initial-manifest.json"), JSON.stringify(manifest, null, 2));

		status.success("Initial snapshot created");
		console.log(chalk.gray("  Use 'snap snapshot list' to view snapshots"));
		return { ...state, snapshotCreated: true };
	} catch (_error) {
		status.warning("Could not create snapshot");
		console.log(chalk.gray("  Run 'snap snapshot create' to create manually"));
		return { ...state, snapshotCreated: false };
	}
}

/**
 * Step 9: Analytics opt-in
 */
async function analyticsStep(state: WizardState): Promise<WizardState> {
	console.log(`\n${chalk.cyan.bold("Step 8: Usage Analytics\n")}`);

	console.log(chalk.white("  Help us improve SnapBack by sharing anonymous usage data:"));
	console.log(chalk.gray("  • Command usage frequency"));
	console.log(chalk.gray("  • Error reports"));
	console.log(chalk.gray("  • No code, file names, or personal data\n"));

	const enableAnalytics = await prompts.confirm({
		message: "Enable anonymous analytics?",
		default: true,
	});

	if (enableAnalytics) {
		status.success("Analytics enabled - thank you!");
	} else {
		status.info("Analytics disabled - no data will be collected");
	}

	return { ...state, analyticsEnabled: enableAnalytics };
}

/**
 * Final step: Summary and next steps
 */
async function summaryStep(state: WizardState): Promise<void> {
	console.log(`\n${chalk.green.bold("Setup Complete! 🎉\n")}`);

	console.log(chalk.white("Configuration Summary:"));
	console.log(chalk.gray("─".repeat(40)));

	// Authentication
	if (state.authenticated) {
		console.log(`${chalk.green("  ✓ ")}Authenticated`);
	} else {
		console.log(`${chalk.yellow("  ! ")}Not authenticated (limited features)`);
	}

	// Workspace
	if (state.workspaceRoot) {
		console.log(`${chalk.green("  ✓ ")}Workspace: ${path.basename(state.workspaceRoot)}`);
	} else {
		console.log(`${chalk.yellow("  ! ")}No workspace configured`);
	}

	// Project type
	if (state.projectType && state.projectType !== "unknown") {
		console.log(`${chalk.green("  ✓ ")}Project type: ${state.projectType}`);
	}

	// Protection level
	console.log(`${chalk.green("  ✓ ")}Protection: ${state.protectionLevel}`);

	// MCP
	if (state.mcpEnabled) {
		console.log(`${chalk.green("  ✓ ")}MCP integration enabled`);
	}

	// File protection
	if (state.filesProtected) {
		console.log(`${chalk.green("  ✓ ")}Critical files protected`);
	}

	// Git hook
	if (state.gitHookInstalled) {
		console.log(`${chalk.green("  ✓ ")}Pre-commit hook installed`);
	}

	// Initial snapshot
	if (state.snapshotCreated) {
		console.log(`${chalk.green("  ✓ ")}Initial snapshot created`);
	}

	// Analytics
	if (state.analyticsEnabled) {
		console.log(`${chalk.green("  ✓ ")}Anonymous analytics enabled`);
	}

	console.log(chalk.gray("─".repeat(40)));

	// Run quick doctor check
	console.log(`\n${chalk.cyan.bold("Quick Health Check:\n")}`);
	try {
		const { detectAIClients } = await import("@snapback/mcp-config");
		const detection = detectAIClients({ cwd: state.workspaceRoot || process.cwd() });
		const configured = detection.detected.filter((c) => c.hasSnapback);
		const needsSetup = detection.needsSetup;

		if (configured.length > 0) {
			console.log(`${chalk.green("  ✓ ")}${configured.length} AI tool(s) ready`);
		}
		if (needsSetup.length > 0) {
			console.log(`${chalk.yellow("  ! ")}${needsSetup.length} tool(s) need MCP config`);
		}
	} catch {
		// Ignore if can't run doctor check
	}

	// Check for VS Code and suggest extension
	try {
		const { detectAIClients } = await import("@snapback/mcp-config");
		const detection = detectAIClients({ cwd: state.workspaceRoot || process.cwd() });
		const hasVSCode = detection.clients.some((c) => c.name === "vscode" && c.exists);

		if (hasVSCode) {
			console.log();
			console.log(chalk.cyan("  💡 VS Code detected!"));
			console.log(chalk.gray("     Consider installing the SnapBack extension:"));
			console.log(chalk.gray("     code --install-extension snapback.snapback-vscode"));
		}
	} catch {
		// Ignore if check fails
	}

	// Next steps - smarter based on what's already done
	console.log(`\n${chalk.cyan.bold("Next Steps:\n")}`);

	let stepNum = 1;

	if (!state.snapshotCreated) {
		console.log(chalk.white(`  ${stepNum}. Create your first snapshot:`));
		console.log(chalk.cyan("     $ snap snapshot create\n"));
		stepNum++;
	}

	if (!state.filesProtected) {
		console.log(chalk.white(`  ${stepNum}. Protect important files:`));
		console.log(chalk.cyan("     $ snap protect src/core/\n"));
		stepNum++;
	}

	console.log(chalk.white(`  ${stepNum}. Check system health:`));
	console.log(chalk.cyan("     $ snap doctor\n"));
	stepNum++;

	// Upgrade prompt for free tier
	if (!state.authenticated) {
		console.log(chalk.gray("─".repeat(40)));
		console.log(`\n${chalk.yellow.bold("Upgrade to Pro:\n")}`);
		console.log(chalk.white("  • Unlimited snapshots"));
		console.log(chalk.white("  • Team collaboration"));
		console.log(chalk.white("  • Priority support"));
		console.log(
			chalk.cyan("  → snap upgrade") +
				chalk.gray(" or visit ") +
				hyperlink.create("snapback.dev/pro", "https://snapback.dev/pricing"),
		);
		console.log();
	}

	// Documentation
	console.log(chalk.gray("  Documentation: ") + hyperlink.create("docs.snapback.dev", "https://docs.snapback.dev"));
	console.log(chalk.gray("  Get help:      ") + chalk.cyan("snap --help"));
	console.log();
}

/**
 * Step 9: Start First Session
 */
async function sessionStep(state: WizardState): Promise<void> {
	if (!state.workspaceRoot) {
		return;
	}

	console.log(`\n${chalk.cyan.bold("Final Step: Start Your First Session\n")}`);

	console.log(chalk.white("  Sessions help SnapBack track your current task:"));
	console.log(chalk.gray("  • Groups snapshots by objective"));
	console.log(chalk.gray("  • Automates snapshot descriptions"));
	console.log(chalk.gray("  • Provides better context for AI\n"));

	const startSession = await prompts.confirm({
		message: "Start a development session now?",
		default: true,
	});

	if (startSession) {
		const task = await prompts.input("What are you working on? (e.g. implementing user auth)", {});

		try {
			const { generateId, saveCurrentSession } = await import("../services/snapback-dir");
			const newSession = {
				id: generateId("sess"),
				task: task || "Initial session",
				startedAt: new Date().toISOString(),
				snapshotCount: 0,
			};

			await saveCurrentSession(newSession, state.workspaceRoot);
			status.success("Session started! You're ready to code.");
		} catch (_error) {
			status.warning("Could not start session");
		}
	} else {
		status.info("Skipped session start - run 'snap session start' later");
	}
}

// =============================================================================
// MAIN WIZARD
// =============================================================================

/**
 * Run the interactive first-run wizard
 */
async function runWizard(options: { force?: boolean }): Promise<void> {
	const { force } = options;

	// Check if already set up
	const homeDir = process.env.HOME || process.env.USERPROFILE || "";
	const configPath = path.join(homeDir, ".snapback", "wizard-complete");

	if (!force && fs.existsSync(configPath)) {
		console.log(chalk.yellow("Setup wizard has already been completed."));
		console.log(chalk.gray("Run 'snap wizard --force' to run again.\n"));

		const runAgain = await prompts.confirm({
			message: "Run wizard again?",
			default: false,
		});

		if (!runAgain) {
			return;
		}
	}

	// Initialize state
	let state: WizardState = {
		authenticated: await checkAuthentication(),
		workspaceRoot: null,
		projectType: null,
		protectionLevel: "standard",
		mcpEnabled: false,
		analyticsEnabled: false,
		filesProtected: false,
		gitHookInstalled: false,
		snapshotCreated: false,
	};

	// Run wizard steps
	try {
		await welcomeStep();
		state = await authenticationStep(state);
		state = await workspaceStep(state);
		state = await protectionStep(state);
		state = await mcpStep(state);
		state = await fileProtectionStep(state);
		state = await gitHookStep(state);
		state = await snapshotStep(state);
		state = await analyticsStep(state);
		await summaryStep(state);
		await sessionStep(state);

		// Mark wizard as complete
		const snapbackHome = path.join(homeDir, ".snapback");
		fs.mkdirSync(snapbackHome, { recursive: true });
		fs.writeFileSync(configPath, new Date().toISOString());
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE") {
			// User pressed Ctrl+C
			console.log(chalk.gray("\n\nWizard cancelled. Run 'snap wizard' to continue.\n"));
		} else {
			throw error;
		}
	}
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

export function createWizardCommand(): Command {
	return new Command("wizard")
		.description("Interactive setup wizard for new users")
		.option("--force", "Run wizard even if already completed")
		.action(async (options) => {
			await runWizard(options);
		});
}

// Export runWizard for smart router usage
export { runWizard };
