/**
 * Where a signed-in member should go before they see Hub.
 *
 * Two flags, two jobs:
 *   - workspace onboarding is the creator's "this workspace exists"
 *   - member onboarding is this human connecting their own agent
 *
 * Null means they can stay on the page they asked for.
 */
export function workspaceEntryPath(
  accountSlug: string,
  state: {
    workspaceCompleted: boolean;
    memberOnboarded: boolean;
    isPrimaryOwner: boolean;
  },
): string | null {
  if (!state.workspaceCompleted && state.isPrimaryOwner) {
    return `/onboarding?account=${encodeURIComponent(accountSlug)}`;
  }

  if (!state.memberOnboarded) {
    return `/onboarding/join?account=${encodeURIComponent(accountSlug)}`;
  }

  return null;
}

/** Stable per-user join key name. Revoke only this name, never anyone else's. */
export function joinKeyName(userId: string): string {
  return `Join · ${userId}`;
}
