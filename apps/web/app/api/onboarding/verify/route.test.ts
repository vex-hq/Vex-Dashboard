/**
 * Unit tests for the onboarding connection-verification route.
 *
 * Onboarding must go green for BOTH products on the shared engine:
 *  - the memory product writes to `session_memories` (MCP `remember`/capture),
 *  - the reliability product writes to `executions` (SDK ingest).
 *
 * And it must go green for the RIGHT PERSON. The memory probe is scoped to
 * the caller, because an invitee joins a workspace that already has traffic —
 * an org-wide probe told them they were connected before they had wired
 * anything, on the one screen that exists to prove they had.
 *
 * Supabase, `resolveOrgId`, and the engine pool are mocked — no network, no
 * Next.js runtime. The mock pool dispatches on the target table so the tests
 * stay independent of query ordering.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_ORG_ID = 'org-00000000-0000-0000-0000-000000000001';
const FAKE_USER_ID = 'user-00000000-0000-0000-0000-000000000002';
const FAKE_SLUG = 'acme-team';

const MEMORY_AGENT_ID = 'klio-host/claude-code';
const EXECUTION_AGENT_ID = 'reliability-agent';

interface QueryResult {
  rows: unknown[];
}

/** Per-table canned responses; `null` makes that table's query reject. */
let sessionMemoriesResult: QueryResult | null = { rows: [] };
let executionsResult: QueryResult | null = { rows: [] };

/** Params the route passed with each table's query, for scope assertions. */
let sessionMemoriesParams: unknown[] | undefined;
let executionsParams: unknown[] | undefined;

/**
 * The mock pool APPLIES the scope the SQL declares, rather than returning
 * canned rows whatever the query says.
 *
 * This matters: an earlier version of these tests only asserted which params
 * the route passed. That assertion holds even if `AND user_id = $2` is
 * deleted from the query — the params are still passed, they are simply
 * ignored — so the suite passed against an implementation with the org-wide
 * leak restored. Filtering here means a row owned by someone else is only
 * ever returned if the SQL genuinely failed to exclude it.
 */
const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
  if (sql.includes('session_memories')) {
    sessionMemoriesParams = params;

    if (sessionMemoriesResult === null) {
      throw new Error('relation "session_memories" does not exist');
    }

    const scopedToUser = /user_id\s*=\s*\$2/.test(sql);

    if (!scopedToUser) {
      return sessionMemoriesResult;
    }

    const caller = params?.[1];

    return {
      rows: sessionMemoriesResult.rows.filter(
        (row) => (row as { user_id?: unknown }).user_id === caller,
      ),
    };
  }

  if (sql.includes('executions')) {
    executionsParams = params;

    if (executionsResult === null) {
      throw new Error('relation "executions" does not exist');
    }

    return executionsResult;
  }

  throw new Error(`Unexpected query: ${sql}`);
});

const requireUserMock = vi.fn();
const resolveOrgIdMock = vi.fn();

/** Who owns the workspace under test; drives the executions fallback. */
let primaryOwnerUserId: string | null = FAKE_USER_ID;

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { primary_owner_user_id: primaryOwnerUserId },
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@kit/supabase/require-user', () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
}));

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: queryMock }),
}));

vi.mock('~/lib/agentguard/resolve-org-id', () => ({
  resolveOrgId: (...args: unknown[]) => resolveOrgIdMock(...args),
}));

async function callRoute(
  url = `http://localhost/api/onboarding/verify?account=${FAKE_SLUG}`,
) {
  const { NextRequest } = await import('next/server');
  const { GET } = await import('./route');

  const response = await GET(new NextRequest(url));

  return { status: response.status, body: await response.json() };
}

function memoryRow(
  count: number,
  lastActivity: string,
  userId: string = FAKE_USER_ID,
) {
  return {
    agent_id: MEMORY_AGENT_ID,
    memory_count: count,
    last_activity: lastActivity,
    user_id: userId,
  };
}

function executionRow(count: number, lastActivity: string) {
  return {
    agent_id: EXECUTION_AGENT_ID,
    execution_count: count,
    last_activity: lastActivity,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMemoriesResult = { rows: [] };
  executionsResult = { rows: [] };
  sessionMemoriesParams = undefined;
  executionsParams = undefined;
  primaryOwnerUserId = FAKE_USER_ID;
  requireUserMock.mockResolvedValue({ data: { id: FAKE_USER_ID } });
  resolveOrgIdMock.mockResolvedValue(FAKE_ORG_ID);
});

