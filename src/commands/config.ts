/**
 * Config Command
 *
 * Implements snap config get/set/path - Configuration management.
 * Manages both global (~/.snapback/) and local (.snapback/) config.
 *
 * @see cli_ui_imp.md Phase 5
 */

import chalk from "chalk";
import { Command } from "commander";

import {
	type GlobalConfig,
	getGlobalConfig,
	getGlobalDir,
	getWorkspaceConfig,
	getWorkspaceDir,
	isSnapbackInitialized,
	saveGlobalConfig,
	saveWorkspaceConfig,
	type WorkspaceConfig,
} from "../services/snapback-dir";

// =============================================================================
// TYPES
// =============================================================================

/**
 * All configurable keys
 */
type GlobalConfigKey = keyof GlobalConfig;
type WorkspaceConfigKey = keyof WorkspaceConfig;

/**
 * Config scope
 */
type ConfigScope = "global" | "local";

// =============================================================================
// CONFIG SCHEMA
// =============================================================================

interface ConfigSchema {
	key: string;
	scope: ConfigScope[];
	type: "string" | "boolean" | "number";
	description: string;
	default?: string | boolean | number;
}

const CONFIG_SCHEMA: ConfigSchema[] = [
	// Global config
	{
		key: "apiUrl",
		scope: ["global"],
		type: "string",
		description: "SnapBack API URL",
		default: "https://api.snapback.dev",
	},
	{
		key: "defaultWorkspace",
		scope: ["global"],
		type: "string",
		description: "Default workspace path",
	},
	{
		key: "analytics",
		scope: ["global"],
		type: "boolean",
		description: "Enable anonymous usage analytics",
		default: true,
	},

	// Workspace config
	{
		key: "protectionLevel",
		scope: ["local"],
		type: "string",
		description: "Protection level (standard | strict)",
		default: "standard",
	},
	{
		key: "syncEnabled",
		scope: ["local"],
		type: "boolean",
		description: "Enable cloud sync",
		default: true,
	},
	{
		key: "tier",
		scope: ["local"],
		type: "string",
		description: "User tier (free | pro)",
		default: "free",
	},
];

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the config command
 */
