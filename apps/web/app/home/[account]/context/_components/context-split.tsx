'use client';

import { useCallback, useState, useTransition } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { displayAgent } from '../../_lib/display-agent';
import { displayMemory } from '../../_lib/display-memory';
import type {
  ContextGroup,
  ContextItemDetail,
  ContextListItem,
  SupersessionLink,
} from '../_lib/server/context-surfaces.types';
import {
  shareMemoryAction,
  unshareMemoryAction,
} from '../_lib/server/context-actions';

/**
 * The context split: **Shared with your team** above **Only you**, each with
 * its own count, and a peek pane carrying one item's evidence and the share
 * action.
 *
 * WHY TWO LABELLED GROUPS AND NOT A FILTER. The reference org holds 5,196
 * private memories and 1 org-scoped one. Everything captured is private; the
 * team-brain premise is unexercised, and a dashboard that merges the two hides
 * exactly that. The split is the security boundary, so it is also the display
 * boundary — and the counts are shown because "5,196 / 1" is the fact this
 * surface exists to tell.
 *
 * The two groups arrive as two props from two separate loaders with two
 * separate predicates. This component never filters one list into two; it
 * could not, because it is never given a merged list.
 *
 * Design language follows `project-issues.tsx`: the same row height, the same
 * indigo selection rail, the same peek pane, the same muted palette. No new
 * component family — see the Linear/Zed tokens in `styles/shadcn-ui.css`.
 */

const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  indigo: '#5e6ad2',
  warn: '#fc7840',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

export interface ContextSplitProps {
  accountSlug: string;
  shared: ContextGroup;
  /** Named `privateGroup`, not `private` — the latter is a reserved word. */
  privateGroup: ContextGroup;
  /** The selected item's detail, already visibility-gated by the loader. */
  detail: ContextItemDetail | null;
}

