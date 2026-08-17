'use client';

import { useEffect, useRef, useTransition } from 'react';

import {
  shareMemoryAction,
  unshareMemoryAction,
} from '../../context/_lib/server/context-actions';
import type { ShellContextItem } from '../../_lib/server/shell-context.types';
import { relativeAge } from '../../_lib/shell/relative-age';
import { L } from './shell-tokens';

/**
 * The detail drawer, over a scrim.
 *
 * EVERY LINE IS BOUNDED BY THE SCHEMA. `recall_outcomes` carries `used`,
 * `usage_score` and `served_stale`. It has NO verdict column and NO per-outcome
 * agent attribution — so this pane says "recalled", "used by an agent" and
 * "served stale" and nothing else. No pass/fail grade, and never the name of
 * the agent that used a memory, because that column does not exist. The
 * provenance note under the block names the two tables so a reader can check
 * the claim rather than take it.
 *
 * Closing: the Close button, the scrim, or Escape. Focus moves to Close on open
 * and returns to the row that opened it, so a keyboard user is not dropped at
 * the top of the document.
 */
export function ItemDrawer({
  item,
  onClose,
  accountSlug,
}: {
  item: ShellContextItem | null;
  onClose: () => void;
  accountSlug: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!item) return;

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  const isShared = item.scope === 'org';

  const toggleShare = () => {
    startTransition(async () => {
      if (isShared) {
        await unshareMemoryAction({ memoryId: item.id, accountSlug });
      } else {
        // `to: 'org'` is the only promotion this screen offers. Project scope
        // exists in the schema but needs a project chooser the prototype does
        // not have, so it is not offered rather than guessed at.
        await shareMemoryAction({ memoryId: item.id, accountSlug, to: 'org' });
      }

      onClose();
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close detail"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />

      <aside
        aria-label="Context detail"
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[420px] flex-col gap-4 overflow-y-auto border-l p-5"
        style={{ borderColor: L.line, background: '#121213' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] tracking-wide uppercase" style={{ color: L.muted }}>
              {item.kind}
            </div>
            <h3
              className="mt-1.5 text-[14px] leading-relaxed font-[510]"
              style={{ color: L.ink }}
            >
              {item.content}
            </h3>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="klio-soft shrink-0 rounded-[4px] border px-2 py-1 text-[12px]"
            style={{ borderColor: L.line, color: L.muted }}
          >
            Close
          </button>
        </div>

        <dl
          className="divide-y rounded-[6px] border"
          style={{ borderColor: L.line }}
        >
          <Row label="project" value={item.projectName ?? 'unfiled'} />
          <Row label="scope" value={item.scope} />
          <Row label="captured" value={`${relativeAge(item.createdAt)} ago`} />
          <Row label="recalled" value={`${item.recalls}×`} />
          <Row label="used by an agent" value={`${item.used}×`} />
          <Row
            label="served stale"
            value={item.servedStale > 0 ? `${item.servedStale}×` : '0'}
            tone={item.servedStale > 0 ? 'danger' : undefined}
          />
          <Row
            label="status"
            value={item.superseded ? 'superseded' : 'active'}
            tone={item.superseded ? undefined : 'ok'}
          />
        </dl>

        <p
          className="border-l-2 py-0.5 pl-2 text-[11px] leading-relaxed"
          style={{ borderColor: L.warn, color: L.muted }}
        >
          Recall counts from brain_recall_events.memory_ids; used and stale from
          recall_outcomes.
        </p>

        <button
          type="button"
          onClick={toggleShare}
          disabled={pending}
          className="klio-soft w-full rounded-[4px] border px-3 py-2 text-center text-[13px] disabled:opacity-60"
          style={
            isShared
              ? { borderColor: L.line, color: L.ink }
              : {
                  borderColor: L.indigo,
                  background: L.indigo,
                  color: '#fff',
                }
          }
        >
          {pending
            ? 'Working…'
            : isShared
              ? 'Make private again'
              : 'Share with the team'}
        </button>
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'danger';
}) {
  const color = tone === 'ok' ? L.ok : tone === 'danger' ? L.danger : L.ink;

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 text-[12px]"
      style={{ borderColor: L.line }}
    >
      <dt style={{ color: L.muted }}>{label}</dt>
      <dd className="tabular-nums" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}
