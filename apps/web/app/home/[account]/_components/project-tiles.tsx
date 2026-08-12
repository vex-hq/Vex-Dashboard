'use client';

import Link from 'next/link';

import { useTranslation } from 'react-i18next';

import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import type { ProjectUsage } from '../_lib/server/context-usage.loader';
import type { ProjectSpark } from '../_lib/server/hub-summary.loader';
import { Sparkline } from './sparkline';

const MIN_TAP_TARGET_CLASS = 'min-h-11';

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
  accountSlug: string;
}

/**
 * Full-width pulse list. Name left, spark and figures right.
 * The 3-column stretch left a dead ocean between three names.
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
      <p className="text-muted-foreground text-[length:var(--text-small)]">
        <Trans i18nKey="agentguard:projectTiles.empty">
          No project activity in the last 30 days.
        </Trans>
      </p>
    );
  }

  return (
    <ul
      data-testid="project-tiles-grid"
      className="border-border divide-y divide-border/80 border-y"
    >
      {sparks.map((spark) => (
        <li key={spark.projectId}>
          <ProjectTile
            spark={spark}
            usage={usageByProject.get(spark.projectId) ?? null}
            accountSlug={accountSlug}
            t={t}
          />
        </li>
      ))}
    </ul>
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
  const memories = usage?.memories30d ?? 0;
  const recalls = usage?.recalls30d ?? 0;
  const unread = memories > 0 && recalls === 0;

  return (
    <Link
      href={`/home/${accountSlug}/projects/${spark.projectId}`}
      data-testid="project-tile"
      className={cn(
        'hover:bg-accent/40 focus-visible:ring-ring flex items-center gap-4 py-3 transition-colors duration-150 ease-[var(--ease-standard)] focus-visible:ring-2 focus-visible:outline-none',
        MIN_TAP_TARGET_CLASS,
      )}
    >
      <span className="text-foreground min-w-0 flex-1 truncate font-[510]">
        {spark.name}
      </span>

      <Sparkline
        series={spark.series}
        windowDays={30}
        width={88}
        height={24}
        strokeClassName="stroke-foreground/40"
        className="hidden h-6 w-[88px] shrink-0 sm:block"
      />

      <span className="text-muted-foreground flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[length:var(--text-tiny)]">
        <TileStat
          testId={`memories-30d-${spark.projectId}`}
          label={t('projectTiles.written', 'written')}
          value={memories.toLocaleString('en-US')}
        />
        <TileStat
          testId={`recalls-30d-${spark.projectId}`}
          label={t('projectTiles.recalled', 'recalled')}
          value={recalls.toLocaleString('en-US')}
          warn={unread}
        />
        <TileStat
          testId={`storage-${spark.projectId}`}
          label={t('projectTiles.storage', 'storage')}
          value={formatBytes(usage?.storageBytes ?? 0)}
        />
      </span>
    </Link>
  );
}

function TileStat({
  testId,
  label,
  value,
  warn = false,
}: {
  testId: string;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <span data-testid={testId} className="flex items-baseline gap-1">
      <span
        className={cn(
          'font-mono text-[length:var(--text-small)] tabular-nums',
          warn ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}
