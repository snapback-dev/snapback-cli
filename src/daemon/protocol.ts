/**
 * SnapBack Daemon Protocol
 *
 * JSON-RPC 2.0 protocol for communication between CLI/Extension and daemon.
 * Uses Unix sockets (Linux/macOS) or named pipes (Windows).
 *
 * @module daemon/protocol
 */

// =============================================================================
// JSON-RPC 2.0 BASE TYPES
// =============================================================================

/**
 * JSON-RPC 2.0 Request
 */
export interface DaemonRequest {
	jsonrpc: "2.0";
	id: string;
	method: DaemonMethod;
	params: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface DaemonResponse {
	jsonrpc: "2.0";
	id: string;
	result?: unknown;
	error?: DaemonError;
}

/**
 * JSON-RPC 2.0 Notification (no response expected)
 */
export interface DaemonNotification {
	jsonrpc: "2.0";
	method: "notification";
	params: DaemonEvent;
}

/**
 * JSON-RPC 2.0 Error
 */
export interface DaemonError {
	code: number;
	message: string;
	data?: unknown;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
	// JSON-RPC standard errors
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,

	// SnapBack-specific errors
	DAEMON_NOT_RUNNING: -32000,
	WORKSPACE_NOT_FOUND: -32001,
	SNAPSHOT_FAILED: -32002,
	VALIDATION_FAILED: -32003,
	PERMISSION_DENIED: -32004,
	TIMEOUT: -32005,
} as const;

// =============================================================================
// DAEMON METHODS
// =============================================================================

export type DaemonMethod =
	// Lifecycle
	| "daemon.ping"
	| "daemon.status"
	| "daemon.shutdown"
	| "daemon.reload"

	// Session
	| "session.begin"
	| "session.end"
	| "session.status"
	| "session.review"
	| "session.changes"

	// Snapshots
	| "snapshot.create"
	| "snapshot.restore"
	| "snapshot.list"
	| "snapshot.delete"

	// Learnings
	| "learning.add"
	| "learning.search"
	| "learning.list"

	// Context
	| "context.get"
	| "context.validate"
	| "context.check_patterns"

	// Validation
	| "validate.quick"
	| "validate.comprehensive"

	// Violations
	| "violation.report"
	| "violation.list"

	// File watching (proactive)
	| "watch.subscribe"
	| "watch.unsubscribe"
	| "watch.file_changed";

// =============================================================================
// METHOD PARAMETERS
// =============================================================================

export type PingParams = Record<string, never>;

export type StatusParams = Record<string, never>;

export type ShutdownParams = Record<string, never>;

export interface BeginSessionParams {
	workspace: string;
	task: string;
	files?: string[];
	keywords?: string[];
}

export interface EndSessionParams {
	workspace: string;
	outcome?: "completed" | "abandoned" | "blocked";
	notes?: string;
	createSnapshot?: boolean;
	acceptLearnings?: number[];
}

export interface SessionStatusParams {
	workspace: string;
}

export interface SessionReviewParams {
	workspace: string;
	files?: string[];
	includeCommitMessage?: boolean;
	skipPatterns?: boolean;
}

export interface SessionChangesParams {
	workspace: string;
	includeDiff?: boolean;
	filterFiles?: string[];
	includeAIAttribution?: boolean;
}

export interface CreateSnapshotParams {
	workspace: string;
	files: string[];
	reason?: string;
	trigger?: "manual" | "mcp" | "ai_assist" | "session_end";
}

export interface RestoreSnapshotParams {
	workspace: string;
	snapshotId: string;
	files?: string[];
	dryRun?: boolean;
}

export interface ListSnapshotsParams {
	workspace: string;
	limit?: number;
	since?: string;
}

export interface DeleteSnapshotParams {
	workspace: string;
	snapshotId: string;
}

export interface AddLearningParams {
	workspace: string;
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	action: string;
	source?: string;
}

export interface SearchLearningsParams {
	workspace: string;
	keywords: string[];
	limit?: number;
}

export interface ListLearningsParams {
	workspace: string;
	limit?: number;
}

export interface GetContextParams {
	workspace: string;
	task: string;
	files?: string[];
	keywords?: string[];
}

export interface ValidateContextParams {
	workspace: string;
}

export interface CheckPatternsParams {
	workspace: string;
	code: string;
	filePath: string;
}

export interface QuickValidateParams {
	workspace: string;
	file?: string;
	files?: string[];
	runTests?: boolean;
	skipTypeScript?: boolean;
	skipTests?: boolean;
	skipLint?: boolean;
}

export interface ComprehensiveValidateParams {
	workspace: string;
	code: string;
	filePath: string;
}

export interface ReportViolationParams {
	workspace: string;
	type: string;
	file: string;
	whatHappened: string;
	whyItHappened: string;
	prevention: string;
}

export interface ListViolationsParams {
	workspace: string;
}

export interface WatchSubscribeParams {
	workspace: string;
	patterns?: string[];
}

export interface WatchUnsubscribeParams {
	workspace: string;
}

export interface FileChangedParams {
	workspace: string;
	file: string;
	timestamp: number;
}

// =============================================================================
// METHOD RESPONSES
// =============================================================================

export interface PingResult {
	pong: true;
	uptime: number;
	version: string;
}

export interface StatusResult {
	pid: number;
	version: string;
	uptime: number;
	startedAt: string;
	workspaces: number;
	connections: number;
	memoryUsage: {
		heapUsed: number;
		heapTotal: number;
		rss: number;
	};
	idleTimeout: number;
	lastActivity: number;
}

export interface ShutdownResult {
	shutting_down: true;
}

export interface BeginSessionResult {
	taskId: string;
	snapshot?: {
		created: boolean;
		snapshotId?: string;
		reason: string;
	};
	patterns: unknown[];
	constraints: unknown[];
	learnings: unknown[];
	riskAssessment: {
		overallRisk: "low" | "medium" | "high";
		riskAreas: string[];
		recommendations: string[];
	};
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
	}>;
}

