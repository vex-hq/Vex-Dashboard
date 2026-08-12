'use client';

import Link from 'next/link';

import { useTranslation } from 'react-i18next';

import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { formatTokens } from '~/lib/agentguard/formatters';

import type { ProjectUsage } from '../_lib/server/context-usage.loader';
import type { ProjectSpark } from '../_lib/server/hub-summary.loader';
import { Sparkline } from './sparkline';

/**
 * Minimum interactive tap target (44px) — matches `context-stream.tsx`'s
 * mobile-tap lesson: the whole card is a link, so it must clear this on its
 * own even though nothing inside it is a separate button.
 */
const MIN_TAP_TARGET_CLASS = 'min-h-11';

/**
 * Carried near-verbatim from `context-usage.loader.ts`'s HONESTY NOTE and
 * from the retired `usage-strip.tsx` (this component is its Hub-page
 * replacement — the "wide numeric usage table" the redesign calls out):
 * result ids are not logged, so exact served-tokens is impossible without an
 * engine change. This copy is the one place a Hub viewer learns why the
 * number next to it says "estimated" instead of a bare count.
 */
const ESTIMATE_TOOLTIP_COPY =
  "Klio doesn't see your agents' own token bills; this is recalls × results × average memory size.";

/**
 * Human-readable byte size. Mirrors the local `formatBytes` helper
 * duplicated in `usage-strip.tsx`, `memory/_components/team-tab.tsx` and
 * `artifact-cards.tsx` — same ladder, same rounding.
 */
function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface ProjectTilesProps {
  sparks: ProjectSpark[];
  usage: ProjectUsage[];
  /** The team account's URL slug, to build each card's project link. */
  accountSlug: string;
}

/**
 * Band 2 — project tiles: a responsive grid of up to 6 cards (already capped
 * by `loadHubSummary`'s `HUB_PROJECT_SPARK_LIMIT`), replacing the wide
 * numeric usage table (`usage-strip.tsx`, still used standalone on the
 * project detail page but retired from the Hub — the least scannable thing
 * on the old page). Each card is a single link to the project.
 *
 * `sparks` (from `loadHubSummary`) drives which projects appear and their
 * 30-day series; `usage` (from `loadContextUsage`, the page's existing
 * loader) is merged in by `projectId` for the memories/recalls/storage
 * micro-stats and the honesty-canary token estimate. A project with a spark
 * but no usage row (e.g. all its 30-day activity was capture-only, so it
 * never appears in `brain_recall_events`) still renders — its stats just
 * read zero/est. 0, never "missing".
 */
export function ProjectTiles({
  sparks,
  usage,
  accountSlug,
}: ProjectTilesProps) {
  const { t } = useTranslation('agentguard');
  const usageByProject = new Map(
    usage
      .filter((row): row is ProjectUsage & { projectId: string } =>
        Boolean(row.projectId),
      )
      .map((row) => [row.projectId, row]),
  );

  if (sparks.length === 0) {
    return (
      <div className="border-border bg-card rounded-lg border p-6 text-center">
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="agentguard:projectTiles.empty">
            No project activity in the last 30 days.
          </Trans>
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="project-tiles-grid"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {sparks.map((spark) => (
        <ProjectTile
          key={spark.projectId}
          spark={spark}
          usage={usageByProject.get(spark.projectId) ?? null}
          accountSlug={accountSlug}
          t={t}
        />
      ))}
    </div>
  );
}

function ProjectTile({
  spark,
  usage,
  accountSlug,
  t,
}: {
  spark: ProjectSpark;
  usage: ProjectUsage | null;
  accountSlug: string;
  t: ReturnType<typeof useTranslation<'agentguard'>>['t'];
}) {
  return (
    <Link
      href={`/home/${accountSlug}/projects/${spark.projectId}`}
      data-testid="project-tile"
      className={cn(
        'border-border bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-[var(--shadow-hard-sm)]',
        'transition-[transform,box-shadow] duration-150 ease-[var(--ease-standard)]',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow-hard)]',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        MIN_TAP_TARGET_CLASS,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground truncate font-[510]">
          {spark.name}
        </span>
      </div>

      <Sparkline
        series={spark.series}
        windowDays={30}
        width={240}
        height={36}
        className="w-full"
      />

      <div className="text-muted-foreground grid grid-cols-3 gap-2 text-[length:var(--text-tiny)]">
        <TileStat
          testId={`memories-30d-${spark.projectId}`}
          label={t('projectTiles.memories30d', 'Memories')}
          value={(usage?.memories30d ?? 0).toLocaleString('en-US')}
        />
        <TileStat
          testId={`recalls-30d-${spark.projectId}`}
          label={t('projectTiles.recalls30d', 'Recalls')}
          value={(usage?.recalls30d ?? 0).toLocaleString('en-US')}
        />
        <TileStat
          testId={`storage-${spark.projectId}`}
          label={t('projectTiles.storage', 'Storage')}
          value={formatBytes(usage?.storageBytes ?? 0)}
        />
      </div>

      <EstimatedTokens
        testId={`est-context-tokens-${spark.projectId}`}
        tokens={usage?.estContextTokens30d ?? 0}
      />
    </Link>
  );
}

function TileStat({
  testId,
  label,
  value,
}: {
  testId: string;
  label: string;
  value: string;
}) {
  return (
    <span data-testid={testId} className="flex flex-col gap-0.5">
      <span className="text-foreground font-mono text-[length:var(--text-small)] tabular-nums">
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}

/**
 * The honesty canary, moved here (behavior and copy) from the retired
 * `usage-strip.tsx`: "estimated" sits directly next to the token figure,
 * every render, with no path that omits it. Deliberately the smallest/
 * quietest element on the card — the redesign asks for three headline
 * micro-stats, and this is the honesty label for the fourth, lower-
 * confidence figure, not a fourth headline stat.
 *
 * Unlike `usage-strip.tsx`'s click-to-reveal disclosure, the explanation
 * copy is always rendered rather than gated behind a toggle: the whole tile
 * is itself an `<a>` (the card's outer `Link`), and a nested `<button>`
 * inside an anchor is invalid HTML and unreliable across browsers/hydration
 * — so there is no interactive element to toggle it here. Always-visible
 * text is simpler and satisfies "no hover-only affordances" trivially.
 */
function EstimatedTokens({
  testId,
  tokens,
}: {
  testId: string;
  tokens: number;
}) {
  const { t } = useTranslation('agentguard');

  return (
    <div
      data-testid={testId}
      className="text-muted-foreground flex flex-col gap-0.5 border-t pt-2 text-[length:var(--text-tiny)]"
    >
      <div className="flex items-center gap-1">
        <span className="font-mono tabular-nums">{formatTokens(tokens)}</span>
        <span>
          {t('projectTiles.estimatedTokens', 'estimated context tokens')}
        </span>
      </div>
      <p className="opacity-75">
        {t('usageStrip.estimateTooltip', ESTIMATE_TOOLTIP_COPY)}
      </p>
    </div>
  );
}
