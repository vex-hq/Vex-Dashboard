'use client';

import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

export interface BillingPlanSummaryCardProps {
  /**
   * Human-readable label for the account's current plan/status — e.g.
   * "Free Plan", "Active", "Lifetime". Deliberately not sourced from
   * `billing.config.ts` (the retired Vex Starter/Pro/Team tiers): this card
   * exists specifically so a Klio user is never shown a Vex price or Vex
   * tier name.
   */
  planLabel: string;
  /**
   * Seat count for team accounts. `undefined` means the concept does not
   * apply for this account (personal accounts are single-seat) and the card
   * renders an explanatory note instead of a number.
   */
  seatCount?: number;
}

/**
 * Replaces the Stripe checkout render on both billing pages
 * (`app/home/[account]/billing/page.tsx` and `app/home/(user)/billing/page.tsx`).
 *
 * Klio does not sell the Vex-era Starter/Pro/Team plans ($29/$99/$349) that
 * `billing.config.ts` still describes — that config stays in the tree
 * because the checkout server actions built on it are untouched, but nothing
 * that reads it renders on these pages anymore. This card is the entire
 * billing surface a Klio user sees until Klio's own billing ships.
 */
export function BillingPlanSummaryCard({
  planLabel,
  seatCount,
}: BillingPlanSummaryCardProps) {
  const { t } = useTranslation('billing');

  return (
    <Card data-testid="billing-plan-summary-card">
      <CardHeader>
        <CardTitle className="text-base">
          {t('planSummary.title', 'Your plan')}
        </CardTitle>

        <CardDescription>
          {t(
            'planSummary.description',
            'Klio billing is separate from the legacy console below.',
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {t('planSummary.currentPlanLabel', 'Current plan')}
          </dt>
          <dd className="font-medium" data-testid="billing-current-plan">
            {planLabel}
          </dd>

          <dt className="text-muted-foreground">
            {t('planSummary.seatsLabel', 'Seats')}
          </dt>
          <dd className="font-medium" data-testid="billing-seat-count">
            {typeof seatCount === 'number'
              ? seatCount
              : t(
                  'planSummary.seatsNotApplicable',
                  'Not applicable — personal accounts are single-seat.',
                )}
          </dd>
        </dl>

        <p
          className="text-muted-foreground text-sm"
          data-testid="billing-klio-pricing-notice"
        >
          {t(
            'planSummary.klioPricingNoticeBeforeEmail',
            'Team pricing is $20 per seat at klio.tech/pricing. Billing setup for Klio is in progress — talk to us at ',
          )}
          <a
            className="text-foreground underline underline-offset-2"
            href="mailto:contact@klio.tech"
          >
            contact@klio.tech
          </a>
          {t('planSummary.klioPricingNoticeAfterEmail', '.')}
        </p>
      </CardContent>
    </Card>
  );
}
