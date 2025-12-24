## SnapBack vNext Spec: CLI-first, MCP bundled, no `apps/mcp-server`

### Decision

* **Delete** `apps/mcp-server/` as a standalone application.
* **Keep MCP as a library module** under `packages/` and launch it **from the CLI**.
* The only “MCP server” that exists at runtime is the process started by:

  * `snap mcp --stdio` (primary)
  * `snapback mcp --stdio` (alias)

This preserves everything Cursor/Claude need (a process speaking MCP) without maintaining a separate app.

---

## Goals

* One distributable: **the CLI** (`snap` + `snapback`).
* MCP is an **internal transport surface** shipped with the CLI.
* Maintain capability and safety; reduce LLM tool choice overload using **facade tools**, not capability cuts.
* Preserve backward compatibility for existing tool names for a deprecation window.

## Non-goals

* Running MCP without the CLI installed (unless you later ship a shim).
* Long-running daemon. MCP is invoked on-demand by the host.

---

## Monorepo structure (TurboRepo)

```
apps/
  cli/
    src/
      bin.ts                  # main entry; supports "snap" and "snapback"
      commands/
        mcp.ts                # "snap mcp --stdio|--sse"
        ...                   # other CLI commands

packages/
  core/
    src/                      # all business logic (snapshots, ctx runtime, validators, etc.)
  mcp/
    src/
      server.ts               # createServer()
      tools/                  # MCP tool definitions + handlers (facade layer)
      transport/
        stdio.ts              # runStdio()
        sse.ts                # optional; only if you truly need HTTP/SSE
      middleware/
        auth.ts
        workspace.ts
        rateLimit.ts
        errors.ts
      index.ts                # exports for CLI
```

**Rule:** `packages/mcp` contains *no CLI concerns*. It only knows how to create/run a server given config.

---

## CLI contract

### Commands

* `snap mcp --stdio [--workspace <path>] [--profile <name>]`
* `snapback mcp --stdio ...` (same binary, different argv alias)

### Host integration

Cursor/Claude point to `snap` (or `snapback`) with args `mcp --stdio`.

### Workspace resolution (must be explicit and safe)

Resolution order inside `snap mcp`:

1. `--workspace` argument (preferred)
2. `SNAPBACK_WORKSPACE_ROOT` env var (host config can set)
3. fallback: `process.cwd()` + “find repo root” traversal
4. if cannot validate workspace: return MCP error result (not protocol crash)

Workspace validation criteria:

* at least one of:

  * `.git/` exists
  * `package.json` exists
  * `.snapback/` exists
* lock workspace root via a security module to prevent path escape.

---

## MCP server module API (`packages/mcp`)

### Public exports

* `createServer(opts): Server`
* `runStdioMcpServer(opts): Promise<void>`
* `runSseMcpServer(opts): Promise<void>` (optional)

### `opts` shape (example)

```ts
type McpServerOptions = {
  workspaceRoot: string;
  tier: "free" | "pro" | "enterprise";
  auth?: { apiKey?: string; userId?: string };
  core: SnapbackCore;               // from packages/core
  telemetry?: TelemetrySink;        // logs -> .snapback/logs/*.jsonl
  mode?: "stdio" | "sse";
};
```

CLI builds `opts` then calls `runStdioMcpServer`.

---

## Tool catalog strategy: consolidate via facades (recommended)

You keep underlying functions, but expose fewer *decision points* to the LLM.

### Target exposed tools: **~10–12**

#### 1) `snapback.analyze`

Replaces:

* `snapback.assess_risk`
* `snapback.validate_recommendation`

Input:

```json
{ "type": "risk" | "package", "...": "type-specific args" }
```

#### 2) `snapback.prepare_workspace`  (**must exist; your audit flagged drift**)

Purpose: “pre-flight” that combines vitals + high-level guidance + snapshot recommendation.
Replaces the *workflow confusion* currently split across vitals/context/session start.

#### 3) `snapback.snapshot_create` (Pro)

#### 4) `snapback.snapshot_list` (Pro)

#### 5) `snapback.snapshot_restore` (Pro, destructive)

Keep snapshot operations explicit; these are safety-critical and user-recognizable.

#### 6) `snapback.validate`

Replaces:

* `snapback.check_patterns`
* `snapback.validate_code`

Input:

```json
{ "mode": "quick" | "comprehensive", "code": "...", "file_path": "..." }
```

#### 7) `snapback.context`

Replaces all ctx_*:

