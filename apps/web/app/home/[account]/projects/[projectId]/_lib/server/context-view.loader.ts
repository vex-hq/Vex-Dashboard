import 'server-only';

import { cache } from 'react';

import type { ContextItem } from '~/home/[account]/_lib/server/context-stream.loader';
import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The project **context view**: this project's active decisions, plans and
 * constraints — each with its supersession history — plus a recent-activity
 * feed and a header summary.
 *
 * MEMBERSHIP IS DECIDED IN SQL, NEVER IN TS. `loadContextView` runs a
 * membership probe as its own first query, before any memory content is
 * touched. An empty result returns `null` immediately and no further query
 * runs — the caller's page 404s. There is no code path that fetches rows
 * more broadly and then filters them by membership in TypeScript.
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): the probe checks
 * `project_members.project_id = … AND project_members.user_id = …`, joined
 * to `projects` to bind the org boundary that `project_members` alone
 * cannot express (it carries no `org_id` column) — without that join, a
 * project id that happens to exist in another org would falsely read as
 * "member". This loader used to also accept a `ProjectAccess` union with an
 * `{ kind: 'admin' }` branch that skipped the membership row entirely
 * (`projects.id = … AND projects.org_id = …` only). That branch is gone: an
 * org admin who is not a project member now gets the same `null` — and the
 * same 404 — as anyone else. See `project-memory.loader.ts`'s file header
 * for the full rationale.
 *
 * Once membership is established, every other query is scoped by
 * `org_id = $1 AND project_id = $2` and carries the visibility arms
 * `visibilityArms` builds. Item visibility is the same ladder the Hub
 * stream uses (`context-stream.loader.ts` / `hub-summary.loader.ts`):
 *
 *   - org arm — always
 *   - own-private arm — always, keyed on the signed-in viewer. The engine
 *     auto-creates projects on first write without enrolling a
 *     `project_members` row and lands hook/curator captures at
 *     `scope='private'` with `project_id` set (see `loadProjectPulse`'s
 *     2026-08-12 incident note) — this arm is what keeps those visible to
 *     their own author.
 *   - project arm — `EXISTS project_members`, always
 *
 * `status IN ('active', 'superseded') AND recall_hidden = FALSE` matches
 * `context-stream.loader.ts`'s filter exactly: this view is recall-shaped
 * like the stream, and `recall_hidden` opting a memory out of recall is a
 * deliberate product decision (see project CLAUDE.md / memory contracts).
 * Sections (`decisions` / `plans` / `constraints`) additionally require
 * `status = 'active'` — only the chain query reaches into `superseded` rows,
 * and only as predecessors of an active row.
 */

const SECTION_TYPES = ['decision', 'plan', 'fact'] as const;
type SectionType = (typeof SECTION_TYPES)[number];

const SECTION_KEY: Record<SectionType, 'decisions' | 'plans' | 'constraints'> =
  {
    decision: 'decisions',
    plan: 'plans',
    fact: 'constraints',
  };

const KNOWN_KINDS = new Set(['decision', 'plan', 'fact', 'note'] as const);
type KnownKind = 'decision' | 'plan' | 'fact' | 'note';

const MEMORY_STATUS_ACTIVE = 'active';
const MEMORY_STATUS_SUPERSEDED = 'superseded';
const MEMORY_VISIBLE_STATUSES = [
  MEMORY_STATUS_ACTIVE,
  MEMORY_STATUS_SUPERSEDED,
] as const;

/** Newest N items of any type shown in the "recent" feed. */
const RECENT_LIMIT = 15;
/** Predecessors walked per supersession chain, oldest cutoff. */
const CHAIN_DEPTH_LIMIT = 20;
/** Window for the header's "active this week" aggregate. */
const ACTIVITY_WINDOW_DAYS = 7;

export interface ChainLink {
  id: string;
  content: string;
  createdAt: string; // ISO
}

export interface ContextViewItem extends ContextItem {
  replaced: ChainLink[]; // predecessors, newest-first; [] if never superseded
}

