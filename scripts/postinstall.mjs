#!/usr/bin/env node
/**
 * Post-install welcome script for @snapback/cli
 * Runs after npm install to show branded welcome message
 */

// Use built output - no dependencies needed at install time
import { displayWelcomeMessage } from "../dist/index.js";

try {
	console.log(displayWelcomeMessage());
} catch {
	// Silently fail if dist not ready (development mode)
	// This is fine - the welcome shows on first CLI run anyway
}
