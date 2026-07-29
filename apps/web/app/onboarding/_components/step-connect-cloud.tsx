'use client';

import Link from 'next/link';

import { ArrowRight, KeyRound, Plug } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import {
  KLIO_DOCS_MCP_ANCHOR,
  KLIO_MCP_KEY_HEADER,
  KLIO_MCP_KEY_PLACEHOLDER,
  KLIO_MCP_URL,
  buildKlioMcpConfig,
} from '~/lib/agentguard/mcp.constants';

import { CodeBlock } from './code-block';

interface StepConnectCloudProps {
  accountSlug: string;
  apiKey: string | null;
  onNext: () => void;
  onBack: () => void;
}

export function StepConnectCloud({
  accountSlug,
  apiKey,
  onNext,
  onBack,
}: StepConnectCloudProps) {
  const { t } = useTranslation('agentguard');
  const keyValue = apiKey ?? KLIO_MCP_KEY_PLACEHOLDER;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.cloudTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.cloudDescription')}
        </p>
      </motion.div>

      {/* OAuth first: the endpoint advertises
          /.well-known/oauth-protected-resource, so any MCP client implementing
          the authorization spec joins with no key at all. */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Plug className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.cloudOauthLabel')}
          </h2>
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            {t('onboarding.cloudOauthUrlLabel')}
          </p>
          <CodeBlock code={KLIO_MCP_URL} ariaLabel="Copy connector URL" />
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.cloudOauthSteps')}
        </p>
      </motion.div>

      {/* Secondary: clients without the OAuth flow */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <KeyRound className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.cloudManualLabel')}
          </h2>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.cloudManualDescription')}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudEndpointLabel')}
            </p>
            <CodeBlock code={KLIO_MCP_URL} ariaLabel="Copy MCP endpoint" />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudHeaderLabel')}
            </p>
            <CodeBlock
              code={`${KLIO_MCP_KEY_HEADER}: ${keyValue}`}
              ariaLabel="Copy auth header"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudConfigLabel')}
            </p>
            <CodeBlock
              code={buildKlioMcpConfig(apiKey)}
              ariaLabel="Copy MCP client config"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!apiKey ? (
            <Link
              href={`/home/${accountSlug}/settings/api-keys`}
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              {t('onboarding.cloudKeyMissing')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          <Link
            href={`/home/${accountSlug}/docs#${KLIO_DOCS_MCP_ANCHOR}`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            {t('onboarding.cloudGuide')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button onClick={onNext} className="rounded-lg px-8" size="lg">
          {t('onboarding.next')}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t('onboarding.back')}
        </button>
      </motion.div>
    </div>
  );
}
