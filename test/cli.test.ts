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

// Mock fs/promises - use importOriginal to keep real implementations
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(),
	};
});

// Mock path - use importOriginal to keep real implementations (like dirname)
vi.mock("node:path", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:path")>();
	return {
		...actual,
		resolve: vi.fn((_, file) => `/resolved/path/${file}`),
	};
});

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

	it("should create a program instance via createCLI", async () => {
		// Import and call createCLI
		const { createCLI } = await import("../src/index");
		const program = await createCLI();

		// Check that program is defined
		expect(program).toBeDefined();
		expect(typeof program.name).toBe("function");
	});
});
