# SnapBack Composer Specification

**Version**: 1.0.0
**Status**: Ready for Implementation
**Location**: `packages/intelligence/src/composer/`
**Author**: Platform Engineering
**Date**: December 2025

---

## Executive Summary

The Composer is the **trust core** of SnapBack's context assembly system. It provides deterministic, reproducible artifact selection under strict token budgets with full explainability. Unlike ad-hoc context stuffing, the Composer guarantees:

1. **Determinism**: Same inputs → same outputs (provable via replay)
2. **Budget enforcement**: Never exceeds allocated tokens
3. **Explainability**: Every selection decision is logged with reasons
4. **Privacy**: Artifact IDs are stable but path-free (HMAC-based)
5. **Extensibility**: Policy Engine outputs constraints; Composer executes them

**Core Insight**: Hooks ≠ Composer. Hooks provide extensibility ("when X happens, do Y"). Composer provides deterministic context selection under budget constraints. These are separate concerns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPOSER PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Sources   │ -> │  Candidates │ -> │  Selection  │ -> │  Rendering  │  │
│  │             │    │             │    │             │    │             │  │
│  │ • Context   │    │ • Score     │    │ • Rank      │    │ • Render    │  │
│  │ • Policy    │    │ • Lane      │    │ • Allocate  │    │ • Measure   │  │
│  │ • History   │    │ • Kind      │    │ • Select    │    │ • Shrink    │  │
│  │ • Vitals    │    │ • Estimate  │    │ • Explain   │    │ • Finalize  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│                           ↓ Cache Key (inputs only) ↓                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SelectionResult                                                     │   │
│  │  • selected: ArtifactRef[] (IDs only, no content)                   │   │
│  │  • allocation: Record<Lane, number>                                  │   │
│  │  • explanation: SelectionExplanation                                 │   │
│  │  • rendered: RenderedArtifact[] (internal only)                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

### Core Types

```typescript
// packages/intelligence/src/types/composer.ts

/**
 * Lanes categorize artifacts by purpose and priority.
 * Priority 0 = highest (always included first).
 */
export type Lane =
  | 'policy'       // Priority 0: Constraints, invariants, danger zones
  | 'rules'        // Priority 1: Protection rules, config
  | 'local'        // Priority 2: Current diff, recent edits
  | 'structure'    // Priority 3: Dependency graphs
  | 'retrieved'    // Priority 4: Semantic retrieval
  | 'history';     // Priority 5: Session context

/**
 * Artifact kinds for fine-grained control.
 */
export type ArtifactKind =
  | 'constraint'        // Hard rules, invariants
  | 'rule_doc'          // Protection rules
  | 'local_diff'        // Current changes
  | 'recent_edit'       // Recent file edits
  | 'symbol_context'    // Symbol definitions
  | 'dependency_graph'  // Import/export relationships
  | 'test_context'      // Related tests
  | 'semantic_match'    // Embedding-based retrieval
  | 'session_history'   // Previous conversation context
  | 'violation'         // Recent violations
  | 'learning';         // Relevant learnings

/**
 * Reference to an artifact (safe for logs/telemetry).
 * Contains NO paths or content.
 */
export interface ArtifactRef {
  id: string;           // HMAC-based, stable, path-free
  kind: ArtifactKind;
  lane: Lane;
  tokenEstimate: number;
}

/**
 * Candidate artifact before selection.
 * Has content access internally but never exposes it.
 */
export interface ArtifactCandidate extends ArtifactRef {
  // Scoring inputs (all quantized for determinism)
  recencyBucket: number;      // 0-5, higher = more recent
  relevanceScore: number;     // 0-1, quantized to 0.001
  specificityScore: number;   // 0-1, quantized to 0.001
  riskAlignment: number;      // 0-1, how well it relates to current risk

  // Internal access (never logged)
  getContent(): string;

  // Shrink capability
  shrink(targetTokens: number): RenderedArtifact;
}

/**
 * Rendered artifact with exact token count.
 * Content is internal only.
 */
export interface RenderedArtifact {
  id: string;
  kind: ArtifactKind;
  lane: Lane;

  // Final state
  content: string;          // Internal only, never logged
  exactTokenCount: number;

  // Shrink metadata
  shrunk: boolean;
  originalTokenCount?: number;
  shrinkStrategy?: ShrinkStrategy;
}

/**
 * Shrink strategies per artifact kind.
 */
export type ShrinkStrategy =
  | 'truncate_oldest'     // For diffs: drop oldest hunks first
  | 'keep_signatures'     // For code: keep signatures, drop bodies
  | 'collapse_summary'    // For graphs: collapse to summary
  | 'drop_entries'        // For history: drop oldest entries
  | 'never';              // For rules: never shrink (hard constraint)
```

### Budget Configuration

```typescript
// packages/intelligence/src/composer/budget.ts

/**
 * Lane-specific budget configuration.
 */
export interface LaneBudget {
  min: number;      // Minimum tokens to allocate (if available)
  max: number;      // Maximum tokens allowed
  priority: number; // Lower = higher priority (0 = highest)
}

/**
 * Complete budget configuration.
 */
export interface BudgetConfig {
  totalTokens: number;
  lanes: Record<Lane, LaneBudget>;
}

/**
 * Default budget configuration.
 * Invariant: sum(lane.min) <= totalTokens
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  totalTokens: 8000,
  lanes: {
    policy:    { min: 200,  max: 500,  priority: 0 },
    rules:     { min: 500,  max: 2000, priority: 1 },
    local:     { min: 1000, max: 3000, priority: 2 },
    structure: { min: 0,    max: 1500, priority: 3 },
    retrieved: { min: 0,    max: 2000, priority: 4 },
    history:   { min: 0,    max: 1000, priority: 5 },
  },
};

/**
 * Validate budget configuration.
 * @throws Error if invalid
 */
export function validateBudgetConfig(config: BudgetConfig): void {
  const sumMins = Object.values(config.lanes)
    .reduce((sum, lane) => sum + lane.min, 0);

  if (sumMins > config.totalTokens) {
    throw new Error(
      `Invalid budget: sum of lane mins (${sumMins}) exceeds total (${config.totalTokens}). ` +
      `Reduce mins or increase totalTokens.`
    );
  }

  for (const [name, lane] of Object.entries(config.lanes)) {
    if (lane.min > lane.max) {
      throw new Error(`Lane ${name}: min (${lane.min}) > max (${lane.max})`);
    }
    if (lane.min < 0 || lane.max < 0) {
      throw new Error(`Lane ${name}: negative budget`);
    }
  }
}
```

