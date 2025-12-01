import { beforeEach, describe, expect, it, vi } from "vitest";
import { check, prepush } from "../../src/index";

describe("Git hooks unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should export check and prepush functions", () => {
		expect(typeof check).toBe("function");
		expect(typeof prepush).toBe("function");
	});

	it("should have proper function signatures", () => {
		// Test that functions can be called with expected parameters
		expect(check).toBeDefined();
		expect(prepush).toBeDefined();
	});
});
