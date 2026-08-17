import {
  BookOpen,
  FolderGit2,
  Hexagon,
  Layers,
  Lightbulb,
  Sparkles,
  Users,
} from 'lucide-react';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

/**
 * Team account sidebar.
 *
 * Pruned to the memory product on 2026-07-29. What was here before was the Vex
 * reliability console — twelve items across Monitoring / Evals / Configuration
 * — and for a Klio user most of them could never populate.
 *
 * The evidence came from the engine database, reviewed 2026-07-29 across every
 * active org: all but one had zero executions and zero alerts, so Failures,
 * Alerts and Tool Usage were dead ends for them. The reliability tables are fed
 * by a single org that drives them through the Vex SDK rather than through
 * Klio's MCP surface.
 *
 * The Evals group and Guardrails were dead for everyone: `datasets` and
 * `guardrails` have never held a row, and `experiments` holds two.
 *
 * Sessions is the exception, and the first cut got it wrong: the item was
 * dropped because the page queried `executions`, which is empty for a
 * memory-only org — but `session_memories` holds 37k rows across 272 sessions.
 * The need was real, the data source was wrong. The page was repointed at
 * `session_memories` and the item came back — but as of the 2026-08-11
 * context-workspace IA pass, Sessions and Agents are pruned from the sidebar
 * again to match the target IA (Hub · Inbox · Private). Both routes
 * remain live at /home/[account]/sessions and /home/[account]/agents; only
 * the nav entries are gone, same hidden-not-deleted treatment as everything
 * below.
 *
 * IMPORTANT — nothing was deleted. Every route, loader and page is still in the
 * tree and still reachable by URL, so the org that does use the reliability
 * console keeps its dashboards; they are simply no longer advertised to people
 * who signed up for shared memory. To restore an item, uncomment it.
 *
 * A per-org solution would be better than commenting: render a nav item only
 * when that org has data behind it. That needs this config to become
 * data-aware, which is a bigger change than the pruning it would justify today.
 */
/**
 * The nav counts. Absent means "not resolved" and renders no badge — see
 * `shell-stats.loader`, which returns nulls rather than zeros on failure,
 * because a `0` beside Proposals is a claim and this nav is the first thing a
 * user reads.
 */
export interface SidebarCounts {
  projects: number | null;
  context: number | null;
  shared: number | null;
  proposals: number | null;
  agents: number | null;
}

const NO_COUNTS: SidebarCounts = {
  projects: null,
  context: null,
  shared: null,
  proposals: null,
  agents: null,
};

function Count({ value }: { value: number | null }) {
  if (value === null) return null;

  return (
    <span className="text-[11px] tabular-nums text-muted-foreground">
      {value.toLocaleString()}
    </span>
  );
}

/**
 * THE SIDEBAR IS THE APPROVED PROTOTYPE'S, ITEM FOR ITEM.
 *
 * Home · Projects · Context · Shared · Proposals · Agents, each with a live
 * count, then a Setup group holding "Keys & agents". That list is transcribed
 * from `klio-v4.html` and is fixed by `team-account-navigation.config.test.tsx`,
 * which asserts the labels in order and fails if an item is added, removed or
 * reordered.
 *
 * The test exists because of what happened without it. The prototype was
 * approved on 2026-08-17 and then only its three new surfaces were specced;
 * the navigation was never written down, so the Hub/Inbox/Private list from
 * the previous IA survived into production beside them and the approved shape
 * was never built. A nav that nobody wrote down is a nav that drifts.
 *
 * Adding an item here is therefore a decision to be made out loud: change the
 * test in the same commit, and say which approved design the new item comes
 * from.
 */
const getRoutes = (account: string, counts: SidebarCounts) => [
  {
    label: '',
    children: [
      {
        label: 'common:routes.dashboard',
        path: pathsConfig.app.accountHome.replace('[account]', account),
        Icon: <Hexagon className={iconClasses} />,
        end: true,
      },
      {
        label: 'agentguard:nav.projects',
        path: createPath(pathsConfig.app.accountProjects, account),
        Icon: <FolderGit2 className={iconClasses} />,
        end: true,
        renderAction: <Count value={counts.projects} />,
      },
      {
        label: 'agentguard:nav.context',
        path: createPath(pathsConfig.app.accountContext, account),
        Icon: <Layers className={iconClasses} />,
        end: true,
        renderAction: <Count value={counts.context} />,
      },
      {
        label: 'agentguard:nav.shared',
        path: createPath(pathsConfig.app.accountShared, account),
        Icon: <Users className={iconClasses} />,
        end: true,
        renderAction: <Count value={counts.shared} />,
      },
      {
        label: 'agentguard:nav.proposals',
        path: createPath(pathsConfig.app.accountProposals, account),
        Icon: <Lightbulb className={iconClasses} />,
        end: true,
        renderAction: <Count value={counts.proposals} />,
      },
      {
        label: 'agentguard:nav.agents',
        path: createPath(pathsConfig.app.accountAgents, account),
        Icon: <Sparkles className={iconClasses} />,
        end: true,
        renderAction: <Count value={counts.agents} />,
      },
    ],
  },
  {
    label: 'agentguard:nav.setup',
    children: [
      {
        label: 'agentguard:nav.keysAndAgents',
        path: createPath(pathsConfig.app.accountSetup, account),
        Icon: <BookOpen className={iconClasses} />,
        end: true,
      },
    ],
  },
];

export function getTeamAccountSidebarConfig(
  account: string,
  counts: SidebarCounts = NO_COUNTS,
) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(account, counts),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
    sidebarCollapsed: process.env.NEXT_PUBLIC_TEAM_SIDEBAR_COLLAPSED,
    sidebarCollapsedStyle: process.env.NEXT_PUBLIC_SIDEBAR_COLLAPSIBLE_STYLE,
  });
}

function createPath(path: string, account: string) {
  return path.replace('[account]', account);
}
