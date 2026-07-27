import { describe, expect, it } from 'vitest';

import {
  KLIO_DOCS_MCP_ANCHOR,
  KLIO_DOCS_URL,
  KLIO_INIT_COMMAND,
  KLIO_MCP_KEY_HEADER,
  KLIO_MCP_KEY_PLACEHOLDER,
  KLIO_MCP_URL,
  buildKlioMcpConfig,
} from './mcp.constants';

describe('buildKlioMcpConfig', () => {
  it('produces valid JSON pointing at the hosted Klio MCP endpoint', () => {
    const parsed = JSON.parse(buildKlioMcpConfig('klio_live_abc123'));

    expect(parsed.mcpServers.klio.url).toBe(KLIO_MCP_URL);
  });

  it('injects the provided api key into the auth header', () => {
    const parsed = JSON.parse(buildKlioMcpConfig('klio_live_abc123'));

    expect(parsed.mcpServers.klio.headers[KLIO_MCP_KEY_HEADER]).toBe(
      'klio_live_abc123',
    );
  });

  it('falls back to a placeholder when the key is null/empty', () => {
    for (const key of [null, undefined, '']) {
      const parsed = JSON.parse(buildKlioMcpConfig(key));

      expect(parsed.mcpServers.klio.headers[KLIO_MCP_KEY_HEADER]).toBe(
        KLIO_MCP_KEY_PLACEHOLDER,
      );
    }
  });

  it('is pretty-printed (multi-line) for readable copy-paste', () => {
    expect(buildKlioMcpConfig('k').split('\n').length).toBeGreaterThan(1);
  });
});

describe('setup constants', () => {
  it('publishes the Klio init command as a runnable one-liner', () => {
    // Shared by onboarding, the Memory empty state, and the in-app docs — a
    // drifted copy here silently teaches users the wrong command.
    expect(KLIO_INIT_COMMAND).toBe('npx @klio-tech/klio@latest init');
  });

  it('points documentation links at the canonical Klio docs host', () => {
    // Regression guard: onboarding used to link the legacy docs.oppla.ai host.
    expect(KLIO_DOCS_URL).toBe('https://docs.klio.tech');
    expect(KLIO_DOCS_URL).not.toContain('oppla');
  });

  it('exposes a fragment-safe anchor for the in-app MCP docs section', () => {
    expect(KLIO_DOCS_MCP_ANCHOR).toMatch(/^[a-z0-9-]+$/);
  });
});
