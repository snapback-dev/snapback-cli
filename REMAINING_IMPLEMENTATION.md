# SnapBack CLI - Remaining Implementation Guide

**Status**: Consolidated from 5 specification documents
**Created**: 2024-12-25
**Scope**: Outstanding items requiring implementation

---

## Summary

| Original Spec | Completion | Remaining Work |
|---------------|------------|----------------|
| `MCP_EMBED_COMPLETION_PLAN.md` | 100% | None - archived |
| `mcp_consolidation.md` | 95% | Minor documentation |
| `mcp_embed.md` | 90% | Integration tests |
| `implementation_spec.md` (Composer) | 85% | Algorithm depth |
| `cli_ui_imp.md` | 70% | Interactive features |

---

## 1. CLI UI Implementation (~30% remaining)

### 1.1 Interactive `snap` (No Args) Smart Router

**Location**: `apps/cli/src/index.ts`
**Priority**: HIGH
**Estimated Effort**: 4 hours

The `snap` command with no arguments should intelligently route based on state:

```typescript
// apps/cli/src/commands/smart-router.ts

import { detectState } from '../services/state';
import { runFirstTimeSetup } from './wizard';
import { promptLogin } from './login';
import { promptWorkspaceInit } from './init';
import { showDashboard } from './status';

export async function smartRouter(): Promise<void> {
  const state = await detectState();

  if (!state.hasGlobalConfig) {
    // First time ever - full onboarding
    return runFirstTimeSetup();
  }

  if (!state.isAuthenticated) {
    // Has config but not logged in
    return promptLogin();
  }

  if (!state.hasWorkspaceConfig && state.isInGitRepo) {
    // Logged in, in a repo, but no .snapback/
    return promptWorkspaceInit();
  }

  // Everything configured - show status dashboard
  return showDashboard();
}
```

**State Detection Service**:

```typescript
// apps/cli/src/services/state.ts

export interface CLIState {
  hasGlobalConfig: boolean;      // ~/.snapback/ exists
  isAuthenticated: boolean;      // Valid credentials stored
  hasWorkspaceConfig: boolean;   // .snapback/ in current dir
  isInGitRepo: boolean;          // .git/ exists
  mcpConfigured: boolean;        // Cursor/Claude configs exist
  aiToolsDetected: string[];     // ['cursor', 'claude', 'copilot']
}

export async function detectState(): Promise<CLIState> {
  const homeDir = os.homedir();
  const cwd = process.cwd();

  const [
    hasGlobalConfig,
    credentials,
    hasWorkspaceConfig,
    isInGitRepo,
    aiTools
  ] = await Promise.all([
    pathExists(path.join(homeDir, '.snapback')),
    getCredentials(),
    pathExists(path.join(cwd, '.snapback')),
    pathExists(path.join(cwd, '.git')),
    detectAITools()
  ]);

  return {
    hasGlobalConfig,
    isAuthenticated: !!credentials?.accessToken,
    hasWorkspaceConfig,
    isInGitRepo,
    mcpConfigured: await checkMCPConfigs(aiTools),
    aiToolsDetected: aiTools
  };
}
```

---

### 1.2 Rich Terminal UI Components

**Location**: `apps/cli/src/ui/`
**Priority**: MEDIUM
**Estimated Effort**: 8 hours

#### Box Component (using boxen)

```typescript
// apps/cli/src/ui/box.ts

import boxen from 'boxen';
import chalk from 'chalk';

export interface BoxOptions {
  title?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  borderColor?: string;
  padding?: number;
  width?: number;
}

export function createBox(content: string, options: BoxOptions = {}): string {
  return boxen(content, {
    title: options.title,
    titleAlignment: options.titleAlignment || 'left',
    borderColor: options.borderColor || 'cyan',
    padding: options.padding ?? 1,
    width: options.width,
    borderStyle: 'round'
  });
}

export function successBox(content: string, title = 'Success'): string {
  return createBox(content, {
    title: `${chalk.green('✓')} ${title}`,
    borderColor: 'green'
  });
}

export function warningBox(content: string, title = 'Warning'): string {
  return createBox(content, {
    title: `${chalk.yellow('⚠')} ${title}`,
    borderColor: 'yellow'
  });
}

export function errorBox(content: string, title = 'Error'): string {
  return createBox(content, {
    title: `${chalk.red('✗')} ${title}`,
    borderColor: 'red'
  });
}

export function infoBox(content: string, title = 'Info'): string {
  return createBox(content, {
    title: `${chalk.blue('ℹ')} ${title}`,
    borderColor: 'blue'
  });
}
```

