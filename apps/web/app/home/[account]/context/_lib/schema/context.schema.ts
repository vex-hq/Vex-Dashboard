import { z } from 'zod';

/**
 * Input validation for the context surfaces' write actions.
 *
 * Everything crossing the server-action boundary is parsed here first. Note
 * what is NOT in these schemas: a user id. The acting user is always taken
 * from the session (`loadAccountViewer`) and never from a payload — a user id
 * that arrives from the client is an attacker-chosen user id, and on the share
 * path it is the only thing standing between one person's private context and
 * their whole team.
 */

const UUID = z.string().uuid();

export const ShareMemorySchema = z.object({
  accountSlug: z.string().min(1),
  memoryId: UUID,
  /** Where to promote it. The engine allows exactly these two. */
  to: z.enum(['org', 'project']).default('org'),
});

export const UnshareMemorySchema = z.object({
  accountSlug: z.string().min(1),
  memoryId: UUID,
});

export const DecideProposalSchema = z.object({
  accountSlug: z.string().min(1),
  proposalId: UUID,
});

export type ShareMemoryInput = z.infer<typeof ShareMemorySchema>;
export type UnshareMemoryInput = z.infer<typeof UnshareMemorySchema>;
export type DecideProposalInput = z.infer<typeof DecideProposalSchema>;
