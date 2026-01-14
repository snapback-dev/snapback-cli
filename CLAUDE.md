# apps/cli - SnapBack CLI

**Purpose**: Command-line interface for SnapBack operations
**Role**: Standalone tool for snapshots, analysis, pre-commit hooks, MCP server

## Binary Names

Both `snap` and `snapback` are registered as CLI entry points (see package.json).

## Command Surface

### Auth Commands
| Command | Description |
|---------|-------------|
| `snap login` | Login via GitHub OAuth (browser), device code (default), or `--api-key` |
| `snap logout` | Clear credentials |
| `snap whoami` | Show current user and tier |

### Workspace Commands
| Command | Description |
|---------|-------------|
| `snap init` | Initialize `.snapback/` directory, detect framework/package manager |
| `snap status` | Show workspace health dashboard |
| `snap fix` | Fix common workspace issues |

### Snapshot Commands
| Command | Description |
|---------|-------------|
| `snap snapshot [-m <msg>]` | Create a snapshot |
| `snap list` | List all snapshots |
| `snap analyze <file>` | Risk analysis for single file |
| `snap check [--snapshot] [--quiet]` | Pre-commit hook, scans staged files |

### Protection Commands
| Command | Description |
|---------|-------------|
| `snap protect add <file>` | Add file to protection list |
| `snap protect remove <file>` | Remove file from protection |
| `snap protect list` | List protected files |

### Session Commands
| Command | Description |
|---------|-------------|
| `snap session start [task]` | Start a coding session |
| `snap session status [--json]` | Show current session |
| `snap session end [-m <msg>]` | End current session |
| `snap session history` | Show session history |

### Intelligence Commands (via @snapback/intelligence)
| Command | Description |
|---------|-------------|
| `snap context [task] [--keywords] [--files]` | Get relevant context before work |
| `snap validate <file> [--all] [--json]` | Run 7-layer validation pipeline |
| `snap stats [--json]` | Show learning statistics |
| `snap learn record` | Record a new learning |
| `snap patterns report/summary` | Report or view violation patterns |

### MCP Commands
| Command | Description |
|---------|-------------|
| `snap mcp --stdio [--workspace] [--tier]` | Start MCP server for AI clients |
| `snap tools configure [--yes] [--dev]` | Configure MCP for AI tools (Cursor, Claude, Windsurf) |
| `snap tools configure --list` | Show current MCP configuration |

### Polish Commands
| Command | Description |
|---------|-------------|
| `snap wizard` | Interactive first-run setup wizard |
| `snap doctor [--verbose] [--json] [--fix] [--fix-mcp]` | Comprehensive diagnostics |
| `snap upgrade [--check]` | Check for and install updates |
| `snap config list/get/set/path` | Manage configuration |
| `snap undo [--list]` | Undo last destructive operation |
| `snap alias list/set/suggest` | Command shortcuts |
| `snap watch` | Continuous file watching daemon |
| `snap interactive` | Guided TUI workflow |

### NOT YET IMPLEMENTED (per spec, requires development)
- `snap restore <id> [--dry-run] [--force] [--allow-corrupt]`
- `snap export <id> [--out <path>]`
- `snap import <path> [--as <id>]`
- `snap sync meta`
- `snap devices`
- `snap cloud snapshot show <id>`

## Architecture

**CLI Framework**: Commander.js for routing, option parsing, help generation

**Analysis Engine**: `CLIEngineAdapter` from `@snapback/engine`
- Replaced the old "Guardian" from @snapback/core
- V2 engine with multi-signal risk analysis

**Storage**: SQLite via `better-sqlite3` (workspace-relative, see [storage-layer.md](../../docs/architecture/storage-layer.md))

| Component | Location | Implementation |
|-----------|----------|----------------|
| **Daemon** | `<workspace>/.snapback/snapshots.db` | `LocalStorage` (simple SQLite) |
| **Commands** | `<workspace>/.snapback/snapback.db` | `StorageBrokerAdapter` (compression, write queue) |
| **Config** | `<workspace>/.snapback/` | JSON files (config.json, vitals.json, protected.json) |
| **Learnings** | `<workspace>/.snapback/learnings/` | JSON files |
| **Global** | `~/.snapback/` | Credentials, MCP configs, cache |

- Tables: `snapshots`, `file_changes`, `sessions`, `session_files`, `queued_operations`
- Content compression: gzip level 9 for file blobs (StorageBrokerAdapter only)

> **Note**: The daemon and direct CLI commands use separate database files. This is intentional—unification offers low ROI since the daemon doesn't benefit from connection pooling or write queuing. See [storage-location-architecture.md](../../docs/decisions/storage-location-architecture.md).

**Intelligence Integration**: `@snapback/intelligence` for learning loop, validation pipeline

## File Structure (src/)

```
index.ts          # Main entry, createCLI(), command registration
commands/         # 23 command files (auth, init, doctor, etc.)
ui/               # logo.ts, errors.ts, links.ts, prompts.ts
services/         # api-client, git-client, snapback-dir, secure-credentials, etc.
utils/            # display.ts (boxes), tables.ts, progress.ts
daemon/           # Background daemon for watch mode
```

## Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
npx @snapback/cli check --snapshot --quiet
```

## CI/CD Integration
```yaml
- name: Validate code
  run: npx @snapback/cli validate --all --json > validation-report.json
```

## Dependencies

- **CLI Framework**: commander, @inquirer/prompts, chalk, ora, boxen, cli-table3, execa, log-update
- **Core Packages**: @snapback/engine (analysis), @snapback/intelligence (learning), @snapback/contracts, @snapback/sdk, @snapback/mcp, @snapback/mcp-config

## Installation

```bash
npm install -g @snapback/cli
# or
pnpm add -g @snapback/cli
# or
npx @snapback/cli <command>
```

## Related Docs
- Engine: [packages/engine/README.md](../../packages/engine/README.md)
- Intelligence: [packages/intelligence/README.md](../../packages/intelligence/README.md)
- MCP Config: [packages/mcp-config/README.md](../../packages/mcp-config/README.md)