export interface ContextViewHeader {
  members: number;
  agentsActive: string[];
  itemsThisWeek: number;
  /** Visible items of any type, same filter as `recent`, no time window. */
  itemsTotal: number;
}

export interface ContextView {
  decisions: ContextViewItem[];
  plans: ContextViewItem[];
  constraints: ContextViewItem[];
  recent: ContextItem[];
  header: ContextViewHeader;
}

interface ContextViewQueryRow {
  id: string;
  memory_type: string;
  content: string;
  scope: string;
  project_id: string | null;
  project_name: string | null;
  agent_id: string | null;
  user_id: string | null;
  created_at: string;
  superseded_by: string | null;
}

interface ChainQueryRow {
  head_id: string;
  id: string;
  content: string;
  created_at: string;
}

interface HeaderQueryRow {
  members: string;
  items_this_week: string;
  items_total: string;
  agents_active: string[] | null;
}

function isKnownKind(kind: string): kind is KnownKind {
  return KNOWN_KINDS.has(kind as KnownKind);
}

function toItem(row: ContextViewQueryRow): ContextItem {
  return {
    id: row.id,
    kind: isKnownKind(row.memory_type) ? row.memory_type : 'other',
    content: row.content,
    scope: row.scope,
    projectId: row.project_id,
    projectName: row.project_name,
    agentId: row.agent_id,
    userId: row.user_id,
    createdAt: row.created_at,
    supersededBy: row.superseded_by,
  };
}

function toChainLink(row: ChainQueryRow): ChainLink {
  return { id: row.id, content: row.content, createdAt: row.created_at };
}

/** Bind helper: pushes a value onto `params`, returns its `$N` placeholder. */
function makeBinder(params: unknown[]): (value: unknown) => string {
  return (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
}

/**
 * The visibility arms every scoped query below ORs together.
 *
 * `params`/`p` are the caller's own binder. The private arm binds the
 * viewer's user id; the project arm binds it again for the
 * `EXISTS project_members` predicate (same value, second placeholder —
 * never interpolated).
 */
function visibilityArms(
  p: (value: unknown) => string,
  viewerUserId: string,
): string[] {
  const privateArm = `(m.scope = 'private' AND m.user_id = ${p(viewerUserId)})`;
  const memberParam = p(viewerUserId);

  return [
    `(m.scope = 'org')`,
    privateArm,
    `(m.scope = 'project' AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = m.project_id AND pm.user_id = ${memberParam}
    ))`,
  ];
}

function assertViewerUserId(viewerUserId: string): string {
  if (viewerUserId.trim().length === 0) {
    throw new Error('context view: viewer user id is required.');
  }

  return viewerUserId;
}

/**
 * Whether `viewerUserId` is a member of `projectId` within `orgId`.
 *
 * This IS the membership boundary for the whole view — see file header. A
 * `false` result must short-circuit every caller before any memory content is
 * queried. No admin branch: membership is the only path in.
 */
async function probeMembership(
  orgId: string,
  projectId: string,
  viewerUserId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();

  const { rows } = await pool.query<{ one: number }>(
    `
    SELECT 1 AS one
    FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.project_id = $1
      AND pm.user_id = $2
      AND p.org_id = $3
    LIMIT 1
    `,
    [projectId, viewerUserId, orgId],
  );

  return rows.length > 0;
}

/** Active decisions/plans/constraints for this project, newest first. */
async function loadSectionItems(
  orgId: string,
  projectId: string,
  viewerUserId: string,
): Promise<ContextItem[]> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [orgId, projectId];
  const p = makeBinder(params);

  const sectionTypesParam = p(SECTION_TYPES as unknown as string[]);
  const activeParam = p(MEMORY_STATUS_ACTIVE);
  const arms = visibilityArms(p, viewerUserId);

  const { rows } = await pool.query<ContextViewQueryRow>(
    `
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.scope,
      m.project_id,
      pr.display_name AS project_name,
      m.agent_id,
      m.user_id,
      m.created_at::text AS created_at,
      m.superseded_by
    FROM session_memories m
    LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
    WHERE m.org_id = $1
      AND m.project_id = $2
      AND m.memory_type = ANY(${sectionTypesParam})
      AND m.status = ${activeParam}
      AND m.recall_hidden = FALSE
      AND (${arms.join(' OR ')})
    ORDER BY m.created_at DESC
    `,
    params,
  );

  return rows.map(toItem);
}

