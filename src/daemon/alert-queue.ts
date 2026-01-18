/**
 * Alert Queue Manager
 *
 * File-based IPC for proactive alerts between CLI daemon and MCP server.
 * Implements PROACTIVE_SNAPBACK_SPEC.md §5.6-5.7.
 *
 * Design: File-based queue (.snapback/alerts.jsonl) with chokidar watching.
 * This enables cross-platform IPC that is debuggable and crash-resistant.
 *
 * @module daemon/alert-queue
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Type Definitions (inline to avoid cross-package dependency issues)
// =============================================================================

/**
 * Alert categories for proactive notifications
 */
export type AlertCategory =
	| "high_risk_file"
	| "pressure_threshold"
	| "velocity_alert"
	| "violation_recurrence"
	| "critical_file_touch"
	| "stale_snapshot"
	| "ai_temperature"
	| "phantom_dependency"
	| "architecture_violation";

/**
 * Alert severity levels
 */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Proactive alert structure
 */
export interface ProactiveAlert {
	id: string;
	timestamp: number;
	severity: AlertSeverity;
	category: AlertCategory;
	summary: string;
	details?: string;
	suggested_action?: string;
	learning_id?: string;
	confidence: number;
	dismissible: boolean;
	expires_at?: number;
}

/**
 * Alert queue entry (stored in .snapback/alerts.jsonl)
 */
export interface AlertQueueEntry extends ProactiveAlert {
	delivered: boolean;
	delivered_at?: number;
	acted_upon?: boolean;
}

/**
 * Alert dismissal preferences
 */
export interface AlertDismissalPreferences {
	dismissed_categories: AlertCategory[];
	dismissed_ids: string[];
	last_dismissal_at?: number;
	dismissal_count: number;
}

/**
 * Alert rate limiting configuration
 */
export interface AlertRateLimiter {
	max_per_session: number;
	min_interval_ms: number;
	confidence_threshold: number;
	natural_breakpoints: Array<"after_test_run" | "after_save" | "before_commit" | "after_long_pause">;
	backoff_on_dismiss: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SNAPBACK_DIR = ".snapback";
const ALERTS_FILE = "alerts.jsonl";
const DISMISSED_FILE = "alerts-dismissed.json";
const HISTORY_FILE = "alerts-history.jsonl";

// =============================================================================
// Alert Queue Class
// =============================================================================

/**
 * Alert queue manager for daemon ↔ MCP server communication
 *
 * Usage:
 * - Daemon writes alerts via `queueAlert()`
 * - MCP server reads alerts via `getPendingAlerts()`
 * - MCP server marks alerts delivered via `markDelivered()`
 */
export class AlertQueue {
	private readonly alertsPath: string;
	private readonly dismissedPath: string;
	private readonly historyPath: string;
	private readonly rateLimiter: AlertRateLimiter;

	/** In-memory cache of pending alerts */
	private pendingAlerts: Map<string, AlertQueueEntry> = new Map();

	/** Session state for rate limiting */
	private sessionState = {
		alertsShown: 0,
		lastAlertTime: 0,
		dismissalCount: 0,
	};

	constructor(
		workspaceRoot: string,
		rateLimiter: AlertRateLimiter = {
			max_per_session: 3,
			min_interval_ms: 60000,
			confidence_threshold: 80,
			natural_breakpoints: ["after_test_run", "after_save", "before_commit", "after_long_pause"],
			backoff_on_dismiss: true,
		},
	) {
		const snapbackDir = join(workspaceRoot, SNAPBACK_DIR);

		// Ensure .snapback directory exists
		if (!existsSync(snapbackDir)) {
			mkdirSync(snapbackDir, { recursive: true });
		}

		this.alertsPath = join(snapbackDir, ALERTS_FILE);
		this.dismissedPath = join(snapbackDir, DISMISSED_FILE);
		this.historyPath = join(snapbackDir, HISTORY_FILE);
		this.rateLimiter = rateLimiter;

		// Load existing alerts on construction
		this.loadAlerts();
	}

	// =========================================================================
	// Public API: Writing Alerts (Daemon)
	// =========================================================================

	/**
	 * Queue a new alert for delivery
	 *
	 * @param alert - The alert to queue
	 * @returns true if queued, false if filtered (dismissed, rate-limited, etc.)
	 */
	queueAlert(alert: ProactiveAlert): boolean {
		// Check dismissal preferences
		if (this.isAlertDismissed(alert)) {
			return false;
		}

		// Check rate limits
		if (!this.passesRateLimit(alert)) {
			return false;
		}

		// Check confidence threshold
		if (alert.confidence < this.rateLimiter.confidence_threshold) {
			return false;
		}

		// Check for duplicate
		if (this.isDuplicate(alert)) {
			return false;
		}

		// Create queue entry
		const entry: AlertQueueEntry = {
			...alert,
			delivered: false,
		};

		// Add to in-memory cache
		this.pendingAlerts.set(alert.id, entry);

		// Persist to file
		this.appendToFile(this.alertsPath, entry);

		return true;
	}

