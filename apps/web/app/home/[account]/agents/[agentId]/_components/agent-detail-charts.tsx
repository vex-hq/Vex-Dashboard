'use client';

import Link from 'next/link';

import { format, formatDistanceToNow } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import { TimeRangeSelect } from '~/components/time-range-select';
import {
  formatConfidence,
  formatCost,
  formatLatency,
  formatTimestamp,
  formatTokens,
  truncateId,
} from '~/lib/agentguard/formatters';
import type {
  ActionDistribution,
  AgentKpis,
  AnomalyAlert,
  CheckScoreBucket,
  ConfidenceOverTime,
  CorrectionLayerUsage,
  CorrectionStatsBucket,
  Execution,
} from '~/lib/agentguard/types';
import { useAgentGuardUpdates } from '~/lib/agentguard/use-agentguard-updates';

import { ActionBadge } from '../../_components/action-badge';

interface AgentDetailChartsProps {
  kpis: AgentKpis;
  confidenceOverTime: ConfidenceOverTime[];
  actionDistribution: ActionDistribution[];
  recentExecutions: Execution[];
  checkScoreTrends: CheckScoreBucket[];
  correctionStats: CorrectionStatsBucket[];
  correctionLayerUsage: CorrectionLayerUsage[];
  anomalyAlerts: AnomalyAlert[];
  accountSlug: string;
  agentId: string;
}

