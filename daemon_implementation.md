Let me design this properly for SnapBack's specific needs.

---

## SnapBack CLI Daemon Architecture

### Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Lazy start** | Don't consume resources until user actually needs SnapBack |
| **Idle shutdown** | Free resources when not in use |
| **Workspace-aware** | Single daemon, multiple workspace contexts |
| **Crash resilient** | Persist critical state; recover gracefully |
| **Zero-config** | Works out of the box, no manual daemon management |

---

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SnapBack Daemon                                   │
│                     (snapback daemon start)                              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │   Watcher   │  │   Session   │  │  Snapshot   │  │   Learning   │   │
│  │   Service   │  │   Manager   │  │   Engine    │  │    Store     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Transport Layer                             │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │   │
│  │  │    IPC    │  │    SSE    │  │   HTTP    │  │  Signals  │    │   │
│  │  │  (sock)   │  │   (MCP)   │  │  (health) │  │ (SIGTERM) │    │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │ IPC                │ SSE                │ IPC
         │                    │                    │
    ┌────┴────┐         ┌─────┴─────┐        ┌─────┴─────┐
    │   CLI   │         │    MCP    │        │ Extension │
    │ commands│         │  Clients  │        │  (vscode) │
    └─────────┘         └───────────┘        └───────────┘
```

---

### Daemon Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIFECYCLE STATE MACHINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────┐     first request      ┌─────────┐                      │
│    │ STOPPED │ ──────────────────────▶│STARTING │                      │
│    └─────────┘                        └────┬────┘                      │
│         ▲                                  │                            │
│         │                                  ▼                            │
│         │ idle timeout            ┌─────────────┐                      │
│         │ (15 min default)        │   RUNNING   │◀─────┐               │
│         │                         └──────┬──────┘      │               │
│         │                                │             │               │
│         │                         activity detected    │               │
│    ┌────┴─────┐                          │             │               │
│    │ STOPPING │◀─────────────────────────┴─────────────┘               │
│    └──────────┘      SIGTERM / idle / explicit stop                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### File Structure

```
~/.snapback/
├── daemon/
│   ├── daemon.pid          # PID file for single-instance enforcement
│   ├── daemon.sock         # Unix socket (Linux/macOS)
│   ├── daemon.lock         # Lock file for startup race conditions
│   └── daemon.log          # Daemon logs (rotated, max 10MB)
├── workspaces/
│   └── {workspace-hash}/
│       ├── state.json      # Persistent session state (crash recovery)
│       ├── learnings.jsonl # Learning store
│       ├── snapshots/      # Blob storage
│       └── .ctx            # Compiled context
└── config.json             # Global configuration
```

---

### Communication Protocol

Using JSON-RPC 2.0 over Unix socket (IPC) for CLI/extension, SSE for MCP.

```typescript
// packages/cli/src/daemon/protocol.ts

interface DaemonRequest {
  jsonrpc: '2.0';
  id: string;
  method: DaemonMethod;
  params: Record<string, unknown>;
}

interface DaemonResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type DaemonMethod =
  // Lifecycle
  | 'daemon.ping'
  | 'daemon.shutdown'
  | 'daemon.status'

  // Session
  | 'session.begin'
  | 'session.end'
  | 'session.status'

  // Snapshots
  | 'snapshot.create'
  | 'snapshot.restore'
  | 'snapshot.list'

  // Learnings
  | 'learning.add'
  | 'learning.search'
  | 'learning.list'

  // Context
  | 'context.get'
  | 'context.validate'

  // Validation
  | 'validate.quick'
  | 'validate.comprehensive'

  // Watching (proactive)
  | 'watch.subscribe'
  | 'watch.unsubscribe';
```

---

### Daemon Implementation

```typescript
// packages/cli/src/daemon/server.ts

import { createServer, Socket } from 'net';
import { unlinkSync, writeFileSync, existsSync } from 'fs';
import { EventEmitter } from 'events';

