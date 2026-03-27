export type IntegrationProvider = 'slack';

export interface IntegrationProviderConfig {
  name: string;
  description: string;
  nangoIntegrationId: string;
  enabled: boolean;
}

export const integrationsConfig = {
  providers: {
    slack: {
      name: 'Slack',
      description: 'Receive confidence alerts in Slack channels',
      nangoIntegrationId: 'slack',
      enabled: true,
    },
  } satisfies Record<IntegrationProvider, IntegrationProviderConfig>,
} as const;

export default integrationsConfig;
