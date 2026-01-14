# @snapback/cli

**Command-line interface for SnapBack** - AI-safe code snapshots, risk analysis, and intelligent validation.

## Installation

```bash
# Global installation
npm install -g @snapback/cli

# Or use via npx
npx @snapback/cli <command>

# Or with pnpm
pnpm add -g @snapback/cli
```

## Quick Start

```bash
# First-time setup with interactive wizard
snap wizard

# Initialize SnapBack in your project
snap init

# Analyze a file for risk
snap analyze src/auth.ts

# Create a snapshot before risky changes
snap snapshot -m "Before major refactor"

# Check staged files before commit
snap check --all

# Run diagnostics if something seems wrong
snap doctor
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `snap init` | Initialize `.snapback/` directory in workspace |
| `snap analyze <file>` | Risk analysis for a single file |
| `snap snapshot` | Create a snapshot of current state |
| `snap list` | List all snapshots |
| `snap check` | Pre-commit hook to check for risky changes |

### Intelligence Commands

These commands integrate `@snapback/intelligence` for learning loop and validation:

| Command | Description | Example |
|---------|-------------|---------|
| `snap context [task]` | Get relevant context before work | `snap context "add auth" -k auth session` |
| `snap validate <file>` | Run 7-layer validation pipeline | `snap validate src/auth.ts` |
| `snap validate --all` | Validate all staged files | `snap validate --all --quiet` |
| `snap stats` | Show learning statistics | `snap stats --json` |

### Learning Commands

| Command | Description |
|---------|-------------|
| `snap learn record` | Record a new learning |
| `snap learn list` | List recorded learnings |
| `snap patterns report` | Report a violation (auto-promotes at 3x) |
| `snap patterns summary` | Show violation patterns and status |

### Protection Commands

| Command | Description |
|---------|-------------|
| `snap protect add <file>` | Add file to protection list |
| `snap protect remove <file>` | Remove file from protection |
| `snap protect list` | List protected files |
| `snap session start` | Start a coding session |
| `snap session end` | End current session |

### Utility Commands

| Command | Description |
|---------|-------------|
| `snap status` | Show workspace status |
| `snap fix` | Fix common issues |
| `snap watch` | Continuous file watching daemon |
| `snap interactive` | Guided TUI workflow |

### Polish Commands

| Command | Description |
|---------|-------------|
| `snap wizard` | Interactive first-run setup wizard |
| `snap doctor` | Comprehensive diagnostics and health check |
| `snap doctor --fix` | Auto-fix detected issues |
| `snap upgrade` | Check for and install CLI updates |
| `snap upgrade --check` | Only check for updates, don't install |
| `snap config list` | List all configuration values |
| `snap config get <key>` | Get a specific config value |
| `snap config set <key> <value>` | Set a configuration value |
| `snap config path` | Show config file locations |
| `snap undo` | Undo the last destructive operation |
| `snap undo --list` | Show recent undoable operations |
| `snap alias list` | List command shortcuts |
| `snap alias set <name> <cmd>` | Create a command alias |
| `snap alias suggest` | Show recommended aliases |

### MCP Server Command

| Command | Description |
|---------|-------------|
| `snap mcp --stdio` | Start MCP server for Cursor/Claude integration |

## World-Class UX Features

SnapBack CLI implements best practices from GitHub CLI, Vercel CLI, and Stripe CLI.

### Smart Error Messages

When something goes wrong, SnapBack suggests fixes:

```
╭───────────────────────────────────────────────────╮
│ [ERR_NOT_INIT] Workspace Not Initialized          │
│                                                   │
│ This workspace hasn't been set up for SnapBack   │
│                                                   │
│ 💡 Suggestion:                                    │
│    Initialize SnapBack in this directory         │
│                                                   │
│ 📋 Try running:                                   │
│    $ snap init                                    │
╰───────────────────────────────────────────────────╯
```

### Unknown Command Suggestions

Typos are caught with helpful suggestions:

```bash
$ snap statis
╭────────────────────────────────╮
│ Unknown command: statis        │
│                                │
│ Did you mean:                  │
│   $ snap status                │
│   $ snap stats                 │
╰────────────────────────────────╯
```

### Interactive First-Run Wizard

```bash
$ snap wizard
```

Guided 5-step onboarding:
1. **Authentication** - Browser login or API key
2. **Workspace Setup** - Auto-detects project type
3. **Protection Level** - Standard or Strict mode
4. **MCP Integration** - Configure AI tool integration
5. **Analytics** - Optional anonymous usage data

### Terminal Hyperlinks

In supported terminals (iTerm2, VS Code, Windows Terminal, Kitty, etc.), SnapBack outputs clickable links:
- File paths open in your editor
- Documentation links open in browser
- Error codes link to troubleshooting guides

### Command Aliases

Create shortcuts for common workflows:

```bash
# Create aliases
snap alias set st status
snap alias set ss snapshot
snap alias set ctx "context --keywords"