interface DaemonConfig {
  socketPath: string;
  pidPath: string;
  idleTimeoutMs: number;  // Default: 15 minutes
  maxConnections: number; // Default: 10
}

export class SnapBackDaemon extends EventEmitter {
  private server: ReturnType<typeof createServer> | null = null;
  private connections: Set<Socket> = new Set();
  private workspaces: Map<string, WorkspaceContext> = new Map();
  private idleTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  constructor(private config: DaemonConfig) {
    super();
  }

  async start(): Promise<void> {
    // 1. Check for existing daemon
    if (await this.isRunning()) {
      throw new Error('Daemon already running');
    }

    // 2. Acquire lock
    await this.acquireLock();

    // 3. Write PID file
    writeFileSync(this.config.pidPath, String(process.pid));

    // 4. Clean up stale socket
    if (existsSync(this.config.socketPath)) {
      unlinkSync(this.config.socketPath);
    }

    // 5. Start IPC server
    this.server = createServer(this.handleConnection.bind(this));

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.config.socketPath, () => {
        console.log(`Daemon listening on ${this.config.socketPath}`);
        resolve();
      });
      this.server!.on('error', reject);
    });

    // 6. Start idle timer
    this.resetIdleTimer();

    // 7. Register signal handlers
    this.registerSignalHandlers();

    // 8. Restore persisted state
    await this.restoreState();
  }

  private handleConnection(socket: Socket): void {
    this.connections.add(socket);
    this.resetIdleTimer();

    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Parse newline-delimited JSON-RPC
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const request: DaemonRequest = JSON.parse(line);
          const response = await this.handleRequest(request);
          socket.write(JSON.stringify(response) + '\n');
        } catch (err) {
          socket.write(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' }
          }) + '\n');
        }
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      this.connections.delete(socket);
    });
  }

  private async handleRequest(request: DaemonRequest): Promise<DaemonResponse> {
    this.lastActivity = Date.now();
    this.resetIdleTimer();

    try {
      const result = await this.dispatch(request.method, request.params);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : 'Unknown error'
        }
      };
    }
  }

  private async dispatch(method: DaemonMethod, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'daemon.ping':
        return { pong: true, uptime: Date.now() - this.startTime };

      case 'daemon.status':
        return {
          pid: process.pid,
          uptime: Date.now() - this.startTime,
          workspaces: this.workspaces.size,
          connections: this.connections.size,
          memoryUsage: process.memoryUsage()
        };

      case 'daemon.shutdown':
        setImmediate(() => this.shutdown());
        return { shutting_down: true };

      case 'session.begin':
        return this.beginSession(params as BeginSessionParams);

      case 'snapshot.create':
        return this.createSnapshot(params as CreateSnapshotParams);

      // ... other method handlers

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      if (this.connections.size === 0) {
        console.log('Idle timeout reached, shutting down');
        this.shutdown();
      } else {
        // Still have connections, reset timer
        this.resetIdleTimer();
      }
    }, this.config.idleTimeoutMs);
  }

  private registerSignalHandlers(): void {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGHUP', () => this.reload());
  }

  async shutdown(): Promise<void> {
    console.log('Daemon shutting down...');

    // 1. Stop accepting connections
    this.server?.close();

    // 2. Persist state for crash recovery
    await this.persistState();

    // 3. Close existing connections gracefully
    for (const socket of this.connections) {
      socket.end();
    }

    // 4. Cleanup files
    if (existsSync(this.config.pidPath)) {
      unlinkSync(this.config.pidPath);
    }
    if (existsSync(this.config.socketPath)) {
      unlinkSync(this.config.socketPath);
    }

    // 5. Exit
    process.exit(0);
  }
}
```

---

### Client Implementation

```typescript
// packages/cli/src/daemon/client.ts

import { connect, Socket } from 'net';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

export class DaemonClient {
  private socket: Socket | null = null;
  private requestId = 0;
  private pending: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(private config: { socketPath: string; pidPath: string }) {}

