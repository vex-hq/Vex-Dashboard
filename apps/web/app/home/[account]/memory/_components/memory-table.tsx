'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
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

import type { MemoryListRow } from '../_lib/server/memory.loader';

/** Maximum search-query length forwarded to the loader (defense in depth). */
export const MEMORY_SEARCH_MAX_LENGTH = 200;

const CONTENT_PREVIEW_LENGTH = 140;

interface FilterOption {
  value: string;
  label: string;
}

interface MemoryTableProps {
  rows: MemoryListRow[];
  accountSlug: string;
  agents: FilterOption[];
  memoryTypes: string[];
  sources: string[];
  projects: FilterOption[];
  page: number;
  pageCount: number;
}

function truncateContent(value: string): string {
  if (value.length <= CONTENT_PREVIEW_LENGTH) {
    return value;
  }

  return `${value.slice(0, CONTENT_PREVIEW_LENGTH)}…`;
}

export default function MemoryTable({
  rows,
  accountSlug,
  agents,
  memoryTypes,
  sources,
  projects,
  page,
  pageCount,
}: MemoryTableProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get('agent') ?? '';
  const currentType = searchParams.get('type') ?? '';
  const currentSource = searchParams.get('source') ?? '';
  const currentProject = searchParams.get('project') ?? '';
  const currentQuery = searchParams.get('q') ?? '';

  const [searchValue, setSearchValue] = useState(currentQuery);

  // Keep the local input in sync when the URL changes (e.g. back/forward).
  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

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

  const submitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateFilter('q', searchValue.trim().slice(0, MEMORY_SEARCH_MAX_LENGTH));
    },
    [searchValue, updateFilter],
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:memory.filters" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:memory.agent" />
              </label>
              <select
                value={currentAgent}
                onChange={(e) => updateFilter('agent', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('memory.allAgents')}</option>
                {agents.map((agent) => (
                  <option key={agent.value} value={agent.value}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:memory.type" />
              </label>
              <select
                value={currentType}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('memory.allTypes')}</option>
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:memory.source" />
              </label>
              <select
                value={currentSource}
                onChange={(e) => updateFilter('source', e.target.value)}
                className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t('memory.allSources')}</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {projects.length > 0 ? (
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs">
                  <Trans i18nKey="agentguard:memory.project" />
                </label>
                <select
                  value={currentProject}
                  onChange={(e) => updateFilter('project', e.target.value)}
                  className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
                >
                  <option value="">{t('memory.allProjects')}</option>
                  {projects.map((project) => (
                    <option key={project.value} value={project.value}>
                      {project.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <form
              onSubmit={submitSearch}
              className="flex flex-1 flex-col gap-1"
            >
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:memory.search" />
              </label>
              <div className="relative min-w-48">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  maxLength={MEMORY_SEARCH_MAX_LENGTH}
                  placeholder={t('memory.searchPlaceholder')}
                  className="h-9 pl-8"
                />
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Memory Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:memory.browserTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:memory.browserDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:memory.noMemories" />
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans i18nKey="agentguard:memory.colType" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:memory.colContent" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:memory.colAgent" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:memory.colSource" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:memory.colCreated" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      router.push(`/home/${accountSlug}/memory/${row.id}`)
                    }
                  >
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {row.memory_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/home/${accountSlug}/memory/${row.id}`}
                        className="hover:text-primary block truncate"
                        title={row.content}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {truncateContent(row.content)}
                      </Link>
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs"
                      title={row.agent_id}
                    >
                      {truncateId(row.agent_id, 24)}
                    </TableCell>
                    <TableCell>{row.source ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTimestamp(row.created_at)}
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
