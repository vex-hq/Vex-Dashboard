import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { HubProjectLead } from '../hub-projects-model';

/**
 * Workspace members as people the Hub can render (Lead avatars).
 *
 * `projects.created_by` is a Supabase auth UUID. Names and photos live on
 * the team-account members RPC, not in the engine. One call covers every
 * project on the page.
 */
export const loadWorkspacePeople = cache(
  async (accountSlug: string): Promise<Map<string, HubProjectLead>> => {
    const client = getSupabaseServerClient();
    const { data, error } = await client.rpc('get_account_members', {
      account_slug: accountSlug,
    });

    if (error) {
      console.error(
        '[homepage] loader "workspacePeople" failed; leads will be unresolved',
        { error: error.message },
      );
      return new Map();
    }

    const people = new Map<string, HubProjectLead>();

    for (const row of data ?? []) {
      const name = (row.name ?? '').trim() || (row.email ?? '').trim();
      if (!row.user_id || !name) continue;

      people.set(row.user_id, {
        userId: row.user_id,
        name,
        pictureUrl: row.picture_url || null,
      });
    }

    return people;
  },
);