#### Spinner Component (using ora)

```typescript
// apps/cli/src/ui/spinner.ts

import ora, { type Ora } from 'ora';

export interface SpinnerTask {
  text: string;
  task: () => Promise<void>;
}

export async function withSpinner<T>(
  text: string,
  task: () => Promise<T>
): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await task();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

export async function runSequentialTasks(
  tasks: SpinnerTask[]
): Promise<void> {
  for (const { text, task } of tasks) {
    await withSpinner(text, task);
  }
}

export async function runParallelWithProgress(
  tasks: SpinnerTask[]
): Promise<void> {
  const spinner = ora(`Running ${tasks.length} tasks...`).start();
  let completed = 0;

  await Promise.all(
    tasks.map(async ({ text, task }) => {
      await task();
      completed++;
      spinner.text = `${completed}/${tasks.length} completed`;
    })
  );

  spinner.succeed(`All ${tasks.length} tasks completed`);
}
```

#### Progress Indicators

```typescript
// apps/cli/src/ui/progress.ts

import cliProgress from 'cli-progress';
import chalk from 'chalk';

export function createProgressBar(
  total: number,
  format?: string
): cliProgress.SingleBar {
  return new cliProgress.SingleBar({
    format: format || `${chalk.cyan('{bar}')} | {percentage}% | {value}/{total}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true
  });
}

export async function withProgress<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  label = 'Processing'
): Promise<void> {
  const bar = createProgressBar(items.length);
  console.log(label);
  bar.start(items.length, 0);

  for (let i = 0; i < items.length; i++) {
    await processor(items[i], i);
    bar.update(i + 1);
  }

  bar.stop();
}
```

---

### 1.3 Interactive Wizard Flow

**Location**: `apps/cli/src/commands/wizard.ts`
**Priority**: HIGH
**Estimated Effort**: 8 hours

```typescript
// apps/cli/src/commands/wizard.ts

import inquirer from 'inquirer';
import { displayBrandedHeader } from '../ui/logo';
import { createBox, successBox } from '../ui/box';
import { withSpinner, runSequentialTasks } from '../ui/spinner';

interface WizardResult {
  authenticated: boolean;
  aiToolsConfigured: string[];
  protectedFiles: string[];
  issuesFixed: number;
}