/**
 * Predecessor chains for `activeIds`, one recursive walk of `superseded_by`
 * per active id, capped at {@link CHAIN_DEPTH_LIMIT} predecessors each.
 *
 * `superseded_by` is expected to be acyclic — a memory can only be replaced
 * once, by construction of the supersession write path. The `path` array
 * accumulated below (`ARRAY[m.id]` seeded in the base term, `c.path ||
 * m.id` extended in the recursive term, `m.id != ALL(c.path)` guarding
 * entry) is defense against write-path corruption, not an expected case:
 * without it, a cyclic `superseded_by` chain would recurse until
 * {@link CHAIN_DEPTH_LIMIT} silently, emitting the same rows over and over
 * as `ChainLink` duplicates rather than erroring or terminating early. The
 * depth cap alone bounds the row count but does not prevent duplicates; the
 * cycle guard does.
 *
 * Returns a map keyed by the active (head) id, each value newest-predecessor
 * first — the `ORDER BY head_id, created_at DESC` below groups rows by chain
 * and orders each group by recency, so grouping while iterating in that order
 * reproduces it without a second sort pass.
 */
async function loadChains(
  orgId: string,
  projectId: string,
  viewerUserId: string,
  activeIds: string[],
): Promise<Map<string, ChainLink[]>> {
  const chains = new Map<string, ChainLink[]>();

  if (activeIds.length === 0) {
    return chains;
  }

  const pool = getAgentGuardPool();
  const params: unknown[] = [orgId, projectId];
  const p = makeBinder(params);

  const supersededParam = p(MEMORY_STATUS_SUPERSEDED);
  const activeIdsParam = p(activeIds);
  const depthLimitParam = p(CHAIN_DEPTH_LIMIT);
  const arms = visibilityArms(p, viewerUserId);
  const armsSql = arms.join(' OR ');

  const { rows } = await pool.query<ChainQueryRow>(
    `
    WITH RECURSIVE chain AS (
      SELECT
        m.id,
        m.content,
        m.created_at::text AS created_at,
        m.superseded_by AS head_id,
        1 AS depth,
        ARRAY[m.id] AS path
      FROM session_memories m
      WHERE m.org_id = $1
        AND m.project_id = $2
        AND m.status = ${supersededParam}
        AND m.recall_hidden = FALSE
        AND m.superseded_by = ANY(${activeIdsParam})
        AND (${armsSql})

      UNION ALL

      SELECT
        m.id,
        m.content,
        m.created_at::text AS created_at,
        c.head_id,
        c.depth + 1,
        c.path || m.id
      FROM session_memories m
      JOIN chain c ON m.superseded_by = c.id
      WHERE m.org_id = $1
        AND m.project_id = $2
        AND m.status = ${supersededParam}
        AND m.recall_hidden = FALSE
        AND c.depth < ${depthLimitParam}
        AND m.id != ALL(c.path)
        AND (${armsSql})
    )
    SELECT head_id, id, content, created_at
    FROM chain
    ORDER BY head_id, created_at DESC
    `,
    params,
  );

  for (const row of rows) {
    const link = toChainLink(row);
    const existing = chains.get(row.head_id);
    if (existing) {
      existing.push(link);
    } else {
      chains.set(row.head_id, [link]);
    }
  }

  return chains;
}

