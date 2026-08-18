// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ShellContextItem } from '../../_lib/server/shell-context.types';
import { ContextTable } from './context-table';

/**
 * The row's rendering rules, which the prototype states as conditionals:
 *
 *   - superseded  → struck through
 *   - stale > 0   → a `stale` badge
 *   - scope org   → a `shared` badge
 *   - no project  → `unfiled`
 *
 * Each badge is tested BOTH ways. A badge that always renders and a badge that
 * never renders both pass a one-sided assertion, and both are wrong in a way a
 * reader of the screen would act on — a permanent `stale` badge would have
 * someone retiring context that is fine.
 */

const item = (over: Partial<ShellContextItem> = {}): ShellContextItem => ({
  id: 'item-1',
  kind: 'fact',
  content: 'Railway builds from GitHub source',
  projectName: 'Agent Memory',
  scope: 'private',
  superseded: false,
  createdAt: new Date().toISOString(),
  recalls: 3,
  servedStale: 0,
  used: 0,
  ...over,
});

describe('ContextTable', () => {
  it('renders the five column headings', () => {
    render(<ContextTable items={[item()]} onSelect={vi.fn()} />);

    for (const heading of ['Kind', 'Context', 'Project', 'Recalled', 'Age']) {
      expect(screen.getByText(heading)).toBeDefined();
    }
  });

  it('shows the reassuring empty copy when nothing matches', () => {
    render(<ContextTable items={[]} onSelect={vi.fn()} />);

    expect(screen.getByText('Nothing matches')).toBeDefined();
    expect(
      screen.getByText(/Clear it to see everything/),
    ).toBeDefined();
  });

  it('strikes through a superseded row, and leaves an active one alone', () => {
    const { rerender } = render(
      <ContextTable items={[item({ superseded: true })]} onSelect={vi.fn()} />,
    );

    expect(
      screen.getByText('Railway builds from GitHub source').style
        .textDecoration,
    ).toBe('line-through');

    rerender(
      <ContextTable items={[item({ superseded: false })]} onSelect={vi.fn()} />,
    );

    expect(
      screen.getByText('Railway builds from GitHub source').style
        .textDecoration,
    ).toBe('');
  });

  it('badges a stale row, and only a stale row', () => {
    const { rerender } = render(
      <ContextTable items={[item({ servedStale: 2 })]} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('stale')).toBeDefined();

    rerender(
      <ContextTable items={[item({ servedStale: 0 })]} onSelect={vi.fn()} />,
    );

    expect(screen.queryByText('stale')).toBeNull();
  });

  it('badges a shared row, and only a shared row', () => {
    const { rerender } = render(
      <ContextTable items={[item({ scope: 'org' })]} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('shared')).toBeDefined();

    rerender(
      <ContextTable items={[item({ scope: 'private' })]} onSelect={vi.fn()} />,
    );

    expect(screen.queryByText('shared')).toBeNull();
  });

  it('labels a row with no project as unfiled', () => {
    render(
      <ContextTable items={[item({ projectName: null })]} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('unfiled')).toBeDefined();
  });

  it('makes no claim the schema cannot carry', () => {
    // recall_outcomes has no verdict column and no per-outcome agent
    // attribution. Nothing on a row may imply either.
    const { container } = render(
      <ContextTable
        items={[item({ scope: 'org', servedStale: 1 })]}
        onSelect={vi.fn()}
      />,
    );

    const text = container.textContent ?? '';

    for (const forbidden of ['passed', 'failed', 'verdict', 'graded', 'score']) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the nav label', () => {
  it('says Home, as the approved prototype does — not Hub', async () => {
    // The shell shipped with `common:routes.dashboard`, whose value was "Hub"
    // from the previous IA. The prototype's first item is Home, and the nav
    // test pins the KEY, not the rendered word — so the wrong label survived
    // a green suite. This pins the word.
    const common = await import('~/../public/locales/en/common.json');

    expect(
      (common as unknown as { routes: { dashboard: string } }).routes.dashboard,
    ).toBe('Home');
  });
});
