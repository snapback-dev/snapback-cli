/**
 * Secure Credentials Storage for SnapBack CLI
 *
 * FIX 4: Implements OS keychain storage with file fallback
 *
 * Security Hierarchy:
 * 1. OS Keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * 2. Encrypted file fallback (AES-256-GCM with machine-derived key)
 * 3. Plain text fallback (development only, with warning)
 *
 * @module services/secure-credentials
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, hostname, platform, userInfo } from "node:os";
import { dirname, join } from "node:path";
import type { GlobalCredentials } from "./snapback-dir";

// =============================================================================
// CONSTANTS
// =============================================================================

const SERVICE_NAME = "snapback-cli";
const ACCOUNT_NAME = "default";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// File paths
const GLOBAL_DIR = join(homedir(), ".snapback");
const CREDENTIALS_FILE = join(GLOBAL_DIR, "credentials.json");
const ENCRYPTED_CREDENTIALS_FILE = join(GLOBAL_DIR, "credentials.enc");

// =============================================================================
// KEYCHAIN INTERFACE
// =============================================================================

/**
 * Keychain abstraction interface
 * Allows for different implementations based on availability
 */
interface KeychainProvider {
	name: string;
	isAvailable(): Promise<boolean>;
	getPassword(service: string, account: string): Promise<string | null>;
	setPassword(service: string, account: string, password: string): Promise<void>;
	deletePassword(service: string, account: string): Promise<boolean>;
}

// =============================================================================
// KEYTAR PROVIDER (OS KEYCHAIN)
// =============================================================================

/**
 * Keytar-based keychain provider
 * Uses OS-level secure credential storage
 */
async function createKeytarProvider(): Promise<KeychainProvider | null> {
	try {
		// Dynamic import to handle missing keytar gracefully
		// @ts-expect-error - keytar is optional dependency
		const keytar = await import("keytar");

		return {
			name: "keytar",
			async isAvailable(): Promise<boolean> {
				try {
					// Test availability by trying a no-op operation
					await keytar.getPassword("__snapback_test__", "__test__");
					return true;
				} catch {
					return false;
				}
			},
			async getPassword(service: string, account: string): Promise<string | null> {
				return keytar.getPassword(service, account);
			},
			async setPassword(service: string, account: string, password: string): Promise<void> {
				await keytar.setPassword(service, account, password);
			},
			async deletePassword(service: string, account: string): Promise<boolean> {
				return keytar.deletePassword(service, account);
			},
		};
	} catch {
		// keytar not available (not installed or native module issues)
		return null;
	}
}

// =============================================================================
// ENCRYPTED FILE PROVIDER
// =============================================================================

/**
 * Derive an encryption key from machine-specific data
 * This provides defense-in-depth even if the file is copied to another machine
 */
function deriveMachineKey(salt: Buffer): Buffer {
	// Combine machine-specific values for key derivation
	const machineData = [
		hostname(),
		platform(),
		userInfo().username,
		homedir(),
		// Add some entropy from process info
		process.arch,
		process.platform,
	].join("|");

	return scryptSync(machineData, salt, KEY_LENGTH);
}

/**
 * Encrypt credentials with machine-derived key
 */