export async function runFirstTimeSetup(): Promise<WizardResult> {
  console.clear();
  displayBrandedHeader();

  console.log(createBox(
    `Welcome to SnapBack!\n\n` +
    `SnapBack protects your code from AI coding assistant\n` +
    `mistakes. When things go wrong, restore in seconds.`,
    { title: 'Welcome', borderColor: 'cyan' }
  ));

  // Step 1: Authentication choice
  const { authChoice } = await inquirer.prompt([{
    type: 'list',
    name: 'authChoice',
    message: 'How would you like to get started?',
    choices: [
      { name: 'Sign in with GitHub (recommended)', value: 'github' },
      { name: 'Continue without signing in', value: 'skip' },
      { name: 'Learn more about SnapBack', value: 'learn' }
    ]
  }]);

  let authenticated = false;
  if (authChoice === 'github') {
    authenticated = await runGitHubAuth();
  } else if (authChoice === 'learn') {
    await showLearnMore();
    return runFirstTimeSetup(); // Restart wizard
  }

  // Step 2: AI Tool Detection
  console.log('\n' + chalk.bold('Step 2 of 4 • AI Tool Detection'));
  console.log('─'.repeat(60));

  const detectedTools = await withSpinner(
    'Scanning for AI coding tools...',
    detectAITools
  );

  displayDetectedTools(detectedTools);

  const { configureTools } = await inquirer.prompt([{
    type: 'confirm',
    name: 'configureTools',
    message: `Configure SnapBack for ${formatToolList(detectedTools)}?`,
    default: true
  }]);

  let configuredTools: string[] = [];
  if (configureTools) {
    configuredTools = await configureMCPForTools(detectedTools);
  }

  // Step 3: Protected Files
  console.log('\n' + chalk.bold('Step 3 of 4 • Protected Files'));
  console.log('─'.repeat(60));

  const suggestedFiles = await withSpinner(
    'Analyzing workspace for critical files...',
    () => scanForProtectedFiles(process.cwd())
  );

  displaySuggestedFiles(suggestedFiles);

  const { protectAll, additionalPatterns } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'protectAll',
      message: 'Protect all detected files?',
      default: true
    },
    {
      type: 'input',
      name: 'additionalPatterns',
      message: 'Add additional patterns? (comma-separated, Enter to skip)',
      filter: (input: string) => input.split(',').map(s => s.trim()).filter(Boolean)
    }
  ]);

  const protectedFiles = protectAll
    ? [...suggestedFiles, ...additionalPatterns]
    : additionalPatterns;

  // Step 4: Health Check + Fixes
  console.log('\n' + chalk.bold('Step 4 of 4 • Workspace Health'));
  console.log('─'.repeat(60));

  const issues = await withSpinner(
    'Running health check...',
    () => runHealthCheck(process.cwd())
  );

  let issuesFixed = 0;
  if (issues.autoFixable.length > 0) {
    displayIssues(issues);

    const { fixIssues } = await inquirer.prompt([{
      type: 'confirm',
      name: 'fixIssues',
      message: `Fix auto-fixable issues? (${issues.autoFixable.length} available)`,
      default: true
    }]);

    if (fixIssues) {
      issuesFixed = await autoFixIssues(issues.autoFixable);
    }
  }

  // Finalize
  console.log('\n' + chalk.bold('Finalizing...'));
  await runSequentialTasks([
    { text: 'Writing .snapback/config.json', task: () => writeWorkspaceConfig(protectedFiles) },
    { text: 'Writing .snapback/protected.json', task: () => writeProtectedFiles(protectedFiles) },
    ...configuredTools.map(tool => ({
      text: `Updating ${tool} MCP config`,
      task: () => writeMCPConfig(tool)
    }))
  ]);

  // Success screen
  console.log('\n' + successBox(
    `✓ SnapBack is now protecting this workspace\n\n` +
    `Workspace:  ${process.cwd()}\n` +
    `Protected:  ${protectedFiles.length} files/patterns\n` +
    `AI Tools:   ${configuredTools.join(', ') || 'None configured'}\n\n` +
    `Next steps:\n\n` +
    `1. Restart Cursor and Claude Desktop\n` +
    `2. Start coding! SnapBack works automatically.\n\n` +
    `Try asking your AI: "What does SnapBack know about this project?"`,
    'Setup Complete!'
  ));

  return {
    authenticated,
    aiToolsConfigured: configuredTools,
    protectedFiles,
    issuesFixed
  };
}
```

---

### 1.4 Dashboard View (`snap status`)

**Location**: `apps/cli/src/commands/status.ts`
**Priority**: MEDIUM
**Estimated Effort**: 4 hours

```typescript
// apps/cli/src/commands/status.ts

import chalk from 'chalk';
import { createBox } from '../ui/box';
import { detectState } from '../services/state';
import { getRecentActivity } from '../services/activity';
import { getWorkspaceVitals } from '../services/vitals';

