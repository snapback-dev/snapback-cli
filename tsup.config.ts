// DTS disabled: tsup DTS generation conflicts with composite TypeScript project setup.
// Type declarations are generated separately via `tsc --build tsconfig.build.json --emitDeclarationOnly`
import { dtsFalseLibraryPreset } from "../../tooling/tsup-config";

export default dtsFalseLibraryPreset({
	splitting: true,
	// Bundle workspace dependencies to create standalone CLI package
	noExternal: [
		"@snapback/contracts",
		"@snapback/core",
		"@snapback/core-runtime",
		"@snapback/mcp",
		"@snapback/mcp-config",
		"@snapback/engine",
		"@snapback/intelligence",
		"@snapback/sdk",
		"@snapback-oss/sdk", // OSS SDK re-exported by Pro SDK
		"@snapback-oss/infrastructure", // Required by OSS SDK
		"@snapback-oss/contracts", // Required by OSS SDK
	],
});
