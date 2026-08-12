import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Per-project usage over the last 30 days: measured capture/recall counts,
 * plus a labeled *estimate* of context tokens served.
 *
 * HONESTY NOTE — carry this near-verbatim to every surface that renders
 * `estContextTokens30d`: result ids are not logged (`022_brain_recall_events.py`),
 * so exact served-tokens is impossible without an engine change; this is
 * `recalls × result_count × mean length ÷ 4` and every surface labels it
 * estimated.
 *
 * - `memories30d` — count of `session_memories` captured in the window,
 *   measured exactly.
 * - `recalls30d` — `SUM(result_count)` from `brain_recall_events` in the
 *   window: the total number of memory results returned by recall calls,
 *   measured exactly (this is a count of results served, not of recall
 *   calls).
 * - `estContextTokens30d` — `recalls30d * meanContentLength / 4`, floored.
 *   `meanContentLength` is the org's mean `length(content)` across active
 *   memories (not project-scoped — brain_recall_events does not log which
 *   result ids were served, so a per-project content length is not
 *   knowable either). This is a rough token-per-character estimate, never
 *   a measured value.
 */
export interface ProjectUsage {
  projectId: string | null;
  projectName: string | null;
  memories30d: number;
  recalls30d: number;
  estContextTokens30d: number; // ALWAYS presented as an estimate
}

interface CaptureRow {
  project_id: string | null;
  project_name: string | null;
  memories: string;
}

interface RecallRow {
  project_id: string | null;
  result_sum: string;
}

interface MeanLenRow {
  mean_len: string | null;
}

function toNumber(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Per-project usage accounting for the last 30 days, merged from two
 * independent aggregates (captures, recalls) plus one org-wide mean content
 * length used to derive the labeled estimate. See the module docstring for
 * the honesty note on `estContextTokens30d`.
 *
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else in
 *   this directory — bound through the params array on every query, never
 *   interpolated into the SQL text.
 */
export const loadContextUsage = cache(
  async (orgId: string): Promise<ProjectUsage[]> => {
    const pool = getAgentGuardPool();

    const [captures, recalls, meanLen] = await Promise.all([
      pool.query<CaptureRow>(
        `
        SELECT
          m.project_id,
          pr.display_name AS project_name,
          COUNT(m.id) AS memories
        FROM session_memories m
        LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
        WHERE m.org_id = $1
          AND m.status = 'active'
          AND m.created_at > now() - interval '30 days'
        GROUP BY m.project_id, pr.display_name
        `,
        [orgId],
      ),
      pool.query<RecallRow>(
        `
        SELECT
          project_id,
          SUM(result_count) AS result_sum
        FROM brain_recall_events
        WHERE org_id = $1
          AND created_at > now() - interval '30 days'
        GROUP BY project_id
        `,
        [orgId],
      ),
      pool.query<MeanLenRow>(
        `
        SELECT AVG(length(content)) AS mean_len
        FROM session_memories
        WHERE org_id = $1
          AND status = 'active'
        `,
        [orgId],
      ),
    ]);

    const meanContentLength = toNumber(meanLen.rows[0]?.mean_len);

    const byProject = new Map<string | null, ProjectUsage>();

    for (const row of captures.rows) {
      byProject.set(row.project_id, {
        projectId: row.project_id,
        projectName: row.project_name,
        memories30d: toNumber(row.memories),
        recalls30d: 0,
        estContextTokens30d: 0,
      });
    }

    for (const row of recalls.rows) {
      const resultSum = toNumber(row.result_sum);
      const estimate = Math.floor((resultSum * meanContentLength) / 4);
      const existing = byProject.get(row.project_id);

      byProject.set(row.project_id, {
        projectId: row.project_id,
        projectName: existing?.projectName ?? null,
        memories30d: existing?.memories30d ?? 0,
        recalls30d: resultSum,
        estContextTokens30d: estimate,
      });
    }

    return Array.from(byProject.values());
  },
);
