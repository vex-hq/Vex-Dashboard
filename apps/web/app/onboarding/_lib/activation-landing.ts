/**
 * Where to send someone after they finish onboarding.
 *
 * Proof is the write, not Hub. A project-tagged memory opens that project
 * with the row selected. An unscoped write opens Inbox. No write (they
 * skipped verify) stays on Hub so the connect card can still catch them.
 */
export function activationHref(
  accountSlug: string,
  write: { id: string; projectId: string | null } | null,
): string {
  if (!write) return `/home/${accountSlug}`;
  if (write.projectId) {
    return `/home/${accountSlug}/projects/${write.projectId}?item=${encodeURIComponent(write.id)}`;
  }

  return `/home/${accountSlug}/inbox?item=${encodeURIComponent(write.id)}`;
}
