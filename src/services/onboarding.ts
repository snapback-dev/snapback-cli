/**
 * Interactive Onboarding Service
 *
 * Provides intelligent onboarding based on workspace analysis.
 * Uses WorkspaceProfiler for fingerprinting and gap analysis.
 *
 * @module services/onboarding
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	getFramework,
	type OnboardingRecommendation,
	type PatternGap,
	type WorkspaceProfile,
	WorkspaceProfiler,
} from "@snapback/intelligence";
import chalk from "chalk";
import ora from "ora";
import { prompts, status } from "../ui/prompts";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from onboarding analysis
 */
export interface OnboardingAnalysis {
	/** Workspace profile */
	profile: WorkspaceProfile;
	/** Prioritized recommendations */
	recommendations: OnboardingRecommendation[];
	/** Quick wins (easy to implement, high impact) */
	quickWins: OnboardingRecommendation[];
	/** Critical issues to address */
	criticalIssues: PatternGap[];
}

/**
 * Options for applying recommendations
 */
export interface ApplyOptions {
	/** Dry run mode - don't actually make changes */
	dryRun?: boolean;
	/** Auto-apply all recommendations */
	autoApply?: boolean;
	/** Interactive mode - ask for each recommendation */
	interactive?: boolean;
}

// =============================================================================
// ONBOARDING RENDERER
// =============================================================================

/**
 * Render workspace profile summary
 */
export function renderProfileSummary(profile: WorkspaceProfile): void {
	console.log();
	console.log(chalk.cyan.bold("Workspace Analysis"));
	console.log(chalk.gray("─".repeat(50)));

	// Framework
	console.log(
		chalk.white("Framework: ") +
			chalk.green(profile.framework.name) +
			chalk.gray(` (${Math.round(profile.framework.confidence * 100)}% confidence)`),
	);

	// Languages
	const topLanguages = profile.languages.slice(0, 3);
	if (topLanguages.length > 0) {
		console.log(chalk.white("Languages: ") + topLanguages.map((l) => `${l.name} (${l.percentage}%)`).join(", "));
	}

	// Package Manager
	console.log(chalk.white("Package Manager: ") + chalk.green(profile.packageManager.name));

	// Structure
	if (profile.structure.isMonorepo) {
		console.log(
			chalk.white("Structure: ") +
				chalk.yellow("Monorepo") +
				(profile.structure.monorepoTool ? chalk.gray(` (${profile.structure.monorepoTool})`) : ""),
		);
	}

	// Context
	if (profile.existingContext.hasContextDirectory) {
		console.log(
			chalk.white("Context Docs: ") +
				chalk.green("Found") +
				chalk.gray(` (${profile.existingContext.files.length} files)`),
		);
	} else {
		console.log(chalk.white("Context Docs: ") + chalk.yellow("Not found"));
	}

	// Health Score
	const healthColor = profile.healthScore >= 70 ? chalk.green : profile.healthScore >= 40 ? chalk.yellow : chalk.red;
	console.log(chalk.white("Health Score: ") + healthColor(`${profile.healthScore}/100`));

	console.log();
}

/**
 * Render gap analysis summary
 */
export function renderGapSummary(gaps: PatternGap[]): void {
	const critical = gaps.filter((g) => g.severity === "critical");
	const high = gaps.filter((g) => g.severity === "high");
	const medium = gaps.filter((g) => g.severity === "medium");

	if (gaps.length === 0) {
		status.success("No significant gaps detected!");
		return;
	}

	console.log(chalk.cyan.bold("Gap Analysis"));
	console.log(chalk.gray("─".repeat(50)));

	if (critical.length > 0) {
		console.log(chalk.red(`Critical: ${critical.length}`) + chalk.gray(" - Immediate attention required"));
		for (const gap of critical.slice(0, 3)) {
			console.log(chalk.red(`  • ${gap.patternName}`));
		}
	}

	if (high.length > 0) {
		console.log(chalk.yellow(`High: ${high.length}`) + chalk.gray(" - Should be addressed soon"));
		for (const gap of high.slice(0, 3)) {
			console.log(chalk.yellow(`  • ${gap.patternName}`));
		}
	}

	if (medium.length > 0) {
		console.log(chalk.blue(`Medium: ${medium.length}`));
	}

	console.log();
}

