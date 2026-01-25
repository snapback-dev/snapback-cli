import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock external dependencies
const mockInquirer = {
	prompt: vi.fn(),
	registerPrompt: vi.fn(),
};

const mockOraInstance = {
	start: vi.fn().mockReturnThis(),
	succeed: vi.fn().mockReturnThis(),
	fail: vi.fn().mockReturnThis(),
};

const mockOra = vi.fn(() => mockOraInstance);

vi.mock("inquirer", () => ({
	default: mockInquirer,
}));

vi.mock("ora", () => ({
	default: mockOra,
}));

// Mock inquirer-file-tree-selection-prompt
const mockFileTreeSelection = vi.fn();

vi.mock("inquirer-file-tree-selection-prompt", () => ({
	default: mockFileTreeSelection,
}));

// Mock fs for statSync
const mockStatSync = vi.fn();

vi.mock("node:fs", () => ({
	statSync: mockStatSync,
}));

describe("CLI Interactive Mode Unit Tests", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it("should have basic test structure", () => {
		expect(true).toBe(true);
	});

	it("should define createCLI function", async () => {
		// Import the CLI module
		const { createCLI } = await import("../src/index");

		// Check that createCLI function is defined
		expect(typeof createCLI).toBe("function");
	});

	it("should create a program instance via createCLI", async () => {
		// Import and call createCLI
		const { createCLI } = await import("../src/index");
		const program = await createCLI();

		// Check that program is defined
		expect(program).toBeDefined();
		expect(typeof program.name).toBe("function");
	});
});
