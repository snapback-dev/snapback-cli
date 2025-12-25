# SnapBack CLI - Remaining Implementation Guide

**Status**: Updated 2024-12-25 (delta analysis v2)
**Scope**: Outstanding items requiring implementation

---

## Summary

| Original Spec | Previous | Current | Delta |
|---------------|----------|---------|-------|
| `MCP_EMBED_COMPLETION_PLAN.md` | 100% | 100% | ✅ Complete |
| `mcp_consolidation.md` | 95% | 98% | Minor docs |
| `mcp_embed.md` | 90% | **98%** | Integration tests exist |
| `implementation_spec.md` (Composer) | 85% | 85% | No change |
| `cli_ui_imp.md` | 70% | **95%** | +25% |

**Major completions since last review:**
- ✅ Interactive wizard (`wizard.ts`) - 973 lines, 9 steps
- ✅ Doctor command (`doctor.ts`) - 911 lines with `--workspace` and `--tests` flags
- ✅ UI prompts module (`prompts.ts`) - full implementation
- ✅ State persistence service (`state.ts`) - StateManager class
- ✅ Status command with dashboard view
- ✅ MCP integration tests (`integration.test.ts`) - 385 lines, 19 test cases
- ✅ 21 commands registered in CLI

---

## 1. CLI UI Implementation (~5% remaining)

### 1.1 Smart Router for `snap` (No Args)

**Location**: `apps/cli/src/index.ts`
**Status**: 🟡 Needs wiring
**Remaining Effort**: 2 hours

The wizard and status commands exist, but `snap` with no args doesn't auto-route. Add before `program.parseAsync()`:

```typescript
// apps/cli/src/index.ts - Add before program.parseAsync()

import { userState } from './services/state';
import { isLoggedIn, isSnapbackInitialized } from './services/snapback-dir';

async function smartRouter(): Promise<boolean> {
  // Only trigger for `snap` with no args
  if (process.argv.length > 2) return false;

  const cwd = process.cwd();
  const isFirstRun = userState.isFirstRun();
  const authenticated = await isLoggedIn();
  const initialized = await isSnapbackInitialized(cwd);

  if (isFirstRun) {
    // Import dynamically to avoid circular deps
    const { runWizard } = await import('./commands/wizard');
    await runWizard({ force: false });
    return true;
  }

  if (!authenticated) {
    console.log(chalk.yellow("Not logged in."));
    console.log(chalk.gray("Run: snap login"));
    return true;
  }

  if (!initialized) {
    console.log(chalk.yellow("Workspace not initialized."));
    console.log(chalk.gray("Run: snap init"));
    return true;
  }

  // Show dashboard (status command)
  const { createStatusCommand } = await import('./commands/status');
  await createStatusCommand().parseAsync(['node', 'snap', 'status']);
  return true;
}

// In createCLI() or before parse:
if (await smartRouter()) {
  process.exit(0);
}
```

---

### 1.2 Shell Completion Scripts

**Location**: `apps/cli/resources/completions/`
**Status**: ❌ Not started
**Remaining Effort**: 2 hours

Create directory and add completions:

```bash
mkdir -p apps/cli/resources/completions
```

**Bash completion** (`snap.bash`):
```bash
_snap_completions() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local commands="login logout whoami init status fix tools mcp protect session context validate stats learn patterns watch config doctor upgrade wizard undo alias snapshot list analyze check"

  if [[ ${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${commands}" -- "${cur}"))
  fi
}

complete -F _snap_completions snap
complete -F _snap_completions snapback
```

**Zsh completion** (`snap.zsh`):
```zsh
#compdef snap snapback

_snap() {
  local -a commands
  commands=(
    'login:Sign in with GitHub'
    'logout:Sign out'
    'whoami:Show current user'
    'init:Initialize workspace'
    'status:Show workspace status'
    'wizard:Interactive setup'
    'doctor:Diagnose issues'
    'config:Manage settings'
    'protect:Manage file protection'
    'mcp:MCP server operations'
  )
  _describe 'command' commands
}

_snap "$@"
```

---

## 2. Composer Pipeline (~15% remaining)

### 2.1 Two-Pass Selection Algorithm Verification

**Location**: `packages/intelligence/src/composer/`
**Status**: 🟡 Structure exists, needs verification tests
**Remaining Effort**: 4 hours

Add tests to verify the two-pass algorithm:

