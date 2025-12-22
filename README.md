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
# Initialize SnapBack in your project
snap init

# Analyze a file for risk
snap analyze src/auth.ts

# Create a snapshot before risky changes
snap snapshot -m "Before major refactor"

# Check staged files before commit
snap check --all
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

- **@snapback/intelligence**: Learning loop, validation pipeline
- **@snapback/core**: Guardian risk analysis
- **@snapback/engine**: V2 analysis engine
- **@snapback/contracts**: Type definitions
- **commander**: CLI framework
- **chalk**: Terminal styling
- **boxen**: Box rendering
- **cli-table3**: Table formatting
- **ora**: Spinners
- **inquirer**: Interactive prompts

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
