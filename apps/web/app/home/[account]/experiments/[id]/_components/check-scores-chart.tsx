'use client';

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

import type { CheckScoreByVariant } from '~/lib/agentguard/types';

interface CheckScoresChartProps {
  checkScores: CheckScoreByVariant[];
  variants: string[];
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 0.8) return 'text-green-600 dark:text-green-400';
  if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function buildScoreMap(
  checkScores: CheckScoreByVariant[],
): Map<string, Map<string, number | null>> {
  const scoreMap = new Map<string, Map<string, number | null>>();

  for (const entry of checkScores) {
    const existing = scoreMap.get(entry.check_type);
    if (existing) {
      existing.set(entry.variant, entry.avg_score);
    } else {
      const variantMap = new Map<string, number | null>();
      variantMap.set(entry.variant, entry.avg_score);
      scoreMap.set(entry.check_type, variantMap);
    }
  }

  return scoreMap;
}

function extractCheckTypes(checkScores: CheckScoreByVariant[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const entry of checkScores) {
    if (!seen.has(entry.check_type)) {
      seen.add(entry.check_type);
      ordered.push(entry.check_type);
    }
  }

  return ordered.sort();
}

function formatCheckType(checkType: string): string {
  return checkType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CheckScoresChart({
  checkScores,
  variants,
}: CheckScoresChartProps) {
  if (checkScores.length === 0) return null;

  const scoreMap = buildScoreMap(checkScores);
  const checkTypes = extractCheckTypes(checkScores);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:experiments.compareChecks" />
        </CardTitle>
        <CardDescription>
          Average score per check type across variants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Check Type</TableHead>
              {variants.map((variant) => (
                <TableHead key={variant} className="text-center">
                  {variant}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkTypes.map((checkType) => {
              const variantScores = scoreMap.get(checkType);

              return (
                <TableRow key={checkType}>
                  <TableCell className="font-medium">
                    {formatCheckType(checkType)}
                  </TableCell>
                  {variants.map((variant) => {
                    const score = variantScores?.get(variant) ?? null;

                    return (
                      <TableCell key={variant} className="text-center">
                        <ScoreCell score={score} />
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

interface ScoreCellProps {
  score: number | null;
}

function ScoreCell({ score }: ScoreCellProps) {
  if (score === null) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const widthPercent = Math.max(score * 100, 2);

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${getScoreColor(score)}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${getScoreTextColor(score)}`}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}