	/**
	 * Generate a new alert from detection
	 *
	 * Helper that creates a properly-formed ProactiveAlert with generated ID
	 */
	createAlert(params: {
		category: AlertCategory;
		severity: ProactiveAlert["severity"];
		summary: string;
		details?: string;
		suggested_action?: string;
		learning_id?: string;
		confidence: number;
		dismissible?: boolean;
		expires_in_ms?: number;
	}): ProactiveAlert {
		const now = Date.now();

		return {
			id: `alert_${now}_${Math.random().toString(36).slice(2, 8)}`,
			timestamp: now,
			severity: params.severity,
			category: params.category,
			summary: params.summary,
			details: params.details,
			suggested_action: params.suggested_action,
			learning_id: params.learning_id,
			confidence: params.confidence,
			dismissible: params.dismissible ?? true,
			expires_at: params.expires_in_ms ? now + params.expires_in_ms : undefined,
		};
	}

	// =========================================================================
	// Public API: Reading Alerts (MCP Server)
	// =========================================================================

	/**
	 * Get pending alerts for delivery
	 *
	 * @param maxAlerts - Maximum alerts to return (default: 3)
	 * @returns Array of pending alerts, sorted by severity then timestamp
	 */
	getPendingAlerts(maxAlerts = 3): ProactiveAlert[] {
		// Reload from file to catch daemon updates
		this.loadAlerts();

		// Filter to undelivered, unexpired alerts
		const now = Date.now();
		const pending = Array.from(this.pendingAlerts.values()).filter((entry) => {
			if (entry.delivered) {
				return false;
			}
			if (entry.expires_at && entry.expires_at < now) {
				return false;
			}
			return true;
		});

		// Sort by severity (critical > warning > info) then by timestamp (newest first)
		const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
		pending.sort((a, b) => {
			const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
			if (severityDiff !== 0) {
				return severityDiff;
			}
			return b.timestamp - a.timestamp;
		});

		// Return top N alerts (excluding queue metadata)
		return pending.slice(0, maxAlerts).map((entry) => ({
			id: entry.id,
			timestamp: entry.timestamp,
			severity: entry.severity,
			category: entry.category,
			summary: entry.summary,
			details: entry.details,
			suggested_action: entry.suggested_action,
			learning_id: entry.learning_id,
			confidence: entry.confidence,
			dismissible: entry.dismissible,
			expires_at: entry.expires_at,
		}));
	}

	/**
	 * Mark alerts as delivered
	 *
	 * @param alertIds - IDs of alerts that were delivered
	 */
	markDelivered(alertIds: string[]): void {
		const now = Date.now();

		for (const id of alertIds) {
			const entry = this.pendingAlerts.get(id);
			if (entry) {
				entry.delivered = true;
				entry.delivered_at = now;
			}
		}

		// Update session state
		this.sessionState.alertsShown += alertIds.length;
		this.sessionState.lastAlertTime = now;

		// Move delivered alerts to history
		this.archiveDeliveredAlerts(alertIds);
	}

	/**
	 * Record that an alert was acted upon
	 *
	 * @param alertId - ID of the alert
	 */
	markActedUpon(alertId: string): void {
		const entry = this.pendingAlerts.get(alertId);
		if (entry) {
			entry.acted_upon = true;
		}
	}

	// =========================================================================
	// Public API: Dismissal Management
	// =========================================================================

	/**
	 * Dismiss an alert or category
	 *
	 * @param alertId - Specific alert ID to dismiss
	 * @param category - Optional: dismiss entire category
	 */
	dismissAlert(alertId: string, category?: AlertCategory): void {
		const prefs = this.loadDismissalPreferences();

		if (category) {
			// Dismiss category
			if (!prefs.dismissed_categories.includes(category)) {
				prefs.dismissed_categories.push(category);
			}
		} else {
			// Dismiss specific alert
			if (!prefs.dismissed_ids.includes(alertId)) {
				prefs.dismissed_ids.push(alertId);
			}
		}

		prefs.last_dismissal_at = Date.now();
		prefs.dismissal_count += 1;

		this.saveDismissalPreferences(prefs);

		// Update session state for backoff
		this.sessionState.dismissalCount += 1;

		// Remove from pending
		this.pendingAlerts.delete(alertId);
	}

	/**
	 * Reset dismissal preferences (e.g., on new session)
	 */
	resetDismissals(): void {
		const prefs: AlertDismissalPreferences = {
			dismissed_categories: [],
			dismissed_ids: [],
			dismissal_count: 0,
		};
		this.saveDismissalPreferences(prefs);
	}

