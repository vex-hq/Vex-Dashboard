import { z } from 'zod';

const ALLOWED_SCOPES = ['ingest', 'verify', 'read', 'memory'] as const;

export const CreateApiKeySchema = z.object({
  accountSlug: z.string().min(1),
  name: z.string().min(1).max(100),
  scopes: z
    .array(z.enum(ALLOWED_SCOPES))
    .min(1, 'At least one scope is required'),
  rateLimitRpm: z.number().int().min(1).max(100_000).default(1000),
  expiresAt: z.string().nullable().default(null),
});

export const RevokeApiKeySchema = z.object({
  accountSlug: z.string().min(1),
  keyId: z.string().uuid(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeySchema>;