/** Newest {@link RECENT_LIMIT} items of ANY type, including superseded. */
async function loadRecent(
  orgId: string,
  projectId: string,
  viewerUserId: string,
): Promise<ContextItem[]> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [orgId, projectId];
  const p = makeBinder(params);

  const statusesParam = p(MEMORY_VISIBLE_STATUSES as unknown as string[]);
  const arms = visibilityArms(p, viewerUserId);
  const limitParam = p(RECENT_LIMIT);

  const { rows } = await pool.query<ContextViewQueryRow>(
    `
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.scope,
      m.project_id,
      pr.display_name AS project_name,
      m.agent_id,
      m.user_id,
      m.created_at::text AS created_at,
      m.superseded_by
    FROM session_memories m
    LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
    WHERE m.org_id = $1
      AND m.project_id = $2
      AND m.status = ANY(${statusesParam})
      AND m.recall_hidden = FALSE
      AND (${arms.join(' OR ')})
    ORDER BY m.created_at DESC
    LIMIT ${limitParam}
    `,
    params,
  );

  return rows.map(toItem);
}

/** Member count, agents active and item volume over the last week. */
async function loadHeader(
  orgId: string,
  projectId: string,
  viewerUserId: string,
): Promise<ContextViewHeader> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [orgId, projectId];
  const p = makeBinder(params);

  const statusesParam = p(MEMORY_VISIBLE_STATUSES as unknown as string[]);
  const arms = visibilityArms(p, viewerUserId);
  const windowParam = p(String(ACTIVITY_WINDOW_DAYS));

  const { rows } = await pool.query<HeaderQueryRow>(
    `
    SELECT
      (
        SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = $2
      ) AS members,
      COUNT(m.id) FILTER (
        WHERE m.created_at > now() - (${windowParam} || ' days')::interval
      ) AS items_this_week,
      COUNT(m.id) AS items_total,
      array_agg(DISTINCT m.agent_id) FILTER (
        WHERE m.agent_id IS NOT NULL
          AND m.created_at > now() - (${windowParam} || ' days')::interval
      ) AS agents_active
    FROM session_memories m
    WHERE m.org_id = $1
      AND m.project_id = $2
      AND m.status = ANY(${statusesParam})
      AND m.recall_hidden = FALSE
      AND (${arms.join(' OR ')})
    `,
    params,
  );

  const row = rows[0];

  return {
    members: parseInt(row?.members ?? '0', 10) || 0,
    itemsThisWeek: parseInt(row?.items_this_week ?? '0', 10) || 0,
    itemsTotal: parseInt(row?.items_total ?? '0', 10) || 0,
    agentsActive: row?.agents_active ?? [],
  };
}

function assembleSections(
  sectionRows: ContextItem[],
  chains: Map<string, ChainLink[]>,
): Pick<ContextView, 'decisions' | 'plans' | 'constraints'> {
  const decisions: ContextViewItem[] = [];
  const plans: ContextViewItem[] = [];
  const constraints: ContextViewItem[] = [];

  const bySection: Record<
    'decisions' | 'plans' | 'constraints',
    ContextViewItem[]
  > = { decisions, plans, constraints };

  for (const item of sectionRows) {
    if (
      item.kind !== 'decision' &&
      item.kind !== 'plan' &&
      item.kind !== 'fact'
    ) {
      continue; // only the three section kinds land here; guarded by SQL too
    }

    const key = SECTION_KEY[item.kind];
    bySection[key].push({ ...item, replaced: chains.get(item.id) ?? [] });
  }

  return { decisions, plans, constraints };
}

/**
 * The full project context view, or `null` when `viewerUserId` may not see
 * `projectId` — see file header for the membership contract.
 */
export const loadContextView = cache(
  async (
    orgId: string,
    projectId: string,
    viewerUserId: string,
  ): Promise<ContextView | null> => {
    const viewer = assertViewerUserId(viewerUserId);
    const isMember = await probeMembership(orgId, projectId, viewer);

    if (!isMember) {
      return null;
    }

    const [sectionRows, recent, header] = await Promise.all([
      loadSectionItems(orgId, projectId, viewer),
      loadRecent(orgId, projectId, viewer),
      loadHeader(orgId, projectId, viewer),
    ]);

    const activeIds = sectionRows.map((item) => item.id);
    const chains = await loadChains(orgId, projectId, viewer, activeIds);

    const { decisions, plans, constraints } = assembleSections(
      sectionRows,
      chains,
    );

    return { decisions, plans, constraints, recent, header };
  },
);
