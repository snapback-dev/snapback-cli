/**
 * Completion Command
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 * Standard feature expected by senior developers.
 *
 * @example
 * ```bash
 * # Bash - add to ~/.bashrc
 * source <(snap completion bash)
 *
 * # Zsh - add to ~/.zshrc
 * source <(snap completion zsh)
 *
 * # Fish
 * snap completion fish > ~/.config/fish/completions/snap.fish
 * ```
 *
 * @module commands/completion
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { Command } from "commander";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Load completion script from resources
 */
async function loadCompletionScript(shell: string): Promise<string | null> {
	const resourcesDir = join(__dirname, "../../resources/completions");
	const filename = `snap.${shell}`;

	try {
		return await readFile(join(resourcesDir, filename), "utf-8");
	} catch {
		return null;
	}
}

/**
 * Create the completion command
 */
export function createCompletionCommand(): Command {
	return new Command("completion")
		.description("Generate shell completion scripts")
		.argument("<shell>", "Shell type: bash, zsh, or fish")
		.addHelpText(
			"after",
			`
Examples:
  ${chalk.gray("# Bash (add to ~/.bashrc)")}
  ${chalk.cyan("source <(snap completion bash)")}

  ${chalk.gray("# Zsh (add to ~/.zshrc)")}
  ${chalk.cyan("source <(snap completion zsh)")}

  ${chalk.gray("# Fish")}
  ${chalk.cyan("snap completion fish > ~/.config/fish/completions/snap.fish")}
`,
		)
		.action(async (shell: string) => {
			const shellLower = shell.toLowerCase();
			const validShells = ["bash", "zsh", "fish"];

			if (!validShells.includes(shellLower)) {
				console.error(chalk.red(`Unknown shell: ${shell}`));
				console.error(chalk.gray(`Supported shells: ${validShells.join(", ")}`));
				process.exit(1);
			}

			const script = await loadCompletionScript(shellLower);

			if (!script) {
				console.error(chalk.red(`Completion script not found for ${shell}`));
				process.exit(1);
			}

			console.log(script);
		});
}
