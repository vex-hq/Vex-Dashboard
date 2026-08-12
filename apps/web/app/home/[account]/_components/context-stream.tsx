'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  CheckCircle2,
  Circle,
  FileText,
  Gavel,
  StickyNote,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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

import { groupStreamByDay } from '../_lib/group-stream-by-day';
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

/**
 * Kind -> glyph. Purely decorative alongside the existing text badge — kind
 * is carried by icon + badge, never by color (a four-hue kind palette was
 * computed and failed CVD validation). `aria-hidden` on every glyph: the
 * badge text is the accessible name for kind, the icon is a redundant
 * visual accelerator.
 */
const KIND_ICONS: Record<ContextItem['kind'], typeof Gavel> = {
  decision: Gavel,
  plan: CheckCircle2,
  fact: FileText,
  note: StickyNote,
  other: Circle,
};

/**
 * Ink + size hierarchy: decisions and plans (deliberate writes) render in
 * primary ink at text-regular; facts and notes (telemetry) recede into
 * muted ink at text-small. This is the whole point of the redesign — it is
 * what makes the screen answerable at a glance without reading every row.
 */
const KIND_EMPHASIS_CLASS: Record<ContextItem['kind'], string> = {
  decision:
    'text-foreground text-[length:var(--text-regular)] leading-[var(--text-regular--line-height)]',
  plan: 'text-foreground text-[length:var(--text-regular)] leading-[var(--text-regular--line-height)]',
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
 * The home stream: a filterable timeline of context items across every scope
 * the viewer can read, grouped under day headers (Band 3 of the Hub
 * redesign).
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

  /**
   * The set of ids currently rendered in `items`. Used to decide whether a
   * superseded row's "replaced →" pointer can actually jump anywhere: the
   * loader (Task 1, frozen) has no `itemId` filter, so a replacement outside
   * the current filtered/paged view simply isn't in `items`. Derived once
   * per `items` change — never mutates `items` itself.
   */
  const renderedItemIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items],
  );

  const dayGroups = useMemo(() => groupStreamByDay(items), [items]);

  return (
    <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-1" data-testid="context-stream-rows">
          {dayGroups.map((group) => (
            <div key={group.key}>
              <h3 className="text-muted-foreground px-1 pt-4 pb-1 text-[length:var(--text-tiny)] font-[590] tracking-wide uppercase first:pt-0">
                {group.label}
              </h3>
              <ul className="flex flex-col divide-y">
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

/**
 * The old boxed "Filters" panel collapsed into a single unlabelled toolbar
 * row: no Card header, no "Filters" title — the controls speak for
 * themselves. "Clear" only appears once a filter is actually set, so the
 * toolbar's resting state is as quiet as possible.
 */
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

  return (
    <div
      data-testid="context-stream-toolbar"
      className="flex flex-wrap items-center gap-2"
    >
      <Select
        value={currentProject || ALL_VALUE}
        onValueChange={(value) =>
          onFilterChange('project', value === ALL_VALUE ? '' : value)
        }
      >
        <SelectTrigger className={cn('w-40', MIN_TAP_TARGET_CLASS)}>
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
        <SelectTrigger className={cn('w-36', MIN_TAP_TARGET_CLASS)}>
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

      <Select
        value={currentKind || ALL_VALUE}
        onValueChange={(value) =>
          onFilterChange('kind', value === ALL_VALUE ? '' : value)
        }
      >
        <SelectTrigger className={cn('w-32', MIN_TAP_TARGET_CLASS)}>
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
    </div>
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
  const Icon = KIND_ICONS[item.kind];

  const metaParts = [item.agentId, formatRelativeTime(item.createdAt)].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <li
      id={`context-stream-item-${item.id}`}
      data-superseded={superseded ? '' : undefined}
      className="flex gap-3 py-3"
    >
      <span
        aria-hidden="true"
        data-testid={`kind-glyph-${item.kind}`}
        className="border-border bg-muted/40 text-muted-foreground mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <Badge
            variant="outline"
            className="font-mono text-xs whitespace-nowrap"
          >
            {item.kind}
          </Badge>

          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className={cn(
              'text-left',
              MIN_TAP_TARGET_CLASS,
              KIND_EMPHASIS_CLASS[item.kind],
              superseded && 'text-muted-foreground line-through opacity-60',
              expanded ? '' : 'line-clamp-1',
            )}
          >
            {item.content}
          </button>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[length:var(--text-tiny)]">
          {item.projectName ? (
            <Badge
              variant="secondary"
              className="text-[length:var(--text-tiny)] font-normal whitespace-nowrap"
            >
              {item.projectName}
            </Badge>
          ) : null}

          {metaParts.length > 0 ? (
            <span>
              {metaParts.join(' · ')}
              {item.userId ? ` · ${truncateId(item.userId)}` : ''}
            </span>
          ) : null}
        </div>

        {replacementId && replacementIsRendered ? (
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
        ) : replacementId ? (
          <span className="text-muted-foreground w-fit text-left text-xs">
            {t('contextStream.replaced', 'replaced →')}
          </span>
        ) : null}
      </div>
    </li>
  );
}
