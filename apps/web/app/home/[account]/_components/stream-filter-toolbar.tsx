'use client';

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

import { displayAgent } from '../_lib/display-agent';
import {
  HUB_ALL_TIME_DAYS_PARAM,
  HUB_DEFAULT_STREAM_DAYS,
} from '../_lib/parse-stream-filters';

const MIN_TAP_TARGET_CLASS = 'min-h-11';

export const KIND_FILTER_OPTIONS = [
  'decision',
  'plan',
  'fact',
  'note',
] as const;

export const DAY_FILTER_OPTIONS = [
  { value: '1', labelKey: 'contextStream.days1', fallback: '24h' },
  {
    value: String(HUB_DEFAULT_STREAM_DAYS),
    labelKey: 'contextStream.days7',
    fallback: '7d',
  },
  { value: '30', labelKey: 'contextStream.days30', fallback: '30d' },
  { value: '90', labelKey: 'contextStream.days90', fallback: '90d' },
] as const;

export type StreamFilterParamKey = 'project' | 'agent' | 'kind' | 'days';

const ALL_VALUE = '__all__';

export function StreamFilterToolbar({
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
  onFilterChange: (key: StreamFilterParamKey, value: string) => void;
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
