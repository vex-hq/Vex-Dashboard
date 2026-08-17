'use client';

import { useCallback, useMemo } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { displayAgent } from '../../../_lib/display-agent';
import { displayMemory } from '../../../_lib/display-memory';
import {
  ISSUE_FILTERS,
  type IssueFilter,
  type ProjectArtifact,
  type ProjectIssue,
  countActivity,
  filterProjectIssues,
  flattenProjectIssues,
  formatArtifactSize,
  isIssueKind,
  parseIssueFilter,
  pickProjectIssue,
} from '../_lib/project-issues-model';
import type { ContextView } from '../_lib/server/context-view.loader';
import {
  type ProjectAccess,
  ProjectAccessDialog,
} from './project-access-dialog';

const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  indigo: '#5e6ad2',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

const FILTER_LABEL: Record<IssueFilter, { key: string; fallback: string }> = {
  issues: { key: 'projects.issues.filterIssues', fallback: 'Issues' },
  activity: { key: 'projects.issues.filterActivity', fallback: 'Activity' },
  artifacts: { key: 'projects.issues.filterArtifacts', fallback: 'Artifacts' },
  replaced: { key: 'projects.issues.filterReplaced', fallback: 'Replaced' },
};

export interface ProjectIssuesProps {
  view: ContextView;
  artifacts?: readonly ProjectArtifact[];
  projectName: string;
  accountSlug: string;
  /** Project pages pass this; Private does not. */
  projectId?: string;
  recalled30d?: number;
  backHref?: string;
  backLabel?: string;
  memoriesHref?: string;
  memoriesLabel?: string;
  access?: ProjectAccess;
}

