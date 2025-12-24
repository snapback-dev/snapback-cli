/**
 * MCP Response Formatting Utilities
 *
 * Helpers for formatting MCP tool responses.
 * Extracted to avoid circular dependencies.
 *
 * @module utils/format
 */

/**
 * Format a JSON response with optional additional text
 */
export function formatJsonResponse(data: unknown, additionalText?: string): { type: "text"; text: string }[] {
	const jsonText = JSON.stringify(data, null, 2);
	const content: { type: "text"; text: string }[] = [{ type: "text", text: jsonText }];
	if (additionalText) {
		content.push({ type: "text", text: additionalText });
	}
	return content;
}