* init/build/validate/status/constraint/check/blockers

Input:

```json
{ "op": "init"|"build"|"validate"|"status"|"constraint"|"check"|"blockers", "...": "op args" }
```

#### 8) `snapback.session`

Replaces:

* start/get_recommendations/stats/end

Input:

```json
{ "op": "start"|"recommendations"|"stats"|"end", "...": "op args" }
```

#### 9) `snapback.learn`

Optional: if you want to keep `record_learning` separate, or fold into `session` as `op:"record_learning"`.

#### 10) `snapback.meta`

Replaces:

* `snapback.meta_list_tools`

---

## Backward compatibility layer

**DECISION: SKIP** — This is internal-only, never publicly released.

No `toolNameMigrations` needed. Go directly to the 11 consolidated tools.

If any MCP host configs (`.cursor/`, `claude_desktop_config.json`) reference old tool names, simply update them to the new names.

---

## Response format: must be machine-chainable

### Standard success result

Every tool returns:

* `content[]` with **(1) structured JSON** + **(2) short human summary**
* include `timestamp`
* include `next_actions` ranked list

**Important fix:** add `structuredContent` (or `type:"json"` depending on your SDK/client expectations). If your current clients only accept `type:"text"`, keep JSON stringified *but also* include a predictable envelope.

Canonical envelope:

```json
{
  "ok": true,
  "timestamp": "ISO",
  "data": { ...tool-specific... },
  "next_actions": [ { "tool": "...", "priority": 0.92, "reason": "...", "condition": "..." } ],
  "session": { ...optional coaching/vitals... },
  "deprecation": { ...optional... }
}
```

### Standard error result

Return MCP tool result with `isError: true` and a structured body:

```json
{ "ok": false, "timestamp": "ISO", "error": { "code": "...", "message": "...", "hint": "..." } }
```

No protocol-level throws.

---

## Tier gating (do it before heavy work)

* Gate at the router layer before handler execution:

  * snapshot_* tools require Pro
* Reject early with a consistent, structured response.
* Avoid performing expensive analysis before denying access.

---

## Security model

* Lock workspace root at server start.
* Validate all file paths against workspace root.
* Disallow `..` path traversal and absolute paths unless explicitly allowed.
* Prefer allowlist patterns for “write-like” operations.
* Log security violations to `.snapback/logs/security.jsonl`.

---

## Rate limiting + abuse safety

Simple per-process limiter:

* max N calls / second per tool
* separate limits for open-world tools (`analyze type:"package"`)

Return structured rate-limit error.

---

## Logging/telemetry

Local-first, file-based:

* `.snapback/logs/mcp.jsonl` (tool calls + duration)
* `.snapback/logs/errors.jsonl` (sanitized error + correlation id)
* `.snapback/logs/audit.jsonl` (risk acknowledgements, restores, destructive operations)

Never write logs to stdout (stdio transport must stay clean). stderr only for debug.

---

## Packaging & distribution

### CLI package.json

* Provide both commands:

  * `"bin": { "snap": "./dist/bin.js", "snapback": "./dist/bin.js" }`

### MCP is not separately published

* The MCP server is accessed via `snap mcp --stdio`.

**Optional shim (only if you later need it):**

* Publish `@snapback/mcp` with `"bin": { "snapback-mcp": "./dist/shim.js" }`
* `shim.js` just execs `snap mcp --stdio`.

---

## Testing requirements

* Unit tests (core): snapshots, ctx runtime, validators, security path checks
* Unit tests (mcp): tool router, schema validation, migrations, tier gating
* Integration tests:

  * spawn `snap mcp --stdio` and run MCP handshake + tool calls
  * verify stdout is protocol-clean, errors are tool-results, and workspace binding works

---

## Migration steps (practical)

1. **Move** tool definitions + handlers from `apps/mcp-server` → `packages/mcp`
2. **Add** `snap mcp` command in CLI that calls `runStdioMcpServer`
3. **Implement facades** (keep old tool names via migration map)
4. **Remove** `apps/mcp-server` from turbo pipeline
5. **Update docs**: installation + host config now point to `snap mcp --stdio`

---

## Final recommendation

* **Do not “remove MCP altogether.”** You still need the MCP protocol surface for Cursor/Claude.
* **Remove the standalone app.** Keep MCP as a **library + CLI subcommand**. That’s the clean architecture: one product, one version, fewer moving parts, and you still speak MCP when asked.

