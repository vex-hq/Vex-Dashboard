'use client';

import { useCallback } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { formatDistanceStrict } from 'date-fns';

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

import { PaginationBar } from '~/components/pagination-bar';
import {
  formatConfidence,
  formatTimestamp,
  truncateId,
} from '~/lib/agentguard/formatters';
import type { SessionListRow } from '~/lib/agentguard/types';

interface ExecutionSessionsTableProps {
  sessions: SessionListRow[];
  accountSlug: string;
  agents: Array<{ agent_id: string; name: string }>;
  page: number;
  pageCount: number;
}

function getSessionStatus(
  row: SessionListRow,
): 'healthy' | 'degraded' | 'risky' {
  if (row.has_block) return 'risky';
  if (row.has_flag) return 'degraded';
  return 'healthy';
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'risky' }) {
  const styles: Record<string, string> = {
    healthy:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    degraded:
      'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    risky: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      <Trans
        i18nKey={`agentguard:executionSessions.status${status.charAt(0).toUpperCase() + status.slice(1)}`}
      />
    </Badge>
  );
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs < 1000) return '<1s';

  return formatDistanceStrict(startDate, endDate);
}

export default function ExecutionSessionsTable({
  sessions,
  accountSlug,
  agents,
  page,
  pageCount,
}: ExecutionSessionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get('agent') ?? '';
  const currentStatus = searchParams.get('status') ?? '';
  const currentTimeRange = searchParams.get('timeRange') ?? '';

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-4 pb-36 duration-500'
      }
    >
      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:executionSessions.filters" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Agent Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:executionSessions.agent" />
              </label>
              <select
                value={currentAgent}
                onChange={(e) => updateFilter('agent', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All Agents</option>
                {agents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:executionSessions.status" />
              </label>
              <select
                value={currentStatus}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="risky">Risky</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:executionSessions.timeRange" />
              </label>
              <select
                value={currentTimeRange}
                onChange={(e) => updateFilter('timeRange', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All Time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:executionSessions.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:executionSessions.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:executionSessions.noSessions" />
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.sessionId" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.agent" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.turns" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.avgConfidence" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.status" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.duration" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:executionSessions.lastActive" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const status = getSessionStatus(session);
                  const confidenceValue = session.avg_confidence;
                  let confidenceColor = 'text-muted-foreground';

                  if (confidenceValue != null) {
                    if (confidenceValue >= 0.8) {
                      confidenceColor = 'text-green-600 dark:text-green-400';
                    } else if (confidenceValue >= 0.5) {
                      confidenceColor = 'text-yellow-600 dark:text-yellow-400';
                    } else {
                      confidenceColor = 'text-red-600 dark:text-red-400';
                    }
                  }

                  return (
                    <TableRow key={session.session_id}>
                      <TableCell>
                        <Link
                          href={`/home/${accountSlug}/execution-sessions/${session.session_id}`}
                          className="text-primary font-mono text-sm hover:underline"
                        >
                          {truncateId(session.session_id)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/home/${accountSlug}/agents/${session.agent_id}`}
                          className="text-primary hover:underline"
                        >
                          {session.agent_name}
                        </Link>
                      </TableCell>
                      <TableCell>{session.turn_count}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${confidenceColor}`}>
                          {formatConfidence(session.avg_confidence)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        {formatDuration(
                          session.first_timestamp,
                          session.last_timestamp,
                        )}
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(session.last_timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <PaginationBar page={page} pageCount={pageCount} />
        </CardContent>
      </Card>
    </div>
  );
}