export async function showDashboard(): Promise<void> {
  const state = await detectState();
  const vitals = await getWorkspaceVitals(process.cwd());
  const activity = await getRecentActivity(process.cwd(), 5);

  // Header
  const userLine = state.isAuthenticated
    ? `${chalk.cyan('@' + state.username)} • Pioneer #${state.pioneerNumber} • ${state.tier}`
    : chalk.yellow('Not signed in');

  // Protection status
  const protectionLine = vitals
    ? `${chalk.bold('Protected:')} ${vitals.protectedCount} files • Last snapshot: ${formatTimeAgo(vitals.lastSnapshot)}`
    : chalk.yellow('Workspace not initialized');

  // AI Tools status
  const aiToolLines = state.aiToolsDetected.map(tool => {
    const connected = state.mcpConfigured;
    const icon = connected ? chalk.green('✓') : chalk.dim('○');
    const status = connected ? 'connected' : 'not configured';
    return `  ${icon} ${tool.padEnd(12)} ${status}`;
  });

  // Recent activity
  const activityLines = activity.map(a =>
    `  • ${formatTime(a.timestamp)}  ${a.description}`
  );

  const content = [
    userLine,
    '',
    `${chalk.bold('Workspace:')} ${path.basename(process.cwd())}`,
    protectionLine,
    '',
    chalk.bold('AI Tools:'),
    ...aiToolLines,
    '',
    chalk.bold('Recent Activity:'),
    ...(activityLines.length > 0 ? activityLines : ['  No recent activity']),
    '',
    chalk.dim("Run 'snap help' for available commands")
  ].join('\n');

  console.log(createBox(content, {
    title: 'SnapBack',
    borderColor: 'cyan'
  }));
}
```

---

## 2. Composer Pipeline (~15% remaining)

### 2.1 Two-Pass Selection Algorithm Verification

**Location**: `packages/intelligence/src/composer/selection.ts`
**Priority**: MEDIUM
**Estimated Effort**: 6 hours

The spec calls for a two-pass pipeline:
1. **Pass 1**: Selection using coarse token estimates
2. **Pass 2**: Render, measure actual tokens, shrink if needed

**Verification checklist**:

```typescript
// packages/intelligence/src/composer/Composer.ts

export class Composer {
  async compose(
    trigger: ComposeTrigger,
    constraints: ComposerConstraints = EMPTY_CONSTRAINTS
  ): Promise<CompositionResult> {
    // 1. Gather candidates from all sources
    const candidates = await this.gatherCandidates(trigger);

    // 2. Check cache (before doing work)
    const cacheKey = this.computeEarlyCacheKey(candidates, context, constraints);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cacheHit: true };
    }

    // 3. PASS 1: Select using coarse estimates
    const selection = selectArtifacts(
      candidates,
      this.config,
      constraints,
      context
    );

    // 4. PASS 2: Render and measure actual tokens
    const rendered = await this.renderSelected(selection.selected, candidates);

    // 5. Measure actual tokens
    const actualTotal = rendered.reduce((sum, r) => sum + r.exactTokenCount, 0);

    // 6. If over budget, shrink
    let finalRendered = rendered;
    if (actualTotal > this.config.totalTokens) {
      finalRendered = await this.shrinkToFit(rendered, this.config.totalTokens);
    }

    // 7. Build final result with explanation
    const result: CompositionResult = {
      ...selection,
      rendered: finalRendered,
      actualTokens: finalRendered.reduce((sum, r) => sum + r.exactTokenCount, 0),
    };

    // 8. Cache and emit for replay
    this.cache.set(cacheKey, result);
    this.emitDecisionLog(result, trigger, constraints);

    return result;
  }
}
```

**Required tests**:

```typescript
// packages/intelligence/test/composer/two-pass.test.ts