If you want, next I can take your current `index.ts` (the file you mounted) and produce a concrete diff-style plan: what moves to `packages/mcp`, what stays in `packages/core`, and what the new `snap mcp` entry file looks like.


Updated from additional input:

Your advisor’s direction is mostly right — with one important nuance:

* **Yes:** push “workflow + state” (sessions, checkpoint discipline, prompts) into the **CLI/workspace**.
* **Yes:** keep **MCP tools as mostly stateless request/response** (return data + “next_action” hints; don’t try to do interactive gating inside MCP).
* **But:** even if the CLI “absorbs” everything, you still need *an MCP server implementation somewhere* **if you want Cursor/Claude Desktop/etc. to connect via MCP**. The trick is: **it lives inside the CLI distribution** (or a package the CLI depends on), not as a standalone app in `/apps`.

So: **remove `apps/mcp-server` as a standalone app**, but **don’t delete MCP capability** — relocate it into the CLI package (or `packages/mcp`) and expose it via `snap mcp` / `snapback mcp`.

---


# Final Implementation Spec (CLI owns everything; MCP is bundled, not standalone)

## 1) Decision

**Adopt: “CLI-first + bundled MCP transport”**

* **CLI is the product surface** (`snap` / `snapback`).
* MCP server is **a CLI subcommand** that boots the MCP transport and exposes tools.
* Business logic stays in `@snapback/core` / `@snapback/engine`.
* `apps/mcp-server` is removed (or archived), replaced by either:

  * `packages/mcp` (recommended), or
  * `apps/cli/src/mcp/*` (acceptable if you want fewer packages).

### Why this is the best fit

* One distribution, one version, one upgrade path.
* No duplicated wiring for auth/config/workspace root.
* MCP becomes a *transport adapter* (thin), not a separate “product.”

---

## 2) Target Repo Layout

### Recommended layout

```
packages/
  core/                # pure domain logic: snapshots, context, learning store, validation, etc.
  engine/              # orchestrator, pipelines, event bus (if distinct from core)
  api-client/          # SnapBackAPIClient + endpoint mapping + auth headers
  mcp/                 # MCP server creation + tool registry + adapters (NO business logic)
apps/
  cli/                 # commander/cac commands; imports packages/mcp to run server
```

### Migration from current state

* Move *tool definitions + handlers* out of `apps/mcp-server` into `packages/mcp`.
* Leave:

  * `ctx-runtime` logic where it belongs (likely core/engine)
  * formatting helpers in `packages/mcp` (LLM-facing formatting is transport-specific)

Then delete:

* `apps/mcp-server` (or keep an `.archive/` folder for historical reference only).

---

## 3) CLI UX Contract

### Binaries

CLI can be invoked as **both** `snapback` and `snap`.

`apps/cli/package.json`:

```json
{
  "name": "@snapback/cli",
  "bin": {
    "snapback": "./dist/index.js",
    "snap": "./dist/index.js"
  }
}
```

### Commands

Minimum set:

* `snap mcp`
  Starts MCP over stdio (Cursor/Claude Desktop-style)
* `snap mcp http --port 7331` *(optional)*
  Starts SSE/HTTP transport if you still need web clients
* `snap session start|stats|end|checkpoint`
  Session lifecycle is a **CLI feature** (writes to `.snapback/`)
* `snap ctx ...`
  Context system commands (these can call the same runtime as MCP tools)
* `snap snapshot create|list|restore`
  (can remain separate commands; MCP will expose analogous tools)

---

## 4) MCP Transport Behavior (bundled)

### Entry point

`apps/cli/src/commands/mcp.ts`:

* sets `workspaceRoot` (default `process.cwd()`)
* validates it’s a real workspace (see §6)
* loads config + auth (same as CLI)
* creates `apiClient` if token exists
* calls `createMcpServer({ workspaceRoot, apiClient, config })`
* connects stdio transport

### Package API

`packages/mcp/src/index.ts`:

```ts
export function createMcpServer(opts: {
  workspaceRoot: string;
  apiClient?: SnapBackAPIClient;
  config: SnapbackConfig;
}): Server
```

---

## 5) Tool Strategy (low-friction + LLM-friendly)

### Rule: keep tools “stateless” from the client’s perspective

Tools can read local files, compute health, and return “next actions,” but avoid multi-step confirmation protocols.

### Keep sessions out of MCP as “active control”

* **CLI** writes session state to `.snapback/session/current.json`
* **MCP** can *read* session state (passive) and include it in responses

### Tool catalog recommendation

