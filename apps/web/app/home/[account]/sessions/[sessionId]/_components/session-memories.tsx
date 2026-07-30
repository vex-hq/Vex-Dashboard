'use client';

import Link from 'next/link';

import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { PaginationBar } from '~/components/pagination-bar';
import { formatTimestamp } from '~/lib/agentguard/formatters';

import type {
  MemorySessionHeader,
  SessionMemoryEntry,
} from '../../_lib/server/memory-sessions.loader';

interface SessionMemoriesProps {
  header: MemorySessionHeader;
  entries: SessionMemoryEntry[];
  accountSlug: string;
  page: number;
  pageCount: number;
}

/**
 * Colour by what the memory is, not by how confident the writer was. A decision
 * is the thing a human scanning a long session is looking for, so it is the one
 * that carries a filled badge.
 */
const TYPE_STYLES: Record<string, string> = {
  decision:
    'bg-primary text-primary-foreground border-transparent dark:bg-primary',
  plan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  note: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  fact: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={TYPE_STYLES[type] ?? ''}>
      {type}
    </Badge>
  );
}

function Stat({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-lg font-medium">{value}</span>
    </div>
  );
}

export function SessionMemories({
  header,
  entries,
  accountSlug,
  page,
  pageCount,
}: SessionMemoriesProps) {
  const { t } = useTranslation('agentguard');

  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-4 pb-36 duration-500'
      }
    >
      {/* Session summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base break-all">
            {header.session_id}
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:sessions.handoverDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label={<Trans i18nKey="agentguard:sessions.captured" />}
              value={header.captured.toLocaleString()}
            />
            <Stat
              label={<Trans i18nKey="agentguard:sessions.recallable" />}
              value={header.recallable.toLocaleString()}
            />
            <Stat
              label={<Trans i18nKey="agentguard:sessions.started" />}
              value={
                <span className="text-sm">
                  {formatTimestamp(header.first_captured)}
                </span>
              }
            />
            <Stat
              label={<Trans i18nKey="agentguard:sessions.lastActive" />}
              value={
                <span className="text-sm">
                  {formatTimestamp(header.last_captured)}
                </span>
              }
            />
            <Stat
              label={<Trans i18nKey="agentguard:sessions.agents" />}
              value={
                <div className="flex flex-col gap-1">
                  {header.agents.map((agent) => (
                    <Link
                      key={agent.agent_id}
                      href={`/home/${accountSlug}/memory/agent/${agent.agent_id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      {agent.agent_id}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({agent.captured.toLocaleString()})
                      </span>
                    </Link>
                  ))}
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* The trail itself */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:sessions.handover" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:sessions.detailDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:sessions.noSessions" />
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-border flex flex-col gap-2 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={entry.memory_type} />

                    {entry.status !== 'active' && (
                      <Badge variant="outline" className="font-normal">
                        {entry.status}
                      </Badge>
                    )}

                    {entry.recall_hidden && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground gap-1 font-normal"
                        title={t('sessions.hiddenFromRecallHint')}
                      >
                        <EyeOff className="h-3 w-3" />
                        <Trans i18nKey="agentguard:sessions.hiddenFromRecall" />
                      </Badge>
                    )}

                    <span className="text-muted-foreground ml-auto text-xs">
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>

                  <p className="text-sm break-words whitespace-pre-wrap">
                    {entry.content}
                  </p>

                  <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                    {header.agent_count > 1 && <span>{entry.agent_id}</span>}

                    <span>
                      {t('sessions.scope')}: {entry.scope}
                    </span>

                    {entry.source && (
                      <span>
                        {t('sessions.source')}: {entry.source}
                      </span>
                    )}

                    {entry.space_name && <span>{entry.space_name}</span>}

                    {entry.project_id && <span>{entry.project_id}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <PaginationBar page={page} pageCount={pageCount} />
        </CardContent>
      </Card>
    </div>
  );
}
