/**
 * Unit tests for connected-apps.loader.ts.
 *
 * The Supabase client is fully mocked — no network calls, no Supabase
 * process.  All fixtures use obviously fake identifiers safe for a public
 * repository.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_GRANT_1 = {
  id: '11111111-1111-1111-1111-111111111111',
  oauth_client_id: 'client_fake_abc',
  account_slug: 'acme-team',
  created_at: '2026-01-15T10:00:00Z',
};

const FAKE_GRANT_2 = {
  id: '22222222-2222-2222-2222-222222222222',
  oauth_client_id: 'client_fake_xyz',
  account_slug: 'beta-team',
  created_at: '2026-01-10T08:00:00Z',
};

// A grant that has a revoked_at set — should NOT appear in the result because
// the query filters via .is('revoked_at', null).
const REVOKED_GRANT = {
  id: '33333333-3333-3333-3333-333333333333',
  oauth_client_id: 'client_fake_old',
  account_slug: 'acme-team',
  created_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Supabase query chain builder
// ---------------------------------------------------------------------------

interface BuildMockClientOptions {
  rows: unknown[];
  error?: { message: string } | null;
  /** Track which query methods were called for assertion */
  callTracker?: {
    isCalledWith: unknown[];
    orderCalledWith: unknown[];
  };
}

function buildMockClient({
  rows,
  error = null,
  callTracker,
}: BuildMockClientOptions): SupabaseClient {
  const orderMock = vi.fn().mockReturnValue({ data: rows, error });
  const isMock = vi.fn().mockReturnValue({ order: orderMock });
  const selectMock = vi.fn().mockReturnValue({ is: isMock });

  if (callTracker) {
    isMock.mockImplementation((...args: unknown[]) => {
      callTracker.isCalledWith.push(args);
      return { order: orderMock };
    });

    orderMock.mockImplementation((...args: unknown[]) => {
      callTracker.orderCalledWith.push(args);
      return { data: rows, error };
    });
  }

  return {
    from: vi.fn().mockReturnValue({ select: selectMock }),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadConnectedApps', () => {
  describe('happy path — active grants returned', () => {
    it('returns the rows from the database as ConnectedApp objects', async () => {
      const client = buildMockClient({ rows: [FAKE_GRANT_1, FAKE_GRANT_2] });
      const { loadConnectedApps } = await import('./connected-apps.loader');

      const result = await loadConnectedApps(client);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(FAKE_GRANT_1);
      expect(result[1]).toEqual(FAKE_GRANT_2);
    });

    it('returns an empty array when the user has no active grants', async () => {
      const client = buildMockClient({ rows: [] });
      const { loadConnectedApps } = await import('./connected-apps.loader');

      const result = await loadConnectedApps(client);

      expect(result).toEqual([]);
    });
  });

  describe('query shape — revoked_at filter applied', () => {
    it('calls .is("revoked_at", null) on the query chain', async () => {
      const callTracker = {
        isCalledWith: [] as unknown[],
        orderCalledWith: [] as unknown[],
      };

      const client = buildMockClient({
        rows: [FAKE_GRANT_1],
        callTracker,
      });

      const { loadConnectedApps } = await import('./connected-apps.loader');
      await loadConnectedApps(client);

      // Verify the is() call received the correct arguments
      expect(callTracker.isCalledWith).toHaveLength(1);
      expect(callTracker.isCalledWith[0]).toEqual(['revoked_at', null]);
    });

    it('calls .order("created_at", { ascending: false })', async () => {
      const callTracker = {
        isCalledWith: [] as unknown[],
        orderCalledWith: [] as unknown[],
      };

      const client = buildMockClient({
        rows: [FAKE_GRANT_1, FAKE_GRANT_2],
        callTracker,
      });

      const { loadConnectedApps } = await import('./connected-apps.loader');
      await loadConnectedApps(client);

      expect(callTracker.orderCalledWith).toHaveLength(1);
      expect(callTracker.orderCalledWith[0]).toEqual([
        'created_at',
        { ascending: false },
      ]);
    });

    it('does not return rows with a revoked_at set (simulates DB filter)', async () => {
      // The DB enforces .is('revoked_at', null); here we verify the loader
      // passes through whatever the DB returns without re-introducing revoked rows.
      const client = buildMockClient({
        // Simulating the DB already filtered out REVOKED_GRANT
        rows: [FAKE_GRANT_1, FAKE_GRANT_2],
      });

      const { loadConnectedApps } = await import('./connected-apps.loader');
      const result = await loadConnectedApps(client);

      const ids = result.map((r) => r.id);
      expect(ids).not.toContain(REVOKED_GRANT.id);
      expect(ids).toContain(FAKE_GRANT_1.id);
      expect(ids).toContain(FAKE_GRANT_2.id);
    });
  });

  describe('error handling', () => {
    it('throws when the database returns an error', async () => {
      const client = buildMockClient({
        rows: [],
        error: { message: 'connection timeout' },
      });

      const { loadConnectedApps } = await import('./connected-apps.loader');

      await expect(loadConnectedApps(client)).rejects.toThrow(
        'Failed to load connected apps: connection timeout',
      );
    });
  });
});
