/**
 * CLI-UX-002: Git Integration
 *
 * Provides git operations for staged files detection, content retrieval,
 * and diff display. Fixes the `check` command to analyze staged files only.
 *
 * @see ../resources/cli_ux_implementation/02-execa-git-client.md
 */

// TODO: Add dependency - pnpm add execa@^9.5.2

import { execa } from "execa";

// =============================================================================
// TYPES
// =============================================================================
// TODO: Copy from 02-execa-git-client.md lines 71-90

export interface GitClientOptions {
	cwd?: string;
	timeout?: number;
}

export interface StagedFile {
	path: string;
	status: "added" | "modified" | "deleted" | "renamed" | "copied";
	oldPath?: string;
}

export interface DiffHunk {
	header: string;
	additions: number;
	deletions: number;
	content: string;
}

// =============================================================================
// CUSTOM ERRORS
// =============================================================================
// TODO: Copy from 02-execa-git-client.md lines 268-285

export class GitNotInstalledError extends Error {
	constructor() {
		super("Git is not installed or not accessible in PATH");
		this.name = "GitNotInstalledError";
	}
}

export class GitNotRepositoryError extends Error {
	constructor(path: string) {
		super(`Not a git repository: ${path}`);
		this.name = "GitNotRepositoryError";
	}
}

export class GitBinaryFileError extends Error {
	constructor(path: string) {
		super(`Cannot read binary file: ${path}`);
		this.name = "GitBinaryFileError";
	}
}

// =============================================================================
// GIT CLIENT CLASS
// =============================================================================
// TODO: Copy GitClient class from 02-execa-git-client.md lines 92-270

export class GitClient {
	private cwd: string;
	private timeout: number;

	constructor(options: GitClientOptions = {}) {
		this.cwd = options.cwd || process.cwd();
		this.timeout = options.timeout || 10000;
	}

