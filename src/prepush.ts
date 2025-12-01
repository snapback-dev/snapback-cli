// enforce reviewed-by for AI-tagged per policy

import { execSync } from "node:child_process";

interface PrePushOptions {
	enforceReviewedBy?: boolean;
}

export async function prepush(options: PrePushOptions = {}): Promise<number> {
	try {
		if (options.enforceReviewedBy) {
			// Check if any AI-tagged commits are being pushed without reviewed-by
			const aiTaggedCommits = getAITaggedCommits();
			if (aiTaggedCommits.length > 0) {
				const unreviewedCommits = aiTaggedCommits.filter((commit) => !hasReviewedBy(commit));

				if (unreviewedCommits.length > 0) {
					console.error("❌ AI-tagged commits require reviewed-by annotation:");
					for (const commit of unreviewedCommits) {
						console.error(`  ${commit.hash}: ${commit.message}`);
					}
					return 1;
				}
			}
		}

		console.log("✅ Pre-push checks passed");
		return 0;
	} catch (error) {
		console.error("Error during pre-push checks:", error);
		return 1;
	}
}

function getAITaggedCommits(): CommitInfo[] {
	try {
		// Get commits that are about to be pushed
		const output = execSync("git log --oneline --grep='AI:' $(git merge-base HEAD @{u})..HEAD", {
			encoding: "utf-8",
		});
		return output
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [hash, ...messageParts] = line.split(" ");
				return {
					hash,
					message: messageParts.join(" "),
				};
			});
	} catch (error) {
		console.error("Failed to get AI-tagged commits:", error);
		return [];
	}
}

function hasReviewedBy(commit: CommitInfo): boolean {
	try {
		// Get full commit message
		const output = execSync(`git show -s --format=%B ${commit.hash}`, {
			encoding: "utf-8",
		});
		return output.includes("Reviewed-by:");
	} catch (error) {
		console.error(`Failed to check reviewed-by for commit ${commit.hash}:`, error);
		return false;
	}
}

interface CommitInfo {
	hash: string;
	message: string;
}

// CLI entry point
if (import.meta.url === new URL(process.argv[1], "file:").href) {
	const args = process.argv.slice(2);
	const options: PrePushOptions = {};

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--enforce-reviewed-by") {
			options.enforceReviewedBy = true;
		}
	}

	prepush(options)
		.then((exitCode) => {
			process.exit(exitCode);
		})
		.catch((error) => {
			console.error("Unexpected error:", error);
			process.exit(1);
		});
}