  async connect(): Promise<void> {
    // 1. Ensure daemon is running (lazy start)
    if (!await this.isDaemonRunning()) {
      await this.startDaemon();
    }

    // 2. Connect to socket
    return new Promise((resolve, reject) => {
      this.socket = connect(this.config.socketPath);

      let buffer = '';

      this.socket.on('connect', resolve);
      this.socket.on('error', reject);

      this.socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const response = JSON.parse(line);
          const pending = this.pending.get(response.id);
          if (pending) {
            this.pending.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        }
      });
    });
  }

  private async isDaemonRunning(): Promise<boolean> {
    if (!existsSync(this.config.pidPath)) {
      return false;
    }

    const pid = parseInt(readFileSync(this.config.pidPath, 'utf-8'), 10);

    try {
      process.kill(pid, 0); // Signal 0 = check if process exists
      return true;
    } catch {
      return false;
    }
  }

  private async startDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        require.resolve('../bin/snapback'),
        'daemon',
        'start',
        '--detach'
      ], {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      // Wait for socket to appear
      const maxWait = 5000;
      const start = Date.now();

      const check = () => {
        if (existsSync(this.config.socketPath)) {
          resolve();
        } else if (Date.now() - start > maxWait) {
          reject(new Error('Daemon failed to start'));
        } else {
          setTimeout(check, 100);
        }
      };

      setTimeout(check, 100);
    });
  }

  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.socket) {
      await this.connect();
    }

    const id = String(++this.requestId);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const request = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }) + '\n';

      this.socket!.write(request);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  // Convenience methods
  async ping() {
    return this.request('daemon.ping');
  }

  async beginTask(params: { task: string; files?: string[] }) {
    return this.request('session.begin', params);
  }

  async createSnapshot(params: { files: string[]; reason?: string }) {
    return this.request('snapshot.create', params);
  }

  // ... other convenience methods
}
```

---

### CLI Commands

```typescript
// packages/cli/src/commands/daemon.ts

import { Command } from 'commander';
import { DaemonClient } from '../daemon/client';
import { SnapBackDaemon } from '../daemon/server';

