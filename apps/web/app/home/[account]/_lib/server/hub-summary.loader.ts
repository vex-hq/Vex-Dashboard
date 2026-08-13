import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The answer-first Hub: "what happened, where, and who's active" in one
 * read-only rollup, for the redesigned dashboard home.
 *
 * VISIBILITY IS INHERITED, NEVER RESTATED. `buildOrgVisibilityArms` below is
 * copied verbatim from `context-stream.loader.ts`'s `loadContextStream` arms
 * — org arm, viewer's own private arm bound to the user id, project arm via
 * `EXISTS project_members` — which are themselves copied from:
 *   - org arm      -> memory/_lib/server/team-memory.loader.ts
 *   - private arm  -> memory/_lib/server/private-memory.loader.ts
 *   - project arm  -> memory/_lib/server/project-memory.loader.ts (EXISTS
 *                     against project_members; membership in SQL, never TS)
 * Change those files first and mirror here, never the reverse. A `null`
 * `viewerUserId` collapses to the org arm only — the private and project
 * arms are omitted from the SQL entirely, exactly as in `loadContextStream`.
 *
 * Base predicates (`status IN ('active', 'superseded') AND recall_hidden =
 * FALSE`) are copied from the same source for the same reason: `recall_hidden`
 * is filtered exactly as `sessions/_lib/server/memory-sessions.loader.ts`
 * filters it for its `recallable` aggregate — a memory that opted out of
 * recall must not resurface in the Hub either.
 *
 * `projectSparks` additionally gates the `projects` FROM clause itself, the
 * same way `loadProjectPulse` (`context-stream.loader.ts`) gates it — without
 * that second gate, a project's id/display_name/series would leak to any org
 * member the moment that project has org-scoped memories tagged with its id,
 * even if the viewer is not a member.
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): `project_members` is
 * the only gate for project visibility. This loader previously took an
 * `isOrgAdmin` flag that widened the `projectSparks` listing gate to `TRUE`
 * for org admins; that branch is gone, not defaulted off — see
 * `context-stream.loader.ts`'s `loadProjectPulse` for the full rationale
 * (migration 039 backfilled an owner for every project, so the membership
 * gate alone is safe).
 *
 * `lastActivityAt` is deliberately NOT bounded by either the 7-day or 30-day
 * window — it answers "when did the viewer's visible brain last change at
 * all", which is a different question from the day-series widgets below it.
 *
 * TESTING POLICY (this repo): the pool is mocked at the module boundary via a
 * FIFO `queueRows` helper and the SQL text is never evaluated, so seed-and-
 * assert visibility tests are worthless here (a query that returns whatever
 * was queued would pass even with the tenancy guard deleted). Only two kinds
 * of assertion are load-bearing: (a) SQL-shape assertions on the generated
 * query text and the bound params array, and (b) TypeScript-side assembly and
 * arithmetic assertions (gap-filling, ranking, capping). See this file's test.
 */
const HUB_ACTIVITY_WINDOW_DAYS = 7;
const HUB_VOLUME_WINDOW_DAYS = 30;
const HUB_PROJECT_SPARK_LIMIT = 6;

const BASE_VISIBILITY_PREDICATE = `m.status IN ('active', 'superseded') AND m.recall_hidden = FALSE`;

export interface DayPoint {
  day: string; // 'YYYY-MM-DD'
  count: number;
}

export interface ProjectSpark {
  projectId: string;
  name: string;
  series: DayPoint[];
}

export interface HubSummary {
  decisions7d: number;
  plans7d: number;
  facts7d: number;
  notes7d: number;
  projectsActive7d: number;
  agentsActive7d: string[];
  lastActivityAt: string | null;
  volume30d: DayPoint[];
  projectSparks: ProjectSpark[];
}

interface HubRollupRow {
  decisions_7d: string;
  plans_7d: string;
  facts_7d: string;
  notes_7d: string;
  projects_active_7d: string;
  agents_active_7d: string[] | null;
  last_activity_at: string | null;
}

interface DailyCountRow {
  day: string;
  count: string;
}

interface ProjectSparkRow {
  project_id: string;
  name: string;
  total: string;
  day: string;
  count: string;
}

function pushParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

/**
 * COPIED VERBATIM (arm predicates only) from `loadContextStream`'s arms in
 * `context-stream.loader.ts` — see this file's header for the chain of
 * silo loaders those arms themselves are copied from. Do not hand-roll a
 * second tenancy path here.
 */
