import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Per-project usage: measured capture/recall/storage accounting over the
 * last 30 days (storage is a level, not a flow, so it is all-time), plus a
 * labeled *estimate* of context tokens served.
 *
 * HONESTY NOTE — carry this near-verbatim to every surface that renders
 * `estContextTokens30d`: result ids are not logged (`022_brain_recall_events.py`),
 * so exact served-tokens is impossible without an engine change; this is
 * `recalls × result_count × mean length ÷ 4` and every surface labels it
 * estimated.
 *
 * - `memories30d` — count of `session_memories` captured in the window,
 *   measured exactly.
 * - `recalls30d` — `COUNT(*)` of `brain_recall_events` rows in the window:
 *   the number of recall calls made, measured exactly. This is distinct
 *   from `result_count`, which counts memory results returned per call
 *   (one recall call can return many results) — `result_count` feeds only
 *   `estContextTokens30d` below, never `recalls30d`.
 * - `storageBytes` — `SUM(length(content))` over ACTIVE `session_memories`,
 *   all-time (not windowed — a level, not a flow), measured exactly.
 * - `estContextTokens30d` — `SUM(result_count) * meanContentLength / 4`,
 *   floored. `meanContentLength` is the org's mean `length(content)` across
 *   active memories (not project-scoped — `brain_recall_events` does not
 *   log which result ids were served, so a per-project content length is
 *   not knowable either). This is a rough token-per-character estimate,
 *   never a measured value.
 */
export interface ProjectUsage {
  projectId: string | null;
  projectName: string | null;
  memories30d: number;
  recalls30d: number;
  storageBytes: number;
  estContextTokens30d: number; // ALWAYS presented as an estimate
}

interface CaptureRow {
  project_id: string | null;
  project_name: string | null;
  memories: string;
}

interface RecallRow {
  project_id: string | null;
  recall_count: string;
  result_sum: string;
}

interface MeanLenRow {
  mean_len: string | null;
}

interface StorageRow {
  project_id: string | null;
  storage_bytes: string;
}

function toNumber(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Per-project usage accounting, merged from three independent aggregates
 * (captures, recalls, storage) plus one org-wide mean content length used
 * to derive the labeled estimate. See the module docstring for the honesty
 * note on `estContextTokens30d` and the recalls-vs-results distinction.
 *
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else in
 *   this directory — bound through the params array on every query, never
 *   interpolated into the SQL text.
 */
export const loadContextUsage = cache(
  async (orgId: string): Promise<ProjectUsage[]> => {
    const pool = getAgentGuardPool();

    const [captures, recalls, meanLen, storage] = await Promise.all([
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
          COUNT(*) AS recall_count,
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
      pool.query<StorageRow>(
        `
        SELECT
          project_id,
          SUM(length(content)) AS storage_bytes
        FROM session_memories
        WHERE org_id = $1
          AND status = 'active'
        GROUP BY project_id
        `,
        [orgId],
      ),
    ]);

    const meanContentLength = toNumber(meanLen.rows[0]?.mean_len);

    const byProject = new Map<string | null, ProjectUsage>();

    function upsert(
      projectId: string | null,
      patch: Partial<Omit<ProjectUsage, 'projectId'>>,
    ): void {
      const existing = byProject.get(projectId);
      byProject.set(projectId, {
        projectId,
        projectName: existing?.projectName ?? null,
        memories30d: existing?.memories30d ?? 0,
        recalls30d: existing?.recalls30d ?? 0,
        storageBytes: existing?.storageBytes ?? 0,
        estContextTokens30d: existing?.estContextTokens30d ?? 0,
        ...patch,
      });
    }

    for (const row of captures.rows) {
      upsert(row.project_id, {
        projectName: row.project_name,
        memories30d: toNumber(row.memories),
      });
    }

    for (const row of recalls.rows) {
      const resultSum = toNumber(row.result_sum);
      const estimate = Math.floor((resultSum * meanContentLength) / 4);
      upsert(row.project_id, {
        recalls30d: toNumber(row.recall_count),
        estContextTokens30d: estimate,
      });
    }

    for (const row of storage.rows) {
      upsert(row.project_id, {
        storageBytes: toNumber(row.storage_bytes),
      });
    }

    return Array.from(byProject.values());
  },
);
