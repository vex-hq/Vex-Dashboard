'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  createDataset,
  createExperiment,
  deleteDataset,
  deleteExperiment,
  updateExperimentStatus,
} from '~/lib/agentguard/experiments';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import {
  CreateDatasetSchema,
  CreateExperimentSchema,
  DeleteDatasetSchema,
  DeleteExperimentSchema,
  UpdateExperimentStatusSchema,
} from '../schema/experiment.schema';

export const createExperimentAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);

    const experiment = await createExperiment({
      orgId,
      name: data.name,
      description: data.description,
      mode: data.mode,
      variants: data.variants,
      datasetId: data.datasetId,
      createdBy: user.id,
    });

    revalidatePath(`/home/${data.accountSlug}/experiments`);
    return { experiment };
  },
  { schema: CreateExperimentSchema },
);

export const updateExperimentStatusAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);
    const success = await updateExperimentStatus(
      orgId,
      data.experimentId,
      data.status,
    );

    if (!success) {
      throw new Error('Experiment not found');
    }

    revalidatePath(`/home/${data.accountSlug}/experiments`);
    return { success: true };
  },
  { schema: UpdateExperimentStatusSchema },
);

export const deleteExperimentAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);
    const success = await deleteExperiment(orgId, data.experimentId);

    if (!success) {
      throw new Error('Experiment not found');
    }

    revalidatePath(`/home/${data.accountSlug}/experiments`);
    return { success: true };
  },
  { schema: DeleteExperimentSchema },
);

export const createDatasetAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);

    const dataset = await createDataset({
      orgId,
      name: data.name,
      items: data.items,
      createdBy: user.id,
    });

    revalidatePath(`/home/${data.accountSlug}/experiments`);
    return { dataset };
  },
  { schema: CreateDatasetSchema },
);

export const deleteDatasetAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);
    if (!user) {
      throw new Error('Authentication required');
    }

    const orgId = await resolveOrgId(data.accountSlug);
    const success = await deleteDataset(orgId, data.datasetId);

    if (!success) {
      throw new Error('Dataset not found');
    }

    revalidatePath(`/home/${data.accountSlug}/experiments`);
    return { success: true };
  },
  { schema: DeleteDatasetSchema },
);
