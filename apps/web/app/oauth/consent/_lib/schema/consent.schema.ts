import { z } from 'zod';

export const ConsentDecisionSchema = z
  .object({
    authorizationId: z.string().min(1),
    decision: z.enum(['approve', 'deny']),
    accountSlug: z.string().min(1).optional(),
  })
  .refine((v) => v.decision === 'deny' || !!v.accountSlug, {
    message: 'accountSlug is required to approve',
  });

export type ConsentDecisionInput = z.infer<typeof ConsentDecisionSchema>;
