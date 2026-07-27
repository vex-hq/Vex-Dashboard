/**
 * Unit tests for the onboarding connection-verification route.
 *
 * Onboarding must go green for BOTH products on the shared engine:
 *  - the memory product writes to `session_memories` (MCP `remember`/capture),
 *  - the reliability product writes to `executions` (SDK ingest).
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

const queryMock = vi.fn(async (sql: string) => {
  if (sql.includes('session_memories')) {
    if (sessionMemoriesResult === null) {
      throw new Error('relation "session_memories" does not exist');
    }

    return sessionMemoriesResult;
  }

  if (sql.includes('executions')) {
    if (executionsResult === null) {
      throw new Error('relation "executions" does not exist');
    }

    return executionsResult;
  }

  throw new Error(`Unexpected query: ${sql}`);
});

const requireUserMock = vi.fn();
const resolveOrgIdMock = vi.fn();

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({}),
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

function memoryRow(count: number, lastActivity: string) {
  return {
    agent_id: MEMORY_AGENT_ID,
    memory_count: count,
    last_activity: lastActivity,
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

  it('reports not connected when the org has neither signal', async () => {
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