You currently expose ~19+ tools. You have two viable options:

**Option A (best for adoption now):** keep the existing tool names for backward compatibility, but implement **facades internally** so you can evolve without breaking clients.

**Option B (best for cognitive load):** consolidate *some* tool families while keeping dangerous actions explicit.

My recommendation: **consolidate only the “ctx_*” family and the session family**, but keep snapshots + restore explicit.

Concretely:

* `snapback.context({ op: "init"|"build"|"validate"|"status"|"constraint"|"check"|"blockers", ... })`
* `snapback.session({ action: "start"|"stats"|"end"|"recommendations", ... })` *(optional — but if you go CLI-first, MCP session tools can become read-only or be deprecated entirely)*

Keep explicit:

* `snapback.create_snapshot`
* `snapback.list_snapshots`
* `snapback.restore_snapshot`

And keep:

* `snapback.assess_risk`
* `snapback.validate_recommendation`
* `snapback.get_context` (your “overview” tool is genuinely useful)

### “Prompt-augmented protection score” is correct

Every tool response should include:

* `session_health` / `context_valid`
* `risk_level` / `risk_score`
* `next_actions: [{ tool, args, reason, priority }]`

That gives *agents* the UX freedom to ask users for confirmation without MCP becoming an interactive state machine.

---

## 6) Workspace Binding & Safety (must-have)

Because you’re bundling MCP into CLI, you get one clean place to enforce:

* workspaceRoot validation
* path traversal protection
* `.snapback/` initialization expectations

**Workspace validation rule:**
A workspace is valid if it contains at least one of:

* `.git/`
* `package.json`
* `.snapback/` (or can be initialized)

If invalid: return a clean MCP error (and CLI exits non-zero).

---

## 7) Sessions & Learning (CLI-owned)

### Canonical storage

* `.snapback/session/current.json` (active)
* `.snapback/session/summaries/*.json` (history)
* `.snapback/learnings/user-learnings.jsonl`

### MCP behavior

* Tools may *reference* session state to include coaching, but should not “own” session lifecycle.
* If you keep `snapback.start_session` as a tool, it should just call the **same local code path** the CLI uses (no network required), and only optionally sync to backend.

---

## 8) API Client Spec (fixing 51500 + future-proofing)

### Endpoint mapping

Replace “string-to-path guessing” with an explicit map:

```ts
const routes = {
  "mcp.startSession": { method: "POST", path: "/v1/mcp/session/start" },
  "mcp.getRecommendations": { method: "POST", path: "/v1/mcp/recommendations" },
  "mcp.getSessionStats": { method: "GET",  path: "/v1/mcp/session/stats" }
} as const;
```

### Header contract

Always send:

* `content-type: application/json` when body exists
* `accept: application/json`

This should eliminate the “unsupported content type: json” class of bugs.

---

## 9) Build & Distribution

* `snap` / `snapback` ship as a single npm package (`@snapback/cli`).
* MCP is started via `snap mcp` (stdio).
* If you still need `npx @snapback/mcp-server`, make it an alias package that depends on `@snapback/cli` and runs `snap mcp` — but **don’t maintain two implementations**.

---

## 10) Deprecation Plan (painless)

* Keep your current tool names working via `toolNameMigrations` for 6 months.
* When users call deprecated names, include a small warning in the response text + `next_actions` pointing to the new tool.

---

## My take on the “organization strategy” advice

They’re right about the *direction* (CLI-first, MCP as data provider), but I’d tighten two claims:

1. **“Avoid session lifecycle tools in MCP.”**
   True *if* those tools try to do interactive gating or remote orchestration.
   But *read-only* session stats/coaching in MCP is totally fine — just make CLI the owner of writes.

2. **“Stateless tools.”**
   In practice, “stateless” means: no conversational multi-step protocols. Reading local workspace state is fine and expected.

---

---

# IMPLEMENTATION SPECIFICATIONS

## Item 2: SnapBackAPIClient Patch (Route Mapping + Content-Type)

### Problem

The current client uses string-to-path guessing and doesn't consistently set headers, causing `51500` class errors ("unsupported content type").

### Solution: Explicit Route Registry

