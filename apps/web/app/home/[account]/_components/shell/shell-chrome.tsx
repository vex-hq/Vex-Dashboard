'use client';

import {
  type ContextFilters,
  PROJECT_CHIP_LIMIT,
  hasAnyFilter,
} from '../../_lib/shell/context-filters';
import { L } from './shell-tokens';

/**
 * The chip row, the stat cards, and the note rule.
 *
 * Three small pieces of chrome the prototype repeats across screens, kept in
 * one file because they are never used apart and each is a dozen lines.
 */

export interface KindCount {
  kind: string;
  n: number;
}

export interface ProjectCount {
  name: string;
  count: number;
}

/**
 * Kind chips, then the top six project chips, then `clear`.
 *
 * The order and the six-project cap are the prototype's:
 *
 *     K.kinds.map(...) + K.projects.slice(0,6).map(...) + clear
 *
 * The cap exists because the chip row must not wrap into a wall — an org with
 * forty projects would bury the rows beneath it. Projects arrive sorted by
 * size, so the six shown are the six worth filtering by.
 */
export function FilterChips({
  kinds,
  projects,
  filters,
  onToggleKind,
  onToggleProject,
  onClear,
}: {
  kinds: readonly KindCount[];
  projects: readonly ProjectCount[];
  filters: ContextFilters;
  onToggleKind: (kind: string) => void;
  onToggleProject: (project: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {kinds.map((k) => (
        <Chip
          key={`kind-${k.kind}`}
          active={filters.kind === k.kind}
          onClick={() => onToggleKind(k.kind)}
        >
          {k.kind} {k.n}
        </Chip>
      ))}

      {projects.slice(0, PROJECT_CHIP_LIMIT).map((p) => (
        <Chip
          key={`proj-${p.name}`}
          active={filters.project === p.name}
          onClick={() => onToggleProject(p.name)}
        >
          {p.name} {p.count}
        </Chip>
      ))}

      {hasAnyFilter(filters) ? (
        <Chip active={false} onClick={onClear}>
          clear
        </Chip>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="klio-soft rounded-[4px] border px-2 py-1 text-[12px]"
      style={{
        borderColor: active ? L.indigo : L.line,
        color: active ? L.ink : L.muted,
        background: active ? 'rgba(94,106,210,0.12)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

/** The Home and Shared stat cards. */
export function StatCards({
  stats,
}: {
  stats: readonly { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[6px] border px-4 py-3"
          style={{ borderColor: L.line }}
        >
          <div
            className="text-[22px] leading-tight font-[510] tabular-nums"
            style={{ color: L.ink }}
          >
            {s.value}
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: L.muted }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The warning-rule note the prototype uses to state an uncomfortable fact. */
export function ShellNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="border-l-2 py-0.5 pl-2 text-[12px] leading-relaxed"
      style={{ borderColor: L.warn, color: L.muted }}
    >
      {children}
    </p>
  );
}

/** A small uppercase group label, as above the Shared and Private groups. */
export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 text-[11px] tracking-wide uppercase"
      style={{ color: L.muted }}
    >
      {children}
    </div>
  );
}
