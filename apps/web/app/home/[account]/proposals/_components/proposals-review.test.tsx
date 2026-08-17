// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { OpenProposal } from '../_lib/server/proposals.loader';
import { ProposalsReview } from './proposals-review';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../_lib/server/proposal-actions', () => ({
  approveProposalAction: vi.fn(),
  rejectProposalAction: vi.fn(),
}));

function proposal(overrides: Partial<OpenProposal> = {}): OpenProposal {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    kind: 'retire',
    detector: 'stale_serve_cluster',
    scope: 'org',
    targetMemoryId: 'bbbbbbbb-0000-0000-0000-000000000001',
    diff: 'Retire — “Deploy with docker compose up -d”',
    proposedContent: null,
    evidence: { prevalence: 14, stale_serves: 14, last_served_at: '2h ago' },
    confidence: 0.86,
    createdAt: '2026-08-16T12:00:00.000Z',
    ...overrides,
  };
}

describe('<ProposalsReview /> — the empty state IS the normal state', () => {
  it('reads as nothing needs your attention, never as broken', () => {
    render(<ProposalsReview accountSlug="acme" proposals={[]} />);

    const empty = screen.getByTestId('proposals-empty');

    expect(empty).toHaveTextContent(/nothing needs your attention/i);
    expect(empty).toHaveTextContent(/when it sees a pattern across sessions/i);
    // No failure language anywhere in the empty state.
    const text = (empty.textContent ?? '').toLowerCase();
    for (const forbidden of ['error', 'failed', 'unavailable', 'broken']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('renders no decision controls when there is nothing to decide', () => {
    render(<ProposalsReview accountSlug="acme" proposals={[]} />);

    expect(screen.queryByTestId(/proposal-approve-/)).toBeNull();
    expect(screen.queryByTestId(/proposal-reject-/)).toBeNull();
  });
});

describe('<ProposalsReview /> — a proposal renders its diff and its evidence inline', () => {
  it('shows the diff', () => {
    render(
      <ProposalsReview accountSlug="acme" proposals={[proposal()]} />,
    );

    expect(screen.getByTestId('proposal-diff')).toHaveTextContent(
      /docker compose/i,
    );
  });

  it('shows every evidence key inline — a link is not the same product', () => {
    render(<ProposalsReview accountSlug="acme" proposals={[proposal()]} />);

    const evidence = screen.getByTestId('proposal-evidence');

    expect(within(evidence).getByText(/prevalence/i)).toBeInTheDocument();
    expect(evidence).toHaveTextContent('14');
    expect(within(evidence).getByText(/last served at/i)).toBeInTheDocument();
  });

  it('renders confidence when the detector supplied one, and omits it otherwise', () => {
    const { unmount } = render(
      <ProposalsReview accountSlug="acme" proposals={[proposal()]} />,
    );

    expect(screen.getByTestId('proposal-confidence')).toHaveTextContent('0.86');
    unmount();

    render(
      <ProposalsReview
        accountSlug="acme"
        proposals={[proposal({ confidence: null })]}
      />,
    );

    expect(screen.queryByTestId('proposal-confidence')).toBeNull();
  });

  it('says so plainly when a proposal carries no evidence at all', () => {
    render(
      <ProposalsReview
        accountSlug="acme"
        proposals={[proposal({ evidence: {} })]}
      />,
    );

    expect(screen.getByTestId('proposal-evidence')).toHaveTextContent(
      /no counted evidence/i,
    );
  });
});

describe('<ProposalsReview /> — decisions', () => {
  it('offers approve and reject on a retire', () => {
    const row = proposal();
    render(<ProposalsReview accountSlug="acme" proposals={[row]} />);

    expect(screen.getByTestId(`proposal-approve-${row.id}`)).toBeEnabled();
    expect(screen.getByTestId(`proposal-reject-${row.id}`)).toBeEnabled();
  });

  /**
   * `add` and `revise` write memory CONTENT, which in the engine means
   * redaction plus an embedding before the CAS guard. The dashboard does not
   * reproduce that, so Approve is disabled and SAYS WHY rather than failing
   * silently on click. Reject still works — closing a proposal writes nothing.
   */
  it('disables approve on a kind the dashboard cannot apply, and explains it', () => {
    const row = proposal({ kind: 'revise', proposedContent: 'new text' });
    render(<ProposalsReview accountSlug="acme" proposals={[row]} />);

    expect(screen.getByTestId(`proposal-approve-${row.id}`)).toBeDisabled();
    expect(screen.getByTestId(`proposal-engine-note-${row.id}`)).toHaveTextContent(
      /approved from an agent/i,
    );
    expect(screen.getByTestId(`proposal-reject-${row.id}`)).toBeEnabled();
  });

  it('leaves approve enabled for a retire — that one the dashboard can apply', () => {
    const row = proposal({ kind: 'retire' });
    render(<ProposalsReview accountSlug="acme" proposals={[row]} />);

    expect(screen.queryByTestId(`proposal-engine-note-${row.id}`)).toBeNull();
  });
});
