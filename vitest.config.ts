import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@cli": resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.{test,spec}.{ts,js}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/**", "dist/**", ".next/**", "**/*.config.*", "**/*.d.ts", "**/types/**"],
		},
	},
});
