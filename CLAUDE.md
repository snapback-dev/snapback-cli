# apps/cli - SnapBack CLI

**Purpose**: Command-line interface for SnapBack operations
**Role**: Standalone tool for snapshots, analysis, pre-commit hooks

## Commands

### `snapback analyze <file>`
**Risk analysis** for single file:
- `-a, --ast`: AST-based deep analysis (vs regex-based quick check)
- `-i, --interactive`: Guided workflow with prompts

Output: Risk score, factors, recommendations

### `snapback snapshot`
**Create snapshot**:
- `-m, --message <msg>`: Snapshot description
- `-f, --files <files...>`: Specific files (vs all)

### `snapback list`
**List all snapshots** with table view (ID, timestamp, message)

### `snapback check`
**Pre-commit hook** for CI/CD:
- `-s, --snapshot`: Auto-create snapshot if risks detected
- `-q, --quiet`: Suppress output unless issues found

Scans staged files → Guardian analysis → exits 1 if risky changes (blocks commit unless `--no-verify`)

### `snapback interactive`
**Guided TUI** with search/select prompts (Inquirer.js)

## Architecture

**Commander.js** for CLI framework:
- Subcommand routing
- Option parsing
- Help generation

**Guardian** integration from `@snapback/core`:
- `quickCheckDoc()`: Fast regex-based
- `analyzeWithAST()`: Deep TypeScript/JS parsing

**Storage** via `@snapback/contracts`:
- `createSnapshotStorage()`: SQLite-backed
- Stores in `~/.snapback/cli.db`

## Use Cases

### Pre-commit Hook
Install in `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npx snapback check --snapshot --quiet
```

Blocks risky commits, auto-creates snapshots.

### CI/CD Integration
```yaml
# GitHub Actions
- name: Check for risky AI changes
  run: npx snapback check --quiet
```

### Interactive Analysis
```bash
snapback interactive
→ Search for file
→ AST analysis?
→ Create snapshot?
```

## Dependencies

- **CLI**: commander (parsing), inquirer (TUI), ora (spinners), chalk (colors)
- **Core**: @snapback/core (Guardian), @snapback/contracts (storage)

## Installation

```bash
npm install -g @snapback/cli
# or
npx @snapback/cli <command>
```

## Related Docs
- Detection Engine: [packages/core/CLAUDE.md](../../packages/core/CLAUDE.md)
- Contracts: [packages/contracts/CLAUDE.md](../../packages/contracts/CLAUDE.md)
