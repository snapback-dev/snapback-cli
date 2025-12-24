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