### Constraints Interface (Policy → Composer)

```typescript
// packages/intelligence/src/composer/constraints.ts

/**
 * Matcher for identifying artifacts.
 */
export type ArtifactMatcher =
  | { type: 'id'; id: string }
  | { type: 'kind'; kind: ArtifactKind }
  | { type: 'lane'; lane: Lane }
  | { type: 'pattern'; pattern: string };  // Glob pattern on internal path

/**
 * Constraint with reason for explainability.
 */
export interface Constraint {
  match: ArtifactMatcher;
  reason: string;
}

/**
 * Constraints from Policy Engine to Composer.
 * Hard constraints that must be respected.
 */
export interface ComposerConstraints {
  /**
   * Must include these artifacts (policy-mandated).
   * Selected before scoring, use budget from their lane.
   */
  mustInclude: Constraint[];

  /**
   * Must exclude these artifacts (policy-blocked).
   * Removed before scoring, never selected.
   */
  mustExclude: Constraint[];

  /**
   * Pinned artifacts (always selected first).
   * E.g., current diff is always pinned.
   */
  pinned: Constraint[];

  /**
   * Lane requirements from policy.
   * E.g., "rules lane must have at least 300 tokens"
   */
  laneRequirements: Array<{
    lane: Lane;
    minTokens: number;
    reason: string;
  }>;
}

/**
 * Default empty constraints.
 */
export const EMPTY_CONSTRAINTS: ComposerConstraints = {
  mustInclude: [],
  mustExclude: [],
  pinned: [],
  laneRequirements: [],
};

/**
 * Check if an artifact matches a constraint.
 */
export function matches(
  artifact: ArtifactCandidate,
  matcher: ArtifactMatcher
): boolean {
  switch (matcher.type) {
    case 'id':
      return artifact.id === matcher.id;
    case 'kind':
      return artifact.kind === matcher.kind;
    case 'lane':
      return artifact.lane === matcher.lane;
    case 'pattern':
      // Pattern matching requires internal path access
      // This is only used during selection, never logged
      return false; // Implement with minimatch
  }
}
```

### Cache Key Computation

```typescript
// packages/intelligence/src/composer/cache.ts

import { createHash } from 'crypto';

/**
 * Inputs for cache key computation.
 * Key is computed BEFORE selection (not from output).
 */
export interface CacheKeyInputs {
  workspaceFingerprint: string;   // Hash of workspace structure
  triggerEvent: string;           // What triggered composition
  commitish: string;              // Git HEAD or equivalent
  candidateDigest: string;        // Hash of candidate set
  rulesDigest: string;            // Hash of active rules
  budgetConfigDigest: string;     // Hash of budget config
  constraintsDigest: string;      // Hash of constraints
  composerVersion: string;        // So upgrades invalidate
}

/**
 * Compute cache key from inputs.
 * This key is computed BEFORE doing selection work.
 */
export function computeCacheKey(inputs: CacheKeyInputs): string {
  const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash('sha256')
    .update(normalized)
    .digest('base64url')
    .slice(0, 32);
}

/**
 * Compute candidate digest from candidate set.
 * Includes id, lane, kind, tokenEstimate for each candidate.
 */
export function computeCandidateDigest(
  candidates: ArtifactCandidate[]
): string {
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const data = sorted.map(c => `${c.id}:${c.lane}:${c.kind}:${c.tokenEstimate}`);
  return createHash('sha256')
    .update(data.join('|'))
    .digest('base64url')
    .slice(0, 16);
}

/**
 * Invalidation triggers for cache.
 */
export type InvalidationTrigger =
  | 'file_saved'
  | 'git_commit'
  | 'config_changed'
  | 'rules_changed'
  | 'constraints_changed'
  | 'session_expired';  // Default: 5 minutes

/**
 * Cache TTL in milliseconds.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

### Artifact Fingerprinting

```typescript
// packages/intelligence/src/composer/fingerprint.ts

import { createHash, createHmac } from 'crypto';

/**
 * Configuration for fingerprinting.
 */
export interface FingerprintConfig {
  workspaceSecret: string;  // Generated once per workspace, stored locally
  algorithm: 'sha256';
  encoding: 'base64url';
}

/**
 * Generate workspace secret (called once per workspace).
 */
export function generateWorkspaceSecret(): string {
  return createHash('sha256')
    .update(crypto.randomUUID())
    .update(Date.now().toString())
    .digest('base64url');
}

/**
 * Generate stable artifact ID.
 * Safe for logs/telemetry (no paths exposed).
 */
export function computeArtifactId(
  artifact: {
    kind: ArtifactKind;
    lane: Lane;
    relativePath: string;  // Internal only
    chunkIndex?: number;
  },
  secret: string
): string {
  // Path fingerprint (HMAC so it's not reversible)
  const pathFingerprint = createHmac('sha256', secret)
    .update(artifact.relativePath)
    .digest('base64url')
    .slice(0, 12);

  // Combine with kind/lane for full ID
  const components = [
    artifact.kind,
    artifact.lane,
    pathFingerprint,
    artifact.chunkIndex ?? 0,
  ];

  return createHash('sha256')
    .update(components.join(':'))
    .digest('base64url')
    .slice(0, 24);
}

/**
 * Example:
 * Input: { kind: 'local_diff', lane: 'local', relativePath: 'src/auth.ts', chunkIndex: 0 }
 * Output: "Xk9mQ2vN8pL3Rm5sYt7uWx" (24 chars, stable, path-free)
 */
```

### Determinism Guardrails

```typescript
// packages/intelligence/src/composer/determinism.ts

/**
 * Quantization precision for relevance scores.
 * Prevents floating-point differences from changing selection.
 */
export const RELEVANCE_PRECISION = 1e-3;

/**
 * Recency buckets for time-based scoring.
 * Prevents "now" from causing non-determinism.
 */
export const RECENCY_BUCKETS = [
  0,      // Bucket 5: current (< 1 min)
  60,     // Bucket 4: recent (1-5 min)
  300,    // Bucket 3: warm (5-30 min)
  1800,   // Bucket 2: cold (30min-2hr)
  7200,   // Bucket 1: stale (2hr-24hr)
  86400,  // Bucket 0: old (> 24hr)
] as const;

/**
 * Quantize relevance score to fixed precision.
 */
export function quantizeRelevance(score: number): number {
  return Math.round(score / RELEVANCE_PRECISION) * RELEVANCE_PRECISION;
}

/**
 * Bucket recency by age.
 * Returns bucket number (higher = more recent).
 */
