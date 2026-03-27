import { z } from 'zod';

const EXPERIMENT_MODES = ['offline', 'live'] as const;
const EXPERIMENT_STATUSES = ['draft', 'running', 'completed'] as const;

const VariantSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1).max(255),
  config: z.record(z.unknown()).optional(),
});

export const CreateExperimentSchema = z.object({
  accountSlug: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  mode: z.enum(EXPERIMENT_MODES),
  variants: z.array(VariantSchema).min(2).max(10),
  datasetId: z.string().uuid().optional(),
});

export const UpdateExperimentStatusSchema = z.object({
  accountSlug: z.string().min(1),
  experimentId: z.string().uuid(),
  status: z.enum(EXPERIMENT_STATUSES),
});

export const DeleteExperimentSchema = z.object({
  accountSlug: z.string().min(1),
  experimentId: z.string().uuid(),
});

const DatasetItemSchema = z.object({
  input: z.string().min(1),
  expected_output: z.string().optional(),
  ground_truth: z.unknown().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateDatasetSchema = z.object({
  accountSlug: z.string().min(1),
  name: z.string().min(1).max(255),
  items: z.array(DatasetItemSchema).min(1),
});

export const DeleteDatasetSchema = z.object({
  accountSlug: z.string().min(1),
  datasetId: z.string().uuid(),
});

export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;
export type UpdateExperimentStatusInput = z.infer<
  typeof UpdateExperimentStatusSchema
>;
export type DeleteExperimentInput = z.infer<typeof DeleteExperimentSchema>;
export type CreateDatasetInput = z.infer<typeof CreateDatasetSchema>;
export type DeleteDatasetInput = z.infer<typeof DeleteDatasetSchema>;
