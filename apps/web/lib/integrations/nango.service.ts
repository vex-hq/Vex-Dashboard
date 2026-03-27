import 'server-only';

import { Nango } from '@nangohq/node';

import { getLogger } from '@kit/shared/logger';

import type { IntegrationProvider } from '~/config/integrations.config';

/**
 * Factory function to create a NangoService instance.
 * Use this instead of instantiating NangoService directly.
 */
export function createNangoService() {
  return new NangoService();
}

class NangoService {
  private nango: Nango;

  constructor() {
    const secretKey = process.env.NANGO_SECRET_KEY;

    if (!secretKey) {
      throw new Error('NANGO_SECRET_KEY environment variable is not set');
    }

    this.nango = new Nango({ secretKey });
  }

  async createConnectSession(params: {
    accountId: string;
    accountName: string;
    userId: string;
    userEmail: string;
    provider: IntegrationProvider;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'nango.createConnectSession',
      accountId: params.accountId,
      provider: params.provider,
    };

    logger.info(ctx, 'Creating Nango connect session');

    const result = await this.nango.createConnectSession({
      end_user: { id: params.userId, email: params.userEmail },
      organization: {
        id: params.accountId,
        display_name: params.accountName,
      },
      allowed_integrations: [params.provider],
    });

    logger.info(ctx, 'Nango connect session created');

    return result.data.token;
  }

  async getConnection(params: {
    provider: IntegrationProvider;
    connectionId: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'nango.getConnection',
      provider: params.provider,
      connectionId: params.connectionId,
    };

    logger.info(ctx, 'Getting Nango connection');

    const connection = await this.nango.getConnection(
      params.provider,
      params.connectionId,
    );

    return connection;
  }

  async deleteConnection(params: {
    provider: IntegrationProvider;
    connectionId: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'nango.deleteConnection',
      provider: params.provider,
      connectionId: params.connectionId,
    };

    logger.info(ctx, 'Deleting Nango connection');

    await this.nango.deleteConnection(params.provider, params.connectionId);

    logger.info(ctx, 'Nango connection deleted');
  }

  async get<T>(params: {
    provider: IntegrationProvider;
    connectionId: string;
    endpoint: string;
    queryParams?: Record<string, string>;
  }): Promise<T> {
    const response = await this.nango.get({
      providerConfigKey: params.provider,
      connectionId: params.connectionId,
      endpoint: params.endpoint,
      params: params.queryParams,
    });

    return response.data as T;
  }

  async post<T>(params: {
    provider: IntegrationProvider;
    connectionId: string;
    endpoint: string;
    data?: unknown;
  }): Promise<T> {
    const response = await this.nango.post({
      providerConfigKey: params.provider,
      connectionId: params.connectionId,
      endpoint: params.endpoint,
      data: params.data,
    });

    return response.data as T;
  }

  async joinSlackChannel(params: {
    connectionId: string;
    channelId: string;
  }): Promise<void> {
    const logger = await getLogger();

    const ctx = {
      name: 'nango.joinSlackChannel',
      connectionId: params.connectionId,
      channelId: params.channelId,
    };

    logger.info(ctx, 'Joining Slack channel via Nango');

    const result = await this.post<{ ok: boolean; error?: string }>({
      provider: 'slack',
      connectionId: params.connectionId,
      endpoint: '/conversations.join',
      data: { channel: params.channelId },
    });

    if (!result.ok && result.error !== 'already_in_channel') {
      logger.error(ctx, `Failed to join Slack channel: ${result.error}`);
      throw new Error(`Failed to join Slack channel: ${result.error}`);
    }

    logger.info(ctx, 'Bot joined Slack channel');
  }
}
