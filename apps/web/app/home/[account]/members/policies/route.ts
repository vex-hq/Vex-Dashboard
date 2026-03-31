import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createAccountsApi } from '@kit/accounts/api';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  createInvitationContextBuilder,
  createInvitationsPolicyEvaluator,
} from '@kit/team-accounts/policies';

import {
  canAddSeat,
  getPlanLimits,
  resolvePlanFromSubscriptionItems,
} from '~/lib/agentguard/plan-limits';

export const GET = enhanceRouteHandler(
  async function ({ params, user }) {
    const client = getSupabaseServerClient();
    const { account } = z.object({ account: z.string() }).parse(params);

    try {
      // ── Seat-limit enforcement ───────────────────────────────────
      // Resolve account ID from slug, then check the Supabase
      // subscription to determine the active plan.
      const { data: accountRow } = await client
        .from('accounts')
        .select('id')
        .eq('slug', account)
        .single();

      if (accountRow) {
        const api = createAccountsApi(client);
        const subscription = await api.getSubscription(accountRow.id);

        // Derive plan from the subscription's price IDs via billing config
        const plan =
          subscription?.status === 'active'
            ? resolvePlanFromSubscriptionItems(subscription.items)
            : 'free';

        const { count: memberCount } = await client
          .from('accounts_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountRow.id);

        const seatCheck = canAddSeat(plan, memberCount ?? 0);

        if (!seatCheck.allowed) {
          const limits = getPlanLimits(plan);

          return NextResponse.json({
            allowed: false,
            reasons: [seatCheck.reason],
            metadata: {
              plan,
              currentSeats: memberCount ?? 0,
              maxSeats: limits.maxSeats,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // ── Standard policy evaluation ───────────────────────────────
      const evaluator = createInvitationsPolicyEvaluator();
      const hasPolicies = await evaluator.hasPoliciesForStage('preliminary');

      if (!hasPolicies) {
        return NextResponse.json({
          allowed: true,
          reasons: [],
          metadata: {
            policiesEvaluated: 0,
            timestamp: new Date().toISOString(),
            noPoliciesConfigured: true,
          },
        });
      }

      // Build context for policy evaluation (empty invitations for testing)
      const contextBuilder = createInvitationContextBuilder(client);

      const context = await contextBuilder.buildContext(
        {
          invitations: [],
          accountSlug: account,
        },
        user,
      );

      // validate against policies
      const result = await evaluator.canInvite(context, 'preliminary');

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          allowed: false,
          reasons: [
            error instanceof Error ? error.message : 'Unknown error occurred',
          ],
          metadata: {
            error: true,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
        },
        { status: 500 },
      );
    }
  },
  {
    auth: true,
  },
);
