import type { ContextItem } from '../../_lib/server/context-stream.loader';

export function pickInboxItem(
  items: readonly { id: string }[],
  requestedId: string | undefined,
): string | undefined {
  if (requestedId && items.some((item) => item.id === requestedId)) {
    return requestedId;
  }

  return items[0]?.id;
}

export function inboxProjectHref(
  accountSlug: string,
  item: Pick<ContextItem, 'id' | 'projectId'>,
): string | null {
  if (!item.projectId) return null;

  return `/home/${accountSlug}/projects/${item.projectId}?item=${encodeURIComponent(item.id)}`;
}
