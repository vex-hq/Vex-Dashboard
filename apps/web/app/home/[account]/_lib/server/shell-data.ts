import 'server-only';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import { loadAccountViewer } from './account-viewer';
import { loadShellContext } from './shell-context.loader';
import type {
  ShellContextItem,
  ShellProject,
} from './shell-context.types';
import { loadShellProjects } from './shell-projects.loader';

/**
 * Run one loader, degrading to `fallback` if it fails.
 *
 * Identical to the context page's own `orFallback` and kept identical on
 * purpose. The reason is documented there at length: a cold Neon resume
 * blowing the connect budget used to throw out of a server component and turn
 * the whole page into an error screen (production digests 1176364607 /
 * 1376536570). A screen that renders its empty state is worth strictly more
 * than a crash page, so each loader fails alone.
 *
 * NOTE what the fallbacks are — empty lists and zeroed stats. Both are
 * indistinguishable from "you have nothing here", which is the SAFE direction
 * to be wrong in: the failure mode that matters is a loader error somehow
 * WIDENING what is shown, and an empty fallback cannot do that.
 */
export async function orFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[shell] loader "${label}" failed; rendering fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
}

export interface ShellContextData {
  items: ShellContextItem[];
  projects: ShellProject[];
  kinds: { kind: string; n: number }[];
  accountSlug: string;
}

/**
 * The rows, the projects and the kind tallies for one screen.
 *
 * The kind counts are derived from the loaded rows rather than queried
 * separately, so the number on a chip always equals the number of rows that
 * chip reveals. A separate `GROUP BY memory_type` over the whole table would
 * be more "correct" and would put, say, `fact 2405` on a chip that filters a
 * 200-row list down to 140 — a number that is true about the database and a
 * lie about the screen.
 */
export async function loadShellContextData(
  accountSlug: string,
): Promise<ShellContextData> {
  const [orgId, viewer] = await Promise.all([
    resolveOrgId(accountSlug),
    loadAccountViewer(accountSlug),
  ]);

  const [items, projects] = await Promise.all([
    orFallback('context', [] as ShellContextItem[], () =>
      loadShellContext(orgId, viewer.userId),
    ),
    orFallback('projects', [] as ShellProject[], () =>
      loadShellProjects(orgId, viewer.userId),
    ),
  ]);

  return {
    items,
    projects,
    kinds: tallyKinds(items),
    accountSlug,
  };
}

function tallyKinds(items: readonly ShellContextItem[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([kind, n]) => ({ kind, n }))
    .sort((a, b) => b.n - a.n);
}
