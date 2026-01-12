// DTS disabled: tsup DTS generation conflicts with composite TypeScript project setup.
// Type declarations are generated separately via `tsc --build tsconfig.build.json --emitDeclarationOnly`
import { dtsFalseLibraryPreset } from "../../tooling/tsup-config";

export default dtsFalseLibraryPreset({
	splitting: true,
});
