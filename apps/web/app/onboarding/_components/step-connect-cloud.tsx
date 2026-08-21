'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Check, ChevronDown, Copy } from 'lucide-react';
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

/**
 * Connect the agents that are NOT on this machine — ChatGPT, Claude.ai, and
 * anything else that speaks MCP.
 *
 * Same shape as the previous screen, and for the same reason: this was three
 * stacked code blocks (connector URL, endpoint, auth header, and a JSON config
 * that repeats both) before the reader had decided whether the screen even
 * applied to them.
 *
 * The OAuth route needs one value, so it is one button. Everything the
 * key-based route needs — endpoint, header, config — is redundant with it and
 * only matters to clients that cannot do the sign-in flow, so it sits behind a
 * disclosure. The key appears only there, never on the default view.
 */
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
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const keyValue = apiKey ?? KLIO_MCP_KEY_PLACEHOLDER;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(KLIO_MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.cloudTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-center">
          {t('onboarding.cloudDescription')}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          type="button"
          size="lg"
          onClick={copyUrl}
          className="w-full max-w-sm rounded-lg"
          data-testid="copy-connector-url"
        >
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied
            ? t('onboarding.cloudCopied')
            : t('onboarding.cloudCopyConnector')}
        </Button>

        <p
          aria-live="polite"
          className="text-muted-foreground max-w-sm text-center text-sm"
        >
          {copied
            ? t('onboarding.cloudPasteHint')
            : t('onboarding.cloudOauthSteps')}
        </p>
      </motion.div>

      {/* Clients that cannot do the sign-in flow. A minority, and everything
          here repeats the URL above, so it stays folded. */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <button
          type="button"
          onClick={() => setShowManual((open) => !open)}
          aria-expanded={showManual}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          {t('onboarding.cloudManualLabel')}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              showManual ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showManual ? (
          <div className="mt-4 w-full space-y-4">
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
          </div>
        ) : null}
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onNext}
          variant="outline"
          className="rounded-lg px-8"
          size="lg"
        >
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
