'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Clock,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';
import { Trans } from '@kit/ui/trans';

import { PaginationBar } from '~/components/pagination-bar';
import { TimeRangeSelect } from '~/components/time-range-select';
import { formatConfidence } from '~/lib/agentguard/formatters';
import type {
  AgentFleetRow,
  ExecutionsOverTime,
  FleetKpis,
  FleetSessionSummary,
} from '~/lib/agentguard/types';
import { useAgentGuardUpdates } from '~/lib/agentguard/use-agentguard-updates';

interface FleetHealthChartsProps {
  kpis: FleetKpis;
  agents: AgentFleetRow[];
  executionsOverTime: ExecutionsOverTime[];
  recentSessions: FleetSessionSummary[];
  accountSlug: string;
  page: number;
  pageCount: number;
}

const executionsChartConfig = {
  pass: {
    label: 'Pass',
    color: 'var(--chart-1)',
  },
  flag: {
    label: 'Flag',
    color: 'var(--chart-3)',
  },
  block: {
    label: 'Block',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

export default function FleetHealthCharts({
  kpis,
  agents,
  executionsOverTime,
  recentSessions,
  accountSlug,
  page,
  pageCount,
}: FleetHealthChartsProps) {
  useAgentGuardUpdates({ accountSlug });

  const chartData = executionsOverTime.map((row) => ({
    bucket: format(new Date(row.bucket), 'MMM d HH:mm'),
    pass: row.pass_count,
    flag: row.flag_count,
    block: row.block_count,
  }));

  // Group sessions by agent_id for O(1) lookup
  const sessionsByAgent = useMemo(() => {
    const map = new Map<string, FleetSessionSummary[]>();

    for (const s of recentSessions) {
      const list = map.get(s.agent_id);

      if (list) {
        list.push(s);
      } else {
        map.set(s.agent_id, [s]);
      }
    }

    return map;
  }, [recentSessions]);

  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-4 pb-36 duration-500'
      }
    >
      <div className="flex items-center justify-end">
        <TimeRangeSelect />
      </div>

      {/* KPI Cards */}
      <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'}>
        <KpiCard
          titleKey="agentguard:fleet.totalAgents"
          value={kpis.total_agents.toString()}
        />
        <KpiCard
          titleKey="agentguard:fleet.executions24h"
          value={kpis.executions_24h.toLocaleString()}
        />
        <KpiCard
          titleKey="agentguard:fleet.avgConfidence"
          value={formatConfidence(kpis.avg_confidence)}
        />
        <KpiCard
          titleKey="agentguard:fleet.passRate"
          value={formatConfidence(kpis.pass_rate)}
        />
        <CorrectionRateCard rate={kpis.correction_rate} />
      </div>

      {/* Executions Over Time Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="agentguard:fleet.executionsOverTime" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:fleet.executionsOverTimeDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className={'h-64 w-full'}
              config={executionsChartConfig}
            >
              <AreaChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="pass"
                  type="natural"
                  fill="var(--color-pass)"
                  stroke="var(--color-pass)"
                  fillOpacity={0.4}
                  stackId="a"
                />
                <Area
                  dataKey="flag"
                  type="natural"
                  fill="var(--color-flag)"
                  stroke="var(--color-flag)"
                  fillOpacity={0.4}
                  stackId="a"
                />
                <Area
                  dataKey="block"
                  type="natural"
                  fill="var(--color-block)"
                  stroke="var(--color-block)"
                  fillOpacity={0.4}
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Agent Cards */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">
          <Trans i18nKey="agentguard:fleet.agentsTable" />
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          <Trans i18nKey="agentguard:fleet.agentsTableDescription" />
        </p>

        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center text-sm">
                <Trans i18nKey="agentguard:fleet.noAgents" />
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.agent_id}
                  agent={agent}
                  sessions={sessionsByAgent.get(agent.agent_id) ?? []}
                  accountSlug={accountSlug}
                />
              ))}
            </div>

            <PaginationBar page={page} pageCount={pageCount} />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent Card                                                          */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  sessions,
  accountSlug,
}: {
  agent: AgentFleetRow;
  sessions: FleetSessionSummary[];
  accountSlug: string;
}) {
  const hasData = agent.executions_24h > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/home/${accountSlug}/agents/${agent.agent_id}`}
            className="text-primary text-base font-semibold hover:underline"
          >
            {agent.name}
          </Link>
          <AgentStatusBadge
            avgConfidence={agent.avg_confidence}
            hasExecutions={hasData}
          />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <MetricPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label={<Trans i18nKey="agentguard:fleet.executions" />}
            value={hasData ? agent.executions_24h.toLocaleString() : '—'}
          />
          <MetricPill
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label={<Trans i18nKey="agentguard:fleet.confidence" />}
            value={formatConfidence(agent.avg_confidence)}
          />
          <MetricPill
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={<Trans i18nKey="agentguard:fleet.passRate" />}
            value={formatConfidence(agent.pass_rate)}
          />
        </div>

        {/* Sessions */}
        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <MessageSquare className="h-3 w-3" />
              <Trans i18nKey="agentguard:fleet.recentSessions" />
            </p>
            <div className="flex flex-col gap-1.5">
              {sessions.map((session) => (
                <SessionRow
                  key={session.session_id}
                  session={session}
                  accountSlug={accountSlug}
                />
              ))}
            </div>
          </div>
        )}

        {/* Last active */}
        {agent.last_active && (
          <p className="text-muted-foreground mt-auto flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(agent.last_active), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Session Row                                                         */
/* ------------------------------------------------------------------ */

/**
 * Fleet health is built from `executions`, so a row's turn count and confidence
 * come from the reliability tables. It therefore links to the execution session
 * view — not to the memory session that may share the same `session_id`.
 */
function SessionRow({
  session,
  accountSlug,
}: {
  session: FleetSessionSummary;
  accountSlug: string;
}) {
  let confidenceColor = 'text-muted-foreground';

  if (session.avg_confidence != null) {
    if (session.avg_confidence >= 0.8) {
      confidenceColor = 'text-green-600 dark:text-green-400';
    } else if (session.avg_confidence >= 0.5) {
      confidenceColor = 'text-yellow-600 dark:text-yellow-400';
    } else {
      confidenceColor = 'text-red-600 dark:text-red-400';
    }
  }

  return (
    <Link
      href={`/home/${accountSlug}/execution-sessions/${session.session_id}`}
      className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors"
    >
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono">
          {session.session_id.slice(0, 8)}
        </span>
        <span className="text-muted-foreground">
          {session.turn_count} <Trans i18nKey="agentguard:fleet.sessionTurns" />
        </span>
      </span>
      <span className={`font-medium ${confidenceColor}`}>
        {formatConfidence(session.avg_confidence)}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Metric Pill                                                         */
/* ------------------------------------------------------------------ */

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: string;
}) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-md px-3 py-2">
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status Badge                                                        */
/* ------------------------------------------------------------------ */

function AgentStatusBadge({
  avgConfidence,
  hasExecutions,
}: {
  avgConfidence: number | null;
  hasExecutions: boolean;
}) {
  if (!hasExecutions || avgConfidence == null) {
    return (
      <Badge
        variant="outline"
        className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      >
        <Trans i18nKey="agentguard:fleet.statusNoData" />
      </Badge>
    );
  }

  if (avgConfidence < 0.5) {
    return (
      <Badge
        variant="outline"
        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      >
        <Trans i18nKey="agentguard:fleet.statusDegraded" />
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    >
      <Trans i18nKey="agentguard:fleet.statusHealthy" />
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* KPI Cards                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ titleKey, value }: { titleKey: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>
          <Trans i18nKey={titleKey} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function CorrectionRateCard({ rate }: { rate: number | null }) {
  if (rate == null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            <Trans i18nKey="agentguard:fleet.correctionRate" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-2xl font-bold">N/A</div>
        </CardContent>
      </Card>
    );
  }

  const pct = (rate * 100).toFixed(1);

  let colorClass: string;
  if (rate >= 0.8) {
    colorClass = 'text-green-600 dark:text-green-400';
  } else if (rate >= 0.5) {
    colorClass = 'text-yellow-600 dark:text-yellow-400';
  } else {
    colorClass = 'text-red-600 dark:text-red-400';
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>
          <Trans i18nKey="agentguard:fleet.correctionRate" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{pct}%</div>
        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="agentguard:fleet.correctionRateDesc" />
        </p>
      </CardContent>
    </Card>
  );
}
