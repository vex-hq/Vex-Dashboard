import { z } from 'zod';

/**
 * Input validation for the project-strip write actions.
 *
 * Note what is NOT here: a user id. The acting user always comes from the
 * session, never from a payload — on the override path a caller-supplied user
 * id would let one person silence, or un-silence, somebody else's opt-out.
 */
export const SetProjectDefaultScopeSchema = z.object({
  accountSlug: z.string().min(1),
  projectId: z.string().uuid(),
  scope: z.enum(['private', 'project', 'org']),
});

export const SetMyCaptureScopeSchema = z.object({
  accountSlug: z.string().min(1),
  projectId: z.string().uuid(),
  /** 'private' opts out of the project default; 'default' follows it again. */
  mine: z.enum(['private', 'default']),
});
