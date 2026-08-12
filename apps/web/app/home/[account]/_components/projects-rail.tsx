'use client';

import Link from 'next/link';

import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import type { ProjectPulse } from '../_lib/server/context-stream.loader';

/**
 * Minimum interactive tap target (44px) — matches `context-stream.tsx`'s
 * mobile-tap lesson: the whole card is a link, so it must clear this on its
 * own even though nothing inside it is a separate button.
 */
const MIN_TAP_TARGET_CLASS = 'min-h-11';

export interface ProjectsRailProps {
  pulses: ProjectPulse[];
  /** The team account's URL slug, to build each card's project link. */
  accountSlug: string;
}

/**
 * "What's moving" rail: one card per project the viewer can see, driven
 * entirely by {@link ProjectPulse} rows from `loadProjectPulse` (Task 1).
 *
 * Purely presentational — `pulses` is already the visibility-scoped,
 * 7-day-windowed result of the loader. This component never re-derives or
 * re-filters it.
 */
export function ProjectsRail({ pulses, accountSlug }: ProjectsRailProps) {
  const { t } = useTranslation('agentguard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:projectsRail.title">
            What&apos;s moving
          </Trans>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {pulses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('projectsRail.empty', 'No project activity in the last 7 days.')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pulses.map((pulse) => (
              <ProjectPulseCard
                key={pulse.projectId}
                pulse={pulse}
                accountSlug={accountSlug}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectPulseCard({
  pulse,
  accountSlug,
}: {
  pulse: ProjectPulse;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');

  return (
    <li>
      <Link
        href={`/home/${accountSlug}/projects/${pulse.projectId}`}
        data-testid="project-pulse-card"
        className={cn(
          'hover:bg-muted/50 flex flex-col gap-2 rounded-md border p-3 transition-colors',
          MIN_TAP_TARGET_CLASS,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{pulse.name}</span>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 font-normal"
          >
            <span>{pulse.itemsThisWeek}</span>
            <span>{t('projectsRail.itemsThisWeek', 'this week')}</span>
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{formatRelativeTime(pulse.lastItemAt)}</span>

          {pulse.agentsActive.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1">
              {pulse.agentsActive.map((agentId) => (
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
            <span>{t('projectsRail.noActiveAgents', 'No active agents')}</span>
          )}
        </div>
      </Link>
    </li>
  );
}
