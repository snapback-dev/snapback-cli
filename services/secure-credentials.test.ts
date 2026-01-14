/**
 * Secure Credentials Tests
 *
 * FIX 4: Tests for OS keychain storage with fallback
 *
 * @see services/secure-credentials.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecureCredentialsManager } from "../../src/services/secure-credentials";
import type { GlobalCredentials } from "../../src/services/snapback-dir";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	unlink: vi.fn(),
	mkdir: vi.fn(),
}));

// Mock os
vi.mock("node:os", () => ({
	homedir: () => "/mock/home",
	hostname: () => "test-machine",
	platform: () => "darwin",
	userInfo: () => ({ username: "testuser" }),
}));

describe("SecureCredentialsManager - FIX 4", () => {
	let manager: SecureCredentialsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		// Create fresh instance for each test
		manager = new SecureCredentialsManager();
	});

	afterEach(() => {
		vi.resetModules();
	});

	describe("Provider Selection", () => {
		it("should initialize successfully", async () => {
			// Should not throw
			await manager.getCredentials();
		});

		it("should fallback to encrypted-file when keytar unavailable", async () => {
			// keytar is not available in test environment
			await manager.getCredentials();
			expect(manager.getProviderName()).toBe("encrypted-file");
		});
	});

	describe("Credentials Storage", () => {
		const testCredentials: GlobalCredentials = {
			accessToken: "test_token_123",
			refreshToken: "refresh_token_456",
			email: "test@example.com",
			tier: "pro",
			expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day
		};

		it("should save credentials without error", async () => {
			const { writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);
			vi.mocked(writeFile).mockResolvedValue(undefined);

			await expect(manager.setCredentials(testCredentials)).resolves.not.toThrow();
		});

		it("should retrieve saved credentials", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			// Create encrypted data that can be decrypted
			// For this test, we'll mock the entire flow
			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) return storedData;
				throw new Error("File not found");
			});

			// Save
			await manager.setCredentials(testCredentials);

			// Retrieve
			const retrieved = await manager.getCredentials();

			expect(retrieved).not.toBeNull();
			expect(retrieved?.accessToken).toBe(testCredentials.accessToken);
			expect(retrieved?.email).toBe(testCredentials.email);
			expect(retrieved?.tier).toBe(testCredentials.tier);
		});

		it("should return null for non-existent credentials", async () => {
			const { readFile } = await import("node:fs/promises");
			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const credentials = await manager.getCredentials();
			expect(credentials).toBeNull();
		});
	});

	describe("Login Status", () => {
		it("should return false when no credentials exist", async () => {
			const { readFile } = await import("node:fs/promises");
			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(false);
		});

		it("should return false when token is expired", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) return storedData;
				throw new Error("File not found");
			});

			// Save expired credentials
			await manager.setCredentials({
				accessToken: "expired_token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
			});

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(false);
		});

		it("should return true when valid credentials exist", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) return storedData;
				throw new Error("File not found");
			});

			// Save valid credentials
			await manager.setCredentials({
				accessToken: "valid_token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
			});

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(true);
		});
	});

	describe("Credentials Deletion", () => {
		it("should clear credentials without error", async () => {
			const { unlink } = await import("node:fs/promises");
			vi.mocked(unlink).mockResolvedValue(undefined);

			await expect(manager.clearCredentials()).resolves.not.toThrow();
		});

		it("should handle non-existent file gracefully", async () => {
			const { unlink } = await import("node:fs/promises");
			vi.mocked(unlink).mockRejectedValue(new Error("File not found"));

			await expect(manager.clearCredentials()).resolves.not.toThrow();
		});
	});

	describe("Encryption", () => {
		it("should not store credentials in plain text", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			// Use object to store data (avoids TypeScript narrowing issues)
			const storage: { data: Buffer | null } = { data: null };

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storage.data = data as Buffer;
			});

			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const credentials: GlobalCredentials = {
				accessToken: "super_secret_token",
				email: "secret@example.com",
				tier: "pro",
			};

			await manager.setCredentials(credentials);

			// Verify the stored data is not plain text JSON
			expect(storage.data).not.toBeNull();
			const storedString = storage.data!.toString("utf8");

			// Should NOT contain plain text token or email
			expect(storedString).not.toContain("super_secret_token");
			expect(storedString).not.toContain("secret@example.com");

			// Should not be valid JSON (encrypted)
			expect(() => JSON.parse(storedString)).toThrow();
		});
	});
});

describe("Secure Credentials Exports", () => {
	it("should export getCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.getCredentialsSecure).toBe("function");
	});

	it("should export saveCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.saveCredentialsSecure).toBe("function");
	});

	it("should export clearCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.clearCredentialsSecure).toBe("function");
	});

	it("should export isLoggedInSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.isLoggedInSecure).toBe("function");
	});

	it("should export getSecureCredentials singleton getter", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.getSecureCredentials).toBe("function");
	});
});