export function ContextSplit({
  accountSlug,
  shared,
  privateGroup,
  detail,
}: ContextSplitProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('item')?.trim() || undefined;

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('item', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <section
      aria-label={t('context.pageTitle', 'Context')}
      className="flex min-h-0 flex-1 flex-col"
      data-testid="context-split"
    >
      <style>{`
        .klio-row:hover { background: rgba(255,255,255,0.035) !important; }
        @media (prefers-reduced-motion: no-preference) {
          .klio-soft { transition: background-color 160ms ${L.ease}, border-color 160ms ${L.ease}, color 160ms ${L.ease}, opacity 180ms ${L.ease}; }
        }
      `}</style>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0 overflow-auto">
          <GroupHeading
            testId="context-group-shared"
            label={t('context.sharedGroup', 'Shared with your team')}
            total={shared.total}
          />
          {shared.items.length === 0 ? (
            <EmptyGroup
              testId="context-shared-empty"
              title={t('context.sharedEmptyTitle', 'Nothing shared yet')}
              body={t(
                'context.sharedEmptyBody',
                'Open one of your own items below and share it — everyone on your team can then use it.',
              )}
            />
          ) : (
            <ul>
              {shared.items.map((entry) => (
                <ContextRow
                  key={entry.id}
                  item={entry}
                  selected={entry.id === selectedId}
                  onSelect={() => select(entry.id)}
                />
              ))}
            </ul>
          )}

          <GroupHeading
            testId="context-group-private"
            label={t('context.privateGroup', 'Only you')}
            total={privateGroup.total}
          />
          {privateGroup.items.length === 0 ? (
            <EmptyGroup
              testId="context-private-empty"
              title={t('context.privateEmptyTitle', 'Nothing private yet')}
              body={t(
                'context.privateEmptyBody',
                'Context your agents capture for you lands here first. Only you can read it.',
              )}
            />
          ) : (
            <ul>
              {privateGroup.items.map((entry) => (
                <ContextRow
                  key={entry.id}
                  item={entry}
                  selected={entry.id === selectedId}
                  onSelect={() => select(entry.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <ItemPeek
          key={detail?.id ?? 'empty'}
          detail={detail}
          accountSlug={accountSlug}
        />
      </div>
    </section>
  );
}

function GroupHeading({
  testId,
  label,
  total,
}: {
  testId: string;
  label: string;
  total: number;
}) {
  return (
    <div
      data-testid={testId}
      className="flex h-8 items-center justify-between gap-3 px-3 text-[12px] font-[590]"
      style={{ color: L.muted }}
    >
      <span className="tracking-[0.04em] uppercase">{label}</span>
      <span className="tabular-nums">{total.toLocaleString()}</span>
    </div>
  );
}

function EmptyGroup({
  testId,
  title,
  body,
}: {
  testId: string;
  title: string;
  body: string;
}) {
  return (
    <div data-testid={testId} className="px-5 py-8" style={{ color: L.muted }}>
      <p className="text-[13px]" style={{ color: L.ink }}>
        {title}
      </p>
      <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}

function ContextRow({
  item,
  selected,
  onSelect,
}: {
  item: ContextListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-testid={`context-item-${item.id}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className="klio-soft klio-row flex h-9 w-full items-center gap-3 border-l-2 px-3 text-left text-[13px]"
        style={{
          borderLeftColor: selected ? L.indigo : 'transparent',
          background: selected ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: L.ink,
        }}
      >
        <span className="min-w-0 flex-1 truncate">
          {displayMemory(item.content)}
        </span>
        <span className="hidden shrink-0 sm:inline" style={{ color: L.muted }}>
          {item.kind}
        </span>
        <span className="hidden shrink-0 md:inline" style={{ color: L.muted }}>
          {item.projectName ?? '---'}
        </span>
        <span className="shrink-0 tabular-nums" style={{ color: L.muted }}>
          {formatRelativeTime(item.createdAt)}
        </span>
      </button>
    </li>
  );
}

/**
 * The peek pane: content, evidence, chain, share action.
 *
 * EVIDENCE COPY IS CONSTRAINED BY THE SCHEMA. `recall_outcomes` carries
 * `used`, `usage_score` and `served_stale` — no verdict, no per-outcome agent.
 * So the three lines below say "recalled", "used by an agent" and "served
 * after it was replaced" and nothing else: no pass/fail grade, and never the
 * name of the agent that used it, because that column does not exist. The
 * `context-split.test.tsx` "makes no claim the schema cannot carry" case is
 * the standing guard on this paragraph.
 */
function ItemPeek({
  detail,
  accountSlug,
}: {
  detail: ContextItemDetail | null;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');

  if (!detail) {
    return (
      <aside className="hidden border-l lg:block" style={{ borderColor: L.line }} />
    );
  }

  const { evidence } = detail;
  const neverRecalled = evidence.recalledCount === 0;

  return (
    <aside
      data-testid="context-item-peek"
      className="border-t px-5 py-5 lg:border-t-0 lg:border-l"
      style={{ borderColor: L.line }}
    >
      <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
        {detail.kind}
      </p>
      <h2
        className="text-[16px] leading-snug font-[560] tracking-[-0.02em]"
        style={{ color: L.ink }}
      >
        {displayMemory(detail.content)}
      </h2>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>
          {detail.scope === 'private'
            ? t('context.chipPrivate', 'Only you')
            : t('context.chipShared', 'Shared with your team')}
        </Chip>
        {detail.projectName ? <Chip>{detail.projectName}</Chip> : null}
        {detail.agentId ? <Chip>{displayAgent(detail.agentId)}</Chip> : null}
        <Chip>{formatRelativeTime(detail.createdAt)}</Chip>
      </div>

      <dl
        data-testid="context-evidence"
        className="mt-6 flex flex-col gap-1.5 border-t pt-4 text-[13px]"
        style={{ borderColor: L.line }}
      >
        <EvidenceRow
          testId="evidence-recalled"
          label={t('context.evidenceRecalled', 'Recalled')}
          value={evidence.recalledCount}
        />
        <EvidenceRow
          testId="evidence-used"
          label={t('context.evidenceUsed', 'Used by an agent')}
          value={evidence.usedCount}
        />
        <EvidenceRow
          testId="evidence-stale"
          label={t('context.evidenceStale', 'Served after it was replaced')}
          value={evidence.servedStaleCount}
          emphasise={evidence.servedStaleCount > 0}
        />
        {neverRecalled ? (
          <p
            data-testid="context-evidence-never-recalled"
            className="mt-1 text-[12px] leading-relaxed"
            style={{ color: L.muted }}
          >
            {t(
              'context.evidenceNeverRecalled',
              'No agent has been served this yet.',
            )}
          </p>
        ) : null}
      </dl>

      {detail.replaced || detail.replacedBy ? (
        <div
          data-testid="context-chain"
          className="mt-6 border-t pt-4"
          style={{ borderColor: L.line }}
        >
          <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
            {t('context.chainTitle', 'Supersession')}
          </p>
          {detail.replaced ? (
            <ChainNode
              testId="chain-replaced"
              label={t('context.chainReplaced', 'Replaced')}
              link={detail.replaced}
            />
          ) : null}
          {detail.replacedBy ? (
            <ChainNode
              testId="chain-replaced-by"
              label={t('context.chainReplacedBy', 'Replaced by')}
              link={detail.replacedBy}
              struck={false}
            />
          ) : null}
        </div>
      ) : null}

      <ShareControls detail={detail} accountSlug={accountSlug} />

      <div className="mt-6 text-[13px]">
        <Link
          href={`/home/${accountSlug}/memory/${detail.id}`}
          className="klio-soft"
          style={{ color: L.muted }}
        >
          {t('context.openMemory', 'Open memory')}
        </Link>
      </div>
    </aside>
  );
}

function EvidenceRow({
  testId,
  label,
  value,
  emphasise = false,
}: {
  testId: string;
  label: string;
  value: number;
  emphasise?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-baseline justify-between gap-4"
    >
      <dt style={{ color: L.muted }}>{label}</dt>
      <dd
        className="tabular-nums"
        style={{ color: emphasise ? L.warn : L.ink }}
      >
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function ChainNode({
  testId,
  label,
  link,
  struck = true,
}: {
  testId: string;
  label: string;
  link: SupersessionLink;
  struck?: boolean;
}) {
  return (
    <p data-testid={testId} className="mb-1 flex gap-2 text-[13px]">
      <span className="shrink-0" style={{ color: L.muted }}>
        {label}
      </span>
      <span
        className={struck ? 'line-through opacity-60' : ''}
        style={{ color: struck ? L.muted : L.ink }}
      >
        {displayMemory(link.content)}
      </span>
    </p>
  );
}

/**
 * Share, and its reverse.
 *
 * WHO SEES WHAT:
 *  - a `private` row the viewer OWNS → "Share with the team".
 *  - a shared row the viewer PROMOTED → "Make private again".
 *  - anything else → no control at all. A row somebody else shared is not this
 *    viewer's to withdraw, and a private row they do not own cannot be shared
 *    by them (the server refuses it too — this is the second of two checks,
 *    not the only one).
 */
function ShareControls({
  detail,
  accountSlug,
}: {
  detail: ContextItemDetail;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canShare = detail.scope === 'private' && detail.ownedByViewer;
  const canUnshare = detail.scope !== 'private' && detail.promotedByViewer;

  if (!canShare && !canUnshare) {
    return null;
  }

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();

      if (!result.ok) {
        setError(
          t(
            'context.shareFailed',
            'That did not go through. Reload and try again.',
          ),
        );

        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="mt-6">
      {canShare ? (
        <button
          type="button"
          data-testid="context-share"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await shareMemoryAction({
                accountSlug,
                memoryId: detail.id,
                to: 'org',
              });

              return { ok: Boolean(result?.shared) };
            })
          }
          className="klio-soft h-8 w-full rounded-[4px] text-[13px] font-[510] disabled:opacity-50"
          style={{ background: L.indigo, color: '#fff' }}
        >
          {t('context.share', 'Share with the team')}
        </button>
      ) : (
        <button
          type="button"
          data-testid="context-unshare"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await unshareMemoryAction({
                accountSlug,
                memoryId: detail.id,
              });

              return { ok: Boolean(result?.reversed) };
            })
          }
          className="klio-soft h-8 w-full rounded-[4px] border text-[13px] font-[510] disabled:opacity-50"
          style={{ borderColor: L.line, color: L.ink }}
        >
          {t('context.unshare', 'Make private again')}
        </button>
      )}

      {error ? (
        <p className="mt-2 text-[12px]" style={{ color: L.warn }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[12px]"
      style={{ borderColor: L.line, color: L.muted }}
    >
      {children}
    </span>
  );
}
