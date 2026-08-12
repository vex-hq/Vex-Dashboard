import { describe, expect, it } from 'vitest';

import { getTeamAccountSidebarConfig } from './team-account-navigation.config';

/**
 * Shape test for the team account sidebar. The 2026-08-11 context-workspace
 * IA pass dropped the Sessions and Agents entries from the Workspace group
 * (their routes stay live at /home/[account]/{sessions,agents} — see the
 * "hidden, not removed" comment block in the config itself). This test
 * guards the nav *shape*, not the routes: it fails if either label ever
 * comes back into the active `getRoutes` array, and it fails if Memory or
 * Projects (which are supposed to still be there) ever go missing.
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

  it('still includes memory and projects in the workspace group', () => {
    const workspaceGroup = config.routes.find(
      (group) => group.label === 'agentguard:nav.workspace',
    );

    expect(workspaceGroup).toBeDefined();

    const workspaceLabels = (workspaceGroup?.children ?? []).map(
      (child) => child.label,
    );

    expect(workspaceLabels).toContain('agentguard:nav.memory');
    expect(workspaceLabels).toContain('agentguard:nav.projects');
  });

  it('still includes the dashboard and documentation entries', () => {
    expect(allLabels()).toContain('common:routes.dashboard');
    expect(allLabels()).toContain('agentguard:nav.documentation');
  });

  it('builds each visible path with the given account slug', () => {
    const workspaceGroup = config.routes.find(
      (group) => group.label === 'agentguard:nav.workspace',
    );

    const memoryEntry = workspaceGroup?.children?.find(
      (child) => child.label === 'agentguard:nav.memory',
    );

    expect(memoryEntry?.path).toBe('/home/acme/memory');
  });
});
