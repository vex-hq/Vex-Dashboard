import { NextResponse } from 'next/server';

import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  createInvitationContextBuilder,
  createInvitationsPolicyEvaluator,
} from '@kit/team-accounts/policies';

import { canAddSeat, getPlanLimits } from '~/lib/agentguard/plan-limits';
import type { PlanLimits } from '~/lib/agentguard/plan-limits';

export const GET = enhanceRouteHandler(
  async function ({ params, user }) {
    const client = getSupabaseServerClient();
    const { account } = z.object({ account: z.string() }).parse(params);

    try {
      // ── Seat-limit enforcement ───────────────────────────────────
      // The plan comes from `accounts.vex_plan` — the SAME source of truth used
      // by the admin plan action, the Stripe billing webhook, the dashboard
      // usage meters, and the engine's entitlement checks.
      //
      // This previously read `organizations.plan` from the engine database,
      // which is written by nothing (it still holds its `'free'` column
      // default), so an account upgraded to any paid/enterprise plan was still
      // gated at the free tier's 1 seat. Reading `vex_plan` here removes that
      // split-brain. `vex_plan_overrides` is honoured too, so a per-account
      // custom seat grant works without changing the plan.
      const { data: accountRow } = await client
        .from('accounts')
        .select('id, vex_plan, vex_plan_overrides')
        .eq('slug', account)
        .single();

      if (accountRow) {
        const plan = accountRow.vex_plan ?? 'free';
        const overrides = (accountRow.vex_plan_overrides ??
          null) as Partial<PlanLimits> | null;

        const { count: memberCount } = await client
          .from('accounts_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountRow.id);

        const seatCheck = canAddSeat(plan, memberCount ?? 0, 1, overrides);

        if (!seatCheck.allowed) {
          const limits = getPlanLimits(plan, overrides);

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
