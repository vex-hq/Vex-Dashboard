'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { displayMemory } from '../../_lib/display-memory';
import {
  approveProposalAction,
  rejectProposalAction,
} from '../_lib/server/proposal-actions';
import type { OpenProposal } from '../_lib/server/proposals.loader';

/**
 * The proposals queue: what Klio suggests changing, with the evidence that
 * made it suggest so, and Approve / Reject.
 *
 * EMPTY IS THE NORMAL STATE. The dreamer runs periodically and will often find
 * nothing; at the time of writing the correct count is zero, because the
 * dreamer has never completed a pass. So the empty state reads as *nothing
 * needs your attention* and explains what would put something here — never as
 * an error, a failure, or a feature that is unavailable. The
 * `proposals-review.test.tsx` empty-state case asserts that copy and fails on
 * failure language.
 *
 * EVIDENCE IS INLINE, NOT LINKED. Every key of the detector's `evidence` jsonb
 * is rendered on the card. The evidence at decision time IS the feature — a
 * link to evidence is a different, worse product, because the decision then
 * happens without it.
 *
 * `diff` is REVIEWER-FACING RATIONALE ONLY (migration 045 is emphatic): it is
 * never written to `session_memories`. `proposedContent` is the column that
 * can become memory content, and it is shown separately and labelled as what
 * approval would write.
 */

const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  indigo: '#5e6ad2',
  warn: '#fc7840',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

/**
 * The kinds the dashboard can apply on its own.
 *
 * `retire` retracts, which is pure SQL. `add` and `revise` write memory
 * content, which requires the engine's redaction + embedding pipeline before
 * its CAS guard — reproducing that here would mean a second write path that
 * drifts from the engine's and stores rows recall cannot rank. See
 * `lib/agentguard/proposal-decisions.ts`.
 */
const DASHBOARD_APPLICABLE_KINDS = new Set(['retire']);

export interface ProposalsReviewProps {
  accountSlug: string;
  proposals: readonly OpenProposal[];
}

