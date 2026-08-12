import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import type { ContextItem } from '~/home/[account]/_lib/server/context-stream.loader';
import { formatRelativeTime } from '~/lib/agentguard/formatters';

import type {
  ChainLink,
  ContextView as ContextViewData,
  ContextViewHeader,
  ContextViewItem,
} from '../_lib/server/context-view.loader';

/** Cap on inline replaced-content preview before it reads as a wall of text. */
const REPLACED_CONTENT_TRUNCATE_LENGTH = 60;

/**
 * Truncates a replaced item's content for the inline supersession line.
 * Local to this component, matching `usage-strip.tsx`'s `formatBytes` — a
 * small display helper duplicated rather than promoted to a shared export
 * this task wasn't asked to create.
 */
function truncateReplacedContent(
  content: string,
  length = REPLACED_CONTENT_TRUNCATE_LENGTH,
): string {
  if (content.length <= length) return content;
  return `${content.slice(0, length)}…`;
}

/** "Mar", "Dec" — the month-abbreviated date each {@link ChainLink} shows. */
function formatMonthAbbrev(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export interface ProjectContextViewProps {
  view: ContextViewData;
}

/**
 * The project context view: a brief a new teammate — or a new agent —
 * could start from. Active decisions, plans and constraints (each with its
 * supersession history), a recent-activity feed, and a header summary.
 *
 * SERVER COMPONENT. Purely presentational — `view` is already the
 * visibility-scoped result of `loadContextView` (the page loads, this only
 * renders). No hooks: like `projects/[projectId]/page.tsx` itself, every
 * piece of static copy goes through `Trans`, never `useTranslation` (which
 * requires a client boundary `context-stream.tsx` and `usage-strip.tsx`
 * both opt into with `'use client'` — this component deliberately does not).
 *
 * Section order is fixed: Decisions, Plans, Constraints, Recent. When every
 * section AND the recent feed are empty, the four cards collapse into one
 * empty-state card rather than four cards each saying "nothing here" — the
 * brief's empty-state copy is written for a project, not a section.
 */
export function ProjectContextView({ view }: ProjectContextViewProps) {
  const { decisions, plans, constraints, recent, header } = view;

  const isEmpty =
    decisions.length === 0 &&
    plans.length === 0 &&
    constraints.length === 0 &&
    recent.length === 0;

  return (
    <div className="flex flex-col gap-6" data-testid="context-view">
      <HeaderChips header={header} />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <ItemSection
            testId="context-view-decisions"
            titleKey="agentguard:contextView.decisions"
            titleFallback="Decisions"
            emptyKey="agentguard:contextView.decisionsEmpty"
            emptyFallback="No decisions recorded yet."
            items={decisions}
          />
          <ItemSection
            testId="context-view-plans"
            titleKey="agentguard:contextView.plans"
            titleFallback="Plans"
            emptyKey="agentguard:contextView.plansEmpty"
            emptyFallback="No plans recorded yet."
            items={plans}
          />
          <ItemSection
            testId="context-view-constraints"
            titleKey="agentguard:contextView.constraints"
            titleFallback="Constraints"
            emptyKey="agentguard:contextView.constraintsEmpty"
            emptyFallback="No constraints recorded yet."
            items={constraints}
          />
          <RecentSection items={recent} />
        </>
      )}
    </div>
  );
}