export function bucketRecency(ageMs: number): number {
  const ageSec = ageMs / 1000;
  for (let i = RECENCY_BUCKETS.length - 1; i >= 0; i--) {
    if (ageSec >= RECENCY_BUCKETS[i]) {
      return RECENCY_BUCKETS.length - 1 - i;
    }
  }
  return RECENCY_BUCKETS.length; // Most recent bucket
}

/**
 * Stable tie-breaker when scores are equal.
 * Order: lane priority → kind priority → lexicographic by id
 */
export function tieBreaker(a: ArtifactCandidate, b: ArtifactCandidate): number {
  // 1. Lane priority (lower = higher priority)
  const lanePriorityA = LANE_PRIORITIES[a.lane];
  const lanePriorityB = LANE_PRIORITIES[b.lane];
  if (lanePriorityA !== lanePriorityB) {
    return lanePriorityA - lanePriorityB;
  }

  // 2. Kind priority
  const kindPriorityA = KIND_PRIORITIES[a.kind] ?? 99;
  const kindPriorityB = KIND_PRIORITIES[b.kind] ?? 99;
  if (kindPriorityA !== kindPriorityB) {
    return kindPriorityA - kindPriorityB;
  }

  // 3. Lexicographic by ID (stable)
  return a.id.localeCompare(b.id);
}

const LANE_PRIORITIES: Record<Lane, number> = {
  policy: 0,
  rules: 1,
  local: 2,
  structure: 3,
  retrieved: 4,
  history: 5,
};

const KIND_PRIORITIES: Record<ArtifactKind, number> = {
  constraint: 0,
  rule_doc: 1,
  local_diff: 2,
  recent_edit: 3,
  symbol_context: 4,
  dependency_graph: 5,
  test_context: 6,
  semantic_match: 7,
  session_history: 8,
  violation: 9,
  learning: 10,
};
```

---

## Selection Algorithm

### Scoring

```typescript
// packages/intelligence/src/composer/scoring.ts

/**
 * Scoring weights (must sum to 1.0).
 */
export const SCORING_WEIGHTS = {
  recency: 0.30,
  relevance: 0.35,
  specificity: 0.20,
  riskAlignment: 0.15,
} as const;

/**
 * Compute composite score for an artifact.
 * All inputs are pre-quantized for determinism.
 */
export function computeScore(candidate: ArtifactCandidate): number {
  const score =
    SCORING_WEIGHTS.recency * (candidate.recencyBucket / 5) +
    SCORING_WEIGHTS.relevance * candidate.relevanceScore +
    SCORING_WEIGHTS.specificity * candidate.specificityScore +
    SCORING_WEIGHTS.riskAlignment * candidate.riskAlignment;

  // Quantize output
  return quantizeRelevance(score);
}

/**
 * Scored candidate with computed score.
 */
export interface ScoredCandidate {
  candidate: ArtifactCandidate;
  score: number;
}

/**
 * Score and sort candidates.
 * Deterministic: same inputs → same order.
 */
export function scoreAndSort(
  candidates: ArtifactCandidate[]
): ScoredCandidate[] {
  const scored = candidates.map(candidate => ({
    candidate,
    score: computeScore(candidate),
  }));

  // Sort by score descending, then tie-breaker
  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score; // Higher score first
    }
    return tieBreaker(a.candidate, b.candidate);
  });

  return scored;
}
```

### Budget Allocation

```typescript
// packages/intelligence/src/composer/allocation.ts

/**
 * Result of budget allocation.
 */
export interface AllocationResult {
  allocation: Record<Lane, number>;
  pool: number;  // Remaining tokens for global selection
  shortfalls: Array<{
    lane: Lane;
    requested: number;
    available: number;
  }>;
}

/**
 * Allocate minimum budgets per lane.
 * If a lane can't fill its min, reallocate unused to pool.
 */
export function allocateMinBudgets(
  candidates: ArtifactCandidate[],
  config: BudgetConfig
): AllocationResult {
  const allocation: Record<Lane, number> = {} as Record<Lane, number>;
  const shortfalls: AllocationResult['shortfalls'] = [];
  let pool = config.totalTokens;

  // Group candidates by lane
  const byLane = new Map<Lane, ArtifactCandidate[]>();
  for (const c of candidates) {
    const list = byLane.get(c.lane) ?? [];
    list.push(c);
    byLane.set(c.lane, list);
  }

  // Allocate mins by priority order
  const lanes = Object.entries(config.lanes)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([lane]) => lane as Lane);

  for (const lane of lanes) {
    const laneCandidates = byLane.get(lane) ?? [];
    const available = laneCandidates.reduce((sum, c) => sum + c.tokenEstimate, 0);
    const laneMin = config.lanes[lane].min;

    // Can't meet min? Take what's available
    const allocated = Math.min(laneMin, available, pool);
    allocation[lane] = allocated;
    pool -= allocated;

    // Track shortfall for debugging
    if (allocated < laneMin) {
      shortfalls.push({ lane, requested: laneMin, available });
    }
  }

  return { allocation, pool, shortfalls };
}
```

### Selection Pipeline

```typescript
// packages/intelligence/src/composer/selection.ts

/**
 * Selection result (safe for logging/telemetry).
 */
export interface SelectionResult {
  selected: ArtifactRef[];
  allocation: Record<Lane, number>;
  explanation: SelectionExplanation;
  cacheKey: string;
  cacheHit: boolean;

  // Internal only (never logged)
  rendered: RenderedArtifact[];
}

/**
 * Main selection function.
 * Implements the two-pass pipeline with constraint enforcement.
 */
