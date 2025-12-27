/**
 * CLI Token Refresh Tests
 *
 * Test ID: CLI-AUTH-FIX6
 * Category: Security - Token Management
 *
 * Tests token refresh logic for CLI authentication:
 * - Token expiry detection
 * - Proactive refresh before expiry
 * - Refresh failure handling
 * - ensureValidCredentials flow
 *
 * FIX 6: Implement CLI token refresh - add refresh token polling before expiry
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the snapback-dir module
const mockGetCredentials = vi.fn();
const mockSaveCredentials = vi.fn();

vi.mock("../../src/services/snapback-dir", () => ({
	getCredentials: () => mockGetCredentials(),
	saveCredentials: (creds: unknown) => mockSaveCredentials(creds),
	createGlobalDirectory: vi.fn().mockResolvedValue(undefined),
	clearCredentials: vi.fn().mockResolvedValue(undefined),
	isLoggedIn: vi.fn().mockResolvedValue(true),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { ensureValidCredentials, isTokenExpired, needsTokenRefresh } from "../../src/commands/auth";

interface GlobalCredentials {
	accessToken: string;
	refreshToken?: string;
	email: string;
	tier: "free" | "pro";
	expiresAt?: string;
}

describe("CLI Token Refresh (FIX 6)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("isTokenExpired", () => {
		it("should return false for token with no expiry", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "free",
			};

			expect(isTokenExpired(credentials)).toBe(false);
		});

		it("should return false for non-expired token", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T13:00:00Z").toISOString(), // 1 hour from now
			};

			expect(isTokenExpired(credentials)).toBe(false);
		});

		it("should return true for expired token", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date("2025-01-01T11:00:00Z").toISOString(), // 1 hour ago
			};

			expect(isTokenExpired(credentials)).toBe(true);
		});
	});

	describe("needsTokenRefresh", () => {
		it("should return false for token with no expiry", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "free",
			};

			expect(needsTokenRefresh(credentials)).toBe(false);
		});

		it("should return false for token not expiring soon", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T13:00:00Z").toISOString(), // 1 hour from now
			};

			expect(needsTokenRefresh(credentials)).toBe(false);
		});

		it("should return true for token expiring within 5 minutes", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date("2025-01-01T12:04:00Z").toISOString(), // 4 minutes from now
			};

			expect(needsTokenRefresh(credentials)).toBe(true);
		});

		it("should return false for already expired token", () => {
			const credentials: GlobalCredentials = {
				accessToken: "test-token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date("2025-01-01T11:00:00Z").toISOString(), // 1 hour ago
			};

			expect(needsTokenRefresh(credentials)).toBe(false);
		});
	});

	describe("ensureValidCredentials", () => {
		it("should return null when not logged in", async () => {
			mockGetCredentials.mockResolvedValue(null);

			const result = await ensureValidCredentials();

			expect(result).toBeNull();
		});

		it("should return credentials when not expired and not needing refresh", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "valid-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T13:00:00Z").toISOString(), // 1 hour from now
			};
			mockGetCredentials.mockResolvedValue(credentials);

			const result = await ensureValidCredentials();

			expect(result).toEqual(credentials);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should refresh token when expiring soon", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "expiring-token",
				refreshToken: "refresh-token-123",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T12:04:00Z").toISOString(), // 4 minutes from now
			};
			mockGetCredentials.mockResolvedValue(credentials);

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					accessToken: "new-access-token",
					refreshToken: "new-refresh-token",
					expiresIn: 3600, // 1 hour
				}),
			});

			const result = await ensureValidCredentials();

			expect(result).not.toBeNull();
			expect(result?.accessToken).toBe("new-access-token");
			expect(mockSaveCredentials).toHaveBeenCalled();
		});

		it("should return original credentials if refresh fails but token still valid", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "expiring-token",
				refreshToken: "bad-refresh-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T12:04:00Z").toISOString(), // 4 minutes from now
			};
			mockGetCredentials.mockResolvedValue(credentials);

			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
			});

			const result = await ensureValidCredentials();

			// Should return original credentials since they're still valid
			expect(result).toEqual(credentials);
		});

		it("should return null when token expired and refresh fails", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "expired-token",
				refreshToken: "bad-refresh-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T11:00:00Z").toISOString(), // 1 hour ago
			};
			mockGetCredentials.mockResolvedValue(credentials);

			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
			});

			const result = await ensureValidCredentials();

			expect(result).toBeNull();
		});

		it("should refresh expired token successfully", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "expired-token",
				refreshToken: "valid-refresh-token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date("2025-01-01T11:00:00Z").toISOString(), // 1 hour ago
			};
			mockGetCredentials.mockResolvedValue(credentials);

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					accessToken: "new-access-token",
					refreshToken: "new-refresh-token",
					expiresIn: 3600,
				}),
			});

			const result = await ensureValidCredentials();

			expect(result).not.toBeNull();
			expect(result?.accessToken).toBe("new-access-token");
		});

		it("should return credentials without refresh token as-is", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "api-key-based-token", // API key auth has no refresh token
				email: "test@example.com",
				tier: "pro",
				// No expiresAt for API key auth
			};
			mockGetCredentials.mockResolvedValue(credentials);

			const result = await ensureValidCredentials();

			expect(result).toEqual(credentials);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle network errors gracefully", async () => {
			const credentials: GlobalCredentials = {
				accessToken: "expiring-token",
				refreshToken: "refresh-token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date("2025-01-01T12:04:00Z").toISOString(), // 4 minutes from now
			};
			mockGetCredentials.mockResolvedValue(credentials);

			mockFetch.mockRejectedValue(new Error("Network error"));

			const result = await ensureValidCredentials();

			// Should return original credentials on network error
			expect(result).toEqual(credentials);
		});
	});
});