describe('GET /api/onboarding/verify', () => {
  it('reports connected when only memory rows exist', async () => {
    sessionMemoriesResult = {
      rows: [memoryRow(4, '2026-07-01T10:00:00.000Z')],
    };

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(MEMORY_AGENT_ID);
    expect(body.memory_count).toBe(4);
  });

  it('reports connected when only executions exist', async () => {
    executionsResult = {
      rows: [executionRow(2, '2026-07-01T10:00:00.000Z')],
    };

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(EXECUTION_AGENT_ID);
    expect(body.execution_count).toBe(2);
  });

  it('reports not connected when there is neither signal', async () => {
    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body).toEqual({ connected: false });
  });

  it('surfaces the agent behind the most recent activity when both exist', async () => {
    sessionMemoriesResult = {
      rows: [memoryRow(9, '2026-07-02T12:00:00.000Z')],
    };
    executionsResult = {
      rows: [executionRow(3, '2026-07-01T12:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(MEMORY_AGENT_ID);
    expect(body.memory_count).toBe(9);
    expect(body.execution_count).toBe(3);
  });

  it('still reports connected when the executions probe fails', async () => {
    executionsResult = null;
    sessionMemoriesResult = {
      rows: [memoryRow(1, '2026-07-01T10:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(MEMORY_AGENT_ID);
  });

  it('still reports connected when the memory probe fails', async () => {
    sessionMemoriesResult = null;
    executionsResult = {
      rows: [executionRow(5, '2026-07-01T10:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(EXECUTION_AGENT_ID);
  });

  it('reports not connected when both probes fail', async () => {
    sessionMemoriesResult = null;
    executionsResult = null;

    const { body } = await callRoute();

    expect(body).toEqual({ connected: false });
  });

  it('rejects unauthenticated callers', async () => {
    requireUserMock.mockResolvedValue({ data: null });

    const { status, body } = await callRoute();

    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('rejects a request without an account parameter', async () => {
    const { status, body } = await callRoute(
      'http://localhost/api/onboarding/verify',
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Missing account parameter' });
  });

  it('reports not connected when the org cannot be resolved', async () => {
    resolveOrgIdMock.mockRejectedValue(new Error('no account for slug'));

    const { body } = await callRoute();

    expect(body).toEqual({ connected: false });
  });
});

describe('GET /api/onboarding/verify — whose agent is this', () => {
  it('scopes the memory probe to the signed-in caller', async () => {
    await callRoute();

    expect(sessionMemoriesParams).toEqual([FAKE_ORG_ID, FAKE_USER_ID]);
  });

  it("does not count another member's memory as this member's proof", async () => {
    // A busy workspace: hundreds of memories, none of them this person's.
    // This is every invitee's situation, and the screen must say so.
    primaryOwnerUserId = 'user-someone-else';
    sessionMemoriesResult = {
      rows: [
        memoryRow(412, '2026-07-02T12:00:00.000Z', 'user-someone-else'),
      ],
    };

    const { body } = await callRoute();

    expect(body).toEqual({ connected: false });
  });

  it('does not run the org-wide executions probe for a non-owner', async () => {
    primaryOwnerUserId = 'user-someone-else';

    await callRoute();

    expect(executionsParams).toBeUndefined();
  });

  it('still gives the workspace owner the executions signal', async () => {
    primaryOwnerUserId = FAKE_USER_ID;
    executionsResult = {
      rows: [executionRow(2, '2026-07-01T10:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(EXECUTION_AGENT_ID);
  });

  it("reports connected on the member's own memory even when they are not the owner", async () => {
    primaryOwnerUserId = 'user-someone-else';
    sessionMemoriesResult = {
      rows: [memoryRow(1, '2026-07-03T09:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body.connected).toBe(true);
    expect(body.agent_id).toBe(MEMORY_AGENT_ID);
    expect(body.memory_count).toBe(1);
  });

  it('reports not connected when the account row is missing', async () => {
    // No account row means no owner to widen for, and the memory probe is
    // the only remaining signal. Fails closed rather than celebrating.
    primaryOwnerUserId = null;
    executionsResult = {
      rows: [executionRow(7, '2026-07-01T10:00:00.000Z')],
    };

    const { body } = await callRoute();

    expect(body).toEqual({ connected: false });
  });
});