function HeaderChips({ header }: { header: ContextViewHeader }) {
  return (
    <Card data-testid="context-view-header">
      <CardContent className="flex flex-wrap items-center gap-3 pt-6">
        <Badge
          variant="secondary"
          className="flex items-center gap-1 font-normal"
          data-testid="context-view-members"
        >
          <span>{header.members}</span>
          <Trans i18nKey="agentguard:contextView.members">members</Trans>
        </Badge>

        <Badge
          variant="secondary"
          className="flex items-center gap-1 font-normal"
          data-testid="context-view-items-this-week"
        >
          <span>{header.itemsThisWeek}</span>
          <Trans i18nKey="agentguard:contextView.itemsThisWeek">
            this week
          </Trans>
        </Badge>

        {header.agentsActive.length > 0 ? (
          <span
            className="flex flex-wrap items-center gap-1"
            data-testid="context-view-agents-active"
          >
            {header.agentsActive.map((agentId) => (
              <Badge
                key={agentId}
                variant="outline"
                className="font-mono text-xs whitespace-nowrap"
              >
                {agentId}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            <Trans i18nKey="agentguard:contextView.noActiveAgents">
              No active agents
            </Trans>
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card data-testid="context-view-empty">
      <CardContent className="text-muted-foreground py-10 text-center text-sm">
        <Trans i18nKey="agentguard:contextView.empty">
          Nothing set down yet — decisions and plans your agents record will
          build this page.
        </Trans>
      </CardContent>
    </Card>
  );
}

function ItemSection({
  testId,
  titleKey,
  titleFallback,
  emptyKey,
  emptyFallback,
  items,
}: {
  testId: string;
  titleKey: string;
  titleFallback: string;
  emptyKey: string;
  emptyFallback: string;
  items: ContextViewItem[];
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey={titleKey}>{titleFallback}</Trans>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey={emptyKey}>{emptyFallback}</Trans>
          </p>
        ) : (
          <dl className="flex flex-col divide-y">
            {items.map((item) => (
              <ItemEntry key={item.id} item={item} />
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function ItemEntry({ item }: { item: ContextViewItem }) {
  return (
    <div className="flex flex-col gap-1 py-3">
      <dt className="text-foreground text-sm">{item.content}</dt>

      <dd className="text-muted-foreground flex flex-col gap-1 text-xs">
        <span className="flex flex-wrap items-center gap-2">
          {item.agentId ? <span>{item.agentId}</span> : null}
          {item.projectName ? <span>{item.projectName}</span> : null}
          <span>{formatRelativeTime(item.createdAt)}</span>
        </span>

        {item.replaced.length > 0 ? (
          <span className="flex flex-col gap-0.5">
            {item.replaced.map((link) => (
              <ReplacedLine key={link.id} link={link} />
            ))}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * The inline supersession line: "replaced <old content, truncated & struck>
 * — Mar". `item.replaced` is already ordered newest-first by the loader
 * (see `context-view.loader.ts`'s `loadChains` doc), so rendering the array
 * in order reproduces that without a second sort here.
 */
function ReplacedLine({ link }: { link: ChainLink }) {
  return (
    <span
      data-testid={`replaced-line-${link.id}`}
      className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs"
    >
      <Trans i18nKey="agentguard:contextView.replacedLabel">replaced</Trans>
      <s className="line-clamp-1 opacity-70">
        {truncateReplacedContent(link.content)}
      </s>
      <span>— {formatMonthAbbrev(link.createdAt)}</span>
    </span>
  );
}

function RecentSection({ items }: { items: ContextItem[] }) {
  return (
    <Card data-testid="context-view-recent">
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:contextView.recent">Recent</Trans>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:contextView.recentEmpty">
              Nothing recent.
            </Trans>
          </p>
        ) : (
          <dl className="flex flex-col divide-y">
            {items.map((item) => (
              <RecentEntry key={item.id} item={item} />
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Superseded items render struck-through, matching `context-stream.tsx`'s
 * `StreamRow` — this feed is the same recall-shaped data, just embedded in
 * the project brief instead of the org-wide stream.
 */
function RecentEntry({ item }: { item: ContextItem }) {
  const superseded = item.supersededBy !== null;

  return (
    <div
      className="flex flex-col gap-1 py-3"
      data-superseded={superseded ? '' : undefined}
    >
      <dt
        className={cn(
          'text-foreground text-sm',
          superseded && 'text-muted-foreground line-through opacity-60',
        )}
      >
        {item.content}
      </dt>

      <dd className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
          {item.kind}
        </Badge>
        <span>{formatRelativeTime(item.createdAt)}</span>
      </dd>
    </div>
  );
}