export function selectArtifacts(
  candidates: ArtifactCandidate[],
  config: BudgetConfig,
  constraints: ComposerConstraints,
  context: SelectionContext
): SelectionResult {
  // Track selected by ID (not object identity)
  const selectedIds = new Set<string>();
  const selected: ArtifactCandidate[] = [];
  const rejections: RejectionRecord[] = [];

  // 1. Apply exclusions
  const afterExclude = candidates.filter(c => {
    const excluded = constraints.mustExclude.some(e => matches(c, e.match));
    if (excluded) {
      rejections.push({
        artifact: toRef(c),
        reason: 'excluded_by_policy',
        detail: constraints.mustExclude.find(e => matches(c, e.match))?.reason,
      });
    }
    return !excluded;
  });

  // 2. Extract pinned (selected first, unconditionally)
  const pinned = afterExclude.filter(c =>
    constraints.pinned.some(p => matches(c, p.match))
  );
  for (const p of pinned) {
    selectedIds.add(p.id);
    selected.push(p);
  }

  // 3. Extract mustInclude (after pinned)
  const mustInclude = afterExclude.filter(c =>
    constraints.mustInclude.some(m => matches(c, m.match)) &&
    !selectedIds.has(c.id)
  );
  for (const m of mustInclude) {
    selectedIds.add(m.id);
    selected.push(m);
  }

  // 4. Remaining candidates for scoring
  const eligible = afterExclude.filter(c => !selectedIds.has(c.id));

  // 5. Allocate budgets
  const { allocation, pool, shortfalls } = allocateMinBudgets(eligible, config);

  // 6. Score and sort eligible candidates
  const scored = scoreAndSort(eligible);

  // 7. Fill budgets by lane, then global
  const laneUsage: Record<Lane, number> = {} as Record<Lane, number>;
  for (const lane of Object.keys(config.lanes) as Lane[]) {
    laneUsage[lane] = selected
      .filter(s => s.lane === lane)
      .reduce((sum, s) => sum + s.tokenEstimate, 0);
  }

  let totalUsed = selected.reduce((sum, s) => sum + s.tokenEstimate, 0);

  for (const { candidate, score } of scored) {
    const lane = candidate.lane;
    const laneMax = config.lanes[lane].max;
    const estimate = candidate.tokenEstimate;

    // Check lane max
    if (laneUsage[lane] + estimate > laneMax) {
      rejections.push({
        artifact: toRef(candidate),
        reason: 'lane_max_reached',
        detail: `${lane} lane at ${laneUsage[lane]}/${laneMax}`,
      });
      continue;
    }

    // Check total budget
    if (totalUsed + estimate > config.totalTokens) {
      rejections.push({
        artifact: toRef(candidate),
        reason: 'budget_exceeded',
        detail: `Total at ${totalUsed}/${config.totalTokens}`,
      });
      continue;
    }

    // Select!
    selectedIds.add(candidate.id);
    selected.push(candidate);
    laneUsage[lane] += estimate;
    totalUsed += estimate;
  }

  // 8. Compute cache key
  const cacheKey = computeCacheKey({
    workspaceFingerprint: context.workspaceFingerprint,
    triggerEvent: context.triggerEvent,
    commitish: context.commitish,
    candidateDigest: computeCandidateDigest(candidates),
    rulesDigest: context.rulesDigest,
    budgetConfigDigest: hashObject(config),
    constraintsDigest: hashObject(constraints),
    composerVersion: COMPOSER_VERSION,
  });

  // 9. Build explanation
  const explanation = buildExplanation(
    selected,
    rejections,
    allocation,
    laneUsage,
    config,
    shortfalls
  );

  // Return WITHOUT rendering yet
  // Rendering happens in second pass
  return {
    selected: selected.map(toRef),
    allocation: laneUsage,
    explanation,
    cacheKey,
    cacheHit: false,
    rendered: [], // Filled in render pass
  };
}

function toRef(c: ArtifactCandidate): ArtifactRef {
  return {
    id: c.id,
    kind: c.kind,
    lane: c.lane,
    tokenEstimate: c.tokenEstimate,
  };
}
```

---

## Two-Pass Pipeline

### Pass 1: Selection (coarse estimates)

```typescript
// packages/intelligence/src/composer/Composer.ts

/**
 * Main Composer class.
 * Orchestrates the two-pass selection + rendering pipeline.
 */
export class Composer {
  private config: BudgetConfig;
  private cache: Map<string, SelectionResult>;
  private sources: ArtifactSource[];

  constructor(options: ComposerOptions = {}) {
    this.config = options.budgetConfig ?? DEFAULT_BUDGET_CONFIG;
    this.cache = new Map();
    this.sources = options.sources ?? [];

    // Validate config on construction
    validateBudgetConfig(this.config);
  }

  /**
   * Main entry point: compose context for a trigger.
   */
  async compose(
    trigger: ComposeTrigger,
    constraints: ComposerConstraints = EMPTY_CONSTRAINTS
  ): Promise<CompositionResult> {
    // 1. Gather candidates from all sources
    const candidates = await this.gatherCandidates(trigger);

    // 2. Build context for cache key
    const context: SelectionContext = {
      workspaceFingerprint: trigger.workspaceFingerprint,
      triggerEvent: trigger.event,
      commitish: trigger.commitish ?? 'HEAD',
      rulesDigest: await this.computeRulesDigest(),
    };

    // 3. Check cache
    const cacheKey = this.computeEarlyCacheKey(candidates, context, constraints);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
      };
    }

    // 4. PASS 1: Select using coarse estimates
    const selection = selectArtifacts(
      candidates,
      this.config,
      constraints,
      context
    );

    // 5. PASS 2: Render and measure actual tokens
    const rendered = await this.renderSelected(selection.selected, candidates);

    // 6. Measure actual tokens
    const actualTotal = rendered.reduce((sum, r) => sum + r.exactTokenCount, 0);

    // 7. If over budget, shrink
    let finalRendered = rendered;
    if (actualTotal > this.config.totalTokens) {
      finalRendered = await this.shrinkToFit(rendered, this.config.totalTokens);
    }

    // 8. Build final result
    const result: CompositionResult = {
      ...selection,
      rendered: finalRendered,
      actualTokens: finalRendered.reduce((sum, r) => sum + r.exactTokenCount, 0),
    };

    // 9. Cache result
    this.cache.set(cacheKey, result);

    // 10. Emit for replay
    this.emitDecisionLog(result, trigger, constraints);

    return result;
  }
}
```

### Pass 2: Render and Shrink

```typescript
// packages/intelligence/src/composer/rendering.ts

/**
 * Shrink strategies by artifact kind.
 */
export const SHRINK_STRATEGIES: Record<ArtifactKind, ShrinkStrategy> = {
  constraint: 'never',           // Never shrink rules
  rule_doc: 'never',             // Never shrink rules
  local_diff: 'truncate_oldest', // Drop oldest hunks
  recent_edit: 'truncate_oldest',
  symbol_context: 'keep_signatures',
  dependency_graph: 'collapse_summary',
  test_context: 'keep_signatures',
  semantic_match: 'truncate_oldest',
  session_history: 'drop_entries',
  violation: 'drop_entries',
  learning: 'drop_entries',
};

/**
 * Render a selected artifact.
 */
export async function renderArtifact(
  ref: ArtifactRef,
  candidates: ArtifactCandidate[]
): Promise<RenderedArtifact> {
  const candidate = candidates.find(c => c.id === ref.id);
  if (!candidate) {
    throw new Error(`Candidate not found: ${ref.id}`);
  }

  const content = candidate.getContent();
  const exactTokenCount = countTokens(content);

  return {
    id: ref.id,
    kind: ref.kind,
    lane: ref.lane,
    content,
    exactTokenCount,
    shrunk: false,
  };
}