describe('Two-Pass Pipeline', () => {
  it('selects in pass 1 using estimates', async () => {
    // Verify selection happens before rendering
  });

  it('renders in pass 2 with exact token counts', async () => {
    // Verify exact tokens are measured after selection
  });

  it('shrinks when actual tokens exceed budget', async () => {
    // Create artifacts that underestimate tokens
    // Verify shrinking occurs
  });

  it('respects shrink strategy per artifact kind', async () => {
    // Verify 'never' kinds are not shrunk
    // Verify 'truncate_oldest' removes oldest content first
  });

  it('emits decision log for replay', async () => {
    // Verify log contains all necessary fields
  });

  it('replays deterministically', async () => {
    // Replay a logged decision
    // Verify identical output
  });
});
```

---

### 2.2 Lane-Based Budget Allocation Depth

**Location**: `packages/intelligence/src/composer/allocation.ts`
**Priority**: MEDIUM
**Estimated Effort**: 4 hours

Verify the allocation algorithm handles edge cases:

```typescript
// packages/intelligence/src/composer/allocation.ts

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

  // Allocate mins by priority order (policy first, history last)
  const lanes = Object.entries(config.lanes)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([lane]) => lane as Lane);

  for (const lane of lanes) {
    const laneCandidates = byLane.get(lane) ?? [];
    const available = laneCandidates.reduce((sum, c) => sum + c.tokenEstimate, 0);
    const laneMin = config.lanes[lane].min;

    // Can't meet min? Take what's available, release rest to pool
    const allocated = Math.min(laneMin, available, pool);
    allocation[lane] = allocated;
    pool -= allocated;

    // Track shortfall for debugging/explainability
    if (allocated < laneMin) {
      shortfalls.push({
        lane,
        requested: laneMin,
        available,
        reason: available < laneMin ? 'insufficient_candidates' : 'budget_exhausted'
      });
    }
  }

  return { allocation, pool, shortfalls };
}
```

**Required tests**:

```typescript
describe('Lane Budget Allocation', () => {
  it('allocates minimum budgets by priority', () => {});
  it('reallocates unused minimum to pool', () => {});
  it('respects lane maximums during filling', () => {});
  it('tracks shortfalls with reasons', () => {});
  it('handles empty lanes gracefully', () => {});
  it('handles budget exhaustion mid-allocation', () => {});
});
```

---

## 3. MCP Integration Tests (~10% remaining)

### 3.1 End-to-End Test Scenarios

**Location**: `packages/mcp/test/e2e/`
**Priority**: HIGH
**Estimated Effort**: 6 hours

```typescript
// packages/mcp/test/e2e/mcp-server.e2e.test.ts

