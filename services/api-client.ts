import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface AnalysisRequest {
	code: string;
	filePath: string;
	context?: {
		surroundingCode?: string;
		projectType?: string;
		language?: string;
	};
}

export interface AnalysisResponse {
	riskLevel: string;
	score: number;
	factors: string[];
	analysisTimeMs: number;
	issues: Array<{
		severity: string;
		message: string;
		line?: number;
		column?: number;
	}>;
}

export interface SecretDetectionResponse {
	secrets: Array<{
		type: string;
		value: string;
		line: number;
		column: number;
		severity: string;
		message: string;
	}>;
}

export interface PolicyEvaluationResponse {
	action: "apply" | "review" | "block";
	reason: string;
	details: any;
}

export class ApiClient {
	private baseUrl: string;
	private apiKey: string | undefined;

	constructor() {
		// Try to get API configuration from environment variables first
		this.baseUrl = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";
		this.apiKey = process.env.SNAPBACK_API_KEY;

		// If not found in environment, try to read from config file
		if (!this.apiKey) {
			this.apiKey = this.readApiKeyFromConfig();
		}
	}

	private readApiKeyFromConfig(): string | undefined {
		try {
			// Try to read from ~/.snapback/config.json
			const configPath = join(homedir(), ".snapback", "config.json");
			const configContent = readFileSync(configPath, "utf-8");
			const config = JSON.parse(configContent);
			return config.apiKey;
		} catch (_error) {
			// Config file not found or invalid, that's okay
			return undefined;
		}
	}

	private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		const headers = {
			"Content-Type": "application/json",
			...(this.apiKey && {
				Authorization: `Bearer ${this.apiKey}`,
			}),
			...options.headers,
		};

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		return (await response.json()) as T;
	}

	// Analyze files using the backend API
	public async analyzeFiles(
		files: Array<{ path: string; content: string }>,
		options?: {
			customRules?: Array<{ name: string; pattern: string; severity: string; filePattern?: string }>;
			workspaceId?: string;
			commitMessage?: string;
			branchName?: string;
		},
	): Promise<any> {
		try {
			const response = await this.fetchAPI<AnalysisResponse>("/api/analyze/fast", {
				method: "POST",
				body: JSON.stringify({
					files,
					...options,
				}),
			});

			return response;
		} catch (error) {
			console.error("Failed to analyze files via API:", error);
			throw error;
		}
	}

	// Detect secrets using the backend API
	public async detectSecrets(content: string, filePath: string): Promise<SecretDetectionResponse> {
		try {
			const response = await this.fetchAPI<SecretDetectionResponse>("/api/detect-secrets", {
				method: "POST",
				body: JSON.stringify({
					content,
					filePath,
				}),
			});

			return response;
		} catch (error) {
			console.error("Failed to detect secrets via API:", error);
			throw error;
		}
	}

	// Evaluate policy using the backend API
	public async evaluatePolicy(sarifLog: any): Promise<PolicyEvaluationResponse> {
		try {
			const response = await this.fetchAPI<PolicyEvaluationResponse>("/api/policy/evaluate", {
				method: "POST",
				body: JSON.stringify({
					sarif: sarifLog,
				}),
			});

			return response;
		} catch (error) {
			console.error("Failed to evaluate policy via API:", error);
			throw error;
		}
	}

	// Health check to verify API connectivity
	public async healthCheck(): Promise<boolean> {
		try {
			await this.fetchAPI("/api/health", {
				method: "GET",
			});
			return true;
		} catch (error) {
			console.error("API health check failed:", error);
			return false;
		}
	}
}