export interface EndSessionResult {
	summary: {
		filesModified: number;
		linesChanged: number;
		duration: number;
	};
	snapshot?: {
		created: boolean;
		snapshotId?: string;
	};
	learningsAccepted: number;
}

export interface SessionStatusResult {
	active: boolean;
	taskId?: string;
	task?: string;
	startedAt?: string;
	filesModified: number;
	snapshotCount: number;
}

export interface SessionReviewResult {
	readyToCommit: boolean;
	validation: {
		passed: boolean;
		issues: unknown[];
	};
	changes: {
		filesModified: number;
		linesChanged: number;
	};
	suggestedCommitMessage?: string;
	suggestedLearnings: unknown[];
}

export interface SessionChangesResult {
	files: Array<{
		path: string;
		status: "created" | "modified" | "deleted";
		linesChanged: number;
		aiAttributed?: boolean;
	}>;
	totalLinesChanged: number;
	riskAssessment: {
		overallRisk: "low" | "medium" | "high";
	};
}

export interface CreateSnapshotResult {
	snapshotId: string;
	fileCount: number;
	totalSize: number;
	createdAt: string;
	deduplicated: boolean;
}

export interface RestoreSnapshotResult {
	restored: boolean;
	filesRestored: number;
	dryRun: boolean;
	changes?: Array<{
		file: string;
		action: "restore" | "create" | "skip";
	}>;
}

export interface ListSnapshotsResult {
	snapshots: Array<{
		id: string;
		reason?: string;
		fileCount: number;
		totalSize: number;
		createdAt: string;
		trigger: string;
	}>;
	total: number;
}

export interface AddLearningResult {
	learningId: string;
	message: string;
}

export interface SearchLearningsResult {
	learnings: unknown[];
	count: number;
}

export interface GetContextResult {
	patterns: unknown[];
	constraints: unknown[];
	learnings: unknown[];
	observations: unknown[];
	riskAssessment: {
		overallRisk: "low" | "medium" | "high";
		riskAreas: string[];
		recommendations: string[];
	};
}

export interface CheckPatternsResult {
	passed: boolean;
	violations: unknown[];
	suggestions: string[];
}

export interface QuickValidateResult {
	passed: boolean;
	typescript?: {
		passed: boolean;
		errors: number;
	};
	tests?: {
		discovered: number;
		passed?: number;
		failed?: number;
	};
	lint?: {
		passed: boolean;
		errors: number;
		warnings: number;
	};
}

export interface ReportViolationResult {
	violationId: string;
	count: number;
	promoted: boolean;
	promotedTo?: "pattern" | "automation";
}

// =============================================================================
// DAEMON EVENTS (Push Notifications)
// =============================================================================

export type DaemonEventType =
	| "snapshot.created"
	| "snapshot.restored"
	| "risk.detected"
	| "session.started"
	| "session.ended"
	| "learning.matched"
	| "validation.failed"
	| "daemon.shutting_down";

export interface DaemonEvent {
	type: DaemonEventType;
	timestamp: number;
	workspace?: string;
	data: unknown;
}

export interface RiskDetectedEvent {
	type: "risk.detected";
	timestamp: number;
	workspace: string;
	data: {
		file: string;
		riskLevel: "low" | "medium" | "high";
		reason: string;
		suggestion: string;
	};
}

export interface SnapshotCreatedEvent {
	type: "snapshot.created";
	timestamp: number;
	workspace: string;
	data: {
		snapshotId: string;
		fileCount: number;
		reason?: string;
	};
}

export interface SessionSavedEvent {
	type: "session.ended";
	timestamp: number;
	workspace: string;
	data: {
		restoredFromDisaster?: boolean;
		linesRecovered?: number;
		timeAgo?: string;
	};
}

// =============================================================================
// WORKSPACE CONTEXT
// =============================================================================

export interface WorkspaceContext {
	id: string;
	root: string;
	initialized: boolean;
	sessionActive: boolean;
	currentTaskId?: string;
	/** Timestamp when session was started (for duration calculation) */
	sessionStartedAt?: number;
	snapshotCount: number;
	lastActivity: number;
	subscribers: Set<string>;
}

// =============================================================================
// DAEMON STATE
// =============================================================================

export interface DaemonState {
	pid: number;
	version: string;
	startedAt: number;
	lastActivity: number;
	workspaces: Map<string, WorkspaceContext>;
	connectionCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a successful response
 */
export function createResponse(id: string, result: unknown): DaemonResponse {
	return {
		jsonrpc: "2.0",
		id,
		result,
	};
}

/**
 * Create an error response
 */
export function createErrorResponse(id: string, code: number, message: string, data?: unknown): DaemonResponse {
	return {
		jsonrpc: "2.0",
		id,
		error: { code, message, data },
	};
}

/**
 * Create a notification (no id, no response expected)
 */
export function createNotification(event: DaemonEvent): DaemonNotification {
	return {
		jsonrpc: "2.0",
		method: "notification",
		params: event,
	};
}

/**
 * Parse a request from a line of text
 */
export function parseRequest(line: string): DaemonRequest {
	const parsed = JSON.parse(line);
	if (parsed.jsonrpc !== "2.0" || !parsed.id || !parsed.method) {
		throw new Error("Invalid JSON-RPC 2.0 request");
	}
	return parsed as DaemonRequest;
}

/**
 * Serialize a response to a line of text
 */
export function serializeResponse(response: DaemonResponse | DaemonNotification): string {
	return `${JSON.stringify(response)}\n`;
}
