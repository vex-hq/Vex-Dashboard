import type { ContextItem } from './server/context-stream.loader';

/**
 * The three latest deliberate writes the Hub should name, not just count.
 *
 * Decisions first, then plans. Active rows beat superseded ones. If the
 * workspace has not filed a decision or plan this week — the common case,
 * because the curator writes `fact` — the latest facts become the briefing
 * rather than leaving Band 1 empty.
 *
 * `retired` is every other visible item that this write superseded — the
 * Distil/Retire pair the Hub can actually show. A predecessor outside the
 * current stream (too old, filtered out) is omitted rather than guessed.
 */
export interface HubHighlight {
  readonly id: string;
  readonly kind: ContextItem['kind'];
  readonly content: string;
  readonly projectName: string | null;
  readonly agentId: string | null;
  readonly createdAt: string;
  readonly supersededBy: string | null;
  readonly retired: readonly string[];
}

const PRIMARY_KINDS = new Set(['decision', 'plan']);
const FACT_KINDS = new Set(['fact']);
const NOTE_KINDS = new Set(['note']);
const DEFAULT_LIMIT = 3;

export function pickHubHighlights(
  items: readonly ContextItem[],
  limit = DEFAULT_LIMIT,
): HubHighlight[] {
  const selected: HubHighlight[] = [];

  const fill = (kinds: Set<string>, requireActive: boolean) => {
    for (const item of items) {
      if (selected.length >= limit) return;
      if (!kinds.has(item.kind)) continue;
      if (requireActive && item.supersededBy !== null) continue;
      if (selected.some((already) => already.id === item.id)) continue;
      selected.push(toHighlight(item, items));
    }
  };

  fill(PRIMARY_KINDS, true);
  fill(PRIMARY_KINDS, false);
  if (selected.length === 0) {
    fill(FACT_KINDS, true);
    fill(FACT_KINDS, false);
  }
  if (selected.length === 0) {
    fill(NOTE_KINDS, true);
    fill(NOTE_KINDS, false);
  }

  return selected;
}

function toHighlight(
  item: ContextItem,
  items: readonly ContextItem[],
): HubHighlight {
  return {
    id: item.id,
    kind: item.kind,
    content: item.content,
    projectName: item.projectName,
    agentId: item.agentId,
    createdAt: item.createdAt,
    supersededBy: item.supersededBy,
    retired: items
      .filter((other) => other.supersededBy === item.id)
      .map((other) => other.content),
  };
}
