import { describe, expect, it } from 'vitest';

import { getTeamAccountSidebarConfig } from './team-account-navigation.config';

/**
 * Shape test for the team account sidebar. The 2026-08-11 context-workspace
 * IA pass dropped the Sessions and Agents entries from the Workspace group
 * (their routes stay live at /home/[account]/{sessions,agents} — see the
 * "hidden, not removed" comment block in the config itself). This test
 * guards the nav *shape*, not the routes: it fails if Sessions/Agents/Memory
 * or Projects come back into the active `getRoutes` array, and it fails if
 * Inbox or Private (which are supposed to still be there) ever go missing.
 */
describe('getTeamAccountSidebarConfig', () => {
  const config = getTeamAccountSidebarConfig('acme');

  function allLabels(): string[] {
    return config.routes.flatMap((group) =>
      (group.children ?? []).map((child) => child.label),
    );
  }

  it('does not include a sessions nav entry', () => {
    expect(allLabels()).not.toContain('agentguard:nav.sessions');
  });

  it('does not include an agents nav entry', () => {
    expect(allLabels()).not.toContain('agentguard:nav.agents');
  });

  it('keeps inbox and private in the workspace group', () => {
    const workspaceGroup = config.routes.find(
      (group) => group.label === 'agentguard:nav.workspace',
    );

    expect(workspaceGroup).toBeDefined();

    const workspaceLabels = (workspaceGroup?.children ?? []).map(
      (child) => child.label,
    );

    expect(workspaceLabels).toContain('agentguard:nav.inbox');
    expect(workspaceLabels).toContain('agentguard:nav.private');
    expect(workspaceLabels).not.toContain('agentguard:nav.memory');
    expect(workspaceLabels).not.toContain('agentguard:nav.projects');
  });

  it('still includes the dashboard entry', () => {
    expect(allLabels()).toContain('common:routes.dashboard');
  });

  // The sidebar footer already links to the docs, and the connect-first-agent
  // card carries the setup instructions this entry existed for — so a whole
  // labelled nav group for one duplicate link came out.
  it('does not include a documentation nav entry', () => {
    expect(allLabels()).not.toContain('agentguard:nav.documentation');
  });

  it('does not include an empty getting-started group', () => {
    expect(
      config.routes.map((group) => 'label' in group && group.label),
    ).not.toContain('agentguard:nav.gettingStarted');
  });

  it('builds each visible path with the given account slug', () => {
    const workspaceGroup = config.routes.find(
      (group) => group.label === 'agentguard:nav.workspace',
    );

    const inboxEntry = workspaceGroup?.children?.find(
      (child) => child.label === 'agentguard:nav.inbox',
    );
    const privateEntry = workspaceGroup?.children?.find(
      (child) => child.label === 'agentguard:nav.private',
    );

    expect(inboxEntry?.path).toBe('/home/acme/inbox');
    expect(privateEntry?.path).toBe('/home/acme/private');
  });
});
