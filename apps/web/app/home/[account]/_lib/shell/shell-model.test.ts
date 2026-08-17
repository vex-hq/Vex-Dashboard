import { describe, expect, it } from 'vitest';

import {
  NO_FILTERS,
  applyFilters,
  hasAnyFilter,
  toggleKind,
  toggleProject,
} from './context-filters';
import { relativeAge } from './relative-age';

const NOW = new Date('2026-08-17T12:00:00.000Z');

const at = (minutesAgo: number) =>
  new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();

describe('relativeAge', () => {
  it('renders minutes under an hour', () => {
    expect(relativeAge(at(4), NOW)).toBe('4m');
    expect(relativeAge(at(59), NOW)).toBe('59m');
  });

  it('floors at 1m so a fresh row never reads 0m', () => {
    // The prototype's Math.max(1, …). "0m" would read as a missing value.
    expect(relativeAge(at(0), NOW)).toBe('1m');
    expect(relativeAge(at(0.2), NOW)).toBe('1m');
  });

  it('renders hours from one hour to one day', () => {
    expect(relativeAge(at(60), NOW)).toBe('1h');
    expect(relativeAge(at(1439), NOW)).toBe('24h');
  });

  it('renders days at a day and beyond', () => {
    expect(relativeAge(at(1440), NOW)).toBe('1d');
    expect(relativeAge(at(1440 * 12), NOW)).toBe('12d');
  });

  it('clamps a future timestamp rather than rendering a negative age', () => {
    // Clock skew between Neon and the renderer must not produce "-3m".
    expect(relativeAge(at(-3), NOW)).toBe('1m');
  });

  it('renders an em dash for an unparseable timestamp, never NaN', () => {
    expect(relativeAge('not-a-date', NOW)).toBe('—');
  });
});

describe('applyFilters', () => {
  const rows = [
    { kind: 'fact', projectName: 'Agent Memory' },
    { kind: 'decision', projectName: 'Agent Memory' },
    { kind: 'fact', projectName: 'hirly' },
    { kind: 'summary', projectName: null },
  ];

  it('returns everything when nothing is filtered', () => {
    expect(applyFilters(rows, NO_FILTERS)).toHaveLength(4);
  });

  it('filters by project', () => {
    const out = applyFilters(rows, { project: 'hirly', kind: null });

    expect(out).toEqual([{ kind: 'fact', projectName: 'hirly' }]);
  });

  it('filters by kind', () => {
    const out = applyFilters(rows, { project: null, kind: 'fact' });

    expect(out).toHaveLength(2);
  });

  it('combines project and kind with AND, not OR', () => {
    // The bug this guards: an OR here would widen the list on a second chip,
    // which reads as the filter having done nothing.
    const out = applyFilters(rows, {
      project: 'Agent Memory',
      kind: 'decision',
    });

    expect(out).toEqual([{ kind: 'decision', projectName: 'Agent Memory' }]);
  });

  it('matches no rows when the two filters cannot both hold', () => {
    const out = applyFilters(rows, { project: 'hirly', kind: 'decision' });

    expect(out).toEqual([]);
  });
});

describe('chip toggles', () => {
  it('sets a project, then clears it when selected again', () => {
    const on = toggleProject(NO_FILTERS, 'hirly');
    expect(on.project).toBe('hirly');

    expect(toggleProject(on, 'hirly').project).toBeNull();
  });

  it('switches directly between two projects', () => {
    const on = toggleProject(NO_FILTERS, 'hirly');

    expect(toggleProject(on, 'relio').project).toBe('relio');
  });

  it('sets a kind, then clears it when selected again', () => {
    const on = toggleKind(NO_FILTERS, 'fact');
    expect(on.kind).toBe('fact');

    expect(toggleKind(on, 'fact').kind).toBeNull();
  });

  it('leaves the other filter untouched when one toggles', () => {
    const both = toggleKind(toggleProject(NO_FILTERS, 'hirly'), 'fact');

    expect(both).toEqual({ project: 'hirly', kind: 'fact' });
    expect(toggleKind(both, 'fact')).toEqual({
      project: 'hirly',
      kind: null,
    });
  });

  it('reports whether the clear chip should show', () => {
    expect(hasAnyFilter(NO_FILTERS)).toBe(false);
    expect(hasAnyFilter({ project: 'hirly', kind: null })).toBe(true);
    expect(hasAnyFilter({ project: null, kind: 'fact' })).toBe(true);
  });
});
