'use client';

import { useCallback } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

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
import { formatTimestamp, truncateId } from '~/lib/agentguard/formatters';

import type { MemorySessionRow } from '../_lib/server/memory-sessions.loader';

interface SessionsTableProps {
  sessions: MemorySessionRow[];
  accountSlug: string;
  agents: string[];
  memoryTypes: string[];
  page: number;
  pageCount: number;
}

/**
 * The type mix a session produced, as compact pills. Zero counts are dropped
 * rather than rendered as "0 decisions" — a row with nothing but observations
 * should look different at a glance from one that recorded a decision.
 */
function TypeBreakdown({ session }: { session: MemorySessionRow }) {
  const { t } = useTranslation('agentguard');

  const parts: Array<{ key: string; count: number; label: string }> = [
    { key: 'facts', count: session.facts, label: t('sessions.typeFacts') },
    {
      key: 'observations',
      count: session.observations,
      label: t('sessions.typeObservations'),
    },
    {
      key: 'summaries',
      count: session.summaries,
      label: t('sessions.typeSummaries'),
    },
    {
      key: 'deliberate',
      count: session.deliberate,
      label: t('sessions.typeDecisions'),
    },
  ].filter((part) => part.count > 0);

  if (parts.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part) => (
        <Badge key={part.key} variant="outline" className="font-normal">
          {part.count} {part.label}
        </Badge>
      ))}
    </div>
  );
}

export default function SessionsTable({
  sessions,
  accountSlug,
  agents,
  memoryTypes,
  page,
  pageCount,
}: SessionsTableProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get('agent') ?? '';
  const currentType = searchParams.get('type') ?? '';
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
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:sessions.filters" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:sessions.agent" />
              </label>
              <select
                value={currentAgent}
                onChange={(e) => updateFilter('agent', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('sessions.allAgents')}</option>
                {agents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:sessions.memoryType" />
              </label>
              <select
                value={currentType}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('sessions.allTypes')}</option>
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:sessions.timeRange" />
              </label>
              <select
                value={currentTimeRange}
                onChange={(e) => updateFilter('timeRange', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('sessions.allTime')}</option>
                <option value="24h">{t('sessions.last24h')}</option>
                <option value="7d">{t('sessions.last7d')}</option>
                <option value="30d">{t('sessions.last30d')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:sessions.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:sessions.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:sessions.noSessions" />
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.sessionId" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.agent" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.captured" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.recallable" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.breakdown" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.started" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:sessions.lastActive" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell>
                      <Link
                        href={`/home/${accountSlug}/sessions/${encodeURIComponent(session.session_id)}`}
                        className="text-primary font-mono text-sm hover:underline"
                        title={session.session_id}
                      >
                        {truncateId(session.session_id)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/home/${accountSlug}/memory/agent/${session.primary_agent_id}`}
                          className="text-primary text-sm hover:underline"
                        >
                          {session.primary_agent_id}
                        </Link>

                        {session.agent_count > 1 && (
                          <span className="text-muted-foreground text-xs">
                            {t('sessions.agents')}: {session.agent_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {session.captured.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.recallable.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <TypeBreakdown session={session} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTimestamp(session.first_captured)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTimestamp(session.last_captured)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <PaginationBar page={page} pageCount={pageCount} />
        </CardContent>
      </Card>
    </div>
  );
}
