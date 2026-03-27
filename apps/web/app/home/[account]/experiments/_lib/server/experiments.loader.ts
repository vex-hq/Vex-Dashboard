import 'server-only';

import { cache } from 'react';

import {
  getCheckScoresByVariant,
  getDataset,
  getExperiment,
  getVariantMetrics,
  listDatasets,
  listExperiments,
} from '~/lib/agentguard/experiments';
import type {
  CheckScoreByVariant,
  Dataset,
  Experiment,
  VariantMetrics,
} from '~/lib/agentguard/types';

export type { CheckScoreByVariant, Dataset, Experiment, VariantMetrics };

export const loadExperiments = cache(
  async (orgId: string): Promise<Experiment[]> => {
    return listExperiments(orgId);
  },
);

export const loadExperiment = cache(
  async (orgId: string, experimentId: string): Promise<Experiment | null> => {
    return getExperiment(orgId, experimentId);
  },
);

export const loadVariantMetrics = cache(
  async (orgId: string, experimentId: string): Promise<VariantMetrics[]> => {
    return getVariantMetrics(orgId, experimentId);
  },
);

export const loadCheckScores = cache(
  async (
    orgId: string,
    experimentId: string,
  ): Promise<CheckScoreByVariant[]> => {
    return getCheckScoresByVariant(orgId, experimentId);
  },
);

export const loadDatasets = cache(
  async (orgId: string): Promise<Dataset[]> => {
    return listDatasets(orgId);
  },
);

export const loadDataset = cache(
  async (orgId: string, datasetId: string): Promise<Dataset | null> => {
    return getDataset(orgId, datasetId);
  },
);