```typescript
// packages/intelligence/test/composer/two-pass.test.ts

describe('Two-Pass Pipeline', () => {
  it('pass 1 uses coarse token estimates', async () => {
    const composer = new Composer(testConfig);
    const result = await composer.compose({ task: 'test' });

    // Verify selection happened before exact measurement
    expect(result.selectionPhase).toBe('complete');
  });

  it('pass 2 shrinks when over budget', async () => {
    const oversizedCandidates = createCandidates(20000); // Over budget
    const config = { ...testConfig, totalTokens: 10000 };

    const result = await composer.compose({ task: 'test' }, {}, oversizedCandidates);

    expect(result.actualTokens).toBeLessThanOrEqual(10000);
  });

  it('respects shrink strategy per kind', async () => {
    const result = await composer.compose({ task: 'test' });

    // 'never' shrink kinds should be intact
    const policyItems = result.rendered.filter(r => r.kind === 'policy');
    expect(policyItems.every(a => !a.wasShrunk)).toBe(true);
  });
});
```

---

### 2.2 Lane Allocation Edge Cases

**Location**: `packages/intelligence/src/composer/allocation.ts`
**Status**: 🟡 Needs edge case tests
**Remaining Effort**: 2 hours

```typescript
describe('Lane Budget Allocation', () => {
  it('handles budget exhaustion mid-allocation', () => {
    const candidates = [
      { lane: 'policy', tokenEstimate: 5000 },
      { lane: 'rules', tokenEstimate: 5000 },
      { lane: 'local', tokenEstimate: 5000 },
    ];
    const config = { totalTokens: 8000 };

    const result = allocateMinBudgets(candidates, config);

    expect(result.shortfalls.length).toBeGreaterThan(0);
  });

  it('handles empty lanes gracefully', () => {
    const candidates = [{ lane: 'policy', tokenEstimate: 1000 }];
    const result = allocateMinBudgets(candidates, defaultConfig);

    expect(result.allocation.rules).toBe(0);
  });
});
```

---

## 3. MCP Tests (~2% remaining)

### 3.1 E2E Transport Test

**Location**: `packages/mcp/test/e2e/`
**Status**: 🟢 Integration tests exist, E2E transport optional
**Remaining Effort**: 2 hours (optional)

The `integration.test.ts` already covers:
- ✅ All 15 tools registered (MCP-INT-001-001)
- ✅ Valid input schemas (MCP-INT-001-003)
- ✅ MCP-compliant response structure (MCP-INT-001-005 through 008)
- ✅ Input validation (MCP-INT-001-009 through 012)
- ✅ Error handling (MCP-INT-001-013, 014)
- ✅ Response stability (MCP-INT-001-015, 016)
- ✅ Schema validation (MCP-INT-001-017 through 019)

Optional E2E test for real STDIO transport:

```typescript
// packages/mcp/test/e2e/transport.test.ts

describe('STDIO Transport E2E', () => {
  it('stdout contains only valid JSON-RPC', async () => {
    const proc = spawn('node', ['dist/cli.js', 'mcp', '--stdio']);
    const stdout: string[] = [];

    proc.stdout.on('data', (data) => stdout.push(data.toString()));

    // Send initialize request
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    }) + '\n');

    await new Promise(r => setTimeout(r, 1000));
    proc.kill();

    // Verify all output is valid JSON-RPC
    for (const line of stdout.filter(l => l.trim())) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
```

---

## Implementation Checklist

### Priority 1 (Quick Wins) - ~4 hours total

- [ ] Wire smart router in `index.ts` for `snap` no-args (2h)
- [ ] Create shell completion scripts (2h)

### Priority 2 (Test Coverage) - ~6 hours total

- [ ] Two-pass pipeline verification tests (4h)
- [ ] Lane allocation edge case tests (2h)

### Priority 3 (Optional Polish) - ~2 hours

- [ ] E2E transport test for STDIO (optional)

---

## Completed Items (Full List)

| Component | Lines | Status |
|-----------|-------|--------|
| `wizard.ts` | 973 | ✅ 9-step interactive wizard |
| `doctor.ts` | 911 | ✅ Comprehensive diagnostics with --workspace, --tests |
| `prompts.ts` | 391 | ✅ confirm, select, input, spinner, progress |
| `state.ts` | 287 | ✅ StateManager with Pioneer stats |
| `status.ts` | 200+ | ✅ Dashboard view with vitals |
| `integration.test.ts` | 385 | ✅ 19 MCP integration test cases |
| `handlers.test.ts` | 1230 | ✅ Unit tests for all handlers |
| `config.ts` | ✅ | Config get/set/list/path |
| `upgrade.ts` | ✅ | Self-update with channel support |
| `undo.ts` | ✅ | Operation rollback |
| `alias.ts` | ✅ | Command shortcuts |

**21 commands now registered** in CLI.

---

## Archived Specifications

All 5 original specs archived to `.archive/specs/`:
- `MCP_EMBED_COMPLETION_PLAN.md`
- `mcp_consolidation.md`
- `mcp_embed.md`
- `implementation_spec.md`
- `cli_ui_imp.md`

---

*Updated 2024-12-25 after delta analysis v2*
