import 'server-only';

import { cache } from 'react';

import { listAlertRules, listConnections } from '~/lib/agentguard/integrations';
import type {
  AlertRuleWithChannel,
  IntegrationConnection,
} from '~/lib/agentguard/types';

export type { AlertRuleWithChannel, IntegrationConnection };

export const loadConnections = cache(
  async (orgId: string): Promise<IntegrationConnection[]> => {
    return listConnections(orgId);
  },
);

export const loadAlertRules = cache(
  async (orgId: string): Promise<AlertRuleWithChannel[]> => {
    return listAlertRules(orgId);
  },
);
