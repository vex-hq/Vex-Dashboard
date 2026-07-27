import { NextRequest, NextResponse } from 'next/server';

import type { Pool } from 'pg';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

/**
 * Onboarding "Go Live" probe.
 *
 * Two products share this engine and each writes to a different table, so a
 * single signal cannot tell us whether the user is wired up:
 *  - the memory product writes to `session_memories` (MCP capture / `remember`),
 *  - the reliability product writes to `executions` (SDK ingest).
 *
 * Either one means "connected". The probes run independently so a failure on
 * one product's table never masks the other product's signal.
 */

/** Newest memory write per agent, most recently active agent first. */
const MEMORY_ACTIVITY_QUERY = `SELECT agent_id,
          COUNT(*)::int AS memory_count,
          MAX(created_at) AS last_activity
   FROM session_memories
   WHERE org_id = $1
   GROUP BY agent_id
   ORDER BY MAX(created_at) DESC
   LIMIT 1`;

/** Newest execution per agent, most recently active agent first. */
const EXECUTION_ACTIVITY_QUERY = `SELECT agent_id,
          COUNT(*)::int AS execution_count,
          MAX("timestamp") AS last_activity
   FROM executions
   WHERE org_id = $1
   GROUP BY agent_id
   ORDER BY MAX("timestamp") DESC
   LIMIT 1`;

type ActivityRow = {
  agent_id: string;
  last_activity: string | Date | null;
};

type MemoryActivityRow = ActivityRow & {
  memory_count: number;
};

type ExecutionActivityRow = ActivityRow & {
  execution_count: number;
};

/**
 * Run one activity probe, returning `null` instead of throwing so one missing
 * or erroring table does not hide the other product's activity.
 */
async function probeActivity<T extends ActivityRow>(
  pool: Pool,
  sql: string,
  orgId: string,
): Promise<T | null> {
  try {
    const result = await pool.query<T>(sql, [orgId]);

    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

function activityTime(row: ActivityRow | null): number {
  if (!row?.last_activity) {
    return 0;
  }

  const time = new Date(row.last_activity).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const { data: user } = await requireUser(client);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountSlug = request.nextUrl.searchParams.get('account');

  if (!accountSlug) {
    return NextResponse.json(
      { error: 'Missing account parameter' },
      { status: 400 },
    );
  }

  try {
    const orgId = await resolveOrgId(accountSlug);
    const pool = getAgentGuardPool();

    const [memory, execution] = await Promise.all([
      probeActivity<MemoryActivityRow>(pool, MEMORY_ACTIVITY_QUERY, orgId),
      probeActivity<ExecutionActivityRow>(
        pool,
        EXECUTION_ACTIVITY_QUERY,
        orgId,
      ),
    ]);

    if (!memory && !execution) {
      return NextResponse.json({ connected: false });
    }

    // Whichever product saw traffic most recently names the detected agent.
    const mostRecent =
      activityTime(memory) >= activityTime(execution)
        ? (memory ?? execution)
        : (execution ?? memory);

    return NextResponse.json({
      connected: true,
      agent_id: mostRecent!.agent_id,
      memory_count: memory?.memory_count ?? 0,
      execution_count: execution?.execution_count ?? 0,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