function encryptCredentials(credentials: GlobalCredentials, salt: Buffer): Buffer {
	const key = deriveMachineKey(salt);
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

	const plaintext = JSON.stringify(credentials);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	// Format: salt (32) + iv (12) + authTag (16) + encrypted data
	return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt credentials with machine-derived key
 */
function decryptCredentials(data: Buffer): GlobalCredentials {
	// Extract components
	const salt = data.subarray(0, SALT_LENGTH);
	const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

	const key = deriveMachineKey(salt);
	const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return JSON.parse(decrypted.toString("utf8")) as GlobalCredentials;
}

/**
 * Encrypted file provider
 * Uses AES-256-GCM with machine-derived key
 */
function createEncryptedFileProvider(): KeychainProvider {
	return {
		name: "encrypted-file",
		async isAvailable(): Promise<boolean> {
			return true; // Always available as fallback
		},
		async getPassword(_service: string, _account: string): Promise<string | null> {
			try {
				const data = await readFile(ENCRYPTED_CREDENTIALS_FILE);
				const credentials = decryptCredentials(data);
				return JSON.stringify(credentials);
			} catch {
				return null;
			}
		},
		async setPassword(_service: string, _account: string, password: string): Promise<void> {
			const credentials = JSON.parse(password) as GlobalCredentials;
			const salt = randomBytes(SALT_LENGTH);
			const encrypted = encryptCredentials(credentials, salt);

			await mkdir(dirname(ENCRYPTED_CREDENTIALS_FILE), { recursive: true });
			await writeFile(ENCRYPTED_CREDENTIALS_FILE, encrypted);
		},
		async deletePassword(_service: string, _account: string): Promise<boolean> {
			try {
				await unlink(ENCRYPTED_CREDENTIALS_FILE);
				return true;
			} catch {
				return false;
			}
		},
	};
}

// =============================================================================
// PLAIN FILE PROVIDER (DEVELOPMENT FALLBACK)
// =============================================================================

/**
 * Plain file provider (legacy, development only)
 * Shows warning when used in production
 * @deprecated Use encrypted file provider instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _createPlainFileProvider(): KeychainProvider {
	let warningShown = false;

	return {
		name: "plain-file",
		async isAvailable(): Promise<boolean> {
			return true;
		},
		async getPassword(_service: string, _account: string): Promise<string | null> {
			try {
				const content = await readFile(CREDENTIALS_FILE, "utf8");
				return content;
			} catch {
				return null;
			}
		},
		async setPassword(_service: string, _account: string, password: string): Promise<void> {
			if (process.env.NODE_ENV === "production" && !warningShown) {
				console.warn(
					"\n⚠️  Warning: Storing credentials in plain text. " +
						"Install 'keytar' for OS keychain support: pnpm add keytar\n",
				);
				warningShown = true;
			}

			await mkdir(dirname(CREDENTIALS_FILE), { recursive: true });
			await writeFile(CREDENTIALS_FILE, password, { mode: 0o600 }); // Restrict file permissions
		},
		async deletePassword(_service: string, _account: string): Promise<boolean> {
			try {
				await unlink(CREDENTIALS_FILE);
				return true;
			} catch {
				return false;
			}
		},
	};
}

// =============================================================================
// SECURE CREDENTIALS MANAGER
// =============================================================================

/**
 * Secure Credentials Manager
 *
 * Automatically selects the most secure available storage:
 * 1. OS Keychain (via keytar)
 * 2. Encrypted file
 * 3. Plain file (with warning)
 */
class SecureCredentialsManager {
	private provider: KeychainProvider | null = null;
	private initialized = false;

	/**
	 * Initialize the credentials manager
	 * Selects the best available provider
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		// Try keytar first (OS keychain)
		const keytarProvider = await createKeytarProvider();
		if (keytarProvider && (await keytarProvider.isAvailable())) {
			this.provider = keytarProvider;
			this.initialized = true;
			return;
		}

		// Fall back to encrypted file
		this.provider = createEncryptedFileProvider();
		this.initialized = true;
	}

	/**
	 * Get the name of the active provider
	 */
	getProviderName(): string {
		return this.provider?.name ?? "none";
	}

	/**
	 * Get stored credentials
	 */
	async getCredentials(): Promise<GlobalCredentials | null> {
		await this.initialize();
		if (!this.provider) return null;

		const stored = await this.provider.getPassword(SERVICE_NAME, ACCOUNT_NAME);
		if (!stored) {
			// Check legacy plain file as migration fallback
			const legacy = await this.getLegacyCredentials();
			if (legacy) {
				// Migrate to secure storage
				await this.setCredentials(legacy);
				// Delete legacy file after successful migration
				try {
					await unlink(CREDENTIALS_FILE);
				} catch {
					// Ignore if file doesn't exist
				}
				return legacy;
			}
			return null;
		}

		try {
			return JSON.parse(stored) as GlobalCredentials;
		} catch {
			return null;
		}
	}

	/**
	 * Get legacy plain-text credentials for migration
	 */
	private async getLegacyCredentials(): Promise<GlobalCredentials | null> {
		try {
			const content = await readFile(CREDENTIALS_FILE, "utf8");
			return JSON.parse(content) as GlobalCredentials;
		} catch {
			return null;
		}
	}

	/**
	 * Save credentials securely
	 */
	async setCredentials(credentials: GlobalCredentials): Promise<void> {
		await this.initialize();
		if (!this.provider) {
			throw new Error("No credentials provider available");
		}

		await this.provider.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify(credentials));
	}

	/**
	 * Clear stored credentials
	 */
	async clearCredentials(): Promise<void> {
		await this.initialize();
		if (!this.provider) return;

		await this.provider.deletePassword(SERVICE_NAME, ACCOUNT_NAME);

		// Also clean up any legacy files
		try {
			await unlink(CREDENTIALS_FILE);
		} catch {
			// Ignore
		}
		try {
			await unlink(ENCRYPTED_CREDENTIALS_FILE);
		} catch {
			// Ignore
		}
	}

	/**
	 * Check if user is logged in
	 */
	async isLoggedIn(): Promise<boolean> {
		const credentials = await this.getCredentials();
		if (!credentials?.accessToken) return false;

		// Check if token is expired
		if (credentials.expiresAt) {
			const expiresAt = new Date(credentials.expiresAt);
			if (expiresAt < new Date()) {
				return false;
			}
		}

		return true;
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

// Singleton instance
let secureCredentialsManager: SecureCredentialsManager | null = null;

/**
 * Get the secure credentials manager singleton
 */
export function getSecureCredentials(): SecureCredentialsManager {
	if (!secureCredentialsManager) {
		secureCredentialsManager = new SecureCredentialsManager();
	}
	return secureCredentialsManager;
}

/**
 * Secure versions of credential functions (drop-in replacements)
 */
export async function getCredentialsSecure(): Promise<GlobalCredentials | null> {
	return getSecureCredentials().getCredentials();
}

export async function saveCredentialsSecure(credentials: GlobalCredentials): Promise<void> {
	return getSecureCredentials().setCredentials(credentials);
}

export async function clearCredentialsSecure(): Promise<void> {
	return getSecureCredentials().clearCredentials();
}

export async function isLoggedInSecure(): Promise<boolean> {
	return getSecureCredentials().isLoggedIn();
}

export { SecureCredentialsManager };
