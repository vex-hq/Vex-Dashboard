'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { formatRelativeTime, truncateId } from '~/lib/agentguard/formatters';

import type { ContextItem } from '../_lib/server/context-stream.loader';

/**
 * Minimum interactive tap target (44px), the mobile-landing lesson: nothing
 * in this filter bar or row list is hover-only or smaller than a thumb.
 */
const MIN_TAP_TARGET_CLASS = 'min-h-11';

/** The kinds the loader's `StreamFilters.kind` actually recognizes. */
const KIND_FILTER_OPTIONS = ['decision', 'plan', 'fact', 'note'] as const;

/**
 * Day-range buckets for the "days" segmented control. Values are strings
 * because they round-trip through URL search params.
 */
const DAY_FILTER_OPTIONS = [
  { value: '1', labelKey: 'contextStream.days1', fallback: '24h' },
  { value: '7', labelKey: 'contextStream.days7', fallback: '7d' },
  { value: '30', labelKey: 'contextStream.days30', fallback: '30d' },
  { value: '90', labelKey: 'contextStream.days90', fallback: '90d' },
] as const;

const FILTER_PARAM_KEYS = ['project', 'agent', 'kind', 'days'] as const;
type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

export interface ContextStreamProps {
  items: ContextItem[];
  projects: Array<{ id: string; name: string }>;
  agents: string[];
}

/**
 * The home stream: a filterable list of context items across every scope the
 * viewer can read.
 *
 * Purely presentational — `items` is already the filtered, visibility-scoped
 * result of {@link loadContextStream}. Filters here only ever WRITE search
 * params (`?project=&agent=&kind=&days=`) via `router.replace`; the page
 * re-reads those params server-side and re-runs the loader, which is what
 * makes a filtered view shareable as a URL. This component never filters
 * `items` client-side.
 */