export function registerDaemonCommands(program: Command): void {
  const daemon = program.command('daemon').description('Manage SnapBack daemon');

  daemon
    .command('start')
    .option('--detach', 'Run in background')
    .option('--idle-timeout <minutes>', 'Shutdown after idle', '15')
    .action(async (options) => {
      if (options.detach) {
        // Fork and exit parent
        const { spawn } = await import('child_process');
        const child = spawn(process.execPath, [
          process.argv[1],
          'daemon',
          'start',
          '--idle-timeout',
          options.idleTimeout
        ], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        console.log(`Daemon started (PID: ${child.pid})`);
        process.exit(0);
      }

      // Run in foreground
      const daemon = new SnapBackDaemon({
        socketPath: getSocketPath(),
        pidPath: getPidPath(),
        idleTimeoutMs: parseInt(options.idleTimeout, 10) * 60 * 1000,
        maxConnections: 10
      });

      await daemon.start();
    });

  daemon
    .command('stop')
    .action(async () => {
      const client = new DaemonClient(getConfig());
      try {
        await client.request('daemon.shutdown');
        console.log('Daemon stopped');
      } catch {
        console.log('Daemon not running');
      }
    });

  daemon
    .command('status')
    .action(async () => {
      const client = new DaemonClient(getConfig());
      try {
        const status = await client.request('daemon.status');
        console.log('Daemon Status:');
        console.log(`  PID: ${status.pid}`);
        console.log(`  Uptime: ${formatDuration(status.uptime)}`);
        console.log(`  Workspaces: ${status.workspaces}`);
        console.log(`  Connections: ${status.connections}`);
        console.log(`  Memory: ${formatBytes(status.memoryUsage.heapUsed)}`);
      } catch {
        console.log('Daemon not running');
      }
    });

  daemon
    .command('restart')
    .action(async () => {
      await program.parseAsync(['node', 'snapback', 'daemon', 'stop']);
      await program.parseAsync(['node', 'snapback', 'daemon', 'start', '--detach']);
    });
}
```

---

### Extension Integration

```typescript
// apps/extension/src/daemon/bridge.ts

import { DaemonClient } from '@snapback/cli/daemon/client';

export class DaemonBridge {
  private client: DaemonClient;
  private statusBar: vscode.StatusBarItem;

  constructor(private context: vscode.ExtensionContext) {
    this.client = new DaemonClient(this.getConfig());
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  async activate(): Promise<void> {
    // 1. Ensure daemon is running (lazy start happens in client.connect)
    try {
      await this.client.connect();
      this.updateStatusBar('connected');
    } catch (err) {
      this.updateStatusBar('error');
      vscode.window.showErrorMessage(`SnapBack daemon failed to start: ${err}`);
      return;
    }

    // 2. Register file watchers that notify daemon
    this.registerFileWatchers();

    // 3. Subscribe to daemon events (proactive notifications)
    this.subscribeToEvents();
  }

  private registerFileWatchers(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidChange(async (uri) => {
      // Let daemon know about file changes for session tracking
      await this.client.request('watch.fileChanged', {
        workspace: this.getWorkspaceId(),
        file: uri.fsPath,
        timestamp: Date.now()
      });
    });

    this.context.subscriptions.push(watcher);
  }

  private subscribeToEvents(): void {
    // Daemon can push events back for proactive notifications
    this.client.on('snapshot.created', (data) => {
      vscode.window.showInformationMessage(
        `✓ Snapshot created: ${data.fileCount} files protected`,
        'View'
      ).then((choice) => {
        if (choice === 'View') {
          vscode.commands.executeCommand('snapback.showSnapshots');
        }
      });
    });

    this.client.on('risk.detected', (data) => {
      vscode.window.showWarningMessage(
        `⚠️ Modifying ${data.file} - this is a high-risk file`,
        'Create Snapshot',
        'Dismiss'
      ).then((choice) => {
        if (choice === 'Create Snapshot') {
          this.client.request('snapshot.create', {
            files: [data.file],
            reason: 'Pre-risk modification'
          });
        }
      });
    });

    this.client.on('session.saved', (data) => {
      if (data.restoredFromDisaster) {
        // The magic "I saved you" moment!
        vscode.window.showInformationMessage(
          `🦸 SnapBack recovered ${data.linesRecovered} lines from ${data.timeAgo}`,
          'View What Changed'
        );
      }
    });
  }

  // Delegate all operations to daemon
  async beginTask(task: string, files?: string[]) {
    return this.client.request('session.begin', {
      workspace: this.getWorkspaceId(),
      task,
      files
    });
  }

  async createSnapshot(files: string[], reason?: string) {
    return this.client.request('snapshot.create', {
      workspace: this.getWorkspaceId(),
      files,
      reason
    });
  }

  async restoreSnapshot(snapshotId: string) {
    return this.client.request('snapshot.restore', {
      workspace: this.getWorkspaceId(),
      snapshotId
    });
  }

  // ... other delegated methods
}
```

---

### MCP Integration

```typescript
// packages/cli/src/mcp/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { DaemonClient } from '../daemon/client';

export class SnapBackMCPServer {
  private server: Server;
  private daemonClient: DaemonClient;

  constructor() {
    this.daemonClient = new DaemonClient(getConfig());

    this.server = new Server({
      name: 'snapback',
      version: '1.4.2'
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    this.registerTools();
    this.registerResources();
  }

  private registerTools(): void {
    // All tools delegate to daemon

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      // Ensure daemon is running
      await this.daemonClient.connect();

      // Map MCP tool names to daemon methods
      const methodMap: Record<string, string> = {
        'begin_task': 'session.begin',
        'complete_task': 'session.end',
        'snapshot_create': 'snapshot.create',
        'snapshot_restore': 'snapshot.restore',
        'snapshot_list': 'snapshot.list',
        'get_context': 'context.get',
        'get_learnings': 'learning.search',
        'learn': 'learning.add',
        'quick_check': 'validate.quick',
        'check_patterns': 'validate.comprehensive',
        'review_work': 'session.review',
        'what_changed': 'session.changes'
      };

      const daemonMethod = methodMap[name];
      if (!daemonMethod) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const result = await this.daemonClient.request(daemonMethod, args);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    });
  }

  private registerResources(): void {
    // Expose daemon state as MCP resources

    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;

      await this.daemonClient.connect();

      if (uri === 'snapback://session') {
        const status = await this.daemonClient.request('session.status');
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status)
          }]
        };
      }

      if (uri === 'snapback://learnings') {
        const learnings = await this.daemonClient.request('learning.list', { limit: 10 });
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(learnings)
          }]
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  async start(port: number = 3000): Promise<void> {
    // SSE transport for MCP
    const transport = new SSEServerTransport('/mcp', port);
    await this.server.connect(transport);
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
  }
}
```

---

### Daemon Events (Push Notifications)

```typescript
// packages/cli/src/daemon/events.ts

