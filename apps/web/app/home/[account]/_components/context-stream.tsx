'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { displayAgent } from '../_lib/display-agent';
import { displayMemory } from '../_lib/display-memory';
import { groupStreamByDay } from '../_lib/group-stream-by-day';
import {
  HUB_ALL_TIME_DAYS_PARAM,
  HUB_DEFAULT_STREAM_DAYS,
} from '../_lib/parse-stream-filters';
import type { ContextItem } from '../_lib/server/context-stream.loader';

const MIN_TAP_TARGET_CLASS = 'min-h-11';

const KIND_FILTER_OPTIONS = ['decision', 'plan', 'fact', 'note'] as const;

const DAY_FILTER_OPTIONS = [
  { value: '1', labelKey: 'contextStream.days1', fallback: '24h' },
  {
    value: String(HUB_DEFAULT_STREAM_DAYS),
    labelKey: 'contextStream.days7',
    fallback: '7d',
  },
  { value: '30', labelKey: 'contextStream.days30', fallback: '30d' },
  { value: '90', labelKey: 'contextStream.days90', fallback: '90d' },
] as const;

type FilterParamKey = 'project' | 'agent' | 'kind' | 'days';

const KIND_EMPHASIS_CLASS: Record<ContextItem['kind'], string> = {
  decision:
    'text-foreground text-[length:var(--text-regular)] leading-[var(--text-regular--line-height)] font-[510]',
  plan: 'text-foreground text-[length:var(--text-regular)] leading-[var(--text-regular--line-height)] font-[510]',
  fact: 'text-muted-foreground text-[length:var(--text-small)] leading-[var(--text-small--line-height)]',
  note: 'text-muted-foreground text-[length:var(--text-small)] leading-[var(--text-small--line-height)]',
  other:
    'text-muted-foreground text-[length:var(--text-small)] leading-[var(--text-small--line-height)]',
};

export interface ContextStreamProps {
  items: ContextItem[];
  projects: Array<{ id: string; name: string }>;
  agents: string[];
}

/**
 * Band 3 — a timeline, not a widget. Kind is a mono label. Content is the
 * row. Filters write URL state so a view is shareable.
 */