export function ProjectIssues({
  view,
  artifacts = [],
  projectName,
  accountSlug,
  projectId,
  recalled30d = 0,
  backHref,
  backLabel,
  memoriesHref,
  memoriesLabel,
  access,
}: ProjectIssuesProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseIssueFilter(searchParams.get('kind') ?? undefined);
  const requested = searchParams.get('item')?.trim() || undefined;
  const showingArtifacts = filter === 'artifacts';

  const issues = useMemo(() => flattenProjectIssues(view), [view]);
  const artifactIds = useMemo(
    () => new Set(artifacts.map((artifact) => artifact.id)),
    [artifacts],
  );
  const visible = useMemo(
    () => filterProjectIssues(issues, filter, artifactIds),
    [artifactIds, filter, issues],
  );
  const selectedId = showingArtifacts
    ? pickProjectIssue(artifacts, requested)
    : pickProjectIssue(visible, requested);
  const selected = visible.find((issue) => issue.id === selectedId) ?? null;
  const selectedArtifact =
    artifacts.find((artifact) => artifact.id === selectedId) ?? null;
  const unused =
    Boolean(projectId) && view.header.itemsTotal > 0 && recalled30d === 0;
  const resolvedBackHref = backHref ?? `/home/${accountSlug}`;
  const resolvedBackLabel =
    backLabel ?? t('projects.backToProjects', 'Back to Projects');
  const resolvedMemoriesHref =
    memoriesHref ??
    (projectId
      ? `/home/${accountSlug}/memory?tab=projects&project=${projectId}`
      : `/home/${accountSlug}/memory?tab=mine`);
  const resolvedMemoriesLabel =
    memoriesLabel ?? t('projects.viewMemories', 'View memories');
  const activityCount = useMemo(
    () => countActivity(issues, artifactIds),
    [artifactIds, issues],
  );
  const visibleCount = showingArtifacts ? artifacts.length : visible.length;

  const replaceParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (params.get('kind') === 'issues') params.delete('kind');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <section aria-label={projectName} className="flex min-h-0 flex-1 flex-col">
      <style>{`
        .klio-row:hover { background: rgba(255,255,255,0.035) !important; }
        .klio-row[aria-current="true"] { background: rgba(255,255,255,0.045) !important; }
        @media (prefers-reduced-motion: no-preference) {
          .klio-soft { transition: background-color 160ms ${L.ease}, border-color 160ms ${L.ease}, color 160ms ${L.ease}, opacity 180ms ${L.ease}, transform 180ms ${L.ease}; }
          .klio-peek { animation: klioPeek 200ms ${L.ease} both; }
          .klio-list { animation: klioList 180ms ${L.ease} both; }
        }
        @keyframes klioPeek {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes klioList {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={resolvedBackHref}
            className="klio-soft shrink-0 text-[13px]"
            style={{ color: L.muted }}
          >
            {resolvedBackLabel}
          </Link>
          <h1 className="truncate text-[15px] font-[510] tracking-[-0.01em] text-[#f7f8f8]">
            {projectName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {projectId && access?.canManage ? (
            <ProjectAccessDialog
              accountSlug={accountSlug}
              projectId={projectId}
              access={access}
            />
          ) : null}
          <span className="text-[12px]" style={{ color: L.muted }}>
            {visibleCount}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
        {ISSUE_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`project-issue-filter-${option}`}
            onClick={() =>
              replaceParams({
                kind: option === 'issues' ? undefined : option,
                item: pickProjectIssue(
                  option === 'artifacts'
                    ? artifacts
                    : filterProjectIssues(issues, option, artifactIds),
                  selectedId,
                ),
              })
            }
            className="klio-soft h-6 rounded-full px-2.5 text-[12px] font-[510]"
            style={{
              color: filter === option ? '#f7f8f8' : L.muted,
              background:
                filter === option ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
          >
            {t(FILTER_LABEL[option].key, FILTER_LABEL[option].fallback)}
          </button>
        ))}
        {unused ? (
          <span className="ml-auto text-[12px]" style={{ color: '#fc7840' }}>
            {t('projects.issues.notRecalled', 'Not recalled this month')}
          </span>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div key={filter} className="klio-list min-w-0 overflow-auto">
          {showingArtifacts ? (
            artifacts.length === 0 ? (
              <EmptyIssues
                filter={filter}
                activityCount={activityCount}
                t={t}
              />
            ) : (
              <ul>
                {artifacts.map((artifact) => (
                  <ArtifactRow
                    key={artifact.id}
                    artifact={artifact}
                    selected={artifact.id === selectedId}
                    onSelect={() => replaceParams({ item: artifact.id })}
                  />
                ))}
              </ul>
            )
          ) : visible.length === 0 ? (
            <EmptyIssues
              filter={filter}
              activityCount={activityCount}
              onOpenActivity={() =>
                replaceParams({
                  kind: 'activity',
                  item: pickProjectIssue(
                    filterProjectIssues(issues, 'activity', artifactIds),
                    undefined,
                  ),
                })
              }
              t={t}
            />
          ) : (
            <ul>
              {visible.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  selected={issue.id === selectedId}
                  onSelect={() => replaceParams({ item: issue.id })}
                />
              ))}
            </ul>
          )}
        </div>

        {showingArtifacts ? (
          <ArtifactPeek
            key={selectedArtifact?.id ?? 'empty'}
            artifact={selectedArtifact}
            accountSlug={accountSlug}
          />
        ) : (
          <IssuePeek
            key={selected?.id ?? 'empty'}
            issue={selected}
            accountSlug={accountSlug}
            memoriesHref={resolvedMemoriesHref}
            memoriesLabel={resolvedMemoriesLabel}
          />
        )}
      </div>
    </section>
  );
}

function EmptyIssues({
  filter,
  activityCount,
  onOpenActivity,
  t,
}: {
  filter: IssueFilter;
  activityCount: number;
  onOpenActivity?: () => void;
  t: ReturnType<typeof useTranslation<'agentguard'>>['t'];
}) {
  if (filter === 'artifacts') {
    return (
      <p className="px-4 py-10 text-[13px]" style={{ color: L.muted }}>
        {t('projects.issues.emptyArtifacts', 'No artifacts yet.')}
      </p>
    );
  }

  if (filter === 'issues' && activityCount > 0) {
    return (
      <div className="px-5 py-10" style={{ color: L.muted }}>
        <p className="text-[14px] text-[#e2e3e5]">
          {t('projects.issues.emptyIssues', 'No decisions or plans yet.')}
        </p>
        <p className="mt-2 text-[13px]">
          {t('projects.issues.activityHint', {
            count: activityCount,
            defaultValue: `${activityCount} captures are in Activity. They are not issues.`,
          })}
        </p>
        {/*
          The addendum's rule for these sections: say plainly that older rows
          are not reclassified, rather than implying the project never decided
          anything. `capture.py` hardcoded `memory_type="fact"` and
          `/capture/event` defaulted to `observation`, so every capture before
          the extraction fix (vex_engine PR #35) landed as a fact. Those rows
          stay facts; only new captures classify.
        */}
        <p
          data-testid="project-not-reclassified"
          className="mt-2 max-w-[56ch] text-[13px] leading-relaxed"
        >
          {t(
            'projects.issues.notReclassified',
            'Decisions and plans only appear for captures made since agents started classifying them. Everything captured before that was filed as a fact and is not reclassified.',
          )}
        </p>
        <button
          type="button"
          onClick={onOpenActivity}
          className="klio-soft mt-4 text-[13px]"
          style={{ color: L.ink }}
          data-testid="project-open-activity"
          disabled={!onOpenActivity}
        >
          {t('projects.issues.openActivity', 'Open activity')}
        </button>
      </div>
    );
  }

  return (
    <p className="px-4 py-10 text-[13px]" style={{ color: L.muted }}>
      {t('projects.issues.empty', 'No issues in this view.')}
    </p>
  );
}

function IssueRow({
  issue,
  selected,
  onSelect,
}: {
  issue: ProjectIssue;
  selected: boolean;
  onSelect: () => void;
}) {
  const replaced = issue.supersededBy !== null;
  const asIssue = isIssueKind(issue.kind);

  return (
    <li>
      <button
        type="button"
        data-testid={`project-issue-${issue.id}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className="klio-soft klio-row flex h-9 w-full items-center gap-3 border-l-2 px-3 text-left text-[13px]"
        style={{
          borderLeftColor: selected ? L.indigo : 'transparent',
          background: selected ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: asIssue && !replaced ? L.ink : L.muted,
        }}
      >
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border"
          style={{
            borderColor: asIssue && !replaced ? L.indigo : '#3a3c40',
            background:
              asIssue && !replaced ? 'rgba(94,106,210,0.18)' : 'transparent',
          }}
        />
        <span
          className={`min-w-0 flex-1 truncate ${replaced ? 'line-through opacity-60' : ''}`}
        >
          {displayMemory(issue.content)}
        </span>
        <span className="hidden shrink-0 sm:inline" style={{ color: L.muted }}>
          {issue.kind}
        </span>
        <span className="hidden shrink-0 md:inline" style={{ color: L.muted }}>
          {issue.agentId ? displayAgent(issue.agentId) : '---'}
        </span>
        <span className="shrink-0 tabular-nums" style={{ color: L.muted }}>
          {formatRelativeTime(issue.createdAt)}
        </span>
      </button>
    </li>
  );
}