function buildOrgVisibilityArms(
  params: unknown[],
  viewerUserId: string | null,
): { arms: string[]; viewerParam: string | null } {
  const arms: string[] = [`(m.scope = 'org')`];
  let viewerParam: string | null = null;

  if (viewerUserId) {
    viewerParam = pushParam(params, viewerUserId);
    arms.push(`(m.scope = 'private' AND m.user_id = ${viewerParam})`);
    arms.push(`(m.scope = 'project' AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = m.project_id AND pm.user_id = ${viewerParam}
    ))`);
  }

  return { arms, viewerParam };
}

/**
 * Contiguous ascending day series over the last `days` days (including
 * today), zero-filled for any day with no queued row. SQL only returns rows
 * for days that had activity, so the gap-fill happens here in TS.
 */
function gapFillSeries(days: number, rows: DailyCountRow[]): DayPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.day, parseInt(row.count, 10) || 0);
  }

  const series: DayPoint[] = [];
  const today = new Date();
  const startOfToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(startOfToday - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    series.push({ day, count: counts.get(day) ?? 0 });
  }

  return series;
}

function toRollup(row: HubRollupRow | undefined): {
  decisions7d: number;
  plans7d: number;
  facts7d: number;
  notes7d: number;
  projectsActive7d: number;
  agentsActive7d: string[];
  lastActivityAt: string | null;
} {
  return {
    decisions7d: parseInt(row?.decisions_7d ?? '0', 10),
    plans7d: parseInt(row?.plans_7d ?? '0', 10),
    facts7d: parseInt(row?.facts_7d ?? '0', 10),
    notes7d: parseInt(row?.notes_7d ?? '0', 10),
    projectsActive7d: parseInt(row?.projects_active_7d ?? '0', 10),
    agentsActive7d: row?.agents_active_7d ?? [],
    lastActivityAt: row?.last_activity_at ?? null,
  };
}

/**
 * Groups the flat project/day rows into per-project series, preserving the
 * SQL's `total DESC` ordering (most-active project first) and gap-filling
 * each project's series to a contiguous 30-day window. Defensively re-caps
 * at `HUB_PROJECT_SPARK_LIMIT` even though the SQL's CTE already limits the
 * project set — belt-and-braces against a future SQL edit that loosens it.
 */
function buildProjectSparks(rows: ProjectSparkRow[]): ProjectSpark[] {
  const order: string[] = [];
  const byProject = new Map<string, { name: string; rows: DailyCountRow[] }>();

  for (const row of rows) {
    let entry = byProject.get(row.project_id);
    if (!entry) {
      entry = { name: row.name, rows: [] };
      byProject.set(row.project_id, entry);
      order.push(row.project_id);
    }
    entry.rows.push({ day: row.day, count: row.count });
  }

  return order.slice(0, HUB_PROJECT_SPARK_LIMIT).map((projectId) => {
    const entry = byProject.get(projectId)!;
    return {
      projectId,
      name: entry.name,
      series: gapFillSeries(HUB_VOLUME_WINDOW_DAYS, entry.rows),
    };
  });
}

/**
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else in
 *   this directory — bound through the params array, never interpolated.
 * @param viewerUserId - The signed-in caller's user id, or `null` for an
 *   unattributed request. A `null` viewer sees only `org`-scoped rows and no
 *   projects at all — see the file header.
 */