const confidenceChartConfig = {
  confidence: {
    label: 'Confidence',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const actionChartConfig = {
  count: {
    label: 'Count',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const ACTION_COLORS: Record<string, string> = {
  pass: 'var(--chart-1)',
  flag: 'var(--chart-3)',
  block: 'var(--chart-5)',
};

const CHECK_TYPE_COLORS: Record<string, string> = {
  schema: 'var(--chart-1)',
  hallucination: 'var(--chart-2)',
  drift: 'var(--chart-3)',
  coherence: 'var(--chart-4)',
  tool_loop: 'var(--chart-5)',
  guardrails: '#8C8C8C',
};

const LAYER_COLORS = ['#34C78E', '#3B82F6', '#F97316', '#8B5CF6', '#F87171'];

export default function AgentDetailCharts({
  kpis,
  confidenceOverTime,
  actionDistribution,
  recentExecutions,
  checkScoreTrends,
  correctionStats,
  correctionLayerUsage,
  anomalyAlerts,
  accountSlug,
  agentId,
}: AgentDetailChartsProps) {
  useAgentGuardUpdates({ accountSlug, agentId });

  const confidenceData = confidenceOverTime.map((row) => ({
    bucket: format(new Date(row.bucket), 'MMM d HH:mm'),
    confidence:
      row.avg_confidence != null
        ? parseFloat((row.avg_confidence * 100).toFixed(1))
        : null,
  }));

  const actionData = actionDistribution.map((row) => ({
    action: row.action.charAt(0).toUpperCase() + row.action.slice(1),
    count: row.count,
    fill: ACTION_COLORS[row.action] ?? 'var(--chart-2)',
  }));

  // Transform check score trends into per-bucket rows with check_type columns
  const checkTypes = [...new Set(checkScoreTrends.map((r) => r.check_type))];
  const checkScoreByBucket = new Map<string, Record<string, number | null>>();
  for (const row of checkScoreTrends) {
    const key = row.bucket;
    if (!checkScoreByBucket.has(key)) {
      checkScoreByBucket.set(key, {});
    }
    checkScoreByBucket.get(key)![row.check_type] =
      row.avg_score != null
        ? parseFloat((row.avg_score * 100).toFixed(1))
        : null;
  }
  const checkScoreData = Array.from(checkScoreByBucket.entries()).map(
    ([bucket, scores]) => ({
      bucket: format(new Date(bucket), 'MMM d HH:mm'),
      ...scores,
    }),
  );

  const checkScoreChartConfig = Object.fromEntries(
    checkTypes.map((ct) => [
      ct,
      {
        label: ct.charAt(0).toUpperCase() + ct.slice(1).replace('_', ' '),
        color: CHECK_TYPE_COLORS[ct] ?? 'var(--chart-2)',
      },
    ]),
  ) satisfies ChartConfig;

  // Correction stats
  const correctionData = correctionStats.map((row) => ({
    bucket: format(new Date(row.bucket), 'MMM d'),
    rate:
      row.total_count > 0
        ? parseFloat(((row.corrected_count / row.total_count) * 100).toFixed(1))
        : 0,
    corrected: row.corrected_count,
    failed: row.failed_count,
    total: row.total_count,
  }));

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
          titleKey="agentguard:agent.totalExecutions"
          value={kpis.total_executions.toLocaleString()}
        />
        <KpiCard
          titleKey="agentguard:agent.avgConfidence"
          value={formatConfidence(kpis.avg_confidence)}
        />
        <KpiCard
          titleKey="agentguard:agent.avgLatency"
          value={formatLatency(kpis.avg_latency)}
        />
        <KpiCard
          titleKey="agentguard:agent.totalTokens"
          value={formatTokens(kpis.total_tokens)}
        />
        <KpiCard
          titleKey="agentguard:agent.totalCost"
          value={formatCost(kpis.total_cost)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Confidence Over Time */}
        {confidenceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="agentguard:agent.confidenceOverTime" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:agent.confidenceOverTimeDescription" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className={'h-64 w-full'}
                config={confidenceChartConfig}
              >
                <LineChart accessibilityLayer data={confidenceData}>
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
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Line
                    dataKey="confidence"
                    type="natural"
                    stroke="var(--color-confidence)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Action Distribution */}
        {actionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="agentguard:agent.actionDistribution" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:agent.actionDistributionDescription" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className={'h-64 w-full'}
                config={actionChartConfig}
              >
                <BarChart accessibilityLayer data={actionData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="action"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-Check Score Trends */}
      {checkScoreData.length > 0 && checkTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="agentguard:agent.checkScoreTrends" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="agentguard:agent.checkScoreTrendsDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className={'h-64 w-full'}
              config={checkScoreChartConfig}
            >
              <LineChart accessibilityLayer data={checkScoreData}>
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {checkTypes.map((ct) => (
                  <Line
                    key={ct}
                    dataKey={ct}
                    type="natural"
                    stroke={CHECK_TYPE_COLORS[ct] ?? 'var(--chart-2)'}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Correction Effectiveness */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {correctionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="agentguard:agent.correctionEffectiveness" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:agent.correctionEffectivenessDescription" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className={'h-64 w-full'}
                config={
                  {
                    rate: { label: 'Correction Rate', color: '#34C78E' },
                  } satisfies ChartConfig
                }
              >
                <LineChart accessibilityLayer data={correctionData}>
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
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Line
                    dataKey="rate"
                    type="natural"
                    stroke="#34C78E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {correctionLayerUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="agentguard:agent.correctionLayerUsage" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:agent.correctionLayerUsageDescription" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className={'h-64 w-full'}
                config={
                  Object.fromEntries(
                    correctionLayerUsage.map((l, i) => [
                      l.layer_name,
                      {
                        label: l.layer_name.replace('_', ' '),
                        color: LAYER_COLORS[i % LAYER_COLORS.length]!,
                      },
                    ]),
                  ) satisfies ChartConfig
                }
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={correctionLayerUsage.map((l) => ({
                      name: l.layer_name,
                      value: l.count,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {correctionLayerUsage.map((_, i) => (
                      <Cell
                        key={i}
                        fill={LAYER_COLORS[i % LAYER_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost & Latency Anomalies */}
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
                    <p className="text-sm font-medium">
                      <Trans
                        i18nKey={
                          alert.alert_type === 'cost_anomaly'
                            ? 'agentguard:anomalies.costAnomaly'
                            : 'agentguard:anomalies.latencyAnomaly'
                        }
                      />
                    </p>
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

      {/* Recent Executions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:agent.recentExecutions" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:agent.recentExecutionsDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExecutions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:agent.noExecutions" />
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.executionId" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.session" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.action" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.confidence" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.latency" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:agent.timestamp" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExecutions.map((exec) => (
                  <TableRow key={exec.execution_id}>
                    <TableCell>
                      <Link
                        href={`/home/${accountSlug}/executions/${exec.execution_id}`}
                        className="text-primary font-mono text-sm hover:underline"
                      >
                        {truncateId(exec.execution_id)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {exec.session_id ? (
                        <span className="text-muted-foreground font-mono text-xs">
                          {truncateId(exec.session_id)}
                          {exec.sequence_number != null && (
                            <span className="text-muted-foreground/60 ml-1">
                              #{exec.sequence_number}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={exec.action} />
                    </TableCell>
                    <TableCell>{formatConfidence(exec.confidence)}</TableCell>
                    <TableCell>{formatLatency(exec.latency_ms)}</TableCell>
                    <TableCell>{formatTimestamp(exec.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
