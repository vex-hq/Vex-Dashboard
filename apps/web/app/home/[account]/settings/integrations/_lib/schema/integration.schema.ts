import { z } from 'zod';

export const DeleteConnectionSchema = z.object({
  accountSlug: z.string().min(1),
  connectionId: z.string().uuid(),
});

export const CreateAlertRuleSchema = z.object({
  accountSlug: z.string().min(1),
  name: z.string().min(1).max(255),
  confidenceThreshold: z.number().min(0).max(1),
  channelType: z.string().min(1),
  connectionId: z.string().uuid(),
  slackChannelId: z.string().min(1),
  slackChannelName: z.string().min(1),
});

export const DeleteAlertRuleSchema = z.object({
  accountSlug: z.string().min(1),
  ruleId: z.string().uuid(),
});

export const ToggleAlertRuleSchema = z.object({
  accountSlug: z.string().min(1),
  ruleId: z.string().uuid(),
  enabled: z.boolean(),
});

export type DeleteConnectionInput = z.infer<typeof DeleteConnectionSchema>;
export type CreateAlertRuleInput = z.infer<typeof CreateAlertRuleSchema>;
export type DeleteAlertRuleInput = z.infer<typeof DeleteAlertRuleSchema>;
export type ToggleAlertRuleInput = z.infer<typeof ToggleAlertRuleSchema>;
