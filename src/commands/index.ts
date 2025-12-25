/**
 * Commands Index
 *
 * @fileoverview Exports all CLI commands for easy registration.
 *
 * ## Command Categories
 *
 * ### Authentication
 * - `createLoginCommand()` - OAuth login flow
 * - `createLogoutCommand()` - Clear credentials
 * - `createWhoamiCommand()` - Show current user
 *
 * ### Workspace Management
 * - `createInitCommand()` - Initialize .snapback/ directory
 * - `createStatusCommand()` - Show workspace status
 * - `createFixCommand()` - Fix common issues
 *
 * ### Intelligence (CLI-UX-005)
 * - `createContextCommand()` - Get context before work
 * - `createValidateCommand()` - Run validation pipeline
 * - `createStatsCommand()` - Show learning statistics
 *
 * ### Learning System
 * - `createLearnCommand()` - Record learnings
 * - `createPatternsCommand()` - Manage patterns and violations
 *
 * ### Protection
 * - `createProtectCommand()` - Configure file protection
 * - `createSessionCommand()` - Manage coding sessions
 * - `createWatchCommand()` - Continuous file watching
 *
 * ### MCP Integration
 * - `createToolsCommand()` - Configure MCP tools
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   createContextCommand,
 *   createValidateCommand,
 *   createStatsCommand,
 *   // ... other commands
 * } from "./commands";
 *
 * program.addCommand(createContextCommand());
 * program.addCommand(createValidateCommand());
 * program.addCommand(createStatsCommand());
 * ```
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands
 */

// =============================================================================
// AUTHENTICATION COMMANDS
// =============================================================================

export { createLoginCommand, createLogoutCommand, createWhoamiCommand } from "./auth";

// =============================================================================
// WORKSPACE MANAGEMENT COMMANDS
// =============================================================================

export { createFixCommand } from "./fix";
export { createInitCommand } from "./init";
export { createStatusCommand } from "./status";

// =============================================================================
// INTELLIGENCE COMMANDS (CLI-UX-005)
// =============================================================================
// These commands integrate @snapback/intelligence into the CLI.
// They are the customer-facing equivalents of the internal MCP tools.
//
// @see ai_dev_utils/mcp/server.ts for internal MCP implementation
// @see packages/intelligence/src/Intelligence.ts for the facade

/**
 * Context command - Get relevant context before starting work
 *
 * Equivalent to MCP's `codebase.start_task()` tool.
 *
 * @example
 * ```bash
 * snap context "add authentication" --keywords auth session
 * ```
 */
export { createContextCommand } from "./context";
/**
 * Stats command - Show learning engine statistics
 *
 * Equivalent to MCP's `codebase.get_learning_stats()` tool.
 *
 * @example
 * ```bash
 * snap stats
 * snap stats --json
 * ```
 */
export { createStatsCommand } from "./stats";
/**
 * Validate command - Run 7-layer validation pipeline
 *
 * Equivalent to MCP's `codebase.validate_code()` tool.
 *
 * @example
 * ```bash
 * snap validate src/auth.ts
 * snap validate --all  # All staged files
 * ```
 */
export { createValidateCommand } from "./validate";

// =============================================================================
// LEARNING SYSTEM COMMANDS
// =============================================================================

export { createLearnCommand } from "./learn";
export { createPatternsCommand } from "./patterns";

// =============================================================================
// PROTECTION COMMANDS
// =============================================================================

export { createProtectCommand } from "./protect";
export { createSessionCommand } from "./session";
export { createWatchCommand } from "./watch";

// =============================================================================
// MCP INTEGRATION COMMANDS
// =============================================================================

export { mcpCommand } from "./mcp";
export { createToolsCommand } from "./tools";

// =============================================================================
// POLISH COMMANDS (Phase 6)
// =============================================================================
// These commands complete the CLI experience with diagnostics, updates, and config.
//
// @see cli_ui_imp.md Phase 6 specification

/**
 * Alias command - Create command shortcuts
 *
 * @example
 * ```bash
 * snap alias list
 * snap alias set st status
 * snap alias delete st
 * ```
 */
export { createAliasCommand, expandAlias } from "./alias";
/**
 * Config command - Manage CLI configuration
 *
 * @example
 * ```bash
 * snap config list
 * snap config get apiUrl
 * snap config set apiUrl https://api.snapback.dev
 * snap config path
 * ```
 */
export { createConfigCommand } from "./config";
/**
 * Doctor command - Comprehensive diagnostics
 *
 * @example
 * ```bash
 * snap doctor
 * snap doctor --fix
 * snap doctor --json
 * ```
 */
export { createDoctorCommand } from "./doctor";
/**
 * Undo command - Restore from last destructive operation
 *
 * @example
 * ```bash
 * snap undo
 * snap undo --list
 * ```
 */
export { createUndoCommand } from "./undo";
/**
 * Upgrade command - Self-update CLI
 *
 * @example
 * ```bash
 * snap upgrade
 * snap upgrade --check
 * snap upgrade --canary
 * ```
 */
export { createUpgradeCommand } from "./upgrade";
/**
 * Wizard command - Interactive first-run setup
 *
 * @example
 * ```bash
 * snap wizard
 * snap wizard --force
 * ```
 */
export { createWizardCommand } from "./wizard";