```typescript
// packages/mcp/src/client/routes.ts
export const MCP_ROUTES = {
  // Session lifecycle
  "mcp.startSession": { method: "POST", path: "/v1/mcp/session/start" },
  "mcp.endSession": { method: "POST", path: "/v1/mcp/session/end" },
  "mcp.getSessionStats": { method: "GET", path: "/v1/mcp/session/stats" },
  
  // Recommendations & Learning
  "mcp.getRecommendations": { method: "POST", path: "/v1/mcp/recommendations" },
  "mcp.recordLearning": { method: "POST", path: "/v1/mcp/learning/record" },
  "mcp.recordActivity": { method: "POST", path: "/v1/mcp/activity/record" },
  
  // Analysis (API-backed)
  "mcp.analyzeRisk": { method: "POST", path: "/v1/analysis/risk" },
  "mcp.validatePackage": { method: "POST", path: "/v1/analysis/package" },
  
  // Snapshots (Pro tier)
  "mcp.createSnapshot": { method: "POST", path: "/v1/snapshots/create" },
  "mcp.listSnapshots": { method: "GET", path: "/v1/snapshots/list" },
  "mcp.restoreSnapshot": { method: "POST", path: "/v1/snapshots/restore" },
  
  // Tool execution (generic endpoint)
  "mcp.execute": { method: "POST", path: "/v1/mcp/execute" },
} as const;

export type McpRouteKey = keyof typeof MCP_ROUTES;
```

### Patched Client Implementation

```typescript
// packages/mcp/src/client/api-client.ts
import ky, { type KyInstance, HTTPError } from "ky";
import CircuitBreaker from "opossum";
import { MCP_ROUTES, type McpRouteKey } from "./routes";

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  fetch?: typeof globalThis.fetch; // For testing
}

export class SnapBackAPIClient {
  private client: KyInstance;
  private circuitBreaker: CircuitBreaker<[string, RequestInit?], unknown>;

  constructor(config: ApiClientConfig) {
    this.client = ky.create({
      prefixUrl: config.baseUrl,
      timeout: config.timeout ?? 30_000,
      retry: { limit: 0 }, // We handle retries
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set("Authorization", `Bearer ${config.apiKey}`);
            // CRITICAL: Always set these headers
            request.headers.set("Accept", "application/json");
            // Content-Type set per-request based on body presence
          },
        ],
      },
      ...(config.fetch && { fetch: config.fetch }),
    });

    this.circuitBreaker = new CircuitBreaker(
      (endpoint: string, options?: RequestInit) => this.doFetch(endpoint, options),
      {
        timeout: config.timeout ?? 30_000,
        errorThresholdPercentage: 50,
        resetTimeout: 30_000,
        volumeThreshold: 5,
      }
    );
  }

  /**
   * Type-safe request using route registry
   */
  async call<T = unknown>(
    route: McpRouteKey,
    params?: Record<string, unknown>
  ): Promise<T> {
    const { method, path } = MCP_ROUTES[route];
    
    const options: RequestInit = { method };
    
    if (params && method !== "GET") {
      options.body = JSON.stringify(params);
      options.headers = {
        "Content-Type": "application/json",
      };
    }
    
    return this.fetchWithRetry<T>(path, options);
  }

  /**
   * Legacy request method - maps old names to routes
   * @deprecated Use call() with route keys instead
   */
  async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    // Map legacy method names to route keys
    const legacyMap: Record<string, McpRouteKey> = {
      "mcp.startSession": "mcp.startSession",
      "mcp.getRecommendations": "mcp.getRecommendations",
      "mcp.recordActivity": "mcp.recordActivity",
      "mcp.recordLearning": "mcp.recordLearning",
      "mcp.getSessionStats": "mcp.getSessionStats",
      "mcp.endSession": "mcp.endSession",
    };

    const routeKey = legacyMap[method];
    if (routeKey) {
      return this.call<T>(routeKey, params);
    }

    // Fallback to generic execute endpoint
    return this.call<T>("mcp.execute", { tool: method, args: params });
  }

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    maxAttempts = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.circuitBreaker.fire(endpoint, options) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          await this.delay(100 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError ?? new Error("Request failed");
  }

  private async doFetch(endpoint: string, options?: RequestInit): Promise<unknown> {
    const url = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const response = await this.client(url, options);
    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Key Fixes

1. **Explicit route registry** - No more path guessing
2. **Always set `Accept: application/json`** - In beforeRequest hook
3. **Conditional `Content-Type`** - Only set when body exists
4. **Type-safe `call()` method** - Uses route keys, not strings
5. **Backward-compatible `request()`** - Maps legacy names to routes

---

## Item 3: Revised Tool Catalog (LLM-Optimized)

### Current State: 19+ Tools

```
CONTEXT (7): ctx_init, ctx_build, ctx_validate, ctx_status, ctx_constraint, ctx_check, ctx_blockers
SESSION (4): start_session, get_recommendations, session_stats, end_session
SNAPSHOTS (3): create_snapshot, list_snapshots, restore_snapshot
ANALYSIS (4): assess_risk, validate_recommendation, validate_code, check_patterns
WORKSPACE (3): get_workspace_vitals, acknowledge_risk, get_context
LEARNING (1): record_learning
META (1): meta_list_tools
```

### Target: 10-12 Tools via Facades

| New Tool | Replaces | Input Shape |
|----------|----------|-------------|
| `snapback.context` | ctx_init, ctx_build, ctx_validate, ctx_status, ctx_constraint, ctx_check, ctx_blockers | `{ op: "init" \| "build" \| ... }` |
| `snapback.session` | start_session, get_recommendations, session_stats, end_session | `{ op: "start" \| "stats" \| ... }` |
| `snapback.analyze` | assess_risk, validate_recommendation | `{ type: "risk" \| "package", ... }` |
| `snapback.validate` | validate_code, check_patterns | `{ mode: "quick" \| "comprehensive", ... }` |
| `snapback.snapshot_create` | create_snapshot | (unchanged) |
| `snapback.snapshot_list` | list_snapshots | (unchanged) |
| `snapback.snapshot_restore` | restore_snapshot | (unchanged) |
| `snapback.prepare_workspace` | get_workspace_vitals + get_context (combined pre-flight) | `{ files?: string[] }` |
| `snapback.acknowledge_risk` | acknowledge_risk | (unchanged) |
| `snapback.learn` | record_learning | (unchanged) |
| `snapback.meta` | meta_list_tools | (unchanged) |

**Result: 11 tools** (from 19+)

### Facade Implementation Pattern

```typescript
// packages/mcp/src/tools/facades/context.ts
import { z } from "zod";
import type { SnapBackToolDefinition } from "../types";

