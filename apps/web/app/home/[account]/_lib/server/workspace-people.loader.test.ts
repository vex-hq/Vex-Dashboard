import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({ rpc }),
}));

describe('loadWorkspacePeople', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('indexes workspace members by user id', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          user_id: 'user-abhishek',
          name: 'Abhishek Thakur',
          email: 'abhishek@klio.tech',
          picture_url: 'https://example.com/a.png',
        },
        {
          user_id: 'user-other',
          name: '  ',
          email: 'other@klio.tech',
          picture_url: '',
        },
      ],
      error: null,
    });

    const { loadWorkspacePeople } = await import('./workspace-people.loader');
    const people = await loadWorkspacePeople('local-test-abhishek');

    expect(rpc).toHaveBeenCalledWith('get_account_members', {
      account_slug: 'local-test-abhishek',
    });
    expect(people.get('user-abhishek')).toEqual({
      userId: 'user-abhishek',
      name: 'Abhishek Thakur',
      email: 'abhishek@klio.tech',
      pictureUrl: 'https://example.com/a.png',
    });
    expect(people.get('user-other')).toEqual({
      userId: 'user-other',
      name: 'other@klio.tech',
      email: 'other@klio.tech',
      pictureUrl: null,
    });
  });

  it('returns an empty map when the members RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { loadWorkspacePeople } = await import('./workspace-people.loader');
    const people = await loadWorkspacePeople('acme');

    expect(people.size).toBe(0);
  });
});
