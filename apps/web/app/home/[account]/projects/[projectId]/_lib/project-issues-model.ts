import type { ContextItem } from '../../../_lib/server/context-stream.loader';
import type {
  ContextView,
  ContextViewItem,
} from './server/context-view.loader';

export const ISSUE_FILTERS = [
  'issues',
  'activity',
  'artifacts',
  'replaced',
] as const;

export type IssueFilter = (typeof ISSUE_FILTERS)[number];

const ISSUE_KINDS = new Set(['decision', 'plan']);
const ACTIVITY_KINDS = new Set(['fact', 'note', 'other']);

export interface ProjectIssue {
  id: string;
  kind: ContextItem['kind'];
  content: string;
  agentId: string | null;
  createdAt: string;
  supersededBy: string | null;
  replaced: ContextViewItem['replaced'];
}

/**
 * One visible artifact. `id` is the memory card (`session_memories.id`),
 * not `artifacts.id` — download and peek are keyed on the card that
 * carries scope and owner.
 */
export interface ProjectArtifact {
  id: string;
  artifactId: string;
  title: string;
  summary: string | null;
  kind: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export function parseIssueFilter(raw: string | undefined): IssueFilter {
  if (raw === 'activity' || raw === 'replaced' || raw === 'artifacts') {
    return raw;
  }
  return 'issues';
}

export function isIssueKind(kind: ProjectIssue['kind']): boolean {
  return ISSUE_KINDS.has(kind);
}

/**
 * One row per visible memory. Sections + recent are merged so a decision
 * that also appears in Recent is not listed twice.
 */
export function flattenProjectIssues(view: ContextView): ProjectIssue[] {
  const byId = new Map<string, ProjectIssue>();

  const take = (item: ContextItem, replaced: ProjectIssue['replaced'] = []) => {
    const existing = byId.get(item.id);
    if (existing) {
      if (existing.replaced.length === 0 && replaced.length > 0) {
        existing.replaced = replaced;
      }
      return;
    }

    byId.set(item.id, {
      id: item.id,
      kind: item.kind,
      content: item.content,
      agentId: item.agentId,
      createdAt: item.createdAt,
      supersededBy: item.supersededBy,
      replaced,
    });
  };

  for (const item of view.decisions) take(item, item.replaced);
  for (const item of view.plans) take(item, item.replaced);
  for (const item of view.constraints) take(item, item.replaced);
  for (const item of view.recent) take(item);

  return [...byId.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function filterProjectIssues(
  issues: readonly ProjectIssue[],
  filter: IssueFilter,
  artifactIds: ReadonlySet<string> = new Set(),
): ProjectIssue[] {
  switch (filter) {
    case 'activity':
      return issues.filter(
        (issue) => ACTIVITY_KINDS.has(issue.kind) && !artifactIds.has(issue.id),
      );
    case 'replaced':
      return issues.filter((issue) => issue.supersededBy !== null);
    case 'artifacts':
      return [];
    default:
      return issues.filter((issue) => ISSUE_KINDS.has(issue.kind));
  }
}

export function toProjectArtifacts(
  rows: ReadonlyArray<{
    id: string;
    memory_id: string;
    title: string;
    summary: string | null;
    kind: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }>,
): ProjectArtifact[] {
  return rows.map((row) => ({
    id: row.memory_id,
    artifactId: row.id,
    title: row.title,
    summary: row.summary,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

export function formatArtifactSize(size: number | null): string | null {
  if (size === null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function countActivity(
  issues: readonly ProjectIssue[],
  artifactIds: ReadonlySet<string> = new Set(),
): number {
  return issues.filter(
    (issue) => ACTIVITY_KINDS.has(issue.kind) && !artifactIds.has(issue.id),
  ).length;
}

export function pickProjectIssue(
  issues: readonly { id: string }[],
  requestedId: string | undefined,
): string | undefined {
  if (requestedId && issues.some((issue) => issue.id === requestedId)) {
    return requestedId;
  }
  return issues[0]?.id;
}