# Now use them
snap st        # → snap status
snap ss -m "before refactor"  # → snap snapshot -m "..."

# See suggested aliases
snap alias suggest
```

### Undo Support

Revert destructive operations:

```bash
# Undo the last operation
snap undo

# View recent operations
snap undo --list
```

### Dry-Run Mode

Preview changes before executing:

```bash
snap init --dry-run
```

Shows exactly what files will be created/modified without making changes.

### Confirmation Prompts

Destructive operations require confirmation:
- Standard risk: Simple Y/n prompt
- High risk: Must type "yes, delete" to confirm
- Use `--force` to skip (for CI/automation)

### Diagnostics (Doctor Command)

```bash
$ snap doctor

🏥 SnapBack Diagnostics

  ✓ Node.js version      v20.10.0
  ✓ CLI installation     v0.5.2 (latest)
  ✓ Global directory     ~/.snapback/ exists
  ✓ Authentication       Logged in as @user
  ✓ Workspace           .snapback/ initialized
  ✓ MCP tools           3 tools configured
  ✓ Git repository       Clean
  ✓ Network              API reachable

  All checks passed!
```

### Shell Completions

Enable tab completion for your shell:

**Bash:**
```bash
eval "$(snap completion bash)"
# Or add to ~/.bashrc
```

**Zsh:**
```bash
eval "$(snap completion zsh)"
# Or add to ~/.zshrc
```

**Fish:**
```fish
snap completion fish | source
# Or save to ~/.config/fish/completions/snap.fish
```

Completion scripts are also available at:
- `apps/cli/resources/completions/snap.bash`
- `apps/cli/resources/completions/snap.zsh`
- `apps/cli/resources/completions/snap.fish`

## MCP Server Integration

SnapBack includes an MCP (Model Context Protocol) server for integration with AI coding assistants like Cursor, Claude Desktop, Windsurf, and others.

### Starting the MCP Server

```bash
# Start with stdio transport (default)
snap mcp --stdio

# Specify workspace explicitly
snap mcp --stdio --workspace /path/to/your/project

