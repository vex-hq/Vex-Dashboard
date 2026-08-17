import { describe, expect, it } from 'vitest';

import { getTeamAccountSidebarConfig } from './team-account-navigation.config';

/**
 * Shape test for the team account sidebar. The 2026-08-11 context-workspace
 * IA pass dropped the Sessions and Agents entries (their routes stay live at
 * /home/[account]/{sessions,agents} — see the "hidden, not removed" comment
 * block in the config itself). Visible items are Hub · Inbox · Context ·
 * Proposals · Private in one unlabeled list (Context and Proposals added by
 * the 2026-08-17 context-surfaces addendum). This test guards the nav *shape*: it fails if
 * Sessions/Agents/Memory or Projects come back into the active `getRoutes`
 * array, and it fails if Inbox or Private ever go missing.
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

  it('keeps hub, inbox, context, proposals and private in one unlabeled list', () => {
    const primary = config.routes.find((group) => group.label === '');

    expect(primary).toBeDefined();

    const labels = (primary?.children ?? []).map((child) => child.label);

    expect(labels).toEqual([
      'common:routes.dashboard',
      'agentguard:nav.inbox',
      'agentguard:nav.context',
      'agentguard:nav.proposals',
      'agentguard:nav.private',
    ]);
    expect(labels).not.toContain('agentguard:nav.memory');
    expect(labels).not.toContain('agentguard:nav.projects');
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
    const primary = config.routes.find((group) => group.label === '');

    const inboxEntry = primary?.children?.find(
      (child) => child.label === 'agentguard:nav.inbox',
    );
    const privateEntry = primary?.children?.find(
      (child) => child.label === 'agentguard:nav.private',
    );

    const contextEntry = primary?.children?.find(
      (child) => child.label === 'agentguard:nav.context',
    );
    const proposalsEntry = primary?.children?.find(
      (child) => child.label === 'agentguard:nav.proposals',
    );

    expect(inboxEntry?.path).toBe('/home/acme/inbox');
    expect(privateEntry?.path).toBe('/home/acme/private');
    expect(contextEntry?.path).toBe('/home/acme/context');
    expect(proposalsEntry?.path).toBe('/home/acme/proposals');
  });
});
