/**
 * SnapBack Daemon Error Types Tests
 *
 * Comprehensive tests for error classes, error codes, and utility functions.
 *
 * @module daemon/errors.test
 */

import { describe, expect, it } from "vitest";
import {
	ConnectionError,
	DaemonError,
	InternalError,
	InvalidParamsError,
	InvalidRequestError,
	isDaemonError,
	isTransientError,
	MethodNotFoundError,
	NotImplementedError,
	ParseError,
	PathTraversalError,
	PermissionDeniedError,
	RequestTooLargeError,
	SnapshotError,
	TimeoutError,
	toDaemonError,
	ValidationError,
	WorkspaceNotFoundError,
} from "../../src/daemon/errors.js";
import { ErrorCodes } from "../../src/daemon/protocol.js";

describe("DaemonError base class", () => {
	it("should create error with code, message, and context", () => {
		const error = new DaemonError(ErrorCodes.INTERNAL_ERROR, "Test error", { foo: "bar" });

		expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
		expect(error.message).toBe("Test error");
		expect(error.context).toEqual({ foo: "bar" });
		expect(error.name).toBe("DaemonError");
		expect(error).toBeInstanceOf(Error);
	});

	it("should create error without context", () => {
		const error = new DaemonError(ErrorCodes.PARSE_ERROR, "Parse failed");

		expect(error.code).toBe(ErrorCodes.PARSE_ERROR);
		expect(error.message).toBe("Parse failed");
		expect(error.context).toBeUndefined();
	});

	it("should convert to JSON-RPC error format", () => {
		const error = new DaemonError(ErrorCodes.INVALID_REQUEST, "Bad request", { field: "id" });
		const jsonRpcError = error.toJsonRpcError();

		expect(jsonRpcError).toEqual({
			code: ErrorCodes.INVALID_REQUEST,
			message: "Bad request",
			data: { field: "id" },
		});
	});

	it("should convert to JSON-RPC error format without data when no context", () => {
		const error = new DaemonError(ErrorCodes.INTERNAL_ERROR, "Error");
		const jsonRpcError = error.toJsonRpcError();

		expect(jsonRpcError).toEqual({
			code: ErrorCodes.INTERNAL_ERROR,
			message: "Error",
			data: undefined,
		});
	});

	it("should have stack trace", () => {
		const error = new DaemonError(ErrorCodes.INTERNAL_ERROR, "Test");
		expect(error.stack).toBeDefined();
		expect(error.stack).toContain("DaemonError");
	});
});

describe("ParseError", () => {
	it("should use PARSE_ERROR code", () => {
		const error = new ParseError("Invalid JSON");

		expect(error.code).toBe(ErrorCodes.PARSE_ERROR);
		expect(error.name).toBe("ParseError");
		expect(error.message).toBe("Invalid JSON");
	});

	it("should accept context", () => {
		const error = new ParseError("Invalid JSON", { position: 42 });
		expect(error.context).toEqual({ position: 42 });
	});
});

describe("InvalidRequestError", () => {
	it("should use INVALID_REQUEST code", () => {
		const error = new InvalidRequestError("Missing id field");

		expect(error.code).toBe(ErrorCodes.INVALID_REQUEST);
		expect(error.name).toBe("InvalidRequestError");
	});
});