export function ContextStream({ items, projects, agents }: ContextStreamProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProject = searchParams.get('project') ?? '';
  const currentAgent = searchParams.get('agent') ?? '';
  const currentKind = searchParams.get('kind') ?? '';
  const currentDays = searchParams.get('days') ?? '';

  const activeFilterCount = useMemo(
    () =>
      FILTER_PARAM_KEYS.filter((key) => Boolean(searchParams.get(key))).length,
    [searchParams],
  );

  const setFilter = useCallback(
    (key: FilterParamKey, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  const jumpToItem = useCallback((id: string) => {
    document
      .getElementById(streamRowId(id))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        projects={projects}
        agents={agents}
        currentProject={currentProject}
        currentAgent={currentAgent}
        currentKind={currentKind}
        currentDays={currentDays}
        activeFilterCount={activeFilterCount}
        onFilterChange={setFilter}
        onClear={clearFilters}
      />

      {items.length === 0 ? (
        <EmptyState activeFilterCount={activeFilterCount} />
      ) : (
        <ul
          className="flex flex-col divide-y"
          data-testid="context-stream-rows"
        >
          {items.map((item) => (
            <StreamRow key={item.id} item={item} onJumpToItem={jumpToItem} />
          ))}
        </ul>
      )}
    </div>
  );

  function streamRowId(id: string): string {
    return `context-stream-item-${id}`;
  }
}

function FilterBar({
  projects,
  agents,
  currentProject,
  currentAgent,
  currentKind,
  currentDays,
  activeFilterCount,
  onFilterChange,
  onClear,
}: {
  projects: Array<{ id: string; name: string }>;
  agents: string[];
  currentProject: string;
  currentAgent: string;
  currentKind: string;
  currentDays: string;
  activeFilterCount: number;
  onFilterChange: (key: FilterParamKey, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('agentguard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:contextStream.filters">Filters</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs">
            <Trans i18nKey="agentguard:contextStream.filterProject">
              Project
            </Trans>
          </label>
          <Select
            value={currentProject || ALL_VALUE}
            onValueChange={(value) =>
              onFilterChange('project', value === ALL_VALUE ? '' : value)
            }
          >
            <SelectTrigger className={cn('w-48', MIN_TAP_TARGET_CLASS)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t('contextStream.allProjects', 'All projects')}
              </SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs">
            <Trans i18nKey="agentguard:contextStream.filterAgent">Agent</Trans>
          </label>
          <Select
            value={currentAgent || ALL_VALUE}
            onValueChange={(value) =>
              onFilterChange('agent', value === ALL_VALUE ? '' : value)
            }
          >
            <SelectTrigger className={cn('w-40', MIN_TAP_TARGET_CLASS)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t('contextStream.allAgents', 'All agents')}
              </SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs">
            <Trans i18nKey="agentguard:contextStream.filterKind">Kind</Trans>
          </label>
          <Select
            value={currentKind || ALL_VALUE}
            onValueChange={(value) =>
              onFilterChange('kind', value === ALL_VALUE ? '' : value)
            }
          >
            <SelectTrigger className={cn('w-36', MIN_TAP_TARGET_CLASS)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t('contextStream.allKinds', 'All kinds')}
              </SelectItem>
              {KIND_FILTER_OPTIONS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            <Trans i18nKey="agentguard:contextStream.filterDays">Time</Trans>
          </span>
          <div className="flex gap-1" role="group">
            <Button
              type="button"
              variant={currentDays === '' ? 'default' : 'outline'}
              size="sm"
              className={cn('px-3', MIN_TAP_TARGET_CLASS)}
              onClick={() => onFilterChange('days', '')}
            >
              {t('contextStream.allTime', 'All time')}
            </Button>
            {DAY_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={currentDays === option.value ? 'default' : 'outline'}
                size="sm"
                className={cn('px-3', MIN_TAP_TARGET_CLASS)}
                onClick={() => onFilterChange('days', option.value)}
              >
                {t(option.labelKey, option.fallback)}
              </Button>
            ))}
          </div>
        </div>

        {activeFilterCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('px-3', MIN_TAP_TARGET_CLASS)}
            onClick={onClear}
          >
            <Trans i18nKey="agentguard:contextStream.clearFilters">
              Clear filters
            </Trans>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

const ALL_VALUE = '__all__';

function EmptyState({ activeFilterCount }: { activeFilterCount: number }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-center text-sm">
        {activeFilterCount > 0 ? (
          <Trans i18nKey="agentguard:contextStream.emptyFiltered">
            No items match the current filters.
          </Trans>
        ) : (
          <Trans i18nKey="agentguard:contextStream.emptyNoItems">
            No context yet. Once your agents start capturing decisions, plans,
            and facts, they will show up here.
          </Trans>
        )}
      </CardContent>
    </Card>
  );
}

function StreamRow({
  item,
  onJumpToItem,
}: {
  item: ContextItem;
  onJumpToItem: (id: string) => void;
}) {
  const { t } = useTranslation('agentguard');
  const [expanded, setExpanded] = useState(false);
  const replacementId = item.supersededBy;
  const superseded = replacementId !== null;

  return (
    <li
      id={`context-stream-item-${item.id}`}
      data-superseded={superseded ? '' : undefined}
      className="flex flex-col gap-1 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="font-mono text-xs whitespace-nowrap"
        >
          {item.kind}
        </Badge>

        {item.projectName ? (
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {item.projectName}
          </Badge>
        ) : null}

        {item.agentId ? (
          <span className="text-muted-foreground text-xs">
            {item.agentId}
            {item.userId ? ` · ${truncateId(item.userId)}` : ''}
          </span>
        ) : null}

        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className={cn(
          'text-foreground text-left text-sm',
          MIN_TAP_TARGET_CLASS,
          superseded && 'text-muted-foreground line-through opacity-60',
          expanded ? '' : 'line-clamp-1',
        )}
      >
        {item.content}
      </button>

      {replacementId ? (
        <button
          type="button"
          onClick={() => onJumpToItem(replacementId)}
          className={cn(
            'text-primary w-fit text-left text-xs hover:underline',
            MIN_TAP_TARGET_CLASS,
            'flex items-center',
          )}
        >
          {t('contextStream.replaced', 'replaced →')}
        </button>
      ) : null}
    </li>
  );
}
