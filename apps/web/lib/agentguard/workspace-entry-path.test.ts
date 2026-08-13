import { describe, expect, it } from 'vitest';

import { joinKeyName, workspaceEntryPath } from './workspace-entry-path';

describe('workspaceEntryPath', () => {
  it('sends the owner through workspace onboarding first', () => {
    expect(
      workspaceEntryPath('acme', {
        workspaceCompleted: false,
        memberOnboarded: false,
        isPrimaryOwner: true,
      }),
    ).toBe('/onboarding?account=acme');
  });

  it('sends an invitee to join connect, even if the workspace is unfinished', () => {
    expect(
      workspaceEntryPath('acme', {
        workspaceCompleted: false,
        memberOnboarded: false,
        isPrimaryOwner: false,
      }),
    ).toBe('/onboarding/join?account=acme');
  });

  it('sends a joined member who has not connected to join connect', () => {
    expect(
      workspaceEntryPath('acme', {
        workspaceCompleted: true,
        memberOnboarded: false,
        isPrimaryOwner: false,
      }),
    ).toBe('/onboarding/join?account=acme');
  });

  it('lets an onboarded member stay', () => {
    expect(
      workspaceEntryPath('acme', {
        workspaceCompleted: true,
        memberOnboarded: true,
        isPrimaryOwner: false,
      }),
    ).toBeNull();
  });
});

describe('joinKeyName', () => {
  it('is unique per user so revoke cannot touch another member', () => {
    expect(joinKeyName('user-1')).toBe('Join · user-1');
    expect(joinKeyName('user-1')).not.toBe(joinKeyName('user-2'));
  });
});
