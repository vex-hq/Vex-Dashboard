/**
 * The filter model behind the chip row on Home and Context.
 *
 * The prototype holds two independent filters — one project, one kind — and
 * combines them with AND:
 *
 *     function shown(){return items.filter(i=>
 *       (!fProj||i.project===fProj)&&(!fKind||i.kind===fKind));}
 *
 * Selecting an already-active chip clears it, so a chip is a toggle rather
 * than a radio. The `clear` chip appears only when at least one filter is set.
 *
 * Pure functions, no React and no SQL: filtering happens over the rows already
 * loaded for the screen, exactly as the prototype does it. This is deliberate
 * and is not a performance oversight — the list is capped by the loader, so
 * filtering client-side keeps chip toggling instant and avoids a round trip
 * that would make the counts on the chips disagree with the rows beneath them.
 */

/** The subset of a row this module needs. Keeps it usable by any row shape. */
export interface FilterableRow {
  kind: string;
  projectName: string | null;
}

export interface ContextFilters {
  project: string | null;
  kind: string | null;
}

export const NO_FILTERS: ContextFilters = { project: null, kind: null };

/** How many project chips the prototype shows: `K.projects.slice(0,6)`. */
export const PROJECT_CHIP_LIMIT = 6;

export function applyFilters<T extends FilterableRow>(
  rows: readonly T[],
  filters: ContextFilters,
): T[] {
  return rows.filter(
    (row) =>
      (!filters.project || row.projectName === filters.project) &&
      (!filters.kind || row.kind === filters.kind),
  );
}

/** Toggle semantics: selecting the active value clears it. */
export function toggleProject(
  filters: ContextFilters,
  project: string,
): ContextFilters {
  return {
    ...filters,
    project: filters.project === project ? null : project,
  };
}

export function toggleKind(
  filters: ContextFilters,
  kind: string,
): ContextFilters {
  return { ...filters, kind: filters.kind === kind ? null : kind };
}

export function hasAnyFilter(filters: ContextFilters): boolean {
  return filters.project !== null || filters.kind !== null;
}
