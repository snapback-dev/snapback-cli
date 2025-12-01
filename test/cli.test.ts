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

// Mock core dependencies
const mockGuardian = {
	quickCheckDoc: vi.fn(),
	analyzeWithAST: vi.fn(),
};

const mockStorage = {
	create: vi.fn(),
	list: vi.fn(),
};

vi.mock("@snapback/core", () => ({
	Guardian: vi.fn(() => mockGuardian),
}));

vi.mock("@snapback/storage", () => ({
	FileSystemStorage: vi.fn(() => mockStorage),
}));

// Mock fs/promises
const mockFs = {
	readFile: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);

// Mock path
const mockPath = {
	resolve: vi.fn((_, file) => `/resolved/path/${file}`),
};

vi.mock("node:path", () => mockPath);

describe("CLI Unit Tests", () => {
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

	it("should create a program instance", async () => {
		// Import the program directly
		const { program } = await import("../src/index");

		// Check that program is defined
		expect(program).toBeDefined();
		expect(typeof program.name).toBe("function");
	});
});
