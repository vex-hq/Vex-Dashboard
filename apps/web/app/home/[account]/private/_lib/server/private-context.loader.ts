import 'server-only';

import { cache } from 'react';

import type { ContextItem } from '~/home/[account]/_lib/server/context-stream.loader';
import type { ArtifactCardRow } from '~/home/[account]/memory/_lib/server/memory-visibility.types';
import { toCount } from '~/home/[account]/memory/_lib/server/memory-visibility.types';
import type {
  ChainLink,
  ContextView,
  ContextViewItem,
} from '~/home/[account]/projects/[projectId]/_lib/server/context-view.loader';
import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The **Private** context: the signed-in viewer's personal memories that
 * are not filed on a project.
 *
 * This is a different silo from a project page. Project pages already
 * include the viewer's own `scope='private'` rows *when those rows carry
 * a `project_id`* (see `context-view.loader` / `loadProjectMemories`).
 * Unscoped private rows (`project_id IS NULL`) have nowhere to live on
 * Hub or a project, so they disappeared from the Linear pane.
 *
 * Every query in this file hard-codes:
 *   `scope = 'private' AND user_id = <signed-in viewer> AND project_id IS NULL`
 *
 * There is no admin variant, no "as user" argument, and no project
 * membership probe. An org admin looking at Private sees their own
 * unscoped rows, exactly as everyone else does. Passing another person's
 * user id is a bug in the caller — this module only accepts the session
 * user from `loadAccountViewer`.
 *
 * Fail closed on a blank user id: `user_id = ''` returning nothing today
 * is luck, not a privacy boundary.
 */

const PRIVATE_SCOPE = 'private';
const SECTION_TYPES = ['decision', 'plan', 'fact'] as const;
const KNOWN_KINDS = new Set(['decision', 'plan', 'fact', 'note'] as const);
type KnownKind = 'decision' | 'plan' | 'fact' | 'note';

const MEMORY_STATUS_ACTIVE = 'active';
const MEMORY_STATUS_SUPERSEDED = 'superseded';
const MEMORY_VISIBLE_STATUSES = [
  MEMORY_STATUS_ACTIVE,
  MEMORY_STATUS_SUPERSEDED,
] as const;

const RECENT_LIMIT = 15;
const CHAIN_DEPTH_LIMIT = 20;
const ACTIVITY_WINDOW_DAYS = 7;
const ARTIFACT_LIST_LIMIT = 100;

const SECTION_KEY: Record<
  'decision' | 'plan' | 'fact',
  'decisions' | 'plans' | 'constraints'
> = {
  decision: 'decisions',
  plan: 'plans',
  fact: 'constraints',
};

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
  items_this_week: string;
  items_total: string;
  agents_active: string[] | null;
}

function assertUserId(userId: string): string {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error(
      'loadPrivateContext*: a non-blank user id is required. Private ' +
        'memories are readable only by their owner, so there is no ' +
        'unattributed variant.',
    );
  }

  return userId;
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

function makeBinder(params: unknown[]): (value: unknown) => string {
  return (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
}

function bindOwnerScope(
  params: unknown[],
  orgId: string,
  userId: string,
): { org: string; user: string; scope: string } {
  params.push(orgId, userId, PRIVATE_SCOPE);
  return { org: '$1', user: '$2', scope: '$3' };
}

async function loadSectionItems(
  orgId: string,
  userId: string,
): Promise<ContextItem[]> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [];
  const keys = bindOwnerScope(params, orgId, userId);
  const p = makeBinder(params);
  const types = p(SECTION_TYPES as unknown as string[]);
  const active = p(MEMORY_STATUS_ACTIVE);

  const { rows } = await pool.query<ContextViewQueryRow>(
    `
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.scope,
      m.project_id,
      NULL::text AS project_name,
      m.agent_id,
      m.user_id,
      m.created_at::text AS created_at,
      m.superseded_by
    FROM session_memories m
    WHERE m.org_id = ${keys.org}
      AND m.user_id = ${keys.user}
      AND m.scope = ${keys.scope}
      AND m.project_id IS NULL
      AND m.memory_type = ANY(${types})
      AND m.status = ${active}
      AND m.recall_hidden = FALSE
    ORDER BY m.created_at DESC
    `,
    params,
  );

  return rows.map(toItem);
}

