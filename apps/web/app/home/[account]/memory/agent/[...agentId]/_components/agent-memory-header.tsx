'use client';

import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import type { AgentActivityRow } from '../../../_lib/server/memory.loader';

interface AgentMemoryHeaderProps {
  summary: AgentActivityRow;
}

/**
 * Resolve the most recent activity timestamp across captures and recalls,
 * mirroring agent-activity's card logic. Returns null when the identity has
 * never captured or recalled anything.
 */
function mostRecentActivity(summary: AgentActivityRow): Date | null {
  const candidates = [summary.last_captured, summary.last_recalled]
    .filter((value): value is string => value != null)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-foreground text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

export function AgentMemoryHeader({ summary }: AgentMemoryHeaderProps) {
  const { t } = useTranslation('agentguard');

  const lastActive = mostRecentActivity(summary);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('memory.captured')}
          value={summary.captured.toLocaleString()}
        />
        <KpiCard
          label={t('memory.recalled')}
          value={summary.recalled.toLocaleString()}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-normal">
              {t('memory.lastActive')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm">
              {lastActive
                ? formatDistanceToNow(lastActive, { addSuffix: true })
                : t('memory.lastActiveNever')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="font-normal">
          {summary.facts.toLocaleString()} {t('memory.facts')}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {summary.via_hook.toLocaleString()} {t('memory.viaHook')}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {summary.via_mcp.toLocaleString()} {t('memory.viaMcp')}
        </Badge>
      </div>
    </div>
  );
}
