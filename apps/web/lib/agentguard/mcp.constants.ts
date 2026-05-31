/**
 * Single source of truth for connecting an external MCP client to Klio Cloud.
 *
 * Any MCP-capable agent (Claude Desktop, Cursor, ChatGPT, Gemini, a custom
 * agent, …) can write into the same shared memory by pointing at the hosted
 * Klio MCP server over Streamable HTTP. The engine serves the transport at
 * `MCP_ENDPOINT_PATH` ("/mcp"); auth travels in the `X-Vex-Key` header (an
 * optional `X-Vex-Agent` header labels the calling agent).
 *
 * Directive-free (no `'use client'`/`'use server'`) so it is safe to import
 * from client components and server code alike.
 */
export const KLIO_MCP_URL = 'https://mcp.klio.tech/mcp';

export const KLIO_MCP_KEY_HEADER = 'X-Vex-Key';

export const KLIO_MCP_AGENT_HEADER = 'X-Vex-Agent';

/** Shown in place of the real key when one isn't available in the session. */
export const KLIO_MCP_KEY_PLACEHOLDER = 'YOUR_API_KEY';

/**
 * Build a paste-ready MCP client config (the standard `mcpServers` shape used
 * by Cursor and most MCP clients) pointing at Klio Cloud, with the user's key
 * injected. Falls back to a placeholder when no key is available so the snippet
 * is always valid, copyable JSON.
 */
export function buildKlioMcpConfig(apiKey: string | null | undefined): string {
  const config = {
    mcpServers: {
      klio: {
        url: KLIO_MCP_URL,
        headers: {
          [KLIO_MCP_KEY_HEADER]: apiKey || KLIO_MCP_KEY_PLACEHOLDER,
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}
