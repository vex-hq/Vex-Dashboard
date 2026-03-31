'use client';

import Link from 'next/link';

import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Hexagon,
  ShieldAlert,
  Wrench,
  Zap,
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

import { TimeRangeSelect } from '~/components/time-range-select';
import { formatConfidence } from '~/lib/agentguard/formatters';
import { getPlanLimits } from '~/lib/agentguard/plan-limits';
import type {
  AgentHealthTile,
  AlertSeveritySummary,
  AnomalyAlert,
  FailurePattern,
  HomepageKpis,
  HomepageTrendBucket,
} from '~/lib/agentguard/types';
import { useAgentGuardUpdates } from '~/lib/agentguard/use-agentguard-updates';

import { UsageMeter } from './usage-meter';

interface HomepageChartsProps {
  kpis: HomepageKpis;
  agentHealth: AgentHealthTile[];
  alertSummary: AlertSeveritySummary;
  trend: HomepageTrendBucket[];
  failurePatterns: FailurePattern[];
  anomalyAlerts: AnomalyAlert[];
  accountSlug: string;
  planUsage: {
    plan: string;
    planOverrides: Record<string, number> | null;
    observationsUsed: number;
    verificationsUsed: number;
    correctionsUsed: number;
  };
}

const trendChartConfig = {
  pass: { label: 'Pass', color: '#34C78E' },
  flag: { label: 'Flag', color: 'hsl(210, 10%, 65%)' },
  block: { label: 'Block', color: '#F87171' },
} satisfies ChartConfig;