/**
 * Render recommendations
 */
export function renderRecommendations(recommendations: OnboardingRecommendation[]): void {
	if (recommendations.length === 0) {
		status.success("No recommendations - workspace looks good!");
		return;
	}

	console.log(chalk.cyan.bold("Recommendations"));
	console.log(chalk.gray("─".repeat(50)));

	for (let i = 0; i < Math.min(5, recommendations.length); i++) {
		const rec = recommendations[i];
		const icon = rec.category === "context" ? "📝" : rec.category === "security" ? "🔒" : "💡";

		console.log(`${icon} ${chalk.white.bold(rec.title)}${chalk.gray(` (${rec.estimatedTime})`)}`);
		console.log(chalk.gray(`   ${rec.description}`));
	}

	if (recommendations.length > 5) {
		console.log(chalk.gray(`   ... and ${recommendations.length - 5} more`));
	}

	console.log();
}

// =============================================================================
// ONBOARDING SERVICE
// =============================================================================

/**
 * Analyze workspace and generate onboarding recommendations
 */
export async function analyzeWorkspace(workspaceRoot: string): Promise<OnboardingAnalysis> {
	const spinner = ora("Analyzing workspace...").start();

	try {
		const profiler = new WorkspaceProfiler({
			workspaceRoot,
			detectPatterns: true,
		});

		const profile = await profiler.analyze();
		spinner.succeed("Workspace analysis complete");

		// Get framework config for recommendations
		const frameworkConfig = getFramework(profile.framework.id);

		// Generate recommendations from gaps
		const recommendations = generateRecommendations(profile, frameworkConfig);

		// Identify quick wins
		const quickWins = recommendations.filter(
			(r) => r.estimatedTime.includes("5 min") || r.estimatedTime.includes("15 min"),
		);

		// Get critical issues
		const criticalIssues = profile.gaps.filter((g) => g.severity === "critical");

		return {
			profile,
			recommendations,
			quickWins,
			criticalIssues,
		};
	} catch (error) {
		spinner.fail("Analysis failed");
		throw error;
	}
}

/**
 * Generate recommendations from workspace profile
 */
function generateRecommendations(
	profile: WorkspaceProfile,
	_frameworkConfig?: ReturnType<typeof getFramework>,
): OnboardingRecommendation[] {
	const recommendations: OnboardingRecommendation[] = [];
	let priority = 1;

	// Context documentation recommendations
	if (!profile.existingContext.hasContextDirectory) {
		recommendations.push({
			id: "create-context-dir",
			category: "context",
			priority: priority++,
			title: "Create .llm-context directory",
			description: "Set up a context directory for AI assistants",
			actions: [
				{
					type: "create-file",
					target: ".llm-context/ARCHITECTURE.md",
					description: "Create architecture documentation",
					content: getArchitectureTemplate(profile),
					autoApply: true,
				},
				{
					type: "create-file",
					target: ".llm-context/PATTERNS.md",
					description: "Create patterns documentation",
					content: getPatternsTemplate(profile),
					autoApply: true,
				},
				{
					type: "create-file",
					target: ".llm-context/CONSTRAINTS.md",
					description: "Create constraints documentation",
					content: getConstraintsTemplate(profile),
					autoApply: true,
				},
			],
			estimatedTime: "15 minutes",
			healthImpact: 30,
		});
	}

	// Add gap-based recommendations
	for (const gap of profile.gaps.slice(0, 5)) {
		recommendations.push({
			id: `gap-${gap.patternId}`,
			category: "pattern",
			priority: priority++,
			title: `Add ${gap.patternName}`,
			description: gap.description,
			actions: [
				{
					type: "add-pattern",
					target: gap.patternId,
					description: gap.recommendation,
					autoApply: false,
				},
			],
			estimatedTime: gap.effort === "trivial" ? "5 minutes" : gap.effort === "small" ? "15 minutes" : "1 hour",
			healthImpact: gap.severity === "critical" ? 15 : gap.severity === "high" ? 10 : 5,
		});
	}

	return recommendations;
}