/**
 * Shrink rendered artifacts to fit budget.
 */
export async function shrinkToFit(
  rendered: RenderedArtifact[],
  targetTokens: number
): Promise<RenderedArtifact[]> {
  let current = rendered.reduce((sum, r) => sum + r.exactTokenCount, 0);

  if (current <= targetTokens) {
    return rendered;
  }

  // Sort by shrinkability (never last, then by priority)
  const shrinkable = [...rendered].sort((a, b) => {
    const stratA = SHRINK_STRATEGIES[a.kind];
    const stratB = SHRINK_STRATEGIES[b.kind];

    if (stratA === 'never' && stratB !== 'never') return 1;
    if (stratB === 'never' && stratA !== 'never') return -1;

    // Shrink lower priority lanes first
    return LANE_PRIORITIES[b.lane] - LANE_PRIORITIES[a.lane];
  });

  const result: RenderedArtifact[] = [];
  const overflow = current - targetTokens;
  let shrunk = 0;

  for (const artifact of shrinkable) {
    if (shrunk >= overflow || SHRINK_STRATEGIES[artifact.kind] === 'never') {
      result.push(artifact);
      continue;
    }

    // Try to shrink
    const newTarget = Math.max(
      artifact.exactTokenCount - (overflow - shrunk),
      100 // Minimum size
    );

    const shrunkArtifact = await applyShrinkStrategy(artifact, newTarget);
    shrunk += artifact.exactTokenCount - shrunkArtifact.exactTokenCount;
    result.push(shrunkArtifact);
  }

  return result;
}

/**
 * Apply shrink strategy to an artifact.
 */
async function applyShrinkStrategy(
  artifact: RenderedArtifact,
  targetTokens: number
): Promise<RenderedArtifact> {
  const strategy = SHRINK_STRATEGIES[artifact.kind];

  switch (strategy) {
    case 'truncate_oldest':
      return truncateOldest(artifact, targetTokens);
    case 'keep_signatures':
      return keepSignatures(artifact, targetTokens);
    case 'collapse_summary':
      return collapseSummary(artifact, targetTokens);
    case 'drop_entries':
      return dropEntries(artifact, targetTokens);
    case 'never':
    default:
      return artifact;
  }
}

/**
 * Truncate oldest content (for diffs, histories).
 */
function truncateOldest(
  artifact: RenderedArtifact,
  targetTokens: number
): RenderedArtifact {
  const lines = artifact.content.split('\n');
  let current = artifact.exactTokenCount;
  let startIndex = 0;

  while (current > targetTokens && startIndex < lines.length - 1) {
    current -= countTokens(lines[startIndex] + '\n');
    startIndex++;
  }

  const newContent = lines.slice(startIndex).join('\n');

  return {
    ...artifact,
    content: newContent,
    exactTokenCount: countTokens(newContent),
    shrunk: true,
    originalTokenCount: artifact.exactTokenCount,
    shrinkStrategy: 'truncate_oldest',
  };
}
```

---

## Explainability

```typescript
// packages/intelligence/src/composer/explainability.ts

/**
 * Rejection record for explainability.
 */
export interface RejectionRecord {
  artifact: ArtifactRef;
  reason: 'excluded_by_policy' | 'lane_max_reached' | 'budget_exceeded' | 'lower_priority';
  detail?: string;
}

/**
 * Selection explanation for debugging.
 */
export interface SelectionExplanation {
  summary: string;

  laneBreakdown: Array<{
    lane: Lane;
    selectedCount: number;
    budgetUsed: number;
    budgetMax: number;
    topArtifacts: Array<{ id: string; kind: ArtifactKind; score: number }>;
  }>;

  topRejections: Array<{
    artifact: ArtifactRef;
    reason: string;
    detail?: string;
  }>;

  constraints: {
    pinnedCount: number;
    mustIncludeCount: number;
    excludedCount: number;
  };

  performance: {
    candidateCount: number;
    selectedCount: number;
    compressionRatio: number;
    cacheHit: boolean;
  };
}

/**
 * Build human-readable explanation.
 */
export function buildExplanation(
  selected: ArtifactCandidate[],
  rejections: RejectionRecord[],
  allocation: Record<Lane, number>,
  laneUsage: Record<Lane, number>,
  config: BudgetConfig,
  shortfalls: Array<{ lane: Lane; requested: number; available: number }>
): SelectionExplanation {
  const lanes = Object.keys(config.lanes) as Lane[];

  const laneBreakdown = lanes.map(lane => {
    const laneSelected = selected.filter(s => s.lane === lane);
    return {
      lane,
      selectedCount: laneSelected.length,
      budgetUsed: laneUsage[lane],
      budgetMax: config.lanes[lane].max,
      topArtifacts: laneSelected
        .slice(0, 3)
        .map(s => ({ id: s.id, kind: s.kind, score: computeScore(s) })),
    };
  });

  const summary = [
    `Selected ${selected.length} artifacts`,
    `using ${Object.values(laneUsage).reduce((a, b) => a + b, 0)}/${config.totalTokens} tokens`,
    shortfalls.length > 0 ? `(${shortfalls.length} lanes under-filled)` : '',
  ].filter(Boolean).join(' ');

  return {
    summary,
    laneBreakdown,
    topRejections: rejections.slice(0, 5).map(r => ({
      artifact: r.artifact,
      reason: r.reason,
      detail: r.detail,
    })),
    constraints: {
      pinnedCount: selected.filter(s => s.kind === 'local_diff').length, // Proxy
      mustIncludeCount: 0, // Filled by caller
      excludedCount: rejections.filter(r => r.reason === 'excluded_by_policy').length,
    },
    performance: {
      candidateCount: selected.length + rejections.length,
      selectedCount: selected.length,
      compressionRatio: 0, // Filled after rendering
      cacheHit: false, // Filled by caller
    },
  };
}

/**
 * Format explanation for CLI output.
 */