function ArtifactRow({
  artifact,
  selected,
  onSelect,
}: {
  artifact: ProjectArtifact;
  selected: boolean;
  onSelect: () => void;
}) {
  const size = formatArtifactSize(artifact.sizeBytes);

  return (
    <li>
      <button
        type="button"
        data-testid={`project-artifact-${artifact.id}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className="klio-soft klio-row flex h-9 w-full items-center gap-3 border-l-2 px-3 text-left text-[13px]"
        style={{
          borderLeftColor: selected ? L.indigo : 'transparent',
          background: selected ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: L.ink,
        }}
      >
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-[3px] border"
          style={{
            borderColor: L.indigo,
            background: 'rgba(94,106,210,0.18)',
          }}
        />
        <span className="min-w-0 flex-1 truncate">{artifact.title}</span>
        <span className="hidden shrink-0 sm:inline" style={{ color: L.muted }}>
          {artifact.kind ?? artifact.mimeType ?? 'file'}
        </span>
        {size ? (
          <span
            className="hidden shrink-0 tabular-nums md:inline"
            style={{ color: L.muted }}
          >
            {size}
          </span>
        ) : null}
        <span className="shrink-0 tabular-nums" style={{ color: L.muted }}>
          {formatRelativeTime(artifact.createdAt)}
        </span>
      </button>
    </li>
  );
}

function IssuePeek({
  issue,
  accountSlug,
  memoriesHref,
  memoriesLabel,
}: {
  issue: ProjectIssue | null;
  accountSlug: string;
  memoriesHref: string;
  memoriesLabel: string;
}) {
  const { t } = useTranslation('agentguard');

  if (!issue) {
    return (
      <aside
        className="hidden border-l lg:block"
        style={{ borderColor: L.line }}
      />
    );
  }

  const replaced = issue.supersededBy !== null;

  return (
    <aside
      data-testid="project-issue-peek"
      className="klio-peek border-t px-5 py-5 lg:border-t-0 lg:border-l"
      style={{ borderColor: L.line }}
    >
      <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
        {issue.kind}
      </p>
      <h2
        className={`text-[16px] leading-snug font-[560] tracking-[-0.02em] ${replaced ? 'line-through opacity-60' : ''}`}
        style={{ color: L.ink }}
      >
        {displayMemory(issue.content)}
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>
          {replaced
            ? t('projects.issues.statusReplaced', 'Replaced')
            : t('projects.issues.statusActive', 'Active')}
        </Chip>
        {issue.agentId ? <Chip>{displayAgent(issue.agentId)}</Chip> : null}
        <Chip>{formatRelativeTime(issue.createdAt)}</Chip>
      </div>

      {issue.replaced.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
            {t('projects.issues.retired', 'Replaced')}
          </p>
          <ul className="flex flex-col gap-1">
            {issue.replaced.map((link) => (
              <li
                key={link.id}
                className="text-[13px] line-through opacity-60"
                style={{ color: L.muted }}
              >
                {displayMemory(link.content)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
        <Link
          href={`/home/${accountSlug}/memory/${issue.id}`}
          className="klio-soft"
          style={{ color: L.ink }}
        >
          {t('projects.issues.openMemory', 'Open memory')}
        </Link>
        <Link
          href={memoriesHref}
          className="klio-soft"
          style={{ color: L.muted }}
        >
          {memoriesLabel}
        </Link>
      </div>
    </aside>
  );
}

function ArtifactPeek({
  artifact,
  accountSlug,
}: {
  artifact: ProjectArtifact | null;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');

  if (!artifact) {
    return (
      <aside
        className="hidden border-l lg:block"
        style={{ borderColor: L.line }}
      />
    );
  }

  const size = formatArtifactSize(artifact.sizeBytes);

  return (
    <aside
      data-testid="project-artifact-peek"
      className="klio-peek border-t px-5 py-5 lg:border-t-0 lg:border-l"
      style={{ borderColor: L.line }}
    >
      <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
        {artifact.kind ?? t('projects.issues.artifactKind', 'Artifact')}
      </p>
      <h2
        className="text-[16px] leading-snug font-[560] tracking-[-0.02em]"
        style={{ color: L.ink }}
      >
        {artifact.title}
      </h2>
      {artifact.summary ? (
        <p
          className="mt-3 text-[13px] leading-relaxed"
          style={{ color: L.muted }}
        >
          {artifact.summary}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {artifact.mimeType ? <Chip>{artifact.mimeType}</Chip> : null}
        {size ? <Chip>{size}</Chip> : null}
        <Chip>{formatRelativeTime(artifact.createdAt)}</Chip>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
        <a
          href={`/api/agentguard/artifacts/${accountSlug}/${artifact.id}`}
          className="klio-soft"
          style={{ color: L.ink }}
        >
          {t('projects.issues.download', 'Download')}
        </a>
        <Link
          href={`/home/${accountSlug}/memory/${artifact.id}`}
          className="klio-soft"
          style={{ color: L.muted }}
        >
          {t('projects.issues.openMemory', 'Open memory')}
        </Link>
      </div>
    </aside>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[12px]"
      style={{ borderColor: L.line, color: L.muted }}
    >
      {children}
    </span>
  );
}
