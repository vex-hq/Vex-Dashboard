import { describe, expect, it } from 'vitest';

import {
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
