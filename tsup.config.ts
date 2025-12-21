import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	// DTS disabled: tsup DTS generation conflicts with composite TypeScript project setup.
	// Type declarations are generated separately via `tsc --build tsconfig.build.json --emitDeclarationOnly`
	// in the build script (see package.json). This avoids TS6307 errors about missing files in project.
	dts: false,
	splitting: true,
	sourcemap: true,
	clean: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
