'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  createAlertRule,
  createConnection,
  deleteAlertRule,
  deleteConnection,
  toggleAlertRule,
} from '~/lib/agentguard/integrations';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createNangoService } from '~/lib/integrations/nango.service';

import {
  CreateAlertRuleSchema,
  DeleteAlertRuleSchema,
  DeleteConnectionSchema,
  ToggleAlertRuleSchema,
} from '../schema/integration.schema';

const CreateConnectSessionSchema = z.object({
  accountSlug: z.string().min(1),
  provider: z.enum(['slack']),
});

const SaveSlackConnectionSchema = z.object({
  accountSlug: z.string().min(1),
  nangoConnectionId: z.string().min(1),
});

export const createConnectSessionAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);
    const nango = createNangoService();

    const sessionToken = await nango.createConnectSession({
      accountId: orgId,
      accountName: data.accountSlug,
      userId: user.id,
      userEmail: user.email ?? '',
      provider: data.provider,
    });

    return { sessionToken };
  },
  { schema: CreateConnectSessionSchema },
);

export const saveSlackConnectionAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);
    await createConnection({
      orgId,
      provider: 'slack',
      nangoConnectionId: data.nangoConnectionId,
      workspaceName: null,
      createdBy: user.id,
    });

    revalidatePath(`/home/${data.accountSlug}/settings/integrations`);
    return { success: true };
  },
  { schema: SaveSlackConnectionSchema },
);

export const deleteConnectionAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);

    // TODO: fetch nango_connection_id and delete from Nango too
    // For now, just delete from our database
    const success = await deleteConnection(orgId, data.connectionId);
    if (!success) {
      throw new Error('Connection not found');
    }

    revalidatePath(`/home/${data.accountSlug}/settings/integrations`);
    return { success: true };
  },
  { schema: DeleteConnectionSchema },
);

export const createAlertRuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }
    const orgId = await resolveOrgId(data.accountSlug);
    const rule = await createAlertRule({
      orgId,
      name: data.name,
      confidenceThreshold: data.confidenceThreshold,
      createdBy: user.id,
      channelType: data.channelType,
      connectionId: data.connectionId,
      slackChannelId: data.slackChannelId,
      slackChannelName: data.slackChannelName,
    });

    revalidatePath(`/home/${data.accountSlug}/settings/integrations`);
    return { rule };
  },
  { schema: CreateAlertRuleSchema },
);

export const deleteAlertRuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }
    const orgId = await resolveOrgId(data.accountSlug);
    const success = await deleteAlertRule(orgId, data.ruleId);
    if (!success) {
      throw new Error('Alert rule not found');
    }

    revalidatePath(`/home/${data.accountSlug}/settings/integrations`);
    return { success: true };
  },
  { schema: DeleteAlertRuleSchema },
);

export const toggleAlertRuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }
    const orgId = await resolveOrgId(data.accountSlug);
    const success = await toggleAlertRule(orgId, data.ruleId, data.enabled);
    if (!success) {
      throw new Error('Alert rule not found');
    }

    revalidatePath(`/home/${data.accountSlug}/settings/integrations`);
    return { success: true };
  },
  { schema: ToggleAlertRuleSchema },
);