export const loadHubSummary = cache(
  async (orgId: string, viewerUserId: string | null): Promise<HubSummary> => {
    const pool = getAgentGuardPool();

    // --- Rollup: kind counts, active projects, active agents, last activity
    const rollupParams: unknown[] = [orgId];
    const { arms: rollupArms } = buildOrgVisibilityArms(
      rollupParams,
      viewerUserId,
    );
    const rollupWindowParam = pushParam(rollupParams, HUB_ACTIVITY_WINDOW_DAYS);
    const rollupWindow = `m.created_at >= now() - (${rollupWindowParam} || ' days')::interval`;

    const rollupSql = `
      SELECT
        COUNT(*) FILTER (WHERE m.memory_type = 'decision' AND ${rollupWindow}) AS decisions_7d,
        COUNT(*) FILTER (WHERE m.memory_type = 'plan' AND ${rollupWindow}) AS plans_7d,
        COUNT(*) FILTER (WHERE m.memory_type = 'fact' AND ${rollupWindow}) AS facts_7d,
        COUNT(*) FILTER (WHERE m.memory_type = 'note' AND ${rollupWindow}) AS notes_7d,
        COUNT(DISTINCT m.project_id) FILTER (
          WHERE m.project_id IS NOT NULL AND ${rollupWindow}
        ) AS projects_active_7d,
        array_agg(DISTINCT m.agent_id) FILTER (
          WHERE m.agent_id IS NOT NULL AND ${rollupWindow}
        ) AS agents_active_7d,
        MAX(m.created_at)::text AS last_activity_at
      FROM session_memories m
      WHERE m.org_id = $1
        AND ${BASE_VISIBILITY_PREDICATE}
        AND (${rollupArms.join(' OR ')})
    `;

    // --- Org-wide 30-day volume (all visible kinds, not just the four)
    const volumeParams: unknown[] = [orgId];
    const { arms: volumeArms } = buildOrgVisibilityArms(
      volumeParams,
      viewerUserId,
    );
    const volumeWindowParam = pushParam(volumeParams, HUB_VOLUME_WINDOW_DAYS);

    const volumeSql = `
      SELECT
        to_char(date_trunc('day', m.created_at), 'YYYY-MM-DD') AS day,
        COUNT(*) AS count
      FROM session_memories m
      WHERE m.org_id = $1
        AND ${BASE_VISIBILITY_PREDICATE}
        AND (${volumeArms.join(' OR ')})
        AND m.created_at >= now() - (${volumeWindowParam} || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `;

    // --- Per-project 30-day sparks, gated on the projects FROM clause the
    // same way loadProjectPulse gates it (see file header).
    const sparkParams: unknown[] = [orgId];
    const { arms: sparkItemArms, viewerParam: sparkViewerParam } =
      buildOrgVisibilityArms(sparkParams, viewerUserId);

    let projectVisibility = 'FALSE';
    if (sparkViewerParam) {
      projectVisibility = `EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = pr.id AND pm.user_id = ${sparkViewerParam}
      )`;
    }

    const sparkWindowParam = pushParam(sparkParams, HUB_VOLUME_WINDOW_DAYS);
    const sparkLimitParam = pushParam(sparkParams, HUB_PROJECT_SPARK_LIMIT);
    const sparkWindow = `m.created_at >= now() - (${sparkWindowParam} || ' days')::interval`;

    const sparkSql = `
      WITH project_totals AS (
        SELECT
          pr.id AS project_id,
          pr.display_name AS name,
          COUNT(m.id) AS total
        FROM projects pr
        LEFT JOIN session_memories m
          ON m.project_id = pr.id
         AND m.org_id = pr.org_id
         AND ${BASE_VISIBILITY_PREDICATE}
         AND ${sparkWindow}
         AND (${sparkItemArms.join(' OR ')})
        WHERE pr.org_id = $1
          AND (${projectVisibility})
        GROUP BY pr.id, pr.display_name
        HAVING COUNT(m.id) > 0
        ORDER BY total DESC
        LIMIT ${sparkLimitParam}
      )
      SELECT
        pt.project_id,
        pt.name,
        pt.total::text AS total,
        to_char(date_trunc('day', m.created_at), 'YYYY-MM-DD') AS day,
        COUNT(m.id) AS count
      FROM project_totals pt
      JOIN session_memories m
        ON m.project_id = pt.project_id
       AND m.org_id = $1
       AND ${BASE_VISIBILITY_PREDICATE}
       AND ${sparkWindow}
       AND (${sparkItemArms.join(' OR ')})
      GROUP BY pt.project_id, pt.name, pt.total, day
      ORDER BY pt.total DESC, pt.project_id, day ASC
    `;

    const [rollupResult, volumeResult, sparkResult] = await Promise.all([
      pool.query<HubRollupRow>(rollupSql, rollupParams),
      pool.query<DailyCountRow>(volumeSql, volumeParams),
      pool.query<ProjectSparkRow>(sparkSql, sparkParams),
    ]);

    return {
      ...toRollup(rollupResult.rows[0]),
      volume30d: gapFillSeries(HUB_VOLUME_WINDOW_DAYS, volumeResult.rows),
      projectSparks: buildProjectSparks(sparkResult.rows),
    };
  },
);