export function ContextStream({ items, projects, agents }: ContextStreamProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProject = searchParams.get('project') ?? '';
  const currentAgent = searchParams.get('agent') ?? '';
  const currentKind = searchParams.get('kind') ?? '';
  const currentDays = searchParams.get('days') ?? '';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get('project')) count += 1;
    if (searchParams.get('agent')) count += 1;
    if (searchParams.get('kind')) count += 1;
    const days = searchParams.get('days');
    if (days && days !== String(HUB_DEFAULT_STREAM_DAYS)) count += 1;
    return count;
  }, [searchParams]);

  const setFilter = useCallback(
    (key: FilterParamKey, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (
        value &&
        !(key === 'days' && value === String(HUB_DEFAULT_STREAM_DAYS))
      ) {
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

  const renderedItemIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items],
  );

  const dayGroups = useMemo(() => groupStreamByDay(items), [items]);

  return (
    <div className="flex flex-col gap-5">
      <FilterToolbar
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
        <div className="flex flex-col" data-testid="context-stream-rows">
          {dayGroups.map((group) => (
            <div key={group.key}>
              <h3 className="text-muted-foreground pt-6 pb-1 text-[length:var(--text-tiny)] font-[510] first:pt-0">
                {group.label}
              </h3>
              <ul className="divide-border/80 divide-y">
                {group.items.map((item) => (
                  <StreamRow
                    key={item.id}
                    item={item}
                    onJumpToItem={jumpToItem}
                    replacementIsRendered={
                      item.supersededBy !== null &&
                      renderedItemIds.has(item.supersededBy)
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function streamRowId(id: string): string {
    return `context-stream-item-${id}`;
  }
}

function FilterToolbar({
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
  const selectedDays =
    currentDays === '' || currentDays === String(HUB_DEFAULT_STREAM_DAYS)
      ? String(HUB_DEFAULT_STREAM_DAYS)
      : currentDays;

  return (
    <div
      data-testid="context-stream-toolbar"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="flex flex-wrap gap-1" role="group">
        {DAY_FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={selectedDays === option.value ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('px-2.5', MIN_TAP_TARGET_CLASS)}
            onClick={() => onFilterChange('days', option.value)}
          >
            {t(option.labelKey, option.fallback)}
          </Button>
        ))}
        <Button
          type="button"
          variant={
            currentDays === HUB_ALL_TIME_DAYS_PARAM ? 'secondary' : 'ghost'
          }
          size="sm"
          className={cn('px-2.5', MIN_TAP_TARGET_CLASS)}
          onClick={() => onFilterChange('days', HUB_ALL_TIME_DAYS_PARAM)}
        >
          {t('contextStream.allTime', 'All time')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Select
          value={currentProject || ALL_VALUE}
          onValueChange={(value) =>
            onFilterChange('project', value === ALL_VALUE ? '' : value)
          }
        >
          <SelectTrigger className={cn('w-36', MIN_TAP_TARGET_CLASS)}>
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

        <Select
          value={currentAgent || ALL_VALUE}
          onValueChange={(value) =>
            onFilterChange('agent', value === ALL_VALUE ? '' : value)
          }
        >
          <SelectTrigger className={cn('w-32', MIN_TAP_TARGET_CLASS)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {t('contextStream.allAgents', 'All agents')}
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent} value={agent}>
                {displayAgent(agent)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentKind || ALL_VALUE}
          onValueChange={(value) =>
            onFilterChange('kind', value === ALL_VALUE ? '' : value)
          }
        >
          <SelectTrigger className={cn('w-28', MIN_TAP_TARGET_CLASS)}>
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

        {activeFilterCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('px-2.5', MIN_TAP_TARGET_CLASS)}
            onClick={onClear}
          >
            <Trans i18nKey="agentguard:contextStream.clearFilters">
              Clear filters
            </Trans>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const ALL_VALUE = '__all__';

function EmptyState({ activeFilterCount }: { activeFilterCount: number }) {
  return (
    <p className="text-muted-foreground py-8 text-[length:var(--text-small)]">
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
    </p>
  );
}

function StreamRow({
  item,
  onJumpToItem,
  replacementIsRendered,
}: {
  item: ContextItem;
  onJumpToItem: (id: string) => void;
  replacementIsRendered: boolean;
}) {
  const { t } = useTranslation('agentguard');
  const [expanded, setExpanded] = useState(false);
  const replacementId = item.supersededBy;
  const superseded = replacementId !== null;

  const metaParts = [
    item.projectName,
    item.agentId ? displayAgent(item.agentId) : null,
    formatRelativeTime(item.createdAt),
  ].filter((part): part is string => Boolean(part));

  return (
    <li
      id={`context-stream-item-${item.id}`}
      data-superseded={superseded ? '' : undefined}
      className="flex items-baseline gap-3 py-2.5"
    >
      {item.kind === 'decision' || item.kind === 'plan' ? (
        <span
          aria-hidden="true"
          data-testid={`kind-glyph-${item.kind}`}
          className="text-muted-foreground w-16 shrink-0 font-mono text-[length:var(--text-tiny)] tracking-[0.04em] uppercase"
        >
          {item.kind}
        </span>
      ) : (
        <span data-testid={`kind-glyph-${item.kind}`} className="hidden" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className={cn(
            'text-left',
            MIN_TAP_TARGET_CLASS,
            KIND_EMPHASIS_CLASS[item.kind],
            superseded && 'text-muted-foreground line-through opacity-60',
            expanded ? 'whitespace-pre-wrap' : 'line-clamp-1',
          )}
        >
          {displayMemory(item.content)}
        </button>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--text-tiny)]">
          {metaParts.length > 0 ? <span>{metaParts.join(' · ')}</span> : null}

          {replacementId && replacementIsRendered ? (
            <button
              type="button"
              onClick={() => onJumpToItem(replacementId)}
              className={cn(
                'text-foreground/80 hover:text-foreground w-fit text-left hover:underline',
                MIN_TAP_TARGET_CLASS,
                'flex items-center',
              )}
            >
              {t('contextStream.replaced', 'replaced')}
            </button>
          ) : replacementId ? (
            <span className="w-fit text-left">
              {t('contextStream.replaced', 'replaced')}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}


