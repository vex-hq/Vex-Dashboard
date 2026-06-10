import { z } from 'zod';

/**
 * Schema for the revoke-grant action.
 *
 * A UUID is required so the server can precisely identify the row to revoke.
 * The RLS policy enforces ownership — no additional ownership field is needed
 * in the schema.
 */
export const RevokeGrantSchema = z.object({
  grantId: z.string().uuid(),
});

export type RevokeGrantInput = z.infer<typeof RevokeGrantSchema>;
