/**
 * CLI-UX-006: State Persistence
 *
 * Manages persistent state for Pioneer Program (points, achievements, streaks)
 * and user preferences across CLI sessions.
 *
 * @see ../resources/cli_ux_implementation/06-state-persistence.md
 */

// TODO: Add dependency - pnpm add conf@^13.0.1

import Conf from "conf";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
// TODO: Copy from 06-state-persistence.md lines 64-115

export interface PioneerStats {
	// TODO: Copy PioneerStats interface from spec line 68-79
	snapshotsCreated: number;
	restoresPerformed: number;
	risksDetected: number;
	filesAnalyzed: number;
	highRiskAverted: number;
	currentStreak: number;
	longestStreak: number;
	totalDaysActive: number;
	sharesGenerated: number;
	shareClicks: number;
}

export interface UnlockedAchievement {
	// TODO: Copy from spec line 81-84
	id: string;
	unlockedAt: string;
}

export interface PioneerState {
	// TODO: Copy from spec line 86-98
	pioneerNumber: number;
	level: "bronze" | "silver" | "gold" | "platinum";
	totalPoints: number;
	unlockedAchievements: UnlockedAchievement[];
	stats: PioneerStats;
	currentStreak: number;
	lastActiveDate: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserPreferences {
	// TODO: Copy from spec line 100-112
	verbosity: "quiet" | "normal" | "verbose";
	colorScheme: "auto" | "light" | "dark" | "none";
	showAchievements: boolean;
	showProgress: boolean;
	defaultSnapshot: {
		includeNodeModules: boolean;
		includeGitIgnored: boolean;
	};
}

export interface SnapBackState {
	version: number;
	pioneer: PioneerState;
	preferences: UserPreferences;
}

// =============================================================================
// DEFAULTS
// =============================================================================
// TODO: Copy from 06-state-persistence.md lines 118-152

const DEFAULT_STATS: PioneerStats = {
	// TODO: Copy DEFAULT_STATS from spec line 120-131
	snapshotsCreated: 0,
	restoresPerformed: 0,
	risksDetected: 0,
	filesAnalyzed: 0,
	highRiskAverted: 0,
	currentStreak: 0,
	longestStreak: 0,
	totalDaysActive: 0,
	sharesGenerated: 0,
	shareClicks: 0,
};

const DEFAULT_PREFERENCES: UserPreferences = {
	// TODO: Copy DEFAULT_PREFERENCES from spec line 133-143
	verbosity: "normal",
	colorScheme: "auto",
	showAchievements: true,
	showProgress: true,
	defaultSnapshot: {
		includeNodeModules: false,
		includeGitIgnored: false,
	},
};

function createDefaultPioneerState(): PioneerState {
	// TODO: Copy from spec lines 145-156
	return {
		pioneerNumber: generatePioneerNumber(),
		level: "bronze",
		totalPoints: 0,
		unlockedAchievements: [],
		stats: { ...DEFAULT_STATS },
		currentStreak: 0,
		lastActiveDate: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}

function generatePioneerNumber(): number {
	// TODO: Copy from spec lines 158-163
	const base = Date.now() % 10000;
	const rand = Math.floor(Math.random() * 1000);
	return base + rand;
}

// =============================================================================
// SCHEMA FOR VALIDATION
// =============================================================================
// TODO: Copy SCHEMA from 06-state-persistence.md lines 168-222

const SCHEMA = {
	// TODO: Copy full schema definition from spec lines 168-222
} as const;

// =============================================================================
// STATE MANAGER CLASS
// =============================================================================
// TODO: Copy StateManager class from 06-state-persistence.md lines 226-320

class StateManager {
	private conf: Conf<SnapBackState>;
	private cache: SnapBackState | null = null;

	constructor() {
		// TODO: Copy constructor from spec lines 230-247
		this.conf = new Conf<SnapBackState>({
			projectName: "snapback",
			projectVersion: "1.0.0",
			schema: SCHEMA as any,
			defaults: {
				version: 1,
				pioneer: createDefaultPioneerState(),
				preferences: DEFAULT_PREFERENCES,
			},
			migrations: {
				// Future migrations go here
			},
		});
	}

	/**
	 * Get Pioneer state
	 */
	getPioneerState(): PioneerState {
		// TODO: Copy from spec lines 252-256
		if (!this.cache) {
			this.cache = this.conf.store;
		}
		return { ...this.cache.pioneer };
	}

	/**
	 * Save Pioneer state
	 */
	savePioneerState(state: PioneerState): void {
		// TODO: Copy from spec lines 261-267
		state.updatedAt = new Date().toISOString();
		this.conf.set("pioneer", state);
		if (this.cache) {
			this.cache.pioneer = state;
		}
	}

	/**
	 * Get user preferences
	 */
	getPreferences(): UserPreferences {
		// TODO: Copy from spec lines 272-274
		return { ...this.conf.get("preferences") };
	}

	/**
	 * Update user preferences
	 */
	setPreferences(prefs: Partial<UserPreferences>): void {
		// TODO: Copy from spec lines 279-282
		const current = this.getPreferences();
		this.conf.set("preferences", { ...current, ...prefs });
	}

	/**
	 * Reset all state (for testing/debugging)
	 */
	reset(): void {
		// TODO: Copy from spec lines 287-290
		this.conf.clear();
		this.cache = null;
	}

	/**
	 * Get storage file path (for debugging)
	 */
	getPath(): string {
		// TODO: Copy from spec lines 295-297
		return this.conf.path;
	}

	/**
	 * Check if this is a fresh installation
	 */
	isFirstRun(): boolean {
		// TODO: Copy from spec lines 302-306
		const pioneer = this.getPioneerState();
		return (
			pioneer.stats.snapshotsCreated === 0 &&
			pioneer.stats.filesAnalyzed === 0 &&
			pioneer.unlockedAchievements.length === 0
		);
	}

	/**
	 * Export state for backup
	 */
	export(): SnapBackState {
		// TODO: Copy from spec lines 311-313
		return JSON.parse(JSON.stringify(this.conf.store));
	}

	/**
	 * Import state from backup
	 */
	import(state: SnapBackState): void {
		// TODO: Copy from spec lines 318-324
		if (state.version !== this.conf.get("version")) {
			throw new Error("State version mismatch");
		}
		this.conf.store = state;
		this.cache = null;
	}
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const userState = new StateManager();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
// TODO: Copy utility functions from 06-state-persistence.md lines 330-362

/**
 * Get effective verbosity from preferences and CLI flags
 */
export function getEffectiveVerbosity(options: { quiet?: boolean; verbose?: boolean }): "quiet" | "normal" | "verbose" {
	// TODO: Copy from spec lines 335-339
	if (options.quiet) return "quiet";
	if (options.verbose) return "verbose";
	return userState.getPreferences().verbosity;
}

/**
 * Check if achievements should be displayed
 */
export function shouldShowAchievements(options: { quiet?: boolean }): boolean {
	// TODO: Copy from spec lines 344-347
	if (options.quiet) return false;
	return userState.getPreferences().showAchievements;
}

/**
 * Check if progress should be displayed
 */
export function shouldShowProgress(options: { quiet?: boolean }): boolean {
	// TODO: Copy from spec lines 352-355
	if (options.quiet) return false;
	return userState.getPreferences().showProgress;
}
