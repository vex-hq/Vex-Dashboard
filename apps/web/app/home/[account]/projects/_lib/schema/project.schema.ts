import { z } from 'zod';

/**
 * Input validation for the project surfaces.
 *
 * Everything crossing the server-action boundary is parsed here first. The
 * user ids in the member schemas are TARGET users (who is being granted or
 * revoked); the ACTING user is always taken from the session and never from
 * these payloads.
 */

const UUID = z.string().uuid();

export const CreateProjectSchema = z.object({
  accountSlug: z.string().min(1),
  displayName: z.string().trim().min(1).max(255),
  gitRemote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
  repoRootPath: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const AddProjectMemberSchema = z.object({
  accountSlug: z.string().min(1),
  projectId: UUID,
  /** The org member being granted access. Must already be in the org. */
  userId: UUID,
  role: z.enum(['read', 'write', 'manage', 'admin', 'member']).default('write'),
});

export const RemoveProjectMemberSchema = z.object({
  accountSlug: z.string().min(1),
  projectId: UUID,
  userId: UUID,
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
export type RemoveProjectMemberInput = z.infer<
  typeof RemoveProjectMemberSchema
>;