export const ContextOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("init"), workspaceRoot: z.string().optional(), force: z.boolean().optional() }),
  z.object({ op: z.literal("build"), workspaceRoot: z.string().optional() }),
  z.object({ op: z.literal("validate"), workspaceRoot: z.string().optional() }),
  z.object({ op: z.literal("status"), workspaceRoot: z.string().optional() }),
  z.object({ op: z.literal("constraint"), domain: z.string(), name: z.string(), workspaceRoot: z.string().optional() }),
  z.object({ op: z.literal("check"), domain: z.string(), name: z.string(), value: z.number(), workspaceRoot: z.string().optional() }),
  z.object({ op: z.literal("blockers"), workspaceRoot: z.string().optional() }),
]);

export const contextFacadeTool: SnapBackToolDefinition = {
  name: "snapback.context",
  description: `Unified context operations for workspace setup and query.

**Operations:**
- op: "init" - Initialize context (creates .snapback/ctx/context.json)
- op: "build" - Rebuild .ctx from context.json
- op: "validate" - Check if context is fresh
- op: "status" - Quick project health overview
- op: "constraint" - Get a constraint threshold (requires domain, name)
- op: "check" - Check value against constraint (requires domain, name, value)
- op: "blockers" - Get current project blockers

**Examples:**
- { "op": "status" } - Get project status at a glance
- { "op": "constraint", "domain": "bundle", "name": "size" } - Get bundle size limit
- { "op": "init", "force": true } - Re-initialize context`,

  inputSchema: {
    type: "object",
    properties: {
      op: {
        type: "string",
        enum: ["init", "build", "validate", "status", "constraint", "check", "blockers"],
        description: "Operation to perform",
      },
      // Op-specific fields
      force: { type: "boolean", description: "For init: force regenerate" },
      domain: { type: "string", description: "For constraint/check: constraint domain" },
      name: { type: "string", description: "For constraint/check: constraint name" },
      value: { type: "number", description: "For check: value to check" },
      workspaceRoot: { type: "string", description: "Workspace root path" },
    },
    required: ["op"],
  },

  annotations: {
    title: "Context Operations",
    readOnlyHint: false, // Some ops write
    destructiveHint: false,
    idempotentHint: false, // Depends on op
  },

  tier: "free",
  requiresBackend: false,
};