	/**
	 * Check if git is installed
	 * @see 02-execa-git-client.md lines 102-110
	 */
	async isGitInstalled(): Promise<boolean> {
		// TODO: Copy implementation from spec lines 102-110
		try {
			await execa("git", ["--version"], { timeout: 5000 });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if cwd is inside a git repository
	 * @see 02-execa-git-client.md lines 115-125
	 */
	async isGitRepository(): Promise<boolean> {
		// TODO: Copy implementation from spec lines 115-125
		try {
			await execa("git", ["rev-parse", "--is-inside-work-tree"], {
				cwd: this.cwd,
				timeout: this.timeout,
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get repository root path
	 * @see 02-execa-git-client.md lines 130-137
	 */
	async getRepositoryRoot(): Promise<string> {
		// TODO: Copy implementation from spec lines 130-137
		const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	/**
	 * Get list of staged files with their status
	 * @see 02-execa-git-client.md lines 142-170
	 */
	async getStagedFiles(): Promise<StagedFile[]> {
		// TODO: Copy implementation from spec lines 142-170
		try {
			const { stdout } = await execa("git", ["diff", "--cached", "--name-status"], {
				cwd: this.cwd,
				timeout: this.timeout,
			});

			if (!stdout.trim()) {
				return [];
			}

			return stdout
				.split("\n")
				.filter(Boolean)
				.map((line) => this.parseStatusLine(line));
		} catch (error) {
			if (this.isNotRepositoryError(error)) {
				throw new GitNotRepositoryError(this.cwd);
			}
			throw error;
		}
	}

	/**
	 * Get staged file content (what will be committed)
	 * @see 02-execa-git-client.md lines 175-188
	 */
	async getStagedContent(filePath: string): Promise<string> {
		// TODO: Copy implementation from spec lines 175-188
		try {
			const { stdout } = await execa("git", ["show", `:${filePath}`], {
				cwd: this.cwd,
				timeout: this.timeout,
			});
			return stdout;
		} catch (error) {
			if (this.isBinaryFileError(error)) {
				throw new GitBinaryFileError(filePath);
			}
			throw error;
		}
	}

	/**
	 * Get diff of staged changes for a file
	 * @see 02-execa-git-client.md lines 193-205
	 */
	async getStagedDiff(filePath?: string): Promise<string> {
		// TODO: Copy implementation from spec lines 193-205
		const args = ["diff", "--cached", "--color=always"];
		if (filePath) {
			args.push("--", filePath);
		}

		const { stdout } = await execa("git", args, {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout;
	}

	/**
	 * Get diff statistics
	 * @see 02-execa-git-client.md lines 210-230
	 */
	async getStagedStats(): Promise<{ additions: number; deletions: number; files: number }> {
		// TODO: Copy implementation from spec lines 210-230
		const { stdout } = await execa("git", ["diff", "--cached", "--numstat"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});

		let additions = 0;
		let deletions = 0;
		let files = 0;

		for (const line of stdout.split("\n").filter(Boolean)) {
			const [add, del] = line.split("\t");
			if (add !== "-") additions += Number.parseInt(add, 10);
			if (del !== "-") deletions += Number.parseInt(del, 10);
			files++;
		}

		return { additions, deletions, files };
	}

	/**
	 * Get current branch name
	 * @see 02-execa-git-client.md lines 235-242
	 */
	async getCurrentBranch(): Promise<string> {
		// TODO: Copy implementation from spec lines 235-242
		const { stdout } = await execa("git", ["branch", "--show-current"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	/**
	 * Get short commit hash of HEAD
	 * @see 02-execa-git-client.md lines 247-254
	 */
	async getHeadCommit(): Promise<string> {
		// TODO: Copy implementation from spec lines 247-254
		const { stdout } = await execa("git", ["rev-parse", "--short", "HEAD"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	// ===========================================================================
	// PRIVATE HELPERS
	// ===========================================================================
	// TODO: Copy from 02-execa-git-client.md lines 258-280

	private parseStatusLine(line: string): StagedFile {
		// TODO: Copy from spec lines 258-266
		const [status, ...pathParts] = line.split("\t");
		const path = pathParts[pathParts.length - 1];
		const oldPath = pathParts.length > 1 ? pathParts[0] : undefined;

		return {
			path,
			status: this.parseStatus(status),
			...(oldPath && { oldPath }),
		};
	}

	private parseStatus(status: string): StagedFile["status"] {
		// TODO: Copy from spec lines 268-278
		const char = status.charAt(0);
		switch (char) {
			case "A":
				return "added";
			case "M":
				return "modified";
			case "D":
				return "deleted";
			case "R":
				return "renamed";
			case "C":
				return "copied";
			default:
				return "modified";
		}
	}

	private isNotRepositoryError(error: unknown): boolean {
		return error instanceof Error && error.message.toLowerCase().includes("not a git repository");
	}

	private isBinaryFileError(error: unknown): boolean {
		return error instanceof Error && error.message.toLowerCase().includes("binary");
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// TODO: Copy from 02-execa-git-client.md lines 290-315

/**
 * Check if a file is a code file worth analyzing
 * @see 02-execa-git-client.md lines 293-305
 */
export function isCodeFile(filePath: string): boolean {
	// TODO: Copy implementation from spec lines 293-305
	const codeExtensions = [
		".ts",
		".tsx",
		".js",
		".jsx",
		".mjs",
		".cjs",
		".py",
		".java",
		".go",
		".rs",
		".rb",
		".php",
		".c",
		".cpp",
		".h",
		".hpp",
		".cs",
		".swift",
		".kt",
		".scala",
		".clj",
		".ex",
		".exs",
	];

	return codeExtensions.some((ext) => filePath.endsWith(ext));
}

/**
 * Create GitClient with validation
 * @see 02-execa-git-client.md lines 310-323
 */
export async function createValidatedGitClient(options?: GitClientOptions): Promise<GitClient> {
	// TODO: Copy implementation from spec lines 310-323
	const client = new GitClient(options);

	if (!(await client.isGitInstalled())) {
		throw new GitNotInstalledError();
	}

	if (!(await client.isGitRepository())) {
		throw new GitNotRepositoryError(options?.cwd || process.cwd());
	}

	return client;
}