// For clients that support bidirectional communication,
// daemon can push events

interface DaemonEvent {
  type: DaemonEventType;
  timestamp: number;
  workspace?: string;
  data: unknown;
}

type DaemonEventType =
  | 'snapshot.created'
  | 'snapshot.restored'
  | 'risk.detected'
  | 'session.started'
  | 'session.ended'
  | 'learning.matched'
  | 'validation.failed';

// In daemon server, when something happens:
private async onFileChanged(workspace: string, file: string): Promise<void> {
  // 1. Check if this is a risky file
  const risk = await this.assessRisk(workspace, file);

  if (risk.level === 'high') {
    // 2. Push notification to all connected clients for this workspace
    this.broadcast(workspace, {
      type: 'risk.detected',
      timestamp: Date.now(),
      workspace,
      data: {
        file,
        riskLevel: risk.level,
        reason: risk.reason,
        suggestion: 'Consider creating a snapshot before modifying'
      }
    });
  }
}

private broadcast(workspace: string, event: DaemonEvent): void {
  for (const socket of this.connections) {
    if (this.connectionWorkspace.get(socket) === workspace) {
      socket.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'notification',
        params: event
      }) + '\n');
    }
  }
}
```

---

### Windows Compatibility

```typescript
// packages/cli/src/daemon/platform.ts

import { platform } from 'os';
import { join } from 'path';

export function getSocketPath(): string {
  if (platform() === 'win32') {
    // Windows named pipes
    return '\\\\.\\pipe\\snapback-daemon';
  }

  // Unix domain socket
  return join(getSnapBackDir(), 'daemon', 'daemon.sock');
}

export function getPidPath(): string {
  return join(getSnapBackDir(), 'daemon', 'daemon.pid');
}

export function getSnapBackDir(): string {
  if (platform() === 'win32') {
    return join(process.env.APPDATA || '', 'snapback');
  }

  return join(process.env.HOME || '', '.snapback');
}
```

---

### Summary: What This Enables

| Capability | How It Works |
|------------|--------------|
| **CLI-first users** | `snapback begin "my task"` → daemon auto-starts, handles everything |
| **Extension users** | Extension connects to daemon on activate, delegates all operations |
| **MCP clients** | MCP server queries daemon, gets real-time state |
| **Proactive notifications** | Daemon watches files, pushes events to connected clients |
| **Crash recovery** | Daemon persists state, restores on restart |
| **Resource efficiency** | Single daemon process, idle shutdown after 15 min |
| **Cross-platform** | Unix sockets + Windows named pipes |

---

### Implementation Order

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 1 | Daemon server + client (IPC) | M |
| 2 | CLI commands delegate to daemon | S |
| 3 | Extension bridge (uses DaemonClient) | M |
| 4 | MCP server queries daemon | S |
| 5 | Event push + proactive notifications | M |
| 6 | Windows named pipe support | S |

---

Want me to start with Phase 1 implementation or dive deeper into any specific component?