export async function handleContextFacade(
  args: z.infer<typeof ContextOpSchema>,
  ctx: { workspaceRoot: string }
): Promise<unknown> {
  const { op, ...params } = args;
  const workspaceRoot = params.workspaceRoot ?? ctx.workspaceRoot;

  switch (op) {
    case "init":
      return handleCtxInit({ workspaceRoot, force: params.force });
    case "build":
      return handleCtxBuild({ workspaceRoot });
    case "validate":
      return handleCtxValidate({ workspaceRoot });
    case "status":
      return handleCtxStatus({ workspaceRoot });
    case "constraint":
      return handleCtxConstraint({ workspaceRoot, domain: params.domain!, name: params.name! });
    case "check":
      return handleCtxCheck({ workspaceRoot, domain: params.domain!, name: params.name!, value: params.value! });
    case "blockers":
      return handleCtxBlockers({ workspaceRoot });
  }
}
```

### Backward Compatibility Migration Map

**SKIPPED** — Internal-only, not publicly released. No migration layer needed.

Direct remodel to 11 consolidated tools.

### prepare_workspace Tool (Critical Missing Tool)

This tool was flagged as missing in the audit. It combines vitals + context + snapshot guidance:

```typescript
// packages/mcp/src/tools/prepare-workspace.ts
export const prepareWorkspaceTool: SnapBackToolDefinition = {
  name: "snapback.prepare_workspace",
  description: `**Purpose:** Pre-flight check that combines workspace vitals, context validation, and snapshot guidance.

**Signal Words (when to auto-trigger):**
- "before I start", "getting started", "beginning work"
- "is it safe", "should I proceed", "ready to code"
- Start of any coding session

**Returns:**
- Protection score (0-100%): 🟢 >70%, 🟡 40-70%, 🔴 <40%
- Context freshness status
- Workspace vitals summary
- Snapshot recommendation (if score < 70%)
- Next actions ranked by priority

**This is the recommended entry point for AI coding sessions.**`,

  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string" },
        description: "Files you plan to modify (for targeted guidance)",
      },
      taskDescription: {
        type: "string",
        description: "Brief description of what you're about to do",
      },
    },
  },

  outputSchema: createOutputSchemaWithNextActions({
    protectionScore: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Overall protection readiness (0-100)",
    },
    protectionIndicator: {
      type: "string",
      enum: ["🟢", "🟡", "🔴"],
      description: "Visual indicator of protection level",
    },
    contextStatus: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        phase: { type: "string" },
        blockerCount: { type: "number" },
      },
    },
    vitals: {
      type: "object",
      properties: {
        pulse: { type: "string" },
        temperature: { type: "string" },
        pressure: { type: "number" },
        oxygen: { type: "number" },
      },
    },
    snapshotAdvice: {
      type: "object",
      properties: {
        recommended: { type: "boolean" },
        reason: { type: "string" },
        suggestedFiles: { type: "array", items: { type: "string" } },
      },
    },
    guidance: {
      type: "string",
      description: "Human-readable summary and advice",
    },
  }),

  annotations: {
    title: "Prepare Workspace",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },

  tier: "free",
  requiresBackend: false,
};
```

---

## Item 4: Final Implementation Approach Summary

### Phase 1: Package Creation (Week 1)

1. **Create `packages/mcp/`** with structure:
   ```
   packages/mcp/
   ├── src/
   │   ├── index.ts              # Public exports
   │   ├── server.ts             # createServer(), runStdioMcpServer()
   │   ├── client/
   │   │   ├── api-client.ts     # SnapBackAPIClient (patched)
   │   │   └── routes.ts         # Explicit route registry
   │   ├── tools/
   │   │   ├── index.ts          # Tool registry
   │   │   ├── types.ts          # SnapBackToolDefinition
   │   │   ├── migrations.ts     # toolNameMigrations
   │   │   └── facades/          # Consolidated facade tools
   │   │       ├── context.ts
   │   │       ├── session.ts
   │   │       ├── analyze.ts
   │   │       └── validate.ts
   │   ├── transport/
   │   │   ├── stdio.ts          # runStdio()
   │   │   └── sse.ts            # runSse() (optional)
   │   └── middleware/
   │       ├── auth.ts
   │       ├── workspace.ts      # Path validation
   │       ├── rate-limit.ts
   │       └── errors.ts
   ├── package.json
   └── tsconfig.json
   ```

2. **Migrate code** from `apps/mcp-server/src/` → `packages/mcp/src/`:
   - `tools/*.ts` → `packages/mcp/src/tools/`
   - `client/snapback-api.ts` → `packages/mcp/src/client/api-client.ts` (with patch)
   - `auth.ts` → `packages/mcp/src/middleware/auth.ts`
   - `utils/security.ts` → `packages/mcp/src/middleware/workspace.ts`

### Phase 2: CLI Integration (Week 2)

1. **Create `apps/cli/src/commands/mcp.ts`**:
   ```typescript
   import { Command } from "commander";
   import { runStdioMcpServer } from "@snapback/mcp";
   import { validateWorkspace, resolveWorkspaceRoot } from "../services/workspace";
   import { loadConfig, loadAuth } from "../services/config";

   export function createMcpCommand() {
     return new Command("mcp")
       .description("Start MCP server for Cursor/Claude integration")
       .option("--stdio", "Use stdio transport (default)")
       .option("--http", "Use HTTP/SSE transport")
       .option("--port <port>", "HTTP port (default: 7331)")
       .option("--workspace <path>", "Workspace root path")
       .option("--profile <name>", "Config profile to use")
       .action(async (options) => {
         // 1. Resolve workspace
         const workspaceRoot = await resolveWorkspaceRoot({
           explicit: options.workspace,
           env: process.env.SNAPBACK_WORKSPACE_ROOT,
           cwd: process.cwd(),
         });

         // 2. Validate workspace
         const validation = await validateWorkspace(workspaceRoot);
         if (!validation.valid) {
           console.error(`Invalid workspace: ${validation.reason}`);
           process.exit(1);
         }

         // 3. Load config + auth
         const config = await loadConfig(workspaceRoot, options.profile);
         const auth = await loadAuth(workspaceRoot);

         // 4. Start appropriate transport
         if (options.http) {
           const { runHttpMcpServer } = await import("@snapback/mcp");
           await runHttpMcpServer({
             workspaceRoot,
             config,
             auth,
             port: parseInt(options.port) || 7331,
           });
         } else {
           await runStdioMcpServer({ workspaceRoot, config, auth });
         }
       });
   }
   ```

2. **Update `apps/cli/src/index.ts`** to register MCP command:
   ```typescript
   import { createMcpCommand } from "./commands/mcp";
   
   // In createCLI():
   program.addCommand(createMcpCommand());
   ```

3. **Update `apps/cli/package.json`** to include both bin aliases:
   ```json
   {
     "name": "@snapback/cli",
     "bin": {
       "snapback": "./dist/index.js",
       "snap": "./dist/index.js"
     },
     "dependencies": {
       "@snapback/mcp": "workspace:*"
     }
   }
   ```

### Phase 3: Migration & Cleanup (Week 3)

1. **Update `turbo.json`** - Remove `apps/mcp-server` from pipeline
2. **Archive `apps/mcp-server`** - Move to `apps/.archive/mcp-server/`
3. **Update host configs** - Point to `snap mcp --stdio`
4. **Run deprecation window** - Keep old tool names working for 6 months

### Phase 4: Testing (Ongoing)

1. **Unit tests**:
   - `packages/mcp/src/tools/__tests__/` - Tool schemas, handlers, migrations
   - `packages/mcp/src/middleware/__tests__/` - Path security, rate limiting

2. **Integration tests**:
   - Spawn `snap mcp --stdio`, run MCP handshake
   - Verify tool calls return structured responses
   - Verify deprecated tool names still work with warnings

3. **E2E tests**:
   - Configure Cursor to use `snap mcp --stdio`
   - Run through typical coding session

---

## Final Tool Catalog (11 Tools)

| Tool | Tier | Purpose |
|------|------|-------  |
| `snapback.prepare_workspace` | Free | Pre-flight check (vitals + context + guidance) |
| `snapback.context` | Free | Context operations (init/build/validate/status/constraint/check/blockers) |
| `snapback.session` | Free | Session lifecycle (start/recommendations/stats/end) |
| `snapback.analyze` | Free | Risk + package analysis |
| `snapback.validate` | Free | Code validation (quick/comprehensive) |
| `snapback.snapshot_create` | Pro | Create restore point |
| `snapback.snapshot_list` | Pro | List available snapshots |
| `snapback.snapshot_restore` | Pro | Restore from snapshot |
| `snapback.acknowledge_risk` | Free | Acknowledge and proceed despite risk |
| `snapback.learn` | Free | Record learning for future sessions |
| `snapback.meta` | Free | List available tools |

**LLM Cognitive Load Reduction:** 19 → 11 tools (42% reduction)
**Backward Compatibility:** Not needed (internal-only, never released)
