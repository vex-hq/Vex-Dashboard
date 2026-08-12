import { describe, expect, it } from 'vitest';

import { parseStreamFilters } from './parse-stream-filters';

describe('parseStreamFilters', () => {
  it('passes through valid project, agent, kind and days', () => {
    const filters = parseStreamFilters({
      project: 'proj-1',
      agent: 'agent-1',
      kind: 'decision',
      days: '7',
    });

    expect(filters).toEqual({
      projectId: 'proj-1',
      agentId: 'agent-1',
      kind: 'decision',
      days: 7,
    });
  });

  it('defaults a missing days param to the last 7 days, not all time', () => {
    expect(parseStreamFilters({})).toEqual({
      projectId: undefined,
      agentId: undefined,
      kind: undefined,
      days: 7,
    });
  });

  it('treats days=all as an explicit all-time opt-in', () => {
    expect(parseStreamFilters({ days: 'all' }).days).toBeUndefined();
  });

  it('falls back kind to undefined when it is not a known kind', () => {
    const filters = parseStreamFilters({ kind: 'sonnet' });
    expect(filters.kind).toBeUndefined();
  });

  it('rejects "other" as a kind filter — it is a display bucket, not a storable value', () => {
    const filters = parseStreamFilters({ kind: 'other' });
    expect(filters.kind).toBeUndefined();
  });

  it.each(['decision', 'plan', 'fact', 'note'])(
    'accepts known kind %s',
    (kind) => {
      expect(parseStreamFilters({ kind }).kind).toBe(kind);
    },
  );

  it('falls back a negative days value to the 7-day default', () => {
    expect(parseStreamFilters({ days: '-7' }).days).toBe(7);
  });

  it('falls back a zero days value to the 7-day default', () => {
    expect(parseStreamFilters({ days: '0' }).days).toBe(7);
  });

  it('falls back a non-numeric days value to the 7-day default', () => {
    expect(parseStreamFilters({ days: 'thirty' }).days).toBe(7);
  });

  it('falls back a decimal days value to the 7-day default', () => {
    expect(parseStreamFilters({ days: '7.5' }).days).toBe(7);
  });

  it('accepts a positive integer days value', () => {
    expect(parseStreamFilters({ days: '30' }).days).toBe(30);
  });

  it('treats an empty-string project/agent as absent', () => {
    const filters = parseStreamFilters({ project: '', agent: '  ' });
    expect(filters.projectId).toBeUndefined();
    expect(filters.agentId).toBeUndefined();
  });

  it('never throws on garbage input', () => {
    expect(() =>
      parseStreamFilters({
        project: '<script>',
        agent: '\n\t',
        kind: 'DROP TABLE',
        days: 'NaN',
      }),
    ).not.toThrow();
  });
});
