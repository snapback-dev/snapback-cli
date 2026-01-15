// DTS disabled: tsup DTS generation conflicts with composite TypeScript project setup.
// Type declarations are generated separately via `tsc --build tsconfig.build.json --emitDeclarationOnly`
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: false,
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: true,
	treeshake: true,
	target: "node20",
	// Add shebang for CLI executable
	banner: {
		js: "#!/usr/bin/env node",
	},
	// Bundle workspace packages only - npm packages stay external
	noExternal: [/^@snapback\//, /^@snapback-oss\//],
	// Skip bundling node_modules - they'll be installed as dependencies
	skipNodeModulesBundle: true,
});
