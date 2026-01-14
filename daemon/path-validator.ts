/**
 * SnapBack Path Validator
 *
 * Comprehensive path validation to prevent path traversal attacks.
 * Based on the more restrictive VS Code PathValidator implementation.
 *
 * Security features:
 * - Path traversal detection (../)
 * - Windows UNC path detection
 * - Windows alternate data streams detection
 * - URL-encoded traversal detection
 * - Null byte injection detection
 * - Symlink validation (optional)
 * - Separator-aware boundary checking
 *
 * @module daemon/path-validator
 */

import { lstat } from "node:fs/promises";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { MAX_PATH_LENGTH } from "./constants.js";
import { PathTraversalError, ValidationError } from "./errors.js";

// =============================================================================
// VALIDATION OPTIONS
// =============================================================================

export interface PathValidationOptions {
	/** Whether to allow absolute paths (default: false) */
	allowAbsolute?: boolean;
	/** Whether to check for symlinks (default: false, can be slow) */
	checkSymlinks?: boolean;
	/** Maximum allowed path length (default: MAX_PATH_LENGTH) */
	maxLength?: number;
	/** Custom base directory for relative path resolution */
	baseDir?: string;
}

// =============================================================================
// DANGEROUS PATTERNS
// =============================================================================

/**
 * Patterns that indicate path traversal attempts
 */
const TRAVERSAL_PATTERNS = [
	// Direct traversal
	/\.\./,
	// URL-encoded traversal
	/%2e%2e/i,
	/%252e%252e/i,
	// Unicode traversal
	/\u002e\u002e/,
	// Backslash variants (Windows)
	/\.\.[\\/]/,
	/[\\/]\.\./,
];

/**
 * Windows-specific dangerous patterns
 */
const WINDOWS_DANGEROUS_PATTERNS = [
	// UNC paths
	/^\\\\[^\\]+\\/,
	/^\/\/[^/]+\//,
	// Alternate data streams
	/:/g,
	// Device paths
	/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i,
];

/**
 * Characters that should never appear in paths
 */
const DANGEROUS_CHARS = [
	"\0", // Null byte
	"\x00", // Null byte (hex)
	"\n", // Newline (could break log parsing)
	"\r", // Carriage return
];

// =============================================================================
// PATH VALIDATOR CLASS
// =============================================================================

export class PathValidator {
	private readonly options: Required<PathValidationOptions>;

	constructor(options: PathValidationOptions = {}) {
		this.options = {
			allowAbsolute: options.allowAbsolute ?? false,
			checkSymlinks: options.checkSymlinks ?? false,
			maxLength: options.maxLength ?? MAX_PATH_LENGTH,
			baseDir: options.baseDir ?? process.cwd(),
		};
	}

	/**
	 * Validate a path within a workspace
	 *
	 * @param workspace - The workspace root directory (must be absolute)
	 * @param filePath - The file path to validate (can be relative or absolute)
	 * @throws PathTraversalError if path escapes workspace
	 * @throws ValidationError if path is invalid
	 */
	validatePath(workspace: string, filePath: string): void {
		// Basic validation
		this.validateBasic(filePath);

		// Resolve the workspace (must be absolute)
		const resolvedWorkspace = resolve(workspace);

		// Resolve the file path relative to workspace
		const resolvedFile = isAbsolute(filePath) ? resolve(filePath) : resolve(resolvedWorkspace, filePath);

		// Check that resolved path is within workspace
		const relativePath = relative(resolvedWorkspace, resolvedFile);

		// If relative path starts with .. or is absolute, it escapes workspace
		if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
			throw new PathTraversalError(filePath);
		}

