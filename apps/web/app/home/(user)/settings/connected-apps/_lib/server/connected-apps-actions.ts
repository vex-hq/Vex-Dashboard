'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { RevokeGrantSchema } from '../schema/connected-apps.schema';

/**
 * Revoke an active OAuth grant.
 *
 * Security design:
 * - `enhanceAction` with `auth: true` (the default) ensures the user is
 *   authenticated and injects the verified `user` object — no manual auth
 *   check is required here.
 * - The UPDATE query is guarded by `.is('revoked_at', null)` so only an
 *   active grant row is targeted; already-revoked grants are a no-op.
 * - Row-level security on `public.oauth_grants` ensures users can only update
 *   their own rows; ownership is enforced at the database policy level, not
 *   in application code.
 * - When zero rows are matched (the id does not exist, belongs to another user,
 *   or is already revoked) the action returns `{ success: false }` WITHOUT
 *   distinguishing the reason — this prevents existence probing.
 */
export const revokeGrantAction = enhanceAction(
  async (data, _user) => {
    const client = getSupabaseServerClient();

    const { data: updatedRows, error } = await client
      .from('oauth_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', data.grantId)
      .is('revoked_at', null)
      .select('id');

    if (error) {
      throw new Error(`Failed to revoke grant: ${error.message}`);
    }

    // Use the length of returned rows as the authoritative signal — PostgREST
    // returns the updated rows when `.select()` is chained after `.update()`.
    const rowsUpdated = (updatedRows ?? []).length;

    return { success: rowsUpdated > 0 };
  },
  {
    schema: RevokeGrantSchema,
  },
);
