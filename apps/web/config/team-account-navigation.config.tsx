import { Brain, FolderGit2, Hexagon } from 'lucide-react';

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
 * again to match the target IA (Home · Projects · Memory · Docs). Both routes
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
const getRoutes = (account: string) => [
  {
    label: '',
    children: [
      {
        label: 'common:routes.dashboard',
        path: pathsConfig.app.accountHome.replace('[account]', account),
        Icon: <Hexagon className={iconClasses} />,
        end: true,
      },
    ],
  },
  {
    label: 'agentguard:nav.workspace',
    children: [
      {
        label: 'agentguard:nav.memory',
        path: createPath(pathsConfig.app.accountMemory, account),
        Icon: <Brain className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.projects',
        path: createPath(pathsConfig.app.accountProjects, account),
        Icon: <FolderGit2 className={iconClasses} />,
        end: true,
      },
    ],
  },
  // ── Getting Started / Documentation — hidden, not removed ─────────────────
  // A whole labelled nav group for one link that the sidebar footer already
  // carries as "Docs". The connection instructions it was surfaced for now
  // live on the home screen itself (the connect-first-agent card), so this
  // was the third route to the same place. Route remains live at
  // /home/[account]/docs. To restore, uncomment.
  //
  // {
  //   label: 'agentguard:nav.gettingStarted',
  //   children: [
  //     {
  //       label: 'agentguard:nav.documentation',
  //       path: createPath(pathsConfig.app.accountDocs, account),
  //       Icon: <BookOpen className={iconClasses} />,
  //     },
  //   ],
  // },

  // ── Sessions / Agents — hidden, not removed ───────────────────────────────
  // Both are real, populated pages (session_memories: 37k rows / 272 sessions).
  // Dropped from the target IA (Home · Projects · Memory · Docs) by the
  // 2026-08-11 context-workspace pass, not because the data is dead — Memory
  // and Projects now carry that surface area. Routes remain live at
  // /home/[account]/{sessions,agents}. To restore an item, uncomment it.
  //
  // {
  //   label: 'agentguard:nav.workspace',
  //   children: [
  //     {
  //       label: 'agentguard:nav.sessions',
  //       path: createPath(pathsConfig.app.accountSessions, account),
  //       Icon: <Activity className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.agents',
  //       path: createPath(pathsConfig.app.accountAgents, account),
  //       Icon: <Sparkles className={iconClasses} />,
  //     },
  //   ],
  // },

  // ── Vex reliability console — hidden, not removed ──────────────────────────
  // Fed only via the Vex SDK; empty for every memory-only org.
  // Routes remain live at
  // /home/[account]/{execution-sessions,agents/failures,alerts,tools}.
  //
  // {
  //   label: 'agentguard:nav.monitoring',
  //   children: [
  //     {
  //       label: 'agentguard:nav.executionSessions',
  //       path: createPath(pathsConfig.app.accountExecutionSessions, account),
  //       Icon: <Activity className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.failures',
  //       path: createPath(pathsConfig.app.accountFailures, account),
  //       Icon: <ShieldAlert className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.alerts',
  //       path: createPath(pathsConfig.app.accountAlerts, account),
  //       Icon: <AlertTriangle className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.toolUsage',
  //       path: createPath(pathsConfig.app.accountToolUsage, account),
  //       Icon: <Wrench className={iconClasses} />,
  //     },
  //   ],
  // },

  // ── Evals — hidden, not removed ───────────────────────────────────────────
  // `datasets` has never held a row; `experiments` holds two. Dead for all orgs.
  //
  // {
  //   label: 'agentguard:nav.evals',
  //   children: [
  //     {
  //       label: 'agentguard:nav.experiments',
  //       path: createPath(pathsConfig.app.accountExperiments, account),
  //       Icon: <FlaskConical className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.datasets',
  //       path: createPath(pathsConfig.app.accountDatasets, account),
  //       Icon: <Database className={iconClasses} />,
  //     },
  //   ],
  // },

  // ── Configuration — hidden, not removed ───────────────────────────────────
  // `guardrails` has never held a row. Integrations is alert-rule plumbing
  // (Slack for outbound alerts), so it follows Alerts out of the sidebar.
  // API keys and members still live under the account settings menu.
  //
  // {
  //   label: 'agentguard:nav.configuration',
  //   children: [
  //     {
  //       label: 'agentguard:nav.guardrails',
  //       path: createPath(pathsConfig.app.accountGuardrails, account),
  //       Icon: <Shield className={iconClasses} />,
  //     },
  //     {
  //       label: 'agentguard:nav.integrations',
  //       path: createPath(pathsConfig.app.accountIntegrations, account),
  //       Icon: <Plug className={iconClasses} />,
  //     },
  //   ],
  // },
];

export function getTeamAccountSidebarConfig(account: string) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(account),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
    sidebarCollapsed: process.env.NEXT_PUBLIC_TEAM_SIDEBAR_COLLAPSED,
    sidebarCollapsedStyle: process.env.NEXT_PUBLIC_SIDEBAR_COLLAPSIBLE_STYLE,
  });
}

function createPath(path: string, account: string) {
  return path.replace('[account]', account);
}
