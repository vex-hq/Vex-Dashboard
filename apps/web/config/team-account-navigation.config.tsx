import {
  Activity,
  AlertTriangle,
  Database,
  FlaskConical,
  Hexagon,
  Plug,
  Shield,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

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
  {
    label: 'agentguard:nav.monitoring',
    children: [
      {
        label: 'agentguard:nav.agents',
        path: createPath(pathsConfig.app.accountAgents, account),
        Icon: <Sparkles className={iconClasses} />,
        end: true,
      },
      {
        label: 'agentguard:nav.sessions',
        path: createPath(pathsConfig.app.accountSessions, account),
        Icon: <Activity className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.failures',
        path: createPath(pathsConfig.app.accountFailures, account),
        Icon: <ShieldAlert className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.alerts',
        path: createPath(pathsConfig.app.accountAlerts, account),
        Icon: <AlertTriangle className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.toolUsage',
        path: createPath(pathsConfig.app.accountToolUsage, account),
        Icon: <Wrench className={iconClasses} />,
      },
    ],
  },
  {
    label: 'agentguard:nav.evals',
    children: [
      {
        label: 'agentguard:nav.experiments',
        path: createPath(pathsConfig.app.accountExperiments, account),
        Icon: <FlaskConical className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.datasets',
        path: createPath(pathsConfig.app.accountDatasets, account),
        Icon: <Database className={iconClasses} />,
      },
    ],
  },
  {
    label: 'agentguard:nav.configuration',
    children: [
      {
        label: 'agentguard:nav.guardrails',
        path: createPath(pathsConfig.app.accountGuardrails, account),
        Icon: <Shield className={iconClasses} />,
      },
      {
        label: 'agentguard:nav.integrations',
        path: createPath(pathsConfig.app.accountIntegrations, account),
        Icon: <Plug className={iconClasses} />,
      },
    ],
  },
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
