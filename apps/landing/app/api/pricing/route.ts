import { NextResponse } from 'next/server';

import { CURRENCY, LAST_UPDATED, PLANS } from '~/lib/pricing';
import { ORG } from '~/lib/site-meta';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    {
      product: ORG.name,
      currency: CURRENCY,
      lastUpdated: LAST_UPDATED,
      plans: PLANS,
      enterprise: { contact: ORG.contactEmail },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
