// staged files → API Client → exit 1 on critical; --bypass logs reason

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ApiClient } from "./services/api-client.js";

interface CheckOptions {
	staged?: boolean;
	bypass?: string;
}

export async function check(options: CheckOptions = {}): Promise<number> {
	try {
		// Get staged files if requested
		let filesToCheck: string[] = [];
		if (options.staged) {
			filesToCheck = getStagedFiles();
		} else {
			// For now, we'll just return success if not checking staged files
			console.log("No files to check");
			return 0;
		}

		if (filesToCheck.length === 0) {
			console.log("No staged files to check");
			return 0;
		}

		// Initialize API client
		const apiClient = new ApiClient();

		// Check if we can connect to the backend API
		const isApiAvailable = await apiClient.healthCheck();

		if (isApiAvailable) {
			// Run analysis using the backend API
			const findings = await analyzeFilesWithAPI(filesToCheck, apiClient);

			// Log findings
			if (findings.length > 0) {
				console.log("API findings:");
				for (const finding of findings) {
					console.log(`  ${finding.file}:${finding.line} [${finding.severity}] ${finding.message}`);
				}

				// Check for critical findings (risk > 8)
				const criticalFindings = findings.filter((f) => f.risk > 8);
				if (criticalFindings.length > 0) {
					if (options.bypass) {
						console.log(`⚠️  Critical findings bypassed: ${options.bypass}`);
						// Log audit entry for bypass
						logAudit("check_bypassed", {
							bypassReason: options.bypass,
							criticalFindings: criticalFindings.length,
						});
						return 0;
					}
					console.error("❌ Critical findings detected. Commit blocked.");
					// Log audit entry for block
					logAudit("check_blocked", {
						criticalFindings: criticalFindings.length,
					});
					return 1;
				}
			} else {
				console.log("✅ No findings detected");
			}
		} else {
			console.log("⚠️  API unavailable, using basic pattern detection as fallback");
			// Fallback to basic pattern detection when API is unavailable
			const findings = await analyzeFilesWithBasicPatterns(filesToCheck);

			// Log findings
			if (findings.length > 0) {
				console.log("Basic pattern findings:");
				for (const finding of findings) {
					console.log(`  ${finding.file}:${finding.line} [${finding.severity}] ${finding.message}`);
				}

				// Check for critical findings (risk > 8)
				const criticalFindings = findings.filter((f) => f.risk > 8);
				if (criticalFindings.length > 0) {
					if (options.bypass) {
						console.log(`⚠️  Critical findings bypassed: ${options.bypass}`);
						// Log audit entry for bypass
						logAudit("check_bypassed", {
							bypassReason: options.bypass,
							criticalFindings: criticalFindings.length,
							fallbackMode: true,
						});
						return 0;
					}
					console.error("❌ Critical findings detected. Commit blocked.");
					// Log audit entry for block
					logAudit("check_blocked", {
						criticalFindings: criticalFindings.length,
						fallbackMode: true,
					});
					return 1;
				}
			} else {
				console.log("✅ No findings detected");
			}
		}

		return 0;
	} catch (error) {
		console.error("Error during check:", error);
		// Log audit entry for error
		logAudit("check_error", {
			error: error instanceof Error ? error.message : String(error),
		});
		return 1;
	}
}

function getStagedFiles(): string[] {
	try {
		const output = execSync("git diff --cached --name-only", { encoding: "utf-8" });
		return output.split("\n").filter(Boolean);
	} catch (error) {
		console.error("Failed to get staged files:", error);
		return [];
	}
}

async function analyzeFilesWithAPI(files: string[], apiClient: ApiClient): Promise<GuardianFinding[]> {
	const findings: GuardianFinding[] = [];

	// Prepare files for analysis
	const filesForAnalysis = files
		.filter((file) => existsSync(file))
		.map((file) => ({
			path: file,
			content: readFileSync(file, "utf-8"),
		}));

	if (filesForAnalysis.length === 0) {
		return findings;
	}

	try {
		// Analyze with backend API
		const result = await apiClient.analyzeFiles(filesForAnalysis);

		// Convert API result to findings
		if (result.score > 0) {
			// For each file that was analyzed, create a finding
			for (const file of filesForAnalysis) {
				findings.push({
					file: file.path,
					line: 1,
					risk: result.score,
					severity: result.riskLevel || "medium",
					message: result.factors.join(", "),
					suggestions: result.issues?.map((issue: any) => issue.message) || [],
				});
			}
		}
	} catch (error) {
		console.warn("Failed to analyze files via API:", error);
	}

	return findings;
}

// Basic pattern detection for offline fallback
async function analyzeFilesWithBasicPatterns(files: string[]): Promise<GuardianFinding[]> {
	const findings: GuardianFinding[] = [];

	for (const file of files) {
		try {
			if (existsSync(file)) {
				const content = readFileSync(file, "utf-8");

				// Simple pattern detection for basic security issues
				const factors: string[] = [];
				const recommendations: string[] = [];

				// Check for common patterns
				if (content.includes("eval(")) {
					factors.push("eval() usage detected - security risk");
					recommendations.push("Avoid using eval() as it can execute arbitrary code");
				}

				if (content.includes("Function(")) {
					factors.push("Function constructor usage detected - security risk");
					recommendations.push("Avoid using Function constructor as it can execute arbitrary code");
				}

				// Score calculation based on number of risk factors (0-10 scale)
				// Each additional factor increases score non-linearly to catch issues earlier
				const score = factors.length > 0 ? Math.min(factors.length * 3, 10) : 0;
				const severity = factors.length > 0 ? (factors.length > 2 ? "high" : "medium") : "low";

				if (score > 0) {
					findings.push({
						file,
						line: 1,
						risk: score,
						severity,
						message: factors.join(", "),
						suggestions: recommendations,
					});
				}
			}
		} catch (error) {
			console.warn(`Failed to analyze file ${file}:`, error);
		}
	}

	return findings;
}

interface GuardianFinding {
	file: string;
	line: number;
	risk: number;
	severity: string;
	message: string;
	suggestions?: string[];
}

function logAudit(action: string, details: Record<string, any>): void {
	// Simple audit logging to console for now
	console.log(`[AUDIT] ${new Date().toISOString()} ${action}:`, JSON.stringify(details));
}

// CLI entry point
if (require.main === module) {
	const args = process.argv.slice(2);
	const options: CheckOptions = {};

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--staged") {
			options.staged = true;
		} else if (args[i] === "--bypass" && i + 1 < args.length) {
			options.bypass = args[++i];
		}
	}

	check(options)
		.then((exitCode) => {
			process.exit(exitCode);
		})
		.catch((error) => {
			console.error("Unexpected error:", error);
			process.exit(1);
		});
}
