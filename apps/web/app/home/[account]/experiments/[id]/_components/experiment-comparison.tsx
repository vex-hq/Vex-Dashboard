'use client';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import type {
  CheckScoreByVariant,
  Experiment,
  VariantMetrics,
} from '~/lib/agentguard/types';

import { CheckScoresChart } from './check-scores-chart';

interface ExperimentComparisonProps {
  experiment: Experiment;
  metrics: VariantMetrics[];
  checkScores: CheckScoreByVariant[];
  accountSlug: string;
}

function getConfidenceColor(value: number | null): string {
  if (value === null) return 'text-muted-foreground';
  if (value > 0.8) return 'text-green-600 dark:text-green-400';
  if (value > 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function formatNumber(value: number | null, suffix?: string): string {
  if (value === null) return '-';
  const formatted =
    value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value.toFixed(value < 10 ? 2 : 0);
  return suffix ? `${formatted}${suffix}` : String(formatted);
}

interface MetricRow {
  label: string;
  getValue: (m: VariantMetrics) => number | null;
  format: (value: number | null) => string;
  higherIsBetter: boolean;
}

const METRIC_ROWS: MetricRow[] = [
  {
    label: 'Avg Confidence',
    getValue: (m) => m.avg_confidence,
    format: (v) => (v !== null ? v.toFixed(3) : '-'),
    higherIsBetter: true,
  },
  {
    label: 'Pass Rate',
    getValue: (m) =>
      m.execution_count > 0 ? m.pass_count / m.execution_count : null,
    format: (v) => (v !== null ? `${(v * 100).toFixed(1)}%` : '-'),
    higherIsBetter: true,
  },
  {
    label: 'Flag Rate',
    getValue: (m) =>
      m.execution_count > 0 ? m.flag_count / m.execution_count : null,
    format: (v) => (v !== null ? `${(v * 100).toFixed(1)}%` : '-'),
    higherIsBetter: false,
  },
  {
    label: 'Block Rate',
    getValue: (m) =>
      m.execution_count > 0 ? m.block_count / m.execution_count : null,
    format: (v) => (v !== null ? `${(v * 100).toFixed(1)}%` : '-'),
    higherIsBetter: false,
  },
  {
    label: 'Correction Rate',
    getValue: (m) =>
      m.execution_count > 0 ? m.corrected_count / m.execution_count : null,
    format: (v) => (v !== null ? `${(v * 100).toFixed(1)}%` : '-'),
    higherIsBetter: false,
  },
  {
    label: 'Avg Latency',
    getValue: (m) => m.avg_latency,
    format: (v) => formatNumber(v, 'ms'),
    higherIsBetter: false,
  },
  {
    label: 'Avg Cost',
    getValue: (m) => m.avg_cost,
    format: (v) => (v !== null ? `$${v.toFixed(4)}` : '-'),
    higherIsBetter: false,
  },
];

function findWinnerIndex(
  values: (number | null)[],
  higherIsBetter: boolean,
): number | null {
  const validEntries = values
    .map((v, i) => ({ value: v, index: i }))
    .filter((e) => e.value !== null);

  if (validEntries.length < 2) return null;

  const sorted = [...validEntries].sort((a, b) => {
    const diff = (a.value ?? 0) - (b.value ?? 0);
    return higherIsBetter ? -diff : diff;
  });

  const best = sorted[0];
  const second = sorted[1];

  if (best === undefined || second === undefined) return null;
  if (best.value === second.value) return null;

  return best.index;
}

function getVariantLabel(variantKey: string, experiment: Experiment): string {
  const found = experiment.variants.find((v) => v.key === variantKey);
  return found ? found.label : variantKey;
}

export function ExperimentComparison({
  experiment,
  metrics,
  checkScores,
}: ExperimentComparisonProps) {
  const variantKeys = experiment.variants.map((v) => v.key);

  if (metrics.length === 0) {
    return <EmptyState experimentId={experiment.id} />;
  }

  const metricsByVariant = new Map(metrics.map((m) => [m.variant, m]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variantKeys.map((key) => {
          const m = metricsByVariant.get(key);
          return (
            <VariantSummaryCard
              key={key}
              variantKey={key}
              label={getVariantLabel(key, experiment)}
              metrics={m ?? null}
            />
          );
        })}
      </div>

      <MetricsComparisonTable
        experiment={experiment}
        metrics={metrics}
        variantKeys={variantKeys}
      />

      {checkScores.length > 0 && (
        <CheckScoresChart checkScores={checkScores} variants={variantKeys} />
      )}
    </div>
  );
}

interface VariantSummaryCardProps {
  variantKey: string;
  label: string;
  metrics: VariantMetrics | null;
}

function VariantSummaryCard({
  variantKey,
  label,
  metrics,
}: VariantSummaryCardProps) {
  const executions = metrics?.execution_count ?? 0;
  const confidence = metrics?.avg_confidence ?? null;
  const passRate =
    metrics && metrics.execution_count > 0
      ? metrics.pass_count / metrics.execution_count
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {variantKey}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="agentguard:experiments.executions" />
            </p>
            <p className="text-lg font-semibold">{executions}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="agentguard:experiments.confidence" />
            </p>
            <p
              className={`text-lg font-semibold ${getConfidenceColor(confidence)}`}
            >
              {confidence !== null ? confidence.toFixed(3) : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="agentguard:experiments.passRate" />
            </p>
            <p className="text-lg font-semibold">
              {passRate !== null ? `${(passRate * 100).toFixed(1)}%` : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsComparisonTableProps {
  experiment: Experiment;
  metrics: VariantMetrics[];
  variantKeys: string[];
}

function MetricsComparisonTable({
  experiment,
  metrics,
  variantKeys,
}: MetricsComparisonTableProps) {
  const metricsByVariant = new Map(metrics.map((m) => [m.variant, m]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:experiments.detailTitle" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Metric</TableHead>
              {variantKeys.map((key) => (
                <TableHead key={key} className="text-center">
                  {getVariantLabel(key, experiment)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {METRIC_ROWS.map((row) => {
              const values = variantKeys.map((key) => {
                const m = metricsByVariant.get(key);
                return m ? row.getValue(m) : null;
              });

              const winnerIdx = findWinnerIndex(values, row.higherIsBetter);

              return (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {values.map((value, idx) => {
                    const isWinner = winnerIdx === idx;
                    const isLoser =
                      winnerIdx !== null && winnerIdx !== idx && value !== null;

                    return (
                      <TableCell key={variantKeys[idx]} className="text-center">
                        <span
                          className={
                            isWinner
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : isLoser
                                ? 'text-muted-foreground'
                                : ''
                          }
                        >
                          {row.format(value)}
                          {isWinner && (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                              Best
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmptyState({ experimentId }: { experimentId: string }) {
  const snippet = `vex.verify(
    output=response,
    task=task,
    experiment_id="${experimentId}",
    variant="<variant-key>",
)`;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <h3 className="text-foreground text-sm font-medium">
          <Trans i18nKey="agentguard:experiments.noResults" />
        </h3>
        <p className="text-muted-foreground mt-2 text-xs">
          Experiment ID:{' '}
          <code className="bg-muted rounded px-1 font-mono">
            {experimentId}
          </code>
        </p>
        <pre className="bg-muted mt-4 w-full max-w-md overflow-x-auto rounded-lg p-4 text-xs">
          <code>{snippet}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
