import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GET } from '~/api/pricing/route';

const PlanFeatureZ = z.object({ label: z.string(), value: z.string() });

const PlanZ = z.object({
  id: z.enum(['free', 'starter', 'pro', 'team']),
  name: z.string(),
  priceMonthly: z.number().int().nonnegative(),
  priceYearly: z.number().optional(),
  description: z.string(),
  audience: z.string(),
  highlighted: z.boolean(),
  features: z.array(PlanFeatureZ).min(1),
  cta: z.object({ label: z.string(), href: z.string().url() }),
});

const ResponseZ = z.object({
  product: z.literal('Vex'),
  currency: z.literal('USD'),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plans: z.array(PlanZ).length(4),
  enterprise: z.object({ contact: z.string().email() }),
});

describe('GET /api/pricing', () => {
  it('returns 200 with the documented contract', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    ResponseZ.parse(body);
  });

  it('sets a public Cache-Control header', () => {
    const res = GET();
    const cc = res.headers.get('cache-control') ?? '';
    expect(cc).toMatch(/public/i);
    expect(cc).toMatch(/max-age=\d+/);
  });

  it('plan ids match lib/pricing PLANS', async () => {
    const res = GET();
    const body = await res.json();
    expect(body.plans.map((p: { id: string }) => p.id)).toEqual([
      'free',
      'starter',
      'pro',
      'team',
    ]);
  });
});