export function ProposalsReview({
  accountSlug,
  proposals,
}: ProposalsReviewProps) {
  const { t } = useTranslation('agentguard');

  return (
    <section
      aria-label={t('proposals.pageTitle', 'Proposals')}
      className="flex min-h-0 flex-1 flex-col overflow-auto"
      data-testid="proposals-review"
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .klio-soft { transition: background-color 160ms ${L.ease}, border-color 160ms ${L.ease}, color 160ms ${L.ease}, opacity 180ms ${L.ease}; }
        }
      `}</style>

      {proposals.length === 0 ? (
        <EmptyQueue />
      ) : (
        <ul className="flex flex-col gap-2 p-3">
          {proposals.map((entry) => (
            <li key={entry.id}>
              <ProposalCard proposal={entry} accountSlug={accountSlug} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyQueue() {
  const { t } = useTranslation('agentguard');

  return (
    <div
      data-testid="proposals-empty"
      className="px-6 py-16 text-center"
      style={{ color: L.muted }}
    >
      <p className="text-[14px] font-[510]" style={{ color: L.ink }}>
        {t('proposals.emptyTitle', 'Nothing needs your attention')}
      </p>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed">
        {t(
          'proposals.emptyBody',
          'Klio proposes changes when it sees a pattern across sessions — a fact that keeps being served after it stopped being true, or a gap that keeps coming up. Nothing matches right now.',
        )}
      </p>
    </div>
  );
}

function ProposalCard({
  proposal,
  accountSlug,
}: {
  proposal: OpenProposal;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const applicable = DASHBOARD_APPLICABLE_KINDS.has(proposal.kind);
  const evidenceKeys = Object.keys(proposal.evidence);

  const decide = (fn: () => Promise<{ decided?: boolean } | undefined>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();

      if (!result?.decided) {
        setError(
          t(
            'proposals.decisionFailed',
            'That did not go through — someone may have decided it already. Reload to see where it stands.',
          ),
        );

        return;
      }

      router.refresh();
    });
  };

  return (
    <article
      data-testid={`proposal-${proposal.id}`}
      className="rounded-[4px] border p-4"
      style={{ borderColor: L.line, background: '#0f1011' }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] tracking-[0.04em] uppercase"
            style={{ color: L.muted }}
          >
            {proposal.kind} · {proposal.detector}
          </p>
          <h3
            data-testid="proposal-diff"
            className="mt-1 text-[15px] leading-snug font-[560] tracking-[-0.01em]"
            style={{ color: L.ink }}
          >
            {displayMemory(proposal.diff)}
          </h3>
        </div>
        {proposal.confidence !== null ? (
          <span
            data-testid="proposal-confidence"
            className="shrink-0 rounded-md border px-2 py-0.5 text-[12px] tabular-nums"
            style={{ borderColor: L.line, color: L.muted }}
          >
            {t('proposals.confidence', 'confidence')} {proposal.confidence}
          </span>
        ) : null}
      </header>

      {proposal.proposedContent ? (
        <p
          data-testid="proposal-proposed-content"
          className="mt-3 rounded-[3px] border px-3 py-2 text-[13px] leading-relaxed"
          style={{ borderColor: L.line, color: L.ink }}
        >
          {displayMemory(proposal.proposedContent)}
        </p>
      ) : null}

      <dl
        data-testid="proposal-evidence"
        className="mt-4 flex flex-col gap-1.5 border-t pt-3 text-[13px]"
        style={{ borderColor: L.line }}
      >
        {evidenceKeys.length === 0 ? (
          <p style={{ color: L.muted }}>
            {t(
              'proposals.noEvidence',
              'No counted evidence was filed with this proposal.',
            )}
          </p>
        ) : (
          evidenceKeys.map((key) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-4"
            >
              <dt style={{ color: L.muted }}>{humaniseKey(key)}</dt>
              <dd className="tabular-nums" style={{ color: L.ink }}>
                {formatEvidenceValue(proposal.evidence[key])}
              </dd>
            </div>
          ))
        )}
        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: L.muted }}>{t('proposals.filed', 'Filed')}</dt>
          <dd className="tabular-nums" style={{ color: L.ink }}>
            {formatRelativeTime(proposal.createdAt)}
          </dd>
        </div>
      </dl>

      {!applicable ? (
        <p
          data-testid={`proposal-engine-note-${proposal.id}`}
          className="mt-3 border-l-2 pl-3 text-[12px] leading-relaxed"
          style={{ borderColor: L.warn, color: L.muted }}
        >
          {t(
            'proposals.engineRequired',
            'This one writes new memory content, so it has to be approved from an agent — the dashboard does not write content. Rejecting it here still works.',
          )}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          data-testid={`proposal-reject-${proposal.id}`}
          disabled={pending}
          onClick={() =>
            decide(() =>
              rejectProposalAction({
                accountSlug,
                proposalId: proposal.id,
              }),
            )
          }
          className="klio-soft h-7 rounded-[4px] border px-3 text-[12px] font-[510] disabled:opacity-50"
          style={{ borderColor: L.line, color: L.ink }}
        >
          {t('proposals.reject', 'Reject')}
        </button>
        <button
          type="button"
          data-testid={`proposal-approve-${proposal.id}`}
          disabled={pending || !applicable}
          onClick={() =>
            decide(() =>
              approveProposalAction({
                accountSlug,
                proposalId: proposal.id,
              }),
            )
          }
          className="klio-soft h-7 rounded-[4px] px-3 text-[12px] font-[510] disabled:opacity-40"
          style={{ background: L.indigo, color: '#fff' }}
        >
          {t('proposals.approve', 'Approve')}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-right text-[12px]" style={{ color: L.warn }}>
          {error}
        </p>
      ) : null}
    </article>
  );
}

/** `stale_serves` → "Stale serves". Detector keys are snake_case by hand. */
function humaniseKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Evidence values are whatever the detector wrote into the jsonb. Scalars
 * render as themselves; anything structured renders as compact JSON rather
 * than as `[object Object]`.
 */
function formatEvidenceValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';

  return JSON.stringify(value);
}
