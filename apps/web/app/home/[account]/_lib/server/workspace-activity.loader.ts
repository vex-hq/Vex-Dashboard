import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Has this workspace EVER captured anything, at all.
 *
 * This exists to answer one question for the homepage's "Connect your first
 * agent" card: is this a workspace that has never captured a memory (show
 * the connect card), or one that has (never show it)? That is deliberately
 * NOT the same question `loadMemoryVolume` (memory/_lib/server/memory.loader.ts)
 * answers for the Memory page's chart — that loader is scoped to
 * `scope = 'org'` and `status = 'active'` over a 30-day window, because the
 * chart is specifically an org-shared, currently-active, recent view.
 *
 * Production evidence (2026-08-12): 15,865 `private`-scope vs 14,533
 * `org`-scope memories written in the last 30 days. Workspaces that write
 * exclusively to `private` scope were passing `loadMemoryVolume(...).every
 * (point => point.captured === 0)` — i.e. reading as never-connected — while
 * in daily, heavy use. Scoping this probe by `scope` or `status` would
 * reintroduce exactly that bug, so it deliberately has neither: the question
 * is "has this workspace ever captured anything", not "how much active
 * org-scope memory does it hold right now". Do not add either filter back
 * without re-deriving why from that production incident.
 *
 * No project-membership or private-ownership filtering either — unlike the
 * visibility-ladder loaders in this directory (see context-stream.loader.ts's
 * header), this is not a "what can the viewer see" query. It is an
 * existence probe over the whole org: "has this org's engine ever received a
 * write", independent of who wrote it or who is asking.
 *
 * TESTING POLICY (this repo): the pool is mocked at the module boundary and
 * never evaluates SQL, so only SQL-shape assertions (bound params, LIMIT,
 * absence of scope/status predicates) and TS-mapping assertions (rows
 * present/absent -> boolean) are load-bearing. See this file's test.
 *
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else in
 *   this directory — bound through the params array, never interpolated.
 */
export const loadHasAnyMemory = cache(
  async (orgId: string): Promise<boolean> => {
    const pool = getAgentGuardPool();

    const { rows } = await pool.query(
      `
      SELECT 1 FROM session_memories WHERE org_id = $1 LIMIT 1
      `,
      [orgId],
    );

    return rows.length > 0;
  },
);
