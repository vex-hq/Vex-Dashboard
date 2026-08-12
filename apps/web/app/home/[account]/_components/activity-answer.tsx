'use client';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';
import { cn } from '@kit/ui/utils';

import { displayAgent } from '../_lib/display-agent';
import type { DayPoint, HubSummary } from '../_lib/server/hub-summary.loader';
import { summarizeSparkline } from '../_lib/sparkline-geometry';

export interface ActivityAnswerProps {
  summary: HubSummary;
  /** Sum of project recalls in the current window. 0 with writes is the leak. */
  recalls?: number;
}

/**
 * Mission-control strip. Three numbers, who is live, the week.
 * No quote, no "Latest", no second copy of the feed.
 */
export function ActivityAnswer({
  summary,
  recalls = 0,
}: ActivityAnswerProps) {
  const { t } = useTranslation('agentguard');
  const written =
    summary.decisions7d +
    summary.plans7d +
    summary.facts7d +
    summary.notes7d;
  const live = summary.agentsActive7d.length;
  const unread = written > 0 && recalls === 0;

  return (
    <section
      aria-label={t('hub.answer.sectionLabel', 'This week at a glance')}
      className="flex flex-col gap-5"
    >
      <dl
        data-testid="hub-answer-line"
        className="grid max-w-xl grid-cols-3 gap-6"
      >
        <Stat
          testId="hub-stat-written"
          value={written}
          label={t('hub.answer.written', 'written')}
        />
        <Stat
          testId="hub-stat-recalled"
          value={recalls}
          label={t('hub.answer.recalled', 'recalled')}
          warn={unread}
        />
        <Stat
          testId="hub-stat-live"
          value={live}
          label={t('hub.answer.live', 'live')}
        />
      </dl>

      <div
        data-testid="hub-answer-meta"
        className="text-muted-foreground flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[length:var(--text-small)]">
          <span data-testid="hub-last-activity">
            {summary.lastActivityAt
              ? formatRelativeTime(summary.lastActivityAt)
              : t('hub.answer.noActivityYet', 'No activity yet')}
          </span>
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <AgentConstellation agents={summary.agentsActive7d} />
        </div>
        <VolumeHeatmap series={summary.volume30d} />
      </div>
    </section>
  );
}

function Stat({
  testId,
  value,
  label,
  warn = false,
}: {
  testId: string;
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <dd
        className={cn(
          'tabular-nums font-[590] text-[length:var(--title-5)] leading-none tracking-[var(--title-5--letter-spacing)]',
          warn ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value.toLocaleString('en-US')}
      </dd>
      <dt className="text-muted-foreground font-mono text-[length:var(--text-tiny)] tracking-[0.06em] uppercase">
        {label}
      </dt>
    </div>
  );
}

function AgentConstellation({ agents }: { agents: readonly string[] }) {
  const { t } = useTranslation('agentguard');

  if (agents.length === 0) {
    return (
      <span data-testid="hub-agents-active">
        {t('hub.answer.agentsActive', {
          count: 0,
          defaultValue: '0 agents active',
        })}
      </span>
    );
  }

  return (
    <span
      data-testid="hub-agents-active"
      aria-label={t('hub.answer.agentsActive', {
        count: agents.length,
        defaultValue: `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} active`,
      })}
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      {agents.map((agent) => (
        <span key={agent} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-primary size-1.5 rounded-full" />
          <span>{displayAgent(agent)}</span>
        </span>
      ))}
    </span>
  );
}

function VolumeHeatmap({ series }: { series: readonly DayPoint[] }) {
  const week = series.slice(-7);
  const max = week.reduce((best, point) => Math.max(best, point.count), 0);
  const label = summarizeSparkline(week, 7);

  return (
    <div role="img" aria-label={label} className="flex h-6 max-w-sm gap-1">
      {week.map((point) => {
        const filled = point.count > 0 && max > 0;

        return (
          <div
            key={point.day}
            title={`${point.day}: ${point.count}`}
            className={
              filled ? 'bg-foreground min-w-0 flex-1' : 'bg-border min-w-0 flex-1'
            }
            style={
              filled ? { opacity: 0.35 + 0.65 * (point.count / max) } : undefined
            }
          />
        );
      })}
    </div>
  );
}