export function formatExplanationForCLI(exp: SelectionExplanation): string {
  const lines: string[] = [
    `\n📊 Composition Summary`,
    `   ${exp.summary}`,
    ``,
    `📁 Lane Breakdown:`,
  ];

  for (const lane of exp.laneBreakdown) {
    const pct = Math.round((lane.budgetUsed / lane.budgetMax) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    lines.push(`   ${lane.lane.padEnd(10)} ${bar} ${lane.selectedCount} artifacts (${lane.budgetUsed}/${lane.budgetMax} tokens)`);
  }

  if (exp.topRejections.length > 0) {
    lines.push(``);
    lines.push(`⏭️  Top Rejections:`);
    for (const rej of exp.topRejections.slice(0, 3)) {
      lines.push(`   • ${rej.artifact.kind}: ${rej.reason}${rej.detail ? ` (${rej.detail})` : ''}`);
    }
  }

  return lines.join('\n');
}
```

---

## Replay Format

```typescript
// packages/intelligence/src/composer/replay.ts

/**
 * Decision log for replay and evals.
 * Saved after each composition for determinism verification.
 */
export interface ComposerDecisionLog {
  // Identification
  id: string;                    // Unique log ID
  timestamp: number;             // Unix timestamp
  composerVersion: string;       // For compatibility

  // Context
  workspaceFingerprint: string;
  triggerEvent: string;
  commitish: string;

  // Inputs
  candidateCount: number;
  candidateDigest: string;       // For verification
  constraintsDigest: string;
  budgetConfigDigest: string;

  // Outputs
  selectedArtifacts: ArtifactRef[];
  budgetAllocation: Record<Lane, number>;
  totalTokensUsed: number;

  // Rankings (for debugging)
  rankings: Array<{
    artifact: ArtifactRef;
    score: number;
    selected: boolean;
    rejectionReason?: string;
  }>;

  // Cache
  cacheKey: string;
  cacheHit: boolean;

  // Expected (for golden tests)
  expectedSelection?: ArtifactRef[];

  // Performance
  durationMs: number;
}

/**
 * Emit decision log for replay.
 */
export function emitDecisionLog(
  result: CompositionResult,
  trigger: ComposeTrigger,
  constraints: ComposerConstraints,
  startTime: number
): ComposerDecisionLog {
  const log: ComposerDecisionLog = {
    id: generateLogId(),
    timestamp: Date.now(),
    composerVersion: COMPOSER_VERSION,

    workspaceFingerprint: trigger.workspaceFingerprint,
    triggerEvent: trigger.event,
    commitish: trigger.commitish ?? 'HEAD',

    candidateCount: result.explanation.performance.candidateCount,
    candidateDigest: computeCandidateDigest([]), // Filled by caller
    constraintsDigest: hashObject(constraints),
    budgetConfigDigest: '', // Filled by caller

    selectedArtifacts: result.selected,
    budgetAllocation: result.allocation,
    totalTokensUsed: result.actualTokens,

    rankings: [], // Filled by selection algorithm

    cacheKey: result.cacheKey,
    cacheHit: result.cacheHit,

    durationMs: Date.now() - startTime,
  };

  // Emit to EventBus for downstream consumers
  eventBus.emit('composer:decision', log);

  return log;
}

/**
 * Verify determinism by replaying a decision log.
 */
export async function verifyDeterminism(
  log: ComposerDecisionLog,
  composer: Composer,
  candidates: ArtifactCandidate[]
): Promise<{ passed: boolean; differences: string[] }> {
  const replay = await composer.compose(
    {
      event: log.triggerEvent,
      workspaceFingerprint: log.workspaceFingerprint,
      commitish: log.commitish,
    },
    // Reconstruct constraints from digest (or load from storage)
  );

  const differences: string[] = [];

  // Compare selected artifacts
  const originalIds = new Set(log.selectedArtifacts.map(a => a.id));
  const replayIds = new Set(replay.selected.map(a => a.id));

  for (const id of originalIds) {
    if (!replayIds.has(id)) {
      differences.push(`Missing in replay: ${id}`);
    }
  }

  for (const id of replayIds) {
    if (!originalIds.has(id)) {
      differences.push(`Extra in replay: ${id}`);
    }
  }

  // Compare token usage
  if (log.totalTokensUsed !== replay.actualTokens) {
    differences.push(
      `Token mismatch: original=${log.totalTokensUsed}, replay=${replay.actualTokens}`
    );
  }

  return {
    passed: differences.length === 0,
    differences,
  };
}
```

---

## Integration with Existing Systems

### ContextEngine → Composer

```typescript
// packages/intelligence/src/context/ContextEngine.ts (updated)

/**
 * ContextEngine becomes an artifact SOURCE for Composer.
 */
export class ContextEngine {
  // ... existing code ...

  /**
   * Generate artifact candidates from context.
   * Used by Composer as one of its sources.
   */
  async generateCandidates(
    input: ContextInput,
    fingerprintConfig: FingerprintConfig
  ): Promise<ArtifactCandidate[]> {
    const candidates: ArtifactCandidate[] = [];
    const now = Date.now();

    // Generate from architecture docs
    const arch = this.configStore.loadArchitecture();
    candidates.push({
      id: computeArtifactId(
        { kind: 'rule_doc', lane: 'rules', relativePath: 'ARCHITECTURE.md' },
        fingerprintConfig.workspaceSecret
      ),
      kind: 'rule_doc',
      lane: 'rules',
      tokenEstimate: countTokens(arch),
      recencyBucket: 0, // Docs are "old"
      relevanceScore: this.computeRelevance(arch, input.keywords ?? []),
      specificityScore: 0.5,
      riskAlignment: 0.3,
      getContent: () => arch,
      shrink: (target) => this.shrinkDoc(arch, target),
    });

    // Generate from violations
    const violations = this.getRecentViolations(input.keywords ?? [], input.files ?? []);
    for (const v of violations) {
      candidates.push({
        id: computeArtifactId(
          { kind: 'violation', lane: 'policy', relativePath: v.file },
          fingerprintConfig.workspaceSecret
        ),
        kind: 'violation',
        lane: 'policy',
        tokenEstimate: countTokens(JSON.stringify(v)),
        recencyBucket: bucketRecency(now - new Date(v.timestamp).getTime()),
        relevanceScore: 0.9, // Violations are highly relevant
        specificityScore: 0.8,
        riskAlignment: 0.9,
        getContent: () => formatViolation(v),
        shrink: (target) => ({ /* ... */ }),
      });
    }

    // Generate from learnings
    const learnings = this.getRelevantLearnings(input.keywords ?? []);
    for (const l of learnings) {
      candidates.push({
        id: computeArtifactId(
          { kind: 'learning', lane: 'history', relativePath: l.trigger },
          fingerprintConfig.workspaceSecret
        ),
        kind: 'learning',
        lane: 'history',
        tokenEstimate: countTokens(JSON.stringify(l)),
        recencyBucket: 3, // Medium recency
        relevanceScore: quantizeRelevance(this.computeRelevance(l.action, input.keywords ?? [])),
        specificityScore: 0.7,
        riskAlignment: 0.5,
        getContent: () => formatLearning(l),
        shrink: (target) => ({ /* ... */ }),
      });
    }

    return candidates;
  }
}
```

### PolicyEngine → Composer

```typescript
// packages/intelligence/src/policy/PolicyEngine.ts (updated)

/**
 * PolicyEngine outputs constraints for Composer.
 */
export class PolicyEngine {
  // ... existing code ...

  /**
   * Generate constraints for Composer.
   */
  getComposerConstraints(
    context: PolicyContext
  ): ComposerConstraints {
    const constraints: ComposerConstraints = {
      mustInclude: [],
      mustExclude: [],
      pinned: [],
      laneRequirements: [],
    };

    // Always pin current diff
    constraints.pinned.push({
      match: { type: 'kind', kind: 'local_diff' },
      reason: 'Current changes are always included',
    });

    // Exclude sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      constraints.mustExclude.push({
        match: { type: 'pattern', pattern },
        reason: 'Sensitive file pattern',
      });
    }

    // Require rules lane if in protected workspace
    if (context.isProtectedWorkspace) {
      constraints.laneRequirements.push({
        lane: 'rules',
        minTokens: 300,
        reason: 'Protected workspace requires rules context',
      });
    }

    // Include violations if any exist
    if (context.hasRecentViolations) {
      constraints.mustInclude.push({
        match: { type: 'kind', kind: 'violation' },
        reason: 'Recent violations require attention',
      });
    }

    return constraints;
  }
}
```

### WorkspaceVitals → Composer

```typescript
// packages/intelligence/src/vitals/WorkspaceVitals.ts (updated)

