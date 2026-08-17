import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import type { ShellRecallSource } from './shell-context.types';

/**
 * Recall traffic grouped by source.
 *
 * Backs the prototype's Agents screen: Agent · Source · Recalls · Last.
 *
 * `brain_recall_events.source` is nullable, so rows written before the column
 * was populated group under `unknown` rather than being dropped — a recall
 * that happened is worth counting even when we cannot say what asked for it.
 *
 * This counts RECALL EVENTS, not memories: one recall serving nine memories is
 * one row here. That is what the prototype's fixture counts and what the
 * column heading "Recalls" means on this screen.
 *
 * Org-scoped only. There is no per-user filter because a recall event is not
 * private context — it is traffic against the org's store, and the screen it
 * feeds is about which agents are connected, not about what they read.
 */
export const loadShellRecallSources = cache(
  async (orgId: string): Promise<ShellRecallSource[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<ShellRecallSourceQueryRow>(
      `
      SELECT
        COALESCE(NULLIF(source, ''), 'unknown') AS source,
        COUNT(*) AS recalls,
        MAX(created_at)::text AS last
      FROM brain_recall_events
      WHERE org_id = $1
      GROUP BY COALESCE(NULLIF(source, ''), 'unknown')
      ORDER BY COUNT(*) DESC
      `,
      [orgId],
    );

    return result.rows.map((row) => ({
      source: row.source,
      recalls: Number(row.recalls) || 0,
      last: row.last,
    }));
  },
);

interface ShellRecallSourceQueryRow {
  source: string;
  recalls: string;
  last: string | null;
}

/**
 * How a source renders on the Agents screen.
 *
 * The prototype maps `hook` to `claude-code (hooks)` and shows every other
 * source verbatim:
 *
 *     esc(r.source)==='hook'?'claude-code (hooks)':esc(r.source)
 *
 * The mapping exists because `hook` names a transport, not an agent, and the
 * only thing that recalls through hooks is Claude Code. Any other source is
 * shown as recorded rather than guessed at — inventing a friendly name for a
 * source we do not recognise would put a claim on screen the data cannot back.
 */
export function displayRecallSource(source: string): string {
  return source === 'hook' ? 'claude-code (hooks)' : source;
}