	// =========================================================================
	// Public API: Queue Management
	// =========================================================================

	/**
	 * Clear all pending alerts
	 */
	clearPending(): void {
		this.pendingAlerts.clear();
		writeFileSync(this.alertsPath, "", "utf-8");
	}

	/**
	 * Get queue stats for debugging/monitoring
	 */
	getStats(): {
		pending: number;
		delivered: number;
		dismissed: number;
		session_alerts_shown: number;
	} {
		let pending = 0;
		let delivered = 0;

		for (const entry of this.pendingAlerts.values()) {
			if (entry.delivered) {
				delivered++;
			} else {
				pending++;
			}
		}

		const prefs = this.loadDismissalPreferences();

		return {
			pending,
			delivered,
			dismissed: prefs.dismissed_ids.length + prefs.dismissed_categories.length,
			session_alerts_shown: this.sessionState.alertsShown,
		};
	}

	// =========================================================================
	// Private: Rate Limiting
	// =========================================================================

	private passesRateLimit(_alert: ProactiveAlert): boolean {
		const now = Date.now();

		// Check max per session
		if (this.sessionState.alertsShown >= this.rateLimiter.max_per_session) {
			return false;
		}

		// Check min interval (with backoff for dismissals)
		const interval = this.rateLimiter.backoff_on_dismiss
			? this.rateLimiter.min_interval_ms * (1 + this.sessionState.dismissalCount * 0.5)
			: this.rateLimiter.min_interval_ms;

		if (now - this.sessionState.lastAlertTime < interval) {
			return false;
		}

		return true;
	}

	// =========================================================================
	// Private: Dismissal Checking
	// =========================================================================

	private isAlertDismissed(alert: ProactiveAlert): boolean {
		const prefs = this.loadDismissalPreferences();

		// Check if specific alert dismissed
		if (prefs.dismissed_ids.includes(alert.id)) {
			return true;
		}

		// Check if category dismissed
		if (prefs.dismissed_categories.includes(alert.category)) {
			return true;
		}

		return false;
	}

	private loadDismissalPreferences(): AlertDismissalPreferences {
		try {
			if (existsSync(this.dismissedPath)) {
				const content = readFileSync(this.dismissedPath, "utf-8");
				return JSON.parse(content);
			}
		} catch {
			// Ignore parse errors, return default
		}

		return {
			dismissed_categories: [],
			dismissed_ids: [],
			dismissal_count: 0,
		};
	}

	private saveDismissalPreferences(prefs: AlertDismissalPreferences): void {
		writeFileSync(this.dismissedPath, JSON.stringify(prefs, null, 2), "utf-8");
	}

	// =========================================================================
	// Private: Deduplication
	// =========================================================================

	private isDuplicate(alert: ProactiveAlert): boolean {
		// Check for same category alert in last 5 minutes
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

		for (const entry of this.pendingAlerts.values()) {
			if (entry.category === alert.category && entry.timestamp > fiveMinutesAgo) {
				return true;
			}
		}

		return false;
	}

	// =========================================================================
	// Private: File Operations
	// =========================================================================

	private loadAlerts(): void {
		try {
			if (!existsSync(this.alertsPath)) {
				return;
			}

			const content = readFileSync(this.alertsPath, "utf-8");
			const lines = content.trim().split("\n").filter(Boolean);

			this.pendingAlerts.clear();

			for (const line of lines) {
				try {
					const entry = JSON.parse(line) as AlertQueueEntry;
					this.pendingAlerts.set(entry.id, entry);
				} catch {
					// Skip malformed lines
				}
			}
		} catch {
			// File doesn't exist or can't be read
		}
	}

	private appendToFile(path: string, entry: AlertQueueEntry): void {
		const line = `${JSON.stringify(entry)}\n`;
		appendFileSync(path, line, "utf-8");
	}

	private archiveDeliveredAlerts(alertIds: string[]): void {
		for (const id of alertIds) {
			const entry = this.pendingAlerts.get(id);
			if (entry) {
				this.appendToFile(this.historyPath, entry);
			}
		}

		// Rewrite alerts file without delivered alerts
		const remaining = Array.from(this.pendingAlerts.values()).filter((e) => !e.delivered);

		writeFileSync(this.alertsPath, `${remaining.map((e) => JSON.stringify(e)).join("\n")}\n`, "utf-8");
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an AlertQueue instance for a workspace
 *
 * @param workspaceRoot - Absolute path to workspace
 * @param rateLimiter - Optional custom rate limiter config
 */
export function createAlertQueue(workspaceRoot: string, rateLimiter?: AlertRateLimiter): AlertQueue {
	return new AlertQueue(workspaceRoot, rateLimiter);
}
