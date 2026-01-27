/**
 * ACP Session Manager
 *
 * Manages session lifecycle for ACP connections.
 *
 * @module acp/session/manager
 */

import { randomUUID } from "node:crypto";

// =============================================================================
// TYPES
// =============================================================================

export interface Session {
	id: string;
	name?: string;
	workspacePath?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	lastActivityAt: Date;
}

export interface CreateSessionParams {
	name?: string;
	workspacePath?: string;
	metadata?: Record<string, unknown>;
}

// =============================================================================
// SESSION MANAGER
// =============================================================================

/**
 * SessionManager handles the lifecycle of ACP sessions.
 *
 * Sessions are lightweight containers that hold context for a sequence
 * of tool calls. They can optionally override the workspace path and
 * carry metadata.
 */
export class SessionManager {
	private sessions = new Map<string, Session>();
	private readonly logFn: (msg: string, data?: Record<string, unknown>) => void;

	constructor(logFn?: (msg: string, data?: Record<string, unknown>) => void) {
		this.logFn = logFn ?? (() => {});
	}

	/**
	 * Create a new session.
	 */
	async create(params: CreateSessionParams): Promise<Session> {
		const session: Session = {
			id: randomUUID(),
			name: params.name,
			workspacePath: params.workspacePath,
			metadata: params.metadata,
			createdAt: new Date(),
			lastActivityAt: new Date(),
		};

		this.sessions.set(session.id, session);
		this.logFn("Session created", { sessionId: session.id, name: session.name });

		return session;
	}

	/**
	 * Get a session by ID.
	 * Updates the lastActivityAt timestamp.
	 */
	get(id: string): Session | undefined {
		const session = this.sessions.get(id);
		if (session) {
			session.lastActivityAt = new Date();
		}
		return session;
	}

	/**
	 * Check if a session exists.
	 */
	has(id: string): boolean {
		return this.sessions.has(id);
	}

	/**
	 * Close a session by ID.
	 */
	async close(id: string): Promise<boolean> {
		const existed = this.sessions.has(id);
		this.sessions.delete(id);

		if (existed) {
			this.logFn("Session closed", { sessionId: id });
		}

		return existed;
	}

	/**
	 * Close all sessions.
	 */
	async closeAll(): Promise<void> {
		const count = this.sessions.size;
		this.sessions.clear();
		this.logFn("All sessions closed", { count });
	}

	/**
	 * List all active sessions.
	 */
	list(): Session[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Get the count of active sessions.
	 */
	get count(): number {
		return this.sessions.size;
	}

	/**
	 * Clean up inactive sessions (idle for longer than timeout).
	 */
	cleanup(maxIdleMs: number = 30 * 60 * 1000): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [id, session] of this.sessions) {
			if (now - session.lastActivityAt.getTime() > maxIdleMs) {
				this.sessions.delete(id);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.logFn("Sessions cleaned up", { cleaned, remaining: this.sessions.size });
		}

		return cleaned;
	}
}