// =============================================================================
// TEMPLATE GENERATORS
// =============================================================================

function getArchitectureTemplate(profile: WorkspaceProfile): string {
	const framework = profile.framework.name;
	const isMonorepo = profile.structure.isMonorepo;

	return `# Architecture

## Overview
This is a ${framework} application${isMonorepo ? " in a monorepo structure" : ""}.

## Directory Structure
\`\`\`
${profile.structure.sourceDirectories.map((d) => `${d}/`).join("\n")}
${profile.structure.testDirectories.map((d) => `${d}/`).join("\n")}
\`\`\`

## Key Components
<!-- Document your main components here -->

## Data Flow
<!-- Describe how data flows through your application -->

## Dependencies
- Framework: ${framework}
- Package Manager: ${profile.packageManager.name}
${profile.languages
	.slice(0, 3)
	.map((l) => `- ${l.name}: ${l.percentage}%`)
	.join("\n")}
`;
}

function getPatternsTemplate(profile: WorkspaceProfile): string {
	const framework = profile.framework.name;

	return `# Patterns

## Error Handling
<!-- Document your error handling patterns -->

## Data Fetching
<!-- Document data fetching patterns for ${framework} -->

## State Management
<!-- Document state management approach -->

## Authentication
<!-- Document auth patterns -->

## Validation
<!-- Document input validation patterns -->

## Testing
<!-- Document testing patterns -->
`;
}

function getConstraintsTemplate(_profile: WorkspaceProfile): string {
	return `# Constraints

## Performance Budgets
- Initial bundle size: < 500KB
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s

## Security Requirements
- All user input must be validated
- No secrets in source code
- HTTPS only in production

## Code Quality
- TypeScript strict mode
- No console.log in production
- Test coverage > 80%

## Dependencies
- Prefer established, maintained packages
- Lock file must be committed
- Regular dependency updates
`;
}

// =============================================================================
// APPLY RECOMMENDATIONS
// =============================================================================

/**
 * Apply recommendations to the workspace
 */
export async function applyRecommendations(
	workspaceRoot: string,
	recommendations: OnboardingRecommendation[],
	options: ApplyOptions = {},
): Promise<void> {
	const { dryRun = false, autoApply = false, interactive = true } = options;

	for (const recommendation of recommendations) {
		if (interactive && !autoApply) {
			const shouldApply = await prompts.confirm({
				message: `Apply: ${recommendation.title}?`,
				default: true,
			});

			if (!shouldApply) {
				continue;
			}
		}

		for (const action of recommendation.actions) {
			if (!action.autoApply && !autoApply) {
				continue;
			}

			if (dryRun) {
				status.info(`[DRY RUN] Would ${action.type}: ${action.target}`);
				continue;
			}

			try {
				switch (action.type) {
					case "create-file":
						if (action.content) {
							const filePath = join(workspaceRoot, action.target);
							await mkdir(dirname(filePath), { recursive: true });
							await writeFile(filePath, action.content, "utf-8");
							status.success(`Created ${action.target}`);
						}
						break;

					case "update-file":
						status.info(`Update ${action.target}: ${action.description}`);
						break;

					default:
						status.info(`${action.type}: ${action.description}`);
				}
			} catch (error) {
				status.error(
					`Failed to apply ${action.type} to ${action.target}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}
}
