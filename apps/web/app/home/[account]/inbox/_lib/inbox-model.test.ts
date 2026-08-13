import { describe, expect, it } from 'vitest';

import { inboxProjectHref, pickInboxItem } from './inbox-model';

describe('pickInboxItem / inboxProjectHref', () => {
  it('keeps a requested id when it is still in the list', () => {
    const items = [{ id: 'a' }, { id: 'b' }];

    expect(pickInboxItem(items, 'b')).toBe('b');
    expect(pickInboxItem(items, 'gone')).toBe('a');
    expect(pickInboxItem([], 'a')).toBeUndefined();
  });

  it('links a filed write to its project row', () => {
    expect(inboxProjectHref('acme', { id: 'mem-1', projectId: 'proj-9' })).toBe(
      '/home/acme/projects/proj-9?item=mem-1',
    );
    expect(
      inboxProjectHref('acme', { id: 'mem-1', projectId: null }),
    ).toBeNull();
  });
});
