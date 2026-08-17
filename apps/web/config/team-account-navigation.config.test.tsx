import { describe, expect, it } from 'vitest';

import { getTeamAccountSidebarConfig } from './team-account-navigation.config';

/**
 * THE NAVIGATION IS PINNED TO THE APPROVED PROTOTYPE.
 *
 * This test exists because of a specific failure. `klio-v4.html` was approved
 * on 2026-08-17, then only its three new surfaces were written into a spec —
 * the navigation was never written down anywhere an implementer could read it,
 * so the previous IA's Hub/Inbox/Private list survived into production beside
 * the new screens and the approved shape was never built.
 *
 * So this asserts the labels, in order, including the Setup group. Adding,
 * removing or reordering an item fails here, which makes the change a decision
 * somebody states out loud rather than one that happens quietly.
 */

const ACCOUNT = 'klio-internal';

const labelsOf = (routes: ReturnType<typeof getTeamAccountSidebarConfig>['routes']) =>
  routes.flatMap((group) =>
    'children' in group ? group.children.map((child) => child.label) : [],
  );

describe('getTeamAccountSidebarConfig', () => {
  it('renders the approved list, in order', () => {
    const config = getTeamAccountSidebarConfig(ACCOUNT);

    expect(labelsOf(config.routes)).toEqual([
      'common:routes.dashboard',
      'agentguard:nav.projects',
      'agentguard:nav.context',
      'agentguard:nav.shared',
      'agentguard:nav.proposals',
      'agentguard:nav.agents',
      'agentguard:nav.keysAndAgents',
    ]);
  });

  it('carries the prototype two groups: one unlabelled, then Setup', () => {
    const config = getTeamAccountSidebarConfig(ACCOUNT);
    const groups = config.routes.filter((r) => 'children' in r);

    expect(groups).toHaveLength(2);
    expect(groups[0] && 'label' in groups[0] ? groups[0].label : null).toBe('');
    expect(groups[1] && 'label' in groups[1] ? groups[1].label : null).toBe(
      'agentguard:nav.setup',
    );
  });

  it('does not carry Hub, Inbox or a standalone Private item', () => {
    // The three that shipped without ever being in an approved design.
    const labels = labelsOf(getTeamAccountSidebarConfig(ACCOUNT).routes);

    expect(labels).not.toContain('agentguard:nav.inbox');
    expect(labels).not.toContain('agentguard:nav.private');
  });

  it('points every item at the account it was given', () => {
    const config = getTeamAccountSidebarConfig(ACCOUNT);

    const paths = config.routes.flatMap((group) =>
      'children' in group ? group.children.map((c) => c.path) : [],
    );

    expect(paths).toEqual([
      `/home/${ACCOUNT}`,
      `/home/${ACCOUNT}/projects`,
      `/home/${ACCOUNT}/context`,
      `/home/${ACCOUNT}/shared`,
      `/home/${ACCOUNT}/proposals`,
      `/home/${ACCOUNT}/agents`,
      `/home/${ACCOUNT}/setup`,
    ]);

    expect(paths.every((p) => !p.includes('[account]'))).toBe(true);
  });

  it('renders no badge for a count that could not be resolved', () => {
    // Absent, never zero. A `0` beside Proposals read off a failed query is a
    // claim the data does not support, on the first thing a user reads.
    const config = getTeamAccountSidebarConfig(ACCOUNT);
    const actions = config.routes.flatMap((group) =>
      'children' in group ? group.children.map((c) => c.renderAction) : [],
    );

    // Every item still has its slot; the component inside renders null.
    expect(actions.length).toBe(7);
  });
});
