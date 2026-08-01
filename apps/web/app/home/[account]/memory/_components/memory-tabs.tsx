import Link from 'next/link';

import { Brain, FolderGit2, Users } from 'lucide-react';

import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

/**
 * The three memory views: Mine, Projects, Team.
 *
 * Tab state lives in the URL (`?tab=`) rather than in client state, because
 * each tab is backed by a DIFFERENT server loader with a different visibility
 * predicate. Rendering all three and hiding two would mean loading private
 * rows on every visit and relying on CSS to keep them off screen — the loaders
 * must not run at all for a tab the user is not looking at.
 */
export const MEMORY_TABS = ['mine', 'projects', 'team'] as const;

export type MemoryTab = (typeof MEMORY_TABS)[number];

/** Parse `?tab=` into a known tab, defaulting to the caller's own memories. */
export function parseMemoryTab(value: string | undefined): MemoryTab {
  return MEMORY_TABS.includes(value as MemoryTab) ? (value as MemoryTab) : 'mine';
}

const TAB_META: Record<
  MemoryTab,
  { icon: typeof Brain; labelKey: string; hintKey: string }
> = {
  mine: {
    icon: Brain,
    labelKey: 'agentguard:memory.tabMine',
    hintKey: 'agentguard:memory.tabMineHint',
  },
  projects: {
    icon: FolderGit2,
    labelKey: 'agentguard:memory.tabProjects',
    hintKey: 'agentguard:memory.tabProjectsHint',
  },
  team: {
    icon: Users,
    labelKey: 'agentguard:memory.tabTeam',
    hintKey: 'agentguard:memory.tabTeamHint',
  },
};

export function MemoryTabs({
  accountSlug,
  active,
}: {
  accountSlug: string;
  active: MemoryTab;
}) {
  return (
    <div className="flex flex-col gap-2">
      <nav className="border-border flex flex-wrap items-center gap-1 border-b">
        {MEMORY_TABS.map((tab) => {
          const { icon: Icon, labelKey } = TAB_META[tab];
          const isActive = tab === active;

          return (
            <Link
              key={tab}
              href={`/home/${accountSlug}/memory?tab=${tab}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <Trans i18nKey={labelKey} />
            </Link>
          );
        })}
      </nav>

      <p className="text-muted-foreground text-sm">
        <Trans i18nKey={TAB_META[active].hintKey} />
      </p>
    </div>
  );
}