# Specify user tier
snap mcp --stdio --tier pro
```

### Configuration for AI Clients

Add to your MCP client configuration (e.g., `mcp.json` for Qoder, Claude, or Cursor):

```json
{
  "mcpServers": {
    "snapback": {
      "command": "node",
      "args": [
        "/absolute/path/to/apps/cli/dist/index.js",
        "mcp",
        "--stdio",
        "--workspace",
        "/absolute/path/to/your/project"
      ],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important:** Both the CLI path and workspace path must be **absolute paths**.

### Workspace Requirements

The MCP server validates that the workspace contains at least one of these markers:

- `.git/` directory
- `package.json` file
- `.snapback/` directory

If validation fails, you'll see:
```
[SnapBack MCP] Workspace validation failed: Workspace must contain at least one marker: .git, package.json, or .snapback
```

**Solution:** Ensure the `--workspace` argument points to a valid project root.

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module` | Relative path used | Use absolute paths for both CLI and workspace |
| `Workspace validation failed` | Missing `--workspace` arg | Add `--workspace /path/to/project` to args |
| `context deadline exceeded` | Server timeout | Check environment variables are set correctly |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SNAPBACK_API_KEY` | Optional | API key for Pro features |
| `BETTER_AUTH_SECRET` | Optional | Auth secret (32+ chars) |
| `DATABASE_URL` | Optional | PostgreSQL connection URL |
| `REDIS_URL` | Optional | Redis/Upstash URL |

## Intelligence Integration

The CLI integrates `@snapback/intelligence` to provide the same learning loop and validation capabilities as SnapBack's internal development tools.

### Pre-Work Context

Get relevant patterns, learnings, and constraints before starting work:

```bash
# Get context for a task
snap context "add user authentication"

# Include files you'll modify
snap context "refactor auth" --files src/auth.ts src/session.ts

# Search with specific keywords
snap context --keywords auth session jwt

# Machine-readable output
snap context "add auth" --json
```

**Output:**
```
┌─────────────────────────────────────────┐
│  📋 Context Loaded                       │
│                                          │
│  Hard Rules: 12 constraints              │
│  Patterns: 8 patterns                    │
│  Learnings: 3 relevant                   │
│  Violations: 2 to avoid                  │
└─────────────────────────────────────────┘

Relevant Learnings:
┌──────────┬──────────────┬─────────────────────────────────┐
│ Type     │ Trigger      │ Action                          │
├──────────┼──────────────┼─────────────────────────────────┤
│ pattern  │ auth         │ Use @snapback/auth package...   │
└──────────┴──────────────┴─────────────────────────────────┘
```

### Pre-Commit Validation

Run the 7-layer validation pipeline before committing:

```bash
# Validate a single file
snap validate src/auth.ts

# Validate all staged files
snap validate --all

# Quiet mode (only output if issues)
snap validate --all --quiet

# JSON output for CI
snap validate --all --json
```

**The 7 Validation Layers:**

| Layer | Checks |
|-------|--------|
| **Syntax** | Bracket matching, semicolons |
| **Types** | `any` usage, `@ts-ignore`, non-null assertions |
| **Tests** | Vague assertions, 4-path coverage |
| **Architecture** | Layer boundaries, service bypass |
| **Security** | Hardcoded secrets, `eval()` |
| **Dependencies** | Deprecated packages |
| **Performance** | console.log, sync I/O, await in loops |

### Learning Statistics

Monitor your learning system's health:

```bash
snap stats
```

**Output:**
```
┌─────────────────────────────────────────┐
│  📊 Learning Statistics                  │
│                                          │
│  Total Interactions: 142                 │
│  Feedback Rate: 68%                      │
│  Accuracy Rate: 94%                      │
│  Golden Examples: 23                     │
└─────────────────────────────────────────┘

Violation Patterns:
┌────────────────────────┬───────┬─────────────────────────┐
│ Type                   │ Count │ Status                  │
├────────────────────────┼───────┼─────────────────────────┤
│ missing-error-handling │ 5     │ 🤖 Ready for automation │
│ vague-assertion        │ 3     │ 📈 Ready for promotion  │
└────────────────────────┴───────┴─────────────────────────┘
```

### Auto-Promotion Thresholds

- **1x seen**: Stored in `violations.jsonl`
- **3x seen**: Auto-promoted to `workspace-patterns.json`
- **5x seen**: Marked for automated detection

## Pre-Commit Hook

Install as a git pre-commit hook:

```bash
#!/bin/sh
# .git/hooks/pre-commit
npx @snapback/cli check --snapshot --quiet
```

Or with lefthook (`.lefthook.yml`):

```yaml
pre-commit:
  commands:
    snapback-check:
      run: npx @snapback/cli check --all --quiet
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Validate code
  run: npx @snapback/cli validate --all --json > validation-report.json

- name: Check for risky changes
  run: npx @snapback/cli check --quiet
```

### Exit Codes

- `0`: All checks passed
- `1`: Issues found (validation failed, risky changes detected)

## Configuration

### Workspace Structure

After `snap init`, your workspace will have:

```
your-project/
├── .snapback/
│   ├── config.json           # Workspace configuration
│   ├── vitals.json           # Workspace vitals
│   ├── constraints.md        # Your project constraints (optional)
│   ├── patterns/
│   │   ├── violations.jsonl  # Tracked violations
│   │   └── workspace-patterns.json  # Promoted patterns
│   └── learnings/
│       └── user-learnings.jsonl     # Recorded learnings
└── .snapbackrc               # CLI configuration
```

### `.snapbackrc` Options

```json
{
  "protectionLevel": "warn",
  "autoSnapshot": true,
  "riskThreshold": 5.0,
  "ignorePaths": ["node_modules", "dist", ".git"]
}
```

## Dependencies

### Core Packages
- **@snapback/intelligence**: Learning loop, validation pipeline
- **@snapback/core**: Guardian risk analysis
- **@snapback/engine**: V2 analysis engine
- **@snapback/contracts**: Type definitions

### CLI Framework
- **commander**: CLI framework
- **chalk**: Terminal styling
- **boxen**: Box rendering
- **cli-table3**: Table formatting
- **ora**: Spinners
- **inquirer**: Interactive prompts

### UX Enhancements
- Smart error messages with actionable suggestions
- Levenshtein distance for typo detection
- OSC 8 terminal hyperlinks
- Dry-run mode with diff preview
- Operation history for undo support
- Command aliases

## Development

```bash
# Clone the repo
git clone https://github.com/snapback-dev/snapback.git
cd snapback

# Install dependencies
pnpm install

# Build the CLI
pnpm --filter @snapback/cli build

# Run locally
node apps/cli/dist/index.js <command>

# Run tests
pnpm --filter @snapback/cli test
```

## Related Packages

- [`@snapback/intelligence`](../../packages/intelligence/README.md) - Learning and validation engine
- [`@snapback/core`](../../packages/core/README.md) - Core snapshot logic
- [`@snapback/sdk`](../../packages/sdk/README.md) - SDK for integrations

## License

Apache-2.0
