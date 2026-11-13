import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function jsonResult<T extends Record<string, unknown>>(
  value: T,
  summary: string,
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `${summary}\n\n${JSON.stringify(value, null, 2)}`,
      },
    ],
    structuredContent: value,
  };
}
