/**
 * Single source of truth for connecting an external MCP client to Klio Cloud.
 *
 * Any MCP client that accepts a remote server URL plus custom headers (Claude
 * Desktop, Cursor, Codex, a self-built agent, …) can write into the same
 * shared memory by pointing at the hosted Klio MCP server over Streamable
 * HTTP. The engine serves the transport at `MCP_ENDPOINT_PATH` ("/mcp"); auth
 * travels in the `X-Vex-Key` header (an optional `X-Vex-Agent` header labels
 * the calling agent).
 *
 * Header-based auth is not available in the consumer ChatGPT and Gemini apps,
 * which cannot attach a custom auth header to a remote MCP server. Those
 * clients still reach the same URL through the OAuth custom-connector flow,
 * the same way Claude.ai does — no header, consent granted at
 * `app/oauth/consent`.
 *
 * Directive-free (no `'use client'`/`'use server'`) so it is safe to import
 * from client components and server code alike.
 */
export const KLIO_MCP_URL = 'https://mcp.klio.tech/mcp';

/**
 * One-command local setup: detects installed coding agents and writes their MCP
 * client config for them. Single source of truth for the onboarding wizard, the
 * Memory page's empty state, and the in-app docs.
 */
export const KLIO_INIT_COMMAND = 'npx @klio-tech/klio@latest init';

/**
 * Canonical hosted documentation site (matches the marketing site's `DOCS_URL`
 * in `apps/landing/app/_components/nav/nav-config.ts`).
 */
export const KLIO_DOCS_URL = 'https://docs.klio.tech';

/**
 * Anchor for the Klio memory / MCP section of the in-app docs page, so links
 * elsewhere in the product (onboarding) can deep-link straight to it.
 */
export const KLIO_DOCS_MCP_ANCHOR = 'klio-memory';

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

/**
 * Environment variable the CLI reads a Klio Cloud key from.
 *
 * Preferred over the `--key` flag when a coding agent runs init on the user's
 * behalf: argv is world-readable via `ps` on most systems, an environment
 * assignment prefixed to the command is not.
 */
export const KLIO_CLI_KEY_ENV = 'KLIO_API_KEY';

/**
 * The instruction a user pastes into their own coding agent so the AGENT wires
 * Klio up, instead of the user opening a terminal.
 *
 * WHY THIS DELEGATES TO THE CLI RATHER THAN DESCRIBING THE CONFIG.
 * Wiring Claude Code correctly is three things, not one: the MCP server (which
 * provides `remember`/`recall`), four lifecycle capture hooks (which provide
 * passive capture), and a tool allow-list. A prompt that told an agent to
 * write an `mcpServers` block would produce an install that looks connected
 * and captures nothing — the exact failure that left four members of the
 * reference workspace holding verified keys and zero memories. So the prompt
 * hands the agent the one tested code path and asks it to report the result.
 *
 * The three rules at the end exist because an agent's default instinct on a
 * failing command is to improvise a fix. Here, improvising produces the silent
 * install. It must stop and say so instead.
 *
 * Requires CLI >= 0.10.0, which added non-interactive key supply. Earlier
 * versions ignore the variable and block on the masked prompt, which is why
 * the command pins `@latest` rather than a floating major.
 */
export function buildKlioAgentPrompt(apiKey: string | null | undefined): string {
  const key = apiKey || KLIO_MCP_KEY_PLACEHOLDER;

  return [
    'Set up Klio — shared memory for AI coding agents — on this machine.',
    '',
    'Run this exact command. It is non-interactive and takes about a minute:',
    '',
    `  ${KLIO_CLI_KEY_ENV}=${key} npx -y @klio-tech/klio@latest init --cloud`,
    '',
    'Then, in order:',
    '',
    '1. If it exits non-zero, or prints "Phase 2 incomplete", STOP and show me',
    '   exactly what it printed. Do not hand-write MCP config as a workaround —',
    '   correct wiring is an MCP server AND four capture hooks, and a partial',
    '   setup looks connected while capturing nothing.',
    '2. If it succeeded, tell me to restart you, so the new MCP server and',
    '   hooks load.',
    '3. After the restart, confirm the Klio tools are available and tell me',
    '   which agents the command reported wiring.',
    '',
    'Do not write this key anywhere except that command.',
  ].join('\n');
}
