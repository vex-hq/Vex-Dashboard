'use client';

import { useMemo, useState } from 'react';

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
          setFilters((f) => toggleProject(f, project))
        }
        onClear={() => setFilters(NO_FILTERS)}
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
