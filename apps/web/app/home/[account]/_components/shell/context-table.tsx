'use client';

import type { ShellContextItem } from '../../_lib/server/shell-context.types';
import { relativeAge } from '../../_lib/shell/relative-age';
import { L } from './shell-tokens';

/** Five columns, dropping to two below the prototype's 820px breakpoint. */
const COLUMNS =
  'grid-cols-[72px_1fr_150px_130px_56px] max-[820px]:grid-cols-[1fr_130px]';

/**
 * The Kind · Context · Project · Recalled · Age table.
 *
 * One component, used by Home, Context and Shared — the prototype has exactly
 * one row shape and reuses it across all three, so the implementation does too.
 *
 * RESPONSIVE, per the prototype's one media query — 820px exactly, expressed
 * as a Tailwind arbitrary variant rather than a custom class, because the
 * `klio-*` classes this file would otherwise have followed are used across the
 * app but defined in no stylesheet, so they style nothing:
 *
 *     @media(max-width:820px){ .row .kind,.row .proj,.row .ago{display:none} }
 *
 * Below 820px the Kind, Project and Age columns drop and content plus the
 * recall count remain. That is the prototype's choice and it is the right one:
 * on a narrow screen the content is the thing worth reading, and the recall
 * count is the thing worth acting on.
 */
export function ContextTable({
  items,
  onSelect,
  selectedId,
  emptyTitle = 'Nothing matches',
  emptyBody = 'No context items for this filter. Clear it to see everything.',
}: {
  items: readonly ShellContextItem[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div
      className="overflow-hidden rounded-[6px] border"
      style={{ borderColor: L.line }}
    >
      <div
        className={`grid h-8 items-center gap-3 border-b px-3 text-[11px] tracking-wide uppercase ${COLUMNS}`}
        style={{ borderColor: L.line, color: L.muted }}
      >
        <span className="max-[820px]:hidden">Kind</span>
        <span>Context</span>
        <span className="max-[820px]:hidden">Project</span>
        <span className="text-right">Recalled</span>
        <span className="text-right max-[820px]:hidden">Age</span>
      </div>

      <ul className="divide-y" style={{ borderColor: L.line }}>
        {items.map((item) => (
          <li key={item.id} style={{ borderColor: L.line }}>
            <button
              type="button"
              data-testid={`shell-item-${item.id}`}
              aria-current={selectedId === item.id ? 'true' : undefined}
              onClick={() => onSelect(item.id)}
              className={`grid h-9 w-full items-center gap-3 border-l-2 px-3 text-left text-[13px] transition-colors hover:bg-white/[0.03] ${COLUMNS}`}
              style={{
                borderLeftColor:
                  selectedId === item.id ? L.indigo : 'transparent',
                background:
                  selectedId === item.id
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                color: L.ink,
              }}
            >
              <span
                className="truncate max-[820px]:hidden"
                style={{ color: L.muted }}
              >
                {item.kind}
              </span>

              <span
                className="min-w-0 truncate"
                style={{
                  textDecoration: item.superseded ? 'line-through' : undefined,
                  color: item.superseded ? L.muted : L.ink,
                }}
              >
                {item.content}
              </span>

              <span
                className="truncate max-[820px]:hidden"
                style={{ color: L.muted }}
              >
                {item.projectName ?? 'unfiled'}
              </span>

              <span className="flex items-center justify-end gap-1.5 tabular-nums">
                <span style={{ color: L.muted }}>{item.recalls}</span>
                {item.servedStale > 0 ? <Badge tone="danger">stale</Badge> : null}
                {item.scope === 'org' ? <Badge tone="ok">shared</Badge> : null}
              </span>

              <span
                className="text-right tabular-nums max-[820px]:hidden"
                style={{ color: L.muted }}
              >
                {relativeAge(item.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: 'ok' | 'danger';
  children: React.ReactNode;
}) {
  const color = tone === 'ok' ? L.ok : L.danger;

  return (
    <span
      className="rounded-[3px] border px-1.5 py-px text-[10px] tracking-wide"
      style={{ borderColor: `${color}55`, color }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  footnote,
}: {
  title: string;
  body: string;
  footnote?: string;
}) {
  return (
    <div
      className="rounded-[6px] border px-6 py-10 text-center"
      style={{ borderColor: L.line }}
    >
      <p className="text-[13px] font-[590]" style={{ color: L.ink }}>
        {title}
      </p>
      <p
        className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed"
        style={{ color: L.muted }}
      >
        {body}
      </p>
      {footnote ? (
        <p
          className="mx-auto mt-3 max-w-[52ch] text-[12px] leading-relaxed"
          style={{ color: L.muted }}
        >
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
