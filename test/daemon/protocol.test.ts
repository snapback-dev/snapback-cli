/**
 * Daemon Protocol Tests
 *
 * TDD RED phase: Tests for JSON-RPC 2.0 protocol utilities
 */

import { describe, expect, it } from "vitest";
import {
	createErrorResponse,
	createNotification,
	createResponse,
	ErrorCodes,
	parseRequest,
	serializeResponse,
} from "../../src/daemon/protocol";

describe("daemon/protocol", () => {
	describe("createResponse", () => {
		it("should create a valid JSON-RPC 2.0 response", () => {
			const response = createResponse("1", { pong: true, uptime: 1000 });

			expect(response).toEqual({
				jsonrpc: "2.0",
				id: "1",
				result: { pong: true, uptime: 1000 },
			});
		});

		it("should handle null result", () => {
			const response = createResponse("2", null);

			expect(response).toEqual({
				jsonrpc: "2.0",
				id: "2",
				result: null,
			});
		});
	});

	describe("createErrorResponse", () => {
		it("should create a valid error response", () => {
			const response = createErrorResponse("3", ErrorCodes.DAEMON_NOT_RUNNING, "Daemon not running");

			expect(response).toEqual({
				jsonrpc: "2.0",
				id: "3",
				error: {
					code: ErrorCodes.DAEMON_NOT_RUNNING,
					message: "Daemon not running",
				},
			});
		});

		it("should include optional data in error", () => {
			const response = createErrorResponse("4", ErrorCodes.VALIDATION_FAILED, "Validation failed", {
				field: "task",
			});

			expect(response).toEqual({
				jsonrpc: "2.0",
				id: "4",
				error: {
					code: ErrorCodes.VALIDATION_FAILED,
					message: "Validation failed",
					data: { field: "task" },
				},
			});
		});
	});

	describe("createNotification", () => {
		it("should create a valid notification", () => {
			const notification = createNotification({
				type: "snapshot.created",
				timestamp: 1234567890,
				workspace: "/test",
				data: { snapshotId: "snap1" },
			});

			expect(notification).toEqual({
				jsonrpc: "2.0",
				method: "notification",
				params: {
					type: "snapshot.created",
					timestamp: 1234567890,
					workspace: "/test",
					data: { snapshotId: "snap1" },
				},
			});
		});
	});

	describe("parseRequest", () => {
		it("should parse a valid JSON-RPC request", () => {
			const line = JSON.stringify({
				jsonrpc: "2.0",
				id: "5",
				method: "daemon.ping",
				params: {},
			});

			const request = parseRequest(line);

			expect(request).toEqual({
				jsonrpc: "2.0",
				id: "5",
				method: "daemon.ping",
				params: {},
			});
		});

		it("should throw for invalid JSON", () => {
			expect(() => parseRequest("not json")).toThrow();
		});

		it("should throw for missing jsonrpc version", () => {
			const line = JSON.stringify({
				id: "6",
				method: "daemon.ping",
			});

			expect(() => parseRequest(line)).toThrow("Invalid JSON-RPC 2.0 request");
		});

		it("should throw for missing id", () => {
			const line = JSON.stringify({
				jsonrpc: "2.0",
				method: "daemon.ping",
			});

			expect(() => parseRequest(line)).toThrow("Invalid JSON-RPC 2.0 request");
		});

		it("should throw for missing method", () => {
			const line = JSON.stringify({
				jsonrpc: "2.0",
				id: "7",
			});

			expect(() => parseRequest(line)).toThrow("Invalid JSON-RPC 2.0 request");
		});
	});

	describe("serializeResponse", () => {
		it("should serialize response with newline", () => {
			const response = createResponse("8", { status: "ok" });
			const serialized = serializeResponse(response);

			expect(serialized).toBe('{"jsonrpc":"2.0","id":"8","result":{"status":"ok"}}\n');
		});

		it("should serialize notification with newline", () => {
			const notification = createNotification({
				type: "session.started",
				timestamp: 1234567890,
				workspace: "/test",
				data: {},
			});
			const serialized = serializeResponse(notification);

			expect(serialized).toContain('"method":"notification"');
			expect(serialized.endsWith("\n")).toBe(true);
		});
	});

	describe("ErrorCodes", () => {
		it("should have standard JSON-RPC error codes", () => {
			expect(ErrorCodes.PARSE_ERROR).toBe(-32700);
			expect(ErrorCodes.INVALID_REQUEST).toBe(-32600);
			expect(ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
			expect(ErrorCodes.INVALID_PARAMS).toBe(-32602);
			expect(ErrorCodes.INTERNAL_ERROR).toBe(-32603);
		});

		it("should have SnapBack-specific error codes", () => {
			expect(ErrorCodes.DAEMON_NOT_RUNNING).toBe(-32000);
			expect(ErrorCodes.WORKSPACE_NOT_FOUND).toBe(-32001);
			expect(ErrorCodes.SNAPSHOT_FAILED).toBe(-32002);
			expect(ErrorCodes.VALIDATION_FAILED).toBe(-32003);
			expect(ErrorCodes.PERMISSION_DENIED).toBe(-32004);
			expect(ErrorCodes.TIMEOUT).toBe(-32005);
		});
	});
});