import { spawn, type ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Server E2E', () => {
  let serverProcess: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Spawn the MCP server via CLI
    serverProcess = spawn('node', [
      './dist/index.js',
      'mcp',
      '--stdio',
      '--workspace', testWorkspacePath
    ], {
      cwd: path.join(__dirname, '../../../../apps/cli'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Create MCP client
    transport = new StdioClientTransport({
      command: 'node',
      args: ['./dist/index.js', 'mcp', '--stdio'],
      env: { ...process.env, SNAPBACK_WORKSPACE_ROOT: testWorkspacePath }
    });

    client = new Client({ name: 'test-client', version: '1.0.0' }, {});
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    serverProcess.kill();
  });

  describe('Protocol Handshake', () => {
    it('responds to initialize request', async () => {
      const info = client.getServerInfo();
      expect(info?.name).toBe('snapback');
    });

    it('returns tool list', async () => {
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThan(10);
      expect(tools.tools.map(t => t.name)).toContain('analyze');
      expect(tools.tools.map(t => t.name)).toContain('prepare_workspace');
    });
  });

  describe('Tool Calls', () => {
    it('prepare_workspace returns valid response', async () => {
      const result = await client.callTool({
        name: 'prepare_workspace',
        arguments: { files: ['src/index.ts'] }
      });

      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('protectionScore');
      expect(data).toHaveProperty('vitals');
      expect(data).toHaveProperty('guidance');
    });

    it('get_context returns context with learnings', async () => {
      const result = await client.callTool({
        name: 'get_context',
        arguments: {
          task: 'Add authentication',
          files: ['src/auth.ts']
        }
      });

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('workspace');
      expect(data).toHaveProperty('relevantLearnings');
      expect(data).toHaveProperty('next_actions');
    });

    it('check_patterns validates code', async () => {
      const result = await client.callTool({
        name: 'check_patterns',
        arguments: {
          code: 'console.log("test");',
          filePath: 'src/test.ts'
        }
      });

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('passed');
      expect(data).toHaveProperty('violations');
    });

    it('report_violation tracks and auto-promotes', async () => {
      // Report same violation 3 times
      for (let i = 0; i < 3; i++) {
        const result = await client.callTool({
          name: 'report_violation',
          arguments: {
            type: 'test-violation',
            file: 'src/test.ts',
            whatHappened: 'Test violation',
            whyItHappened: 'Testing',
            prevention: 'Dont do this'
          }
        });

        const data = JSON.parse(result.content[0].text);
        if (i === 2) {
          expect(data.promoted).toBe(true);
          expect(data.occurrences).toBe(3);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('returns structured error for invalid tool', async () => {
      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {}
      });

      expect(result.isError).toBe(true);
      const error = JSON.parse(result.content[0].text);
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });

    it('returns validation error for missing params', async () => {
      const result = await client.callTool({
        name: 'check_patterns',
        arguments: {} // Missing required code and filePath
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Transport', () => {
    it('stdout is protocol-clean (no debug output)', async () => {
      // Collect stdout during operation
      const stdout: string[] = [];
      serverProcess.stdout?.on('data', (data) => {
        stdout.push(data.toString());
      });

      await client.callTool({
        name: 'prepare_workspace',
        arguments: {}
      });

      // All stdout should be valid JSON-RPC
      for (const line of stdout) {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      }
    });
  });
});
```

---

## 4. Documentation Completeness (~5% remaining)

### 4.1 Tool Annotation Updates

**Location**: `packages/mcp/src/registry.ts`
**Priority**: LOW
**Estimated Effort**: 2 hours

Ensure all 15 tools have complete MCP annotations:

```typescript
// Required annotation structure for each tool
interface ToolAnnotations {
  title: string;           // Human-readable title
  readOnlyHint: boolean;   // True if tool doesn't modify state
  destructiveHint: boolean; // True if tool can cause data loss
  idempotentHint: boolean; // True if repeated calls are safe
  openWorldHint?: boolean; // True if tool accesses external resources
}

// Audit checklist:
// [ ] analyze - annotations complete
// [ ] prepare_workspace - annotations complete
// [ ] snapshot_create - annotations complete (destructiveHint: false)
// [ ] snapshot_list - annotations complete (readOnlyHint: true)
// [ ] snapshot_restore - annotations complete (destructiveHint: true)
// [ ] validate - annotations complete
// [ ] context - annotations complete (per op)
// [ ] session - annotations complete (per op)
// [ ] learn - annotations complete
// [ ] acknowledge_risk - annotations complete
// [ ] get_context - annotations complete
// [ ] check_patterns - annotations complete
// [ ] report_violation - annotations complete
// [ ] get_learnings - annotations complete
// [ ] meta - annotations complete
```

---

## Implementation Checklist

### Priority 1 (Blockers - Complete First)

- [ ] Smart router for `snap` no-args command
- [ ] State detection service
- [ ] MCP E2E test suite
- [ ] Two-pass pipeline verification tests

### Priority 2 (Core Experience)

- [ ] Interactive wizard flow
- [ ] Dashboard status view
- [ ] Rich UI components (boxes, spinners, progress)
- [ ] Lane allocation edge case tests

### Priority 3 (Polish)

- [ ] Tool annotation completeness audit
- [ ] Documentation update for new tools
- [ ] Shell completion scripts

---

## Archived Specifications

The following specifications have been archived as they are 95-100% complete:

| File | Status | Archive Location |
|------|--------|------------------|
| `MCP_EMBED_COMPLETION_PLAN.md` | 100% Complete | `.archive/specs/` |
| `mcp_consolidation.md` | 95% Complete | `.archive/specs/` |
| `mcp_embed.md` | 90% Complete | `.archive/specs/` |
| `implementation_spec.md` | 85% Complete | `.archive/specs/` |
| `cli_ui_imp.md` | 70% Complete | `.archive/specs/` |

---

*Consolidated 2024-12-25 from 5 specification documents*
