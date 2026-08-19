'use client';

import { useMemo, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import type { ShellContextItem } from '../../_lib/server/shell-context.types';
import {
  type ContextFilters,
  NO_FILTERS,
  applyFilters,
  toggleKind,
  toggleProject,
} from '../../_lib/shell/context-filters';
import { ContextTable } from './context-table';
import { FilterChips, type KindCount, type ProjectCount } from './shell-chrome';
import { ItemDrawer } from './item-drawer';

/**
 * Filters over a list, the list, and the drawer over both.
 *
 * Backs Home and Context, which in the prototype differ only in what sits
 * above the chip row. Filtering happens over the rows already loaded rather
 * than by refetching — see `context-filters.ts` for why that is deliberate.
 */
export function ShellList({
  items,
  kinds,
  projects,
  accountSlug,
  initialProject = null,
  above,
}: {
  items: readonly ShellContextItem[];
  kinds: readonly KindCount[];
  projects: readonly ProjectCount[];
  accountSlug: string;
  /** Set when arriving from the Projects screen, which filters on click. */
  initialProject?: string | null;
  above?: React.ReactNode;
}) {
  const [filters, setFilters] = useState<ContextFilters>(
    initialProject ? { ...NO_FILTERS, project: initialProject } : NO_FILTERS,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Mirror the project filter into the URL.
   *
   * The project strip is rendered by the SERVER, from `?project=`. Filters are
   * client state, so a chip that only set state left the strip invisible for
   * the way people actually filter — click the chip, not arrive from Projects.
   * Reflecting the choice into the URL gives both paths one source of truth,
   * and makes a filtered view linkable, which it was not before.
   *
   * `replace`, not `push`: toggling a chip is refining a view, not navigating,
   * and it should not take a Back press per chip to leave the screen.
   */
  const syncProjectToUrl = (project: string | null) => {
    const params = new URLSearchParams(window.location.search);

    if (project) params.set('project', project);
    else params.delete('project');

    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const visible = useMemo(
    () => applyFilters(items, filters),
    [items, filters],
  );

  // Resolved from the full list, not the filtered one: an item stays open
  // while the filter beneath it changes, and closing it should not depend on
  // whether it still matches.
  const open = useMemo(
    () => items.find((i) => i.id === openId) ?? null,
    [items, openId],
  );

  return (
    <div className="flex flex-col gap-4">
      {above}

      <FilterChips
        kinds={kinds}
        projects={projects}
        filters={filters}
        onToggleKind={(kind) => setFilters((f) => toggleKind(f, kind))}
        onToggleProject={(project) =>
          setFilters((f) => {
            const next = toggleProject(f, project);
            syncProjectToUrl(next.project);

            return next;
          })
        }
        onClear={() => {
          setFilters(NO_FILTERS);
          syncProjectToUrl(null);
        }}
      />

      <ContextTable
        items={visible}
        selectedId={openId}
        onSelect={setOpenId}
      />

      <ItemDrawer
        item={open}
        accountSlug={accountSlug}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