export default function HomepageCharts({
  kpis,
  agentHealth,
  alertSummary,
  trend,
  failurePatterns,
  anomalyAlerts,
  accountSlug,
  planUsage,
}: HomepageChartsProps) {
  useAgentGuardUpdates();

  const planLimits = getPlanLimits(planUsage.plan, planUsage.planOverrides);

  const chartData = trend.map((row) => ({
    bucket: format(new Date(row.bucket), 'HH:mm'),
    pass: row.pass_count,
    flag: row.flag_count,
    block: row.block_count,
  }));

  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-6 pb-36 duration-500'
      }
    >
      <div className="flex items-center justify-end">
        <TimeRangeSelect />
      </div>

      {/* Row 1: Hero Reliability Gauge + KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReliabilityGaugeCard confidence={kpis.avg_confidence} />
        <KpiCard
          titleKey="agentguard:homepage.verifications"
          subtitleKey="agentguard:homepage.verificationsSubtitle"
          value={kpis.total_verifications.toLocaleString()}
          icon={<Zap className="h-4 w-4 text-[#8C8C8C]" />}
        />
        <KpiCard
          titleKey="agentguard:homepage.issuesCaught"
          subtitleKey="agentguard:homepage.issuesCaughtSubtitle"
          value={kpis.issues_caught.toLocaleString()}
          icon={<ShieldAlert className="h-4 w-4 text-[#8C8C8C]" />}
        />
        <KpiCard
          titleKey="agentguard:homepage.autoCorrected"
          subtitleKey="agentguard:homepage.autoCorrectedSubtitle"
          value={kpis.auto_corrected.toLocaleString()}
          icon={<Wrench className="h-4 w-4 text-[#8C8C8C]" />}
        />
      </div>

      {/* Plan Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">
              <Trans
                i18nKey="agentguard:homepage.planUsage"
                defaults="Plan Usage"
              />
            </CardTitle>
            <CardDescription>
              <Trans
                i18nKey="agentguard:homepage.planUsageDescription"
                defaults="Current billing period usage"
              />
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {planUsage.plan.charAt(0).toUpperCase() + planUsage.plan.slice(1)}
            </Badge>
            <Link
              href={`/home/${accountSlug}/billing`}
              className="text-primary flex items-center gap-1 text-sm hover:underline"
            >
              <Trans i18nKey="agentguard:homepage.upgrade" defaults="Upgrade" />
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`grid gap-4 ${planLimits.correctionsEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
          >
            <UsageMeter
              label="Observations"
              current={planUsage.observationsUsed}
              limit={planLimits.observationsPerMonth}
            />
            <UsageMeter
              label="Verifications"
              current={planUsage.verificationsUsed}
              limit={planLimits.verificationsPerMonth}
            />
            {planLimits.correctionsEnabled ? (
              <UsageMeter
                label="Corrections"
                current={planUsage.correctionsUsed}
                limit={planLimits.correctionsPerMonth}
              />
            ) : (
              <div className="bg-muted/30 flex items-center gap-2 rounded-lg px-4 py-3">
                <Zap className="h-4 w-4 shrink-0 text-[#8C8C8C]" />
                <p className="text-muted-foreground text-sm">
                  <Trans
                    i18nKey="agentguard:homepage.correctionsProOnly"
                    defaults="Auto-Correction is available on paid plans"
                  />
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Row 2: 24h Activity Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Trans i18nKey="agentguard:homepage.activityChart" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:homepage.activityChartDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-48 w-full" config={trendChartConfig}>
              <AreaChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
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

      {/* Row 3: Agent Health + Right Column (Alerts + Activity) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Agent Health — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="agentguard:homepage.agentHealth" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:homepage.agentHealthDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentHealth.length === 0 ? (
              <p className="text-muted-foreground py-4 text-sm">
                <Trans i18nKey="agentguard:homepage.noAgents" />
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {agentHealth.map((agent) => (
                  <AgentTile
                    key={agent.agent_id}
                    agent={agent}
                    accountSlug={accountSlug}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts — 1/3 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              <Trans i18nKey="agentguard:homepage.alertSummary" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:homepage.alertSummaryDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertSummaryPanel
              summary={alertSummary}
              accountSlug={accountSlug}
            />
          </CardContent>
        </Card>
      </div>
      {/* Row 4: Failure Patterns */}
      {failurePatterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Trans i18nKey="agentguard:homepage.failurePatterns" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:homepage.failurePatternsDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failurePatterns.map((fp, i) => (
                <Link
                  key={`${fp.agent_id}-${fp.check_type}`}
                  href={`/home/${accountSlug}/agents/${fp.agent_id}`}
                  className="border-border flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono text-xs">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{fp.agent_name}</p>
                      <p className="text-muted-foreground text-xs">
                        {fp.check_type}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-[#F87171]/30 bg-[#F87171]/15 text-[#F87171]"
                  >
                    {fp.failure_count} failures
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Trans i18nKey="agentguard:anomalies.title" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:anomalies.description" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomalyAlerts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              <Trans i18nKey="agentguard:anomalies.noAnomalies" />
            </p>
          ) : (
            <div className="space-y-3">
              {anomalyAlerts.map((alert) => (
                <div
                  key={alert.alert_id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        alert.severity === 'high'
                          ? 'border-red-500/30 bg-red-500/15 text-red-400'
                          : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-400'
                      }
                    >
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        <Trans
                          i18nKey={
                            alert.alert_type === 'cost_anomaly'
                              ? 'agentguard:anomalies.costAnomaly'
                              : 'agentguard:anomalies.latencyAnomaly'
                          }
                        />
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {alert.agent_name}
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(alert.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reliability Gauge Card                                              */
/* ------------------------------------------------------------------ */

const gaugeThemes = {
  good: {
    from: '#34C78E',
    to: '#2DD4BF',
    glow: 'rgba(52, 199, 142, 0.35)',
  },
  warning: {
    from: '#F97316',
    to: '#FBBF24',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  critical: {
    from: '#F87171',
    to: '#FB923C',
    glow: 'rgba(248, 113, 113, 0.3)',
  },
  neutral: {
    from: '#8C8C8C',
    to: '#8C8C8C',
    glow: 'transparent',
  },
} as const;

type GaugeTheme = { from: string; to: string; glow: string };

function ReliabilityGaugeCard({ confidence }: { confidence: number | null }) {
  const value = confidence ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;

  let theme: GaugeTheme = gaugeThemes.neutral;

  if (confidence != null) {
    if (confidence >= 0.8) {
      theme = gaugeThemes.good;
    } else if (confidence >= 0.5) {
      theme = gaugeThemes.warning;
    } else {
      theme = gaugeThemes.critical;
    }
  }

  const gradientId = 'gauge-gradient';
  const glowId = 'gauge-glow';

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="relative flex-shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-20 w-20"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={theme.from} />
                <stop offset="100%" stopColor={theme.to} />
              </linearGradient>
              <filter id={glowId}>
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#1A1A1A"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              filter={`url(#${glowId})`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Hexagon
              className="h-6 w-6"
              style={{ color: theme.from, opacity: 0.85 }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-[11px] font-semibold tracking-wide text-[#8C8C8C] uppercase">
            <Trans i18nKey="agentguard:homepage.reliabilityScore" />
          </p>
          <span
            className="text-4xl font-semibold tracking-tight"
            style={{ color: theme.from }}
          >
            {formatConfidence(confidence)}
          </span>
          <p className="text-[11px] text-[#8C8C8C]">
            <Trans i18nKey="agentguard:homepage.reliabilityScoreSubtitle" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* KPI Card                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({
  titleKey,
  subtitleKey,
  value,
  icon,
}: {
  titleKey: string;
  subtitleKey: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-base font-medium text-[#F0F0F0]">
          <Trans i18nKey={titleKey} />
        </span>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-[#8C8C8C]">
          <Trans i18nKey={subtitleKey} />
        </div>
        <div className="mt-3 text-4xl font-semibold text-[#F0F0F0]">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Agent Health Tiles                                                   */
/* ------------------------------------------------------------------ */

function AgentTile({
  agent,
  accountSlug,
}: {
  agent: AgentHealthTile;
  accountSlug: string;
}) {
  const hasData = agent.executions_24h > 0;
  const confidence = agent.avg_confidence ?? 0;

  let barColor = 'bg-[#8C8C8C]';
  let dotColor = 'bg-[#8C8C8C]';

  if (hasData && agent.avg_confidence != null) {
    if (agent.avg_confidence >= 0.8) {
      barColor = 'bg-[#34C78E]';
      dotColor = 'bg-[#34C78E]';
    } else if (agent.avg_confidence >= 0.5) {
      barColor = 'bg-[#F97316]';
      dotColor = 'bg-[#F97316]';
    } else {
      barColor = 'bg-[#F87171]';
      dotColor = 'bg-[#F87171]';
    }
  }

  return (
    <Link
      href={`/home/${accountSlug}/agents/${agent.agent_id}`}
      className="group border-border bg-card flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor}`}
        />
        <p className="truncate text-sm font-medium text-[#F0F0F0]">
          {agent.name}
        </p>
      </div>

      {hasData ? (
        <>
          <div className="bg-border h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8C8C8C]">
              {formatConfidence(agent.avg_confidence)}
            </span>
            <span className="text-[#8C8C8C]">
              {agent.executions_24h.toLocaleString()}{' '}
              <Trans i18nKey="agentguard:homepage.runs" />
            </span>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-[#8C8C8C]">
          <Trans i18nKey="agentguard:homepage.noData" />
        </p>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Alert Summary Panel                                                 */
/* ------------------------------------------------------------------ */

function AlertSummaryPanel({
  summary,
  accountSlug,
}: {
  summary: AlertSeveritySummary;
  accountSlug: string;
}) {
  const total = summary.critical + summary.high + summary.medium + summary.low;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <CheckCircle2 className="h-8 w-8 text-[#34C78E]" />
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="agentguard:homepage.allClear" />
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[#F97316]" />
        <span className="text-sm font-medium">
          {total} <Trans i18nKey="agentguard:homepage.activeAlerts" />
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <SeverityPill
          label="Critical"
          count={summary.critical}
          variant="critical"
        />
        <SeverityPill label="High" count={summary.high} variant="high" />
        <SeverityPill label="Medium" count={summary.medium} variant="medium" />
        <SeverityPill label="Low" count={summary.low} variant="low" />
      </div>

      <Link
        href={`/home/${accountSlug}/alerts`}
        className="text-primary text-sm hover:underline"
      >
        <Trans i18nKey="agentguard:homepage.viewAllAlerts" />
      </Link>
    </div>
  );
}

const severityStyles = {
  critical: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  high: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  medium: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  low: 'bg-[#8C8C8C]/15 text-[#8C8C8C] border-[#8C8C8C]/30',
} as const;

function SeverityPill({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: keyof typeof severityStyles;
}) {
  const dimmed = count === 0;

  return (
    <Badge
      variant="outline"
      className={
        dimmed
          ? 'border-border bg-border/50 text-muted-foreground/50'
          : severityStyles[variant]
      }
    >
      {count} {label}
    </Badge>
  );
}
