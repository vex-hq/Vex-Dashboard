import { describe, expect, it } from 'vitest';

import { activationHref } from './activation-landing';

describe('activationHref', () => {
  it('stays on Hub when nothing was written', () => {
    expect(activationHref('acme', null)).toBe('/home/acme');
  });

  it('opens the project row when the write is filed on a project', () => {
    expect(activationHref('acme', { id: 'mem-1', projectId: 'proj-9' })).toBe(
      '/home/acme/projects/proj-9?item=mem-1',
    );
  });

  it('opens Inbox when the write has no project', () => {
    expect(activationHref('acme', { id: 'mem-2', projectId: null })).toBe(
      '/home/acme/inbox?item=mem-2',
    );
  });
});