/**
 * Vitals feed relevance adjustments to Composer.
 */
export class WorkspaceVitals {
  // ... existing code ...

  /**
   * Adjust artifact relevance based on current vitals.
   */
  adjustRelevance(
    candidates: ArtifactCandidate[],
    vitals: VitalsSnapshot
  ): ArtifactCandidate[] {
    const pressure = this.pressureGauge.getPressure();
    const pulse = this.pulseTracker.getPulse();

    return candidates.map(c => {
      let adjustment = 0;

      // High pressure → prioritize recent
      if (pressure.level === 'high') {
        if (c.recencyBucket >= 4) {
          adjustment += 0.1;
        }
      }

      // Rapid pulse → prioritize local changes
      if (pulse.bpm > 30) {
        if (c.lane === 'local') {
          adjustment += 0.15;
        }
      }

      // Low oxygen → prioritize rules
      if (vitals.oxygen < 0.5) {
        if (c.lane === 'rules' || c.lane === 'policy') {
          adjustment += 0.1;
        }
      }

      return {
        ...c,
        relevanceScore: Math.min(1, c.relevanceScore + adjustment),
      };
    });
  }
}
```

---

## CLI Integration

```typescript
// apps/cli/src/commands/compose.ts

/**
 * CLI command to preview composition.
 */
export const composeCommand = new Command('compose')
  .description('Preview context composition')
  .option('-t, --trigger <event>', 'Trigger event type', 'manual')
  .option('-v, --verbose', 'Show detailed breakdown')
  .option('--dry-run', 'Preview without caching')
  .action(async (options) => {
    const intelligence = await getIntelligenceService();
    const composer = intelligence.getComposer();

    const result = await composer.compose({
      event: options.trigger,
      workspaceFingerprint: await getWorkspaceFingerprint(),
    });

    console.log(formatExplanationForCLI(result.explanation));

    if (options.verbose) {
      console.log('\n📋 Selected Artifacts:');
      for (const artifact of result.selected) {
        console.log(`   • ${artifact.kind} (${artifact.lane}): ${artifact.tokenEstimate} tokens`);
      }

      if (result.explanation.topRejections.length > 0) {
        console.log('\n⏭️  All Rejections:');
        for (const rej of result.explanation.topRejections) {
          console.log(`   • ${rej.artifact.kind}: ${rej.reason}`);
        }
      }
    }

    console.log(`\n✅ Composition complete: ${result.actualTokens}/${composer.getConfig().totalTokens} tokens`);
    if (result.cacheHit) {
      console.log('   (cache hit)');
    }
  });
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/intelligence/test/composer/selection.test.ts

describe('Selection Algorithm', () => {
  describe('determinism', () => {
    it('produces identical output for identical inputs', async () => {
      const candidates = createTestCandidates(20);
      const config = DEFAULT_BUDGET_CONFIG;
      const constraints = EMPTY_CONSTRAINTS;
      const context = createTestContext();

      const result1 = selectArtifacts(candidates, config, constraints, context);
      const result2 = selectArtifacts(candidates, config, constraints, context);

      expect(result1.selected.map(s => s.id)).toEqual(result2.selected.map(s => s.id));
      expect(result1.cacheKey).toEqual(result2.cacheKey);
    });

    it('uses quantized scores to prevent float drift', () => {
      const candidate = createTestCandidate({
        relevanceScore: 0.123456789,
        recencyBucket: 3,
      });

      const score = computeScore(candidate);

      expect(score).toBe(0.123); // Quantized to 3 decimal places
    });
  });

  describe('constraint enforcement', () => {
    it('respects mustExclude', () => {
      const candidates = createTestCandidates(10);
      const constraints: ComposerConstraints = {
        ...EMPTY_CONSTRAINTS,
        mustExclude: [{
          match: { type: 'kind', kind: 'semantic_match' },
          reason: 'test',
        }],
      };

      const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, constraints, createTestContext());

      expect(result.selected.every(s => s.kind !== 'semantic_match')).toBe(true);
    });

    it('always includes pinned artifacts', () => {
      const candidates = createTestCandidates(10);
      const pinned = candidates[5];
      const constraints: ComposerConstraints = {
        ...EMPTY_CONSTRAINTS,
        pinned: [{
          match: { type: 'id', id: pinned.id },
          reason: 'test',
        }],
      };

      const result = selectArtifacts(candidates, DEFAULT_BUDGET_CONFIG, constraints, createTestContext());

      expect(result.selected.some(s => s.id === pinned.id)).toBe(true);
    });
  });

  describe('budget allocation', () => {
    it('respects lane maximums', () => {
      const candidates = createManyCandidates('local', 50);
      const config: BudgetConfig = {
        ...DEFAULT_BUDGET_CONFIG,
        lanes: {
          ...DEFAULT_BUDGET_CONFIG.lanes,
          local: { min: 100, max: 500, priority: 2 },
        },
      };

      const result = selectArtifacts(candidates, config, EMPTY_CONSTRAINTS, createTestContext());

      const localTokens = result.selected
        .filter(s => s.lane === 'local')
        .reduce((sum, s) => sum + s.tokenEstimate, 0);

      expect(localTokens).toBeLessThanOrEqual(500);
    });

    it('reallocates unused min budget to pool', () => {
      const candidates = createTestCandidates(5); // Not enough to fill mins

      const { pool, shortfalls } = allocateMinBudgets(candidates, DEFAULT_BUDGET_CONFIG);

      expect(shortfalls.length).toBeGreaterThan(0);
      expect(pool).toBeGreaterThan(0);
    });
  });
});
```

### Integration Tests

```typescript
// packages/intelligence/test/composer/integration.test.ts

