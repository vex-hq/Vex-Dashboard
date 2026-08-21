import { NextRequest, NextResponse } from 'next/server';

import type { Pool } from 'pg';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

/**
 * Onboarding "Go Live" probe — has THIS PERSON's agent written anything?
 *
 * Two products share this engine and each writes to a different table, so a
 * single signal cannot tell us whether the user is wired up:
 *  - the memory product writes to `session_memories` (MCP capture / `remember`),
 *  - the reliability product writes to `executions` (SDK ingest).
 *
 * The probes run independently so a failure on one product's table never
 * masks the other product's signal.
 *
 * WHY THE MEMORY PROBE IS SCOPED TO THE CALLER.
 * This used to ask "does this ORG have any memory?". In a workspace that
 * already had traffic — which is every workspace an invitee joins — the
 * answer was yes before the invitee had wired anything, so the one screen
 * whose entire job is to prove the setup worked celebrated somebody else's
 * agent. It is now scoped to `user_id`, which the engine fills from the
 * `created_by` of the API key that authenticated the write; onboarding and
 * join keys are both minted with the signed-in user as `created_by`, so a
 * member's own writes are attributable and nobody else's count.
 *
 * WHY `executions` IS NOT SCOPED THE SAME WAY.
 * That table has no user column — SDK ingest is attributed to an org and an
 * agent, not a person — so it cannot answer "did YOU do this". Rather than
 * pretend, it is only consulted for the account's primary owner, who is the
 * one doing reliability-product setup during workspace onboarding. For every
 * other member the memory probe is the only signal, which is the correct
 * answer for the product they are actually being onboarded onto.
 */

/**
 * Newest memory write per agent FOR ONE USER, most recently active first.
 *
 * `user_id = $2` is an equality, deliberately not `IS NOT DISTINCT FROM`:
 * a row with a NULL `user_id` is one the engine could not attribute to
 * anybody, and an unattributable write is not proof that this person is
 * connected.
 */
const MEMORY_ACTIVITY_QUERY = `SELECT agent_id,
          COUNT(*)::int AS memory_count,
          MAX(created_at) AS last_activity
   FROM session_memories
   WHERE org_id = $1
     AND user_id = $2
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
  params: unknown[],
): Promise<T | null> {
  try {
    const result = await pool.query<T>(sql, params);

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

    // Resolved before the probes so both can still run concurrently, and
    // derived server-side from the account row — never from a request
    // parameter, which the caller controls.
    const { data: account } = await client
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('slug', accountSlug)
      .maybeSingle();

    const isPrimaryOwner = account?.primary_owner_user_id === user.id;

    const [memory, execution] = await Promise.all([
      probeActivity<MemoryActivityRow>(pool, MEMORY_ACTIVITY_QUERY, [
        orgId,
        user.id,
      ]),
      // Org-wide, and therefore only trusted for the person who owns the
      // workspace — see the note at the top of this file.
      isPrimaryOwner
        ? probeActivity<ExecutionActivityRow>(pool, EXECUTION_ACTIVITY_QUERY, [
            orgId,
          ])
        : Promise.resolve(null),
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
