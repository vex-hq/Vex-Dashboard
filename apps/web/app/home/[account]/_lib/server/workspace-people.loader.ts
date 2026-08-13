import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { HubProjectLead } from '../hub-projects-model';

export interface WorkspacePerson extends HubProjectLead {
  email: string;
}

/**
 * Workspace members as people the Hub and project-access UI can render.
 *
 * `projects.created_by` and `project_members.user_id` are Supabase auth
 * UUIDs. Names, emails and photos live on the team-account members RPC,
 * not in the engine. One call covers every project on the page.
 */
export const loadWorkspacePeople = cache(
  async (accountSlug: string): Promise<Map<string, WorkspacePerson>> => {
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

    const people = new Map<string, WorkspacePerson>();

    for (const row of data ?? []) {
      const email = (row.email ?? '').trim();
      const name = (row.name ?? '').trim() || email;
      if (!row.user_id || !name) continue;

      people.set(row.user_id, {
        userId: row.user_id,
        name,
        email,
        pictureUrl: row.picture_url || null,
      });
    }

    return people;
  },
);
