import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../../src/services/api-client";

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create an instance with default configuration", () => {
		const client = new ApiClient();
		expect(client).toBeDefined();
	});

	it("should use environment variables for configuration", () => {
		// Set environment variables
		process.env.SNAPBACK_API_URL = "https://test-api.snapback.dev";
		process.env.SNAPBACK_API_KEY = "test-key";

		const client = new ApiClient();

		// Clean up environment variables
		delete process.env.SNAPBACK_API_URL;
		delete process.env.SNAPBACK_API_KEY;

		expect(client).toBeDefined();
	});

	it("should make a successful API call to analyze files", async () => {
		const mockResponse = {
			riskLevel: "medium",
			score: 0.5,
			factors: ["test factor"],
			analysisTimeMs: 100,
			issues: [],
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const client = new ApiClient();
		const result = await client.analyzeFiles([{ path: "test.ts", content: "console.log('test');" }]);

		expect(result).toEqual(mockResponse);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.snapback.dev/api/analyze/fast",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should handle API errors gracefully", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const client = new ApiClient();

		await expect(client.analyzeFiles([{ path: "test.ts", content: "console.log('test');" }])).rejects.toThrow(
			"API error: 500 Internal Server Error",
		);
	});

	it("should perform health check successfully", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ status: "ok" }),
		});

		const client = new ApiClient();
		const result = await client.healthCheck();

		expect(result).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.snapback.dev/api/health",
			expect.objectContaining({
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});
});