		// Normalize and check again (handles edge cases)
		const normalizedRelative = normalize(relativePath);
		if (normalizedRelative.startsWith("..")) {
			throw new PathTraversalError(filePath);
		}
	}

	/**
	 * Validate basic path properties without workspace context
	 *
	 * @param filePath - The file path to validate
	 * @throws ValidationError if path is invalid
	 */
	validateBasic(filePath: string): void {
		// Check for null/undefined
		if (filePath == null) {
			throw new ValidationError("Path is required");
		}

		// Check type
		if (typeof filePath !== "string") {
			throw new ValidationError("Path must be a string");
		}

		// Check for empty path
		if (filePath.trim() === "") {
			throw new ValidationError("Path cannot be empty");
		}

		// Check length
		if (filePath.length > this.options.maxLength) {
			throw new ValidationError(`Path too long: ${filePath.length} chars (max: ${this.options.maxLength})`);
		}

		// Check for dangerous characters
		for (const char of DANGEROUS_CHARS) {
			if (filePath.includes(char)) {
				throw new ValidationError(`Path contains dangerous character: ${JSON.stringify(char)}`);
			}
		}

		// Check for traversal patterns
		for (const pattern of TRAVERSAL_PATTERNS) {
			if (pattern.test(filePath)) {
				throw new PathTraversalError(filePath);
			}
		}

		// Check for Windows-specific dangerous patterns
		if (process.platform === "win32") {
			for (const pattern of WINDOWS_DANGEROUS_PATTERNS) {
				if (pattern.test(filePath)) {
					throw new ValidationError(`Path contains dangerous Windows pattern: ${filePath}`);
				}
			}
		} else {
			// On Unix, still check for Windows UNC paths (could be used in attack)
			if (filePath.startsWith("\\\\") || filePath.includes(":")) {
				throw new ValidationError(`Path contains Windows-style characters: ${filePath}`);
			}
		}

		// Check for absolute paths if not allowed
		if (!this.options.allowAbsolute && isAbsolute(filePath)) {
			throw new ValidationError(`Absolute paths not allowed: ${filePath}`);
		}
	}

	/**
	 * Validate a path and check for symlinks (async)
	 *
	 * @param workspace - The workspace root directory
	 * @param filePath - The file path to validate
	 * @throws PathTraversalError if path escapes workspace (including via symlink)
	 */
	async validatePathWithSymlinkCheck(workspace: string, filePath: string): Promise<void> {
		// First do basic validation
		this.validatePath(workspace, filePath);

		// Then check for symlinks if enabled
		if (this.options.checkSymlinks) {
			const resolvedWorkspace = resolve(workspace);
			const resolvedFile = isAbsolute(filePath) ? resolve(filePath) : resolve(resolvedWorkspace, filePath);

			try {
				const stats = await lstat(resolvedFile);
				if (stats.isSymbolicLink()) {
					// For symlinks, we need to check the real path
					const { realpath } = await import("node:fs/promises");
					const realPath = await realpath(resolvedFile);
					const realRelative = relative(resolvedWorkspace, realPath);

					if (realRelative.startsWith("..") || isAbsolute(realRelative)) {
						throw new PathTraversalError(`Symlink escapes workspace: ${filePath} -> ${realPath}`);
					}
				}
			} catch (err) {
				// File doesn't exist yet, that's OK for some operations
				if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
					throw err;
				}
			}
		}
	}

	/**
	 * Validate multiple paths
	 *
	 * @param workspace - The workspace root directory
	 * @param filePaths - Array of file paths to validate
	 * @throws PathTraversalError if any path escapes workspace
	 */
	validatePaths(workspace: string, filePaths: string[]): void {
		for (const filePath of filePaths) {
			this.validatePath(workspace, filePath);
		}
	}

	/**
	 * Sanitize a path by removing dangerous components
	 * Note: This is a best-effort sanitization, validation should still be used
	 *
	 * @param filePath - The file path to sanitize
	 * @returns Sanitized path
	 */
	sanitizePath(filePath: string): string {
		let sanitized = filePath;

		// Remove null bytes
		sanitized = sanitized.replace(/\0/g, "");

		// Remove URL encoding of ..
		sanitized = sanitized.replace(/%2e%2e/gi, "");
		sanitized = sanitized.replace(/%252e%252e/gi, "");

		// Normalize path separators
		sanitized = sanitized.replace(/\\/g, sep);

		// Normalize the path
		sanitized = normalize(sanitized);

		// Remove leading .. components
		while (sanitized.startsWith(`..${sep}`) || sanitized === "..") {
			sanitized = sanitized.slice(3);
		}

		return sanitized;
	}
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Default validator instance
 */
const defaultValidator = new PathValidator();

/**
 * Validate a path within a workspace
 *
 * @param workspace - The workspace root directory
 * @param filePath - The file path to validate
 * @throws PathTraversalError if path escapes workspace
 */
export function validatePath(workspace: string, filePath: string): void {
	defaultValidator.validatePath(workspace, filePath);
}

/**
 * Validate multiple paths within a workspace
 *
 * @param workspace - The workspace root directory
 * @param filePaths - Array of file paths to validate
 * @throws PathTraversalError if any path escapes workspace
 */
export function validatePaths(workspace: string, filePaths: string[]): void {
	defaultValidator.validatePaths(workspace, filePaths);
}

/**
 * Validate basic path properties
 *
 * @param filePath - The file path to validate
 * @throws ValidationError if path is invalid
 */
export function validateBasicPath(filePath: string): void {
	defaultValidator.validateBasic(filePath);
}

/**
 * Sanitize a path by removing dangerous components
 *
 * @param filePath - The file path to sanitize
 * @returns Sanitized path
 */
export function sanitizePath(filePath: string): string {
	return defaultValidator.sanitizePath(filePath);
}
