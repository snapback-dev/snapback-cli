import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for apps/cli
 * Uses shared nodeConfig preset from @snapback/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		resolve: {
			alias: {
				"@cli": resolve(__dirname, "./src"),
			},
		},
		test: {
			name: "@snapback/cli",
			include: ["test/**/*.test.ts"],
		},
	}),
);
