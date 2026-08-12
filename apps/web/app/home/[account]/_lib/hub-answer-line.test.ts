import { describe, expect, it } from 'vitest';

import { buildHubAnswerLineCase } from './hub-answer-line';

function input(overrides: Partial<Parameters<typeof buildHubAnswerLineCase>[0]>) {
  return {
    decisions7d: 0,
    plans7d: 0,
    facts7d: 0,
    notes7d: 0,
    projectsActive7d: 0,
    ...overrides,
  };
}

describe('buildHubAnswerLineCase', () => {
  it('prefers decisions+plans when both are present', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 14, plans7d: 6, facts7d: 31, projectsActive7d: 3 }),
    );

    expect(result).toEqual({
      kind: 'decisionsAndPlans',
      decisions: 14,
      plans: 6,
      projects: 3,
    });
  });

  it('falls back to decisions-only when plans are zero', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 5, plans7d: 0, projectsActive7d: 2 }),
    );

    expect(result).toEqual({ kind: 'decisionsOnly', decisions: 5, projects: 2 });
  });

  it('falls back to plans-only when decisions are zero', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 0, plans7d: 9, projectsActive7d: 1 }),
    );

    expect(result).toEqual({ kind: 'plansOnly', plans: 9, projects: 1 });
  });

  it('reports facts honestly when there are no decisions or plans', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 0, plans7d: 0, facts7d: 31 }),
    );

    expect(result).toEqual({ kind: 'factsOnly', facts: 31 });
  });

  it('falls back to notes when even facts are zero', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 0, plans7d: 0, facts7d: 0, notes7d: 4 }),
    );

    expect(result).toEqual({ kind: 'notesOnly', notes: 4 });
  });

  it('reports empty when nothing happened this week', () => {
    const result = buildHubAnswerLineCase(input({}));

    expect(result).toEqual({ kind: 'empty' });
  });

  // Mutation check: a `>=` instead of `>` on the decisions/plans guards would
  // wrongly select 'decisionsAndPlans' when both are exactly zero — this
  // pins the strict '> 0' boundary.
  it('does not select decisionsAndPlans when both counts are exactly zero', () => {
    const result = buildHubAnswerLineCase(
      input({ decisions7d: 0, plans7d: 0, facts7d: 2 }),
    );

    expect(result.kind).not.toBe('decisionsAndPlans');
    expect(result.kind).toBe('factsOnly');
  });
});