export function createConfigCommand(): Command {
	const config = new Command("config").description("Manage SnapBack configuration");

	// List all config
	config
		.command("list")
		.description("List all configuration values")
		.option("--global", "Show only global config")
		.option("--local", "Show only local/workspace config")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			try {
				await listConfig(options);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Get a config value
	config
		.command("get <key>")
		.description("Get a configuration value")
		.option("--global", "Get from global config")
		.option("--local", "Get from local/workspace config")
		.action(async (key: string, options) => {
			try {
				await getConfigValue(key, options);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Set a config value
	config
		.command("set <key> <value>")
		.description("Set a configuration value")
		.option("--global", "Set in global config")
		.option("--local", "Set in local/workspace config")
		.action(async (key: string, value: string, options) => {
			try {
				await setConfigValue(key, value, options);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Unset a config value
	config
		.command("unset <key>")
		.description("Remove a configuration value")
		.option("--global", "Unset from global config")
		.option("--local", "Unset from local/workspace config")
		.action(async (key: string, options) => {
			try {
				await unsetConfigValue(key, options);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	// Show config file paths
	config
		.command("path")
		.description("Show configuration file paths")
		.action(async () => {
			await showConfigPaths();
		});

	// Show available config keys
	config
		.command("keys")
		.description("List all available configuration keys")
		.action(() => {
			showConfigKeys();
		});

	return config;
}

// =============================================================================
// IMPLEMENTATIONS
// =============================================================================

/**
 * List all configuration values
 */
async function listConfig(options: { global?: boolean; local?: boolean; json?: boolean }): Promise<void> {
	const cwd = process.cwd();
	const result: Record<string, unknown> = {};

	// Get global config
	if (!options.local) {
		const globalConfig = await getGlobalConfig();
		if (options.json) {
			result.global = globalConfig || {};
		} else {
			console.log(chalk.cyan.bold("Global Configuration"));
			console.log(chalk.gray(`Path: ${getGlobalDir()}/config.json`));
			console.log();

			if (globalConfig) {
				for (const [key, value] of Object.entries(globalConfig)) {
					console.log(`  ${chalk.cyan(key)}: ${formatValue(value)}`);
				}
			} else {
				console.log(chalk.gray("  (no global config set)"));
			}
			console.log();
		}
	}

	// Get local config
	if (!options.global) {
		const hasWorkspace = await isSnapbackInitialized(cwd);

		if (hasWorkspace) {
			const workspaceConfig = await getWorkspaceConfig(cwd);
			if (options.json) {
				result.local = workspaceConfig || {};
			} else {
				console.log(chalk.cyan.bold("Workspace Configuration"));
				console.log(chalk.gray(`Path: ${getWorkspaceDir(cwd)}/config.json`));
				console.log();

				if (workspaceConfig) {
					for (const [key, value] of Object.entries(workspaceConfig)) {
						console.log(`  ${chalk.cyan(key)}: ${formatValue(value)}`);
					}
				} else {
					console.log(chalk.gray("  (no workspace config set)"));
				}
			}
		} else if (!options.json) {
			console.log(chalk.yellow("Not in a SnapBack workspace"));
			console.log(chalk.gray("Run: snap init"));
		}
	}

	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
	}
}

/**
 * Get a configuration value
 */
async function getConfigValue(key: string, options: { global?: boolean; local?: boolean }): Promise<void> {
	const cwd = process.cwd();
	const schema = CONFIG_SCHEMA.find((s) => s.key === key);

	if (!schema) {
		console.log(chalk.yellow(`Unknown config key: ${key}`));
		console.log(chalk.gray("Run 'snap config keys' to see available keys"));
		return;
	}

	// Determine scope
	const scope = determineScope(options, schema);

	let value: unknown;

	if (scope === "global") {
		const config = await getGlobalConfig();
		value = config?.[key as GlobalConfigKey];
	} else {
		if (!(await isSnapbackInitialized(cwd))) {
			console.log(chalk.yellow("Not in a SnapBack workspace"));
			return;
		}
		const config = await getWorkspaceConfig(cwd);
		value = config?.[key as WorkspaceConfigKey];
	}

	if (value === undefined) {
		if (schema.default !== undefined) {
			console.log(formatValue(schema.default), chalk.gray("(default)"));
		} else {
			console.log(chalk.gray("(not set)"));
		}
	} else {
		console.log(formatValue(value));
	}
}

/**
 * Set a configuration value
 */
async function setConfigValue(
	key: string,
	value: string,
	options: { global?: boolean; local?: boolean },
): Promise<void> {
	const cwd = process.cwd();
	const schema = CONFIG_SCHEMA.find((s) => s.key === key);

	if (!schema) {
		console.log(chalk.yellow(`Unknown config key: ${key}`));
		console.log(chalk.gray("Run 'snap config keys' to see available keys"));
		return;
	}

	// Determine scope
	const scope = determineScope(options, schema);

	// Parse value based on type
	const parsedValue = parseValue(value, schema.type);

	if (scope === "global") {
		const config = (await getGlobalConfig()) || {};
		(config as Record<string, unknown>)[key] = parsedValue;
		await saveGlobalConfig(config);
		console.log(chalk.green("✓"), `Set ${chalk.cyan(key)} = ${formatValue(parsedValue)} (global)`);
	} else {
		if (!(await isSnapbackInitialized(cwd))) {
			console.log(chalk.yellow("Not in a SnapBack workspace"));
			console.log(chalk.gray("Run: snap init"));
			return;
		}

		const config = (await getWorkspaceConfig(cwd)) || {
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		(config as unknown as Record<string, unknown>)[key] = parsedValue;
		config.updatedAt = new Date().toISOString();
		await saveWorkspaceConfig(config, cwd);
		console.log(chalk.green("✓"), `Set ${chalk.cyan(key)} = ${formatValue(parsedValue)} (workspace)`);
	}
}

/**
 * Unset a configuration value
 */
async function unsetConfigValue(key: string, options: { global?: boolean; local?: boolean }): Promise<void> {
	const cwd = process.cwd();
	const schema = CONFIG_SCHEMA.find((s) => s.key === key);

	if (!schema) {
		console.log(chalk.yellow(`Unknown config key: ${key}`));
		return;
	}

	const scope = determineScope(options, schema);

	if (scope === "global") {
		const config = await getGlobalConfig();
		if (config && key in config) {
			delete (config as Record<string, unknown>)[key];
			await saveGlobalConfig(config);
			console.log(chalk.green("✓"), `Unset ${chalk.cyan(key)} (global)`);
		} else {
			console.log(chalk.gray(`${key} was not set`));
		}
	} else {
		if (!(await isSnapbackInitialized(cwd))) {
			console.log(chalk.yellow("Not in a SnapBack workspace"));
			return;
		}

		const config = await getWorkspaceConfig(cwd);
		if (config && key in config) {
			delete (config as unknown as Record<string, unknown>)[key];
			config.updatedAt = new Date().toISOString();
			await saveWorkspaceConfig(config, cwd);
			console.log(chalk.green("✓"), `Unset ${chalk.cyan(key)} (workspace)`);
		} else {
			console.log(chalk.gray(`${key} was not set`));
		}
	}
}

/**
 * Show configuration file paths
 */
async function showConfigPaths(): Promise<void> {
	const cwd = process.cwd();

	console.log(chalk.cyan.bold("Configuration Paths"));
	console.log();

	console.log(chalk.bold("Global:"));
	console.log(`  ${chalk.cyan("Directory:")}  ${getGlobalDir()}`);
	console.log(`  ${chalk.cyan("Config:")}     ${getGlobalDir()}/config.json`);
	console.log(`  ${chalk.cyan("Credentials:")} ${getGlobalDir()}/credentials.json`);
	console.log();

	console.log(chalk.bold("Workspace:"));
	if (await isSnapbackInitialized(cwd)) {
		console.log(`  ${chalk.cyan("Directory:")}  ${getWorkspaceDir(cwd)}`);
		console.log(`  ${chalk.cyan("Config:")}     ${getWorkspaceDir(cwd)}/config.json`);
		console.log(`  ${chalk.cyan("Vitals:")}     ${getWorkspaceDir(cwd)}/vitals.json`);
		console.log(`  ${chalk.cyan("Protected:")}  ${getWorkspaceDir(cwd)}/protected.json`);
	} else {
		console.log(chalk.gray("  Not in a SnapBack workspace"));
	}
}

/**
 * Show available config keys
 */
function showConfigKeys(): void {
	console.log(chalk.cyan.bold("Available Configuration Keys"));
	console.log();

	console.log(chalk.bold("Global (--global):"));
	for (const schema of CONFIG_SCHEMA.filter((s) => s.scope.includes("global"))) {
		console.log(`  ${chalk.cyan(schema.key.padEnd(20))} ${chalk.gray(schema.description)}`);
		if (schema.default !== undefined) {
			console.log(`  ${"".padEnd(20)} ${chalk.gray(`Default: ${schema.default}`)}`);
		}
	}
	console.log();

	console.log(chalk.bold("Workspace (--local):"));
	for (const schema of CONFIG_SCHEMA.filter((s) => s.scope.includes("local"))) {
		console.log(`  ${chalk.cyan(schema.key.padEnd(20))} ${chalk.gray(schema.description)}`);
		if (schema.default !== undefined) {
			console.log(`  ${"".padEnd(20)} ${chalk.gray(`Default: ${schema.default}`)}`);
		}
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Determine config scope from options
 */
function determineScope(options: { global?: boolean; local?: boolean }, schema: ConfigSchema): ConfigScope {
	if (options.global) {
		return "global";
	}
	if (options.local) {
		return "local";
	}

	// Use schema default
	return schema.scope[0];
}

/**
 * Parse value based on type
 */
function parseValue(value: string, type: ConfigSchema["type"]): string | boolean | number {
	switch (type) {
		case "boolean":
			return value === "true" || value === "1" || value === "yes";
		case "number":
			return Number(value);
		default:
			return value;
	}
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? chalk.green("true") : chalk.red("false");
	}
	if (typeof value === "string") {
		return chalk.yellow(`"${value}"`);
	}
	return String(value);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { CONFIG_SCHEMA, type ConfigSchema, type ConfigScope };