describe("MethodNotFoundError", () => {
	it("should include method in message and context", () => {
		const error = new MethodNotFoundError("daemon.unknown");

		expect(error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
		expect(error.name).toBe("MethodNotFoundError");
		expect(error.message).toBe("Unknown method: daemon.unknown");
		expect(error.context).toEqual({ method: "daemon.unknown" });
	});
});

describe("InvalidParamsError", () => {
	it("should use INVALID_PARAMS code", () => {
		const error = new InvalidParamsError("workspace is required", { param: "workspace" });

		expect(error.code).toBe(ErrorCodes.INVALID_PARAMS);
		expect(error.name).toBe("InvalidParamsError");
		expect(error.context).toEqual({ param: "workspace" });
	});
});

describe("InternalError", () => {
	it("should use INTERNAL_ERROR code", () => {
		const error = new InternalError("Unexpected failure");

		expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
		expect(error.name).toBe("InternalError");
	});
});

describe("WorkspaceNotFoundError", () => {
	it("should include workspace in message and context", () => {
		const error = new WorkspaceNotFoundError("/path/to/workspace");

		expect(error.code).toBe(ErrorCodes.WORKSPACE_NOT_FOUND);
		expect(error.name).toBe("WorkspaceNotFoundError");
		expect(error.message).toBe("Workspace not found: /path/to/workspace");
		expect(error.context).toEqual({ workspace: "/path/to/workspace" });
	});
});

describe("SnapshotError", () => {
	it("should use SNAPSHOT_FAILED code", () => {
		const error = new SnapshotError("Failed to create snapshot", { files: 5 });

		expect(error.code).toBe(ErrorCodes.SNAPSHOT_FAILED);
		expect(error.name).toBe("SnapshotError");
		expect(error.context).toEqual({ files: 5 });
	});
});

describe("ValidationError", () => {
	it("should use VALIDATION_FAILED code", () => {
		const error = new ValidationError("Path cannot be empty");

		expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
		expect(error.name).toBe("ValidationError");
	});
});

describe("PermissionDeniedError", () => {
	it("should use PERMISSION_DENIED code", () => {
		const error = new PermissionDeniedError("Access denied to file");

		expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
		expect(error.name).toBe("PermissionDeniedError");
	});
});

describe("TimeoutError", () => {
	it("should include operation and timeout in message and context", () => {
		const error = new TimeoutError("snapshot.create", 30000);

		expect(error.code).toBe(ErrorCodes.TIMEOUT);
		expect(error.name).toBe("TimeoutError");
		expect(error.message).toBe("Operation timed out after 30000ms: snapshot.create");
		expect(error.context).toEqual({ operation: "snapshot.create", timeoutMs: 30000 });
	});
});

describe("PathTraversalError", () => {
	it("should use PERMISSION_DENIED code and include path", () => {
		const error = new PathTraversalError("../../../etc/passwd");

		expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
		expect(error.name).toBe("PathTraversalError");
		expect(error.message).toBe("Path traversal detected: ../../../etc/passwd");
		expect(error.context).toEqual({ path: "../../../etc/passwd" });
	});
});

describe("RequestTooLargeError", () => {
	it("should include size and maxSize in message and context", () => {
		const error = new RequestTooLargeError(2000000, 1000000);

		expect(error.code).toBe(ErrorCodes.INVALID_REQUEST);
		expect(error.name).toBe("RequestTooLargeError");
		expect(error.message).toBe("Request too large: 2000000 bytes (max: 1000000)");
		expect(error.context).toEqual({ size: 2000000, maxSize: 1000000 });
	});
});

describe("NotImplementedError", () => {
	it("should include feature in message and context", () => {
		const error = new NotImplementedError("file watching");

		expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
		expect(error.name).toBe("NotImplementedError");
		expect(error.message).toBe("Not implemented: file watching");
		expect(error.context).toEqual({ feature: "file watching" });
	});
});

describe("ConnectionError", () => {
	it("should default to transient", () => {
		const error = new ConnectionError("Connection refused");

		expect(error.code).toBe(ErrorCodes.DAEMON_NOT_RUNNING);
		expect(error.name).toBe("ConnectionError");
		expect(error.isTransient).toBe(true);
	});

	it("should allow non-transient errors", () => {
		const error = new ConnectionError("Authentication failed", false);

		expect(error.isTransient).toBe(false);
	});

	it("should accept context", () => {
		const error = new ConnectionError("Connection failed", true, { attempt: 3 });

		expect(error.context).toEqual({ attempt: 3 });
	});
});

describe("isDaemonError", () => {
	it("should return true for DaemonError instances", () => {
		expect(isDaemonError(new DaemonError(1, "test"))).toBe(true);
		expect(isDaemonError(new ParseError("test"))).toBe(true);
		expect(isDaemonError(new TimeoutError("op", 1000))).toBe(true);
		expect(isDaemonError(new ConnectionError("test"))).toBe(true);
	});

	it("should return false for non-DaemonError values", () => {
		expect(isDaemonError(new Error("test"))).toBe(false);
		expect(isDaemonError("error string")).toBe(false);
		expect(isDaemonError(null)).toBe(false);
		expect(isDaemonError(undefined)).toBe(false);
		expect(isDaemonError({ code: 1, message: "test" })).toBe(false);
	});
});

describe("toDaemonError", () => {
	it("should return DaemonError as-is", () => {
		const original = new ParseError("test");
		const converted = toDaemonError(original);

		expect(converted).toBe(original);
	});

	it("should convert Error to InternalError", () => {
		const original = new Error("Something went wrong");
		original.name = "TypeError";
		const converted = toDaemonError(original);

		expect(converted).toBeInstanceOf(InternalError);
		expect(converted.message).toBe("Something went wrong");
		expect(converted.context).toMatchObject({
			originalError: "TypeError",
		});
	});

	it("should convert string to InternalError", () => {
		const converted = toDaemonError("string error");

		expect(converted).toBeInstanceOf(InternalError);
		expect(converted.message).toBe("string error");
	});

	it("should convert number to InternalError", () => {
		const converted = toDaemonError(42);

		expect(converted).toBeInstanceOf(InternalError);
		expect(converted.message).toBe("42");
	});

	it("should convert null to InternalError", () => {
		const converted = toDaemonError(null);

		expect(converted).toBeInstanceOf(InternalError);
		expect(converted.message).toBe("null");
	});
});

describe("isTransientError", () => {
	it("should return true for transient ConnectionError", () => {
		expect(isTransientError(new ConnectionError("test", true))).toBe(true);
	});

	it("should return false for non-transient ConnectionError", () => {
		expect(isTransientError(new ConnectionError("test", false))).toBe(false);
	});

	it("should return true for TimeoutError", () => {
		expect(isTransientError(new TimeoutError("op", 1000))).toBe(true);
	});

	it("should return false for other DaemonErrors", () => {
		expect(isTransientError(new ParseError("test"))).toBe(false);
		expect(isTransientError(new InternalError("test"))).toBe(false);
		expect(isTransientError(new PermissionDeniedError("test"))).toBe(false);
	});

	it("should return false for non-DaemonError values", () => {
		expect(isTransientError(new Error("test"))).toBe(false);
		expect(isTransientError("error")).toBe(false);
		expect(isTransientError(null)).toBe(false);
	});
});

describe("Error inheritance chain", () => {
	it("all error types should be instanceof DaemonError", () => {
		const errors = [
			new ParseError("test"),
			new InvalidRequestError("test"),
			new MethodNotFoundError("test"),
			new InvalidParamsError("test"),
			new InternalError("test"),
			new WorkspaceNotFoundError("test"),
			new SnapshotError("test"),
			new ValidationError("test"),
			new PermissionDeniedError("test"),
			new TimeoutError("op", 1000),
			new PathTraversalError("test"),
			new RequestTooLargeError(100, 50),
			new NotImplementedError("test"),
			new ConnectionError("test"),
		];

		for (const error of errors) {
			expect(error).toBeInstanceOf(DaemonError);
			expect(error).toBeInstanceOf(Error);
		}
	});
});
