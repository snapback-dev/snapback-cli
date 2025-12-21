import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: false, // Disable tsup DTS generation due to composite project issues
	splitting: true,
	sourcemap: true,
	clean: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