async function loadChains(
  orgId: string,
  userId: string,
  activeIds: string[],
): Promise<Map<string, ChainLink[]>> {
  const chains = new Map<string, ChainLink[]>();
  if (activeIds.length === 0) return chains;

  const pool = getAgentGuardPool();
  const params: unknown[] = [];
  const keys = bindOwnerScope(params, orgId, userId);
  const p = makeBinder(params);
  const superseded = p(MEMORY_STATUS_SUPERSEDED);
  const ids = p(activeIds);
  const depth = p(CHAIN_DEPTH_LIMIT);

  const ownerGate = `
    m.org_id = ${keys.org}
    AND m.user_id = ${keys.user}
    AND m.scope = ${keys.scope}
    AND m.project_id IS NULL
  `;

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
      WHERE ${ownerGate}
        AND m.status = ${superseded}
        AND m.recall_hidden = FALSE
        AND m.superseded_by = ANY(${ids})

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
      WHERE ${ownerGate}
        AND m.status = ${superseded}
        AND m.recall_hidden = FALSE
        AND c.depth < ${depth}
        AND m.id != ALL(c.path)
    )
    SELECT head_id, id, content, created_at
    FROM chain
    ORDER BY head_id, created_at DESC
    `,
    params,
  );

  for (const row of rows) {
    const existing = chains.get(row.head_id);
    const link = {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
    };
    if (existing) existing.push(link);
    else chains.set(row.head_id, [link]);
  }

  return chains;
}

async function loadRecent(
  orgId: string,
  userId: string,
): Promise<ContextItem[]> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [];
  const keys = bindOwnerScope(params, orgId, userId);
  const p = makeBinder(params);
  const statuses = p(MEMORY_VISIBLE_STATUSES as unknown as string[]);
  const limit = p(RECENT_LIMIT);

  const { rows } = await pool.query<ContextViewQueryRow>(
    `
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.scope,
      m.project_id,
      NULL::text AS project_name,
      m.agent_id,
      m.user_id,
      m.created_at::text AS created_at,
      m.superseded_by
    FROM session_memories m
    WHERE m.org_id = ${keys.org}
      AND m.user_id = ${keys.user}
      AND m.scope = ${keys.scope}
      AND m.project_id IS NULL
      AND m.status = ANY(${statuses})
      AND m.recall_hidden = FALSE
    ORDER BY m.created_at DESC
    LIMIT ${limit}
    `,
    params,
  );

  return rows.map(toItem);
}

async function loadHeader(
  orgId: string,
  userId: string,
): Promise<ContextView['header']> {
  const pool = getAgentGuardPool();
  const params: unknown[] = [];
  const keys = bindOwnerScope(params, orgId, userId);
  const p = makeBinder(params);
  const statuses = p(MEMORY_VISIBLE_STATUSES as unknown as string[]);
  const window = p(String(ACTIVITY_WINDOW_DAYS));

  const { rows } = await pool.query<HeaderQueryRow>(
    `
    SELECT
      COUNT(m.id) FILTER (
        WHERE m.created_at > now() - (${window} || ' days')::interval
      ) AS items_this_week,
      COUNT(m.id) AS items_total,
      array_agg(DISTINCT m.agent_id) FILTER (
        WHERE m.agent_id IS NOT NULL
          AND m.created_at > now() - (${window} || ' days')::interval
      ) AS agents_active
    FROM session_memories m
    WHERE m.org_id = ${keys.org}
      AND m.user_id = ${keys.user}
      AND m.scope = ${keys.scope}
      AND m.project_id IS NULL
      AND m.status = ANY(${statuses})
      AND m.recall_hidden = FALSE
    `,
    params,
  );

  const row = rows[0];

  return {
    members: 0,
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
  const bySection = { decisions, plans, constraints };

  for (const item of sectionRows) {
    if (
      item.kind !== 'decision' &&
      item.kind !== 'plan' &&
      item.kind !== 'fact'
    ) {
      continue;
    }

    bySection[SECTION_KEY[item.kind]].push({
      ...item,
      replaced: chains.get(item.id) ?? [],
    });
  }

  return { decisions, plans, constraints };
}

/**
 * The viewer's unscoped private context. Always a view, never `null` —
 * there is no membership probe. Empty means the viewer has not written
 * anything personal that is not on a project.
 */
export const loadPrivateContextView = cache(
  async (orgId: string, userId: string): Promise<ContextView> => {
    const owner = assertUserId(userId);

    const [sectionRows, recent, header] = await Promise.all([
      loadSectionItems(orgId, owner),
      loadRecent(orgId, owner),
      loadHeader(orgId, owner),
    ]);

    const chains = await loadChains(
      orgId,
      owner,
      sectionRows.map((item) => item.id),
    );

    return {
      ...assembleSections(sectionRows, chains),
      recent,
      header,
    };
  },
);

/**
 * Files the viewer stored privately and not on a project. Visibility
 * comes from the memory card (`scope`/`user_id`/`project_id`), not the
 * `artifacts` row.
 */
export const loadPrivateContextArtifacts = cache(
  async (
    orgId: string,
    userId: string,
    limit = ARTIFACT_LIST_LIMIT,
  ): Promise<ArtifactCardRow[]> => {
    const pool = getAgentGuardPool();
    const owner = assertUserId(userId);

    const result = await pool.query<
      Omit<ArtifactCardRow, 'size_bytes'> & { size_bytes: string | null }
    >(
      `
      SELECT
        a.id,
        m.id AS memory_id,
        a.title,
        a.summary,
        a.kind,
        a.mime_type,
        a.size_bytes,
        m.created_at
      FROM session_memories m
      JOIN artifacts a
        ON a.id::text = m.metadata->>'artifact_id'
       AND a.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.user_id = $2
        AND m.scope = $3
        AND m.project_id IS NULL
        AND m.status = $4
        AND m.memory_type = 'artifact'
        AND a.status = 'active'
      ORDER BY m.created_at DESC
      LIMIT $5
      `,
      [orgId, owner, PRIVATE_SCOPE, MEMORY_STATUS_ACTIVE, limit],
    );

    return result.rows.map((row) => ({
      ...row,
      size_bytes: row.size_bytes === null ? null : toCount(row.size_bytes),
    }));
  },
);