describe('Composer Integration', () => {
  let composer: Composer;

  beforeEach(() => {
    composer = new Composer({
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      sources: [new MockArtifactSource()],
    });
  });

  it('completes two-pass pipeline', async () => {
    const result = await composer.compose({
      event: 'file_saved',
      workspaceFingerprint: 'test-123',
    });

    // Verify selection happened
    expect(result.selected.length).toBeGreaterThan(0);

    // Verify rendering happened
    expect(result.rendered.length).toBe(result.selected.length);

    // Verify tokens measured
    expect(result.actualTokens).toBeGreaterThan(0);

    // Verify within budget
    expect(result.actualTokens).toBeLessThanOrEqual(DEFAULT_BUDGET_CONFIG.totalTokens);
  });

  it('shrinks when rendering exceeds budget', async () => {
    // Create source with artifacts that underestimate tokens
    const source = new MockArtifactSource({
      underestimateBy: 0.5, // Estimates are 50% of actual
    });

    composer = new Composer({
      budgetConfig: { ...DEFAULT_BUDGET_CONFIG, totalTokens: 1000 },
      sources: [source],
    });

    const result = await composer.compose({
      event: 'test',
      workspaceFingerprint: 'test',
    });

    // Should have shrunk to fit
    expect(result.actualTokens).toBeLessThanOrEqual(1000);
    expect(result.rendered.some(r => r.shrunk)).toBe(true);
  });

  it('uses cache on second call', async () => {
    const trigger = {
      event: 'file_saved',
      workspaceFingerprint: 'test-123',
    };

    const result1 = await composer.compose(trigger);
    const result2 = await composer.compose(trigger);

    expect(result1.cacheHit).toBe(false);
    expect(result2.cacheHit).toBe(true);
    expect(result1.selected).toEqual(result2.selected);
  });
});
```

### Replay Tests

```typescript
// packages/intelligence/test/composer/replay.test.ts

describe('Replay Verification', () => {
  it('passes determinism check for recorded decision', async () => {
    const composer = new Composer();
    const candidates = createTestCandidates(20);

    // First run
    const result = await composer.compose(
      { event: 'test', workspaceFingerprint: 'test' },
      EMPTY_CONSTRAINTS
    );

    // Capture log
    const log = emitDecisionLog(result, { event: 'test', workspaceFingerprint: 'test' }, EMPTY_CONSTRAINTS, Date.now());

    // Verify replay
    const verification = await verifyDeterminism(log, composer, candidates);

    expect(verification.passed).toBe(true);
    expect(verification.differences).toHaveLength(0);
  });
});
```

---

## File Structure

```
packages/intelligence/src/composer/
├── index.ts                 # Public exports
├── Composer.ts              # Main orchestrator
├── types.ts                 # Core types (Lane, ArtifactKind, etc.)
├── budget.ts                # BudgetConfig, allocation algorithm
├── constraints.ts           # ComposerConstraints, matching
├── selection.ts             # Scoring, ranking, selection pipeline
├── rendering.ts             # Render, measure, shrink strategies
├── cache.ts                 # Cache key computation, invalidation
├── fingerprint.ts           # Stable artifact ID generation
├── determinism.ts           # Quantization, bucketing, tie-breakers
├── explainability.ts        # SelectionExplanation, formatting
└── replay.ts                # Decision logs, verification

packages/intelligence/test/composer/
├── selection.test.ts        # Unit tests for selection
├── budget.test.ts           # Unit tests for allocation
├── determinism.test.ts      # Tests for quantization/bucketing
├── integration.test.ts      # Full pipeline tests
└── replay.test.ts           # Replay verification tests
```

---

## Implementation Checklist

### Phase 1: Core Types & Algorithms (Week 1)
- [ ] Define all types in `types.ts`
- [ ] Implement `budget.ts` with validation
- [ ] Implement `constraints.ts` with matching
- [ ] Implement `determinism.ts` (quantization, bucketing)
- [ ] Implement `fingerprint.ts` (HMAC-based IDs)
- [ ] Unit tests for each module

### Phase 2: Selection Pipeline (Week 2)
- [ ] Implement `selection.ts` with scoring
- [ ] Implement budget allocation algorithm
- [ ] Implement tie-breaker logic
- [ ] Implement constraint enforcement
- [ ] Integration tests for selection

### Phase 3: Rendering & Shrinking (Week 3)
- [ ] Implement `rendering.ts`
- [ ] Implement shrink strategies per kind
- [ ] Implement two-pass pipeline in `Composer.ts`
- [ ] Integration tests for rendering

### Phase 4: Cache & Explainability (Week 4)
- [ ] Implement `cache.ts` with input-based keys
- [ ] Implement `explainability.ts` with formatting
- [ ] Implement `replay.ts` with verification
- [ ] CLI integration
- [ ] End-to-end tests

### Phase 5: Integration (Week 5)
- [ ] Update ContextEngine to generate candidates
- [ ] Update PolicyEngine to output constraints
- [ ] Wire WorkspaceVitals for relevance adjustment
- [ ] EventBus integration for replay
- [ ] Documentation

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Determinism | 100% | Replay verification passes |
| Budget compliance | 100% | Never exceeds totalTokens |
| Cache hit rate | >80% | For unchanged workspaces |
| Selection latency | <50ms | p95 for selection phase |
| Render latency | <100ms | p95 for render phase |
| Shrink success | 100% | When needed, always achieves budget |

---

## References

- **Advisor Feedback**: Two-pass pipeline, cache keys on inputs, min reallocation
- **Existing Patterns**: ValidationPipeline confidence, EventBus replay
- **Architecture**: packages/intelligence layer structure
- **Testing**: 4-path coverage requirement from CONSTRAINTS.md

---

*Specification Version 1.0.0 - Ready for Implementation*
