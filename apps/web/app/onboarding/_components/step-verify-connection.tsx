'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2, PartyPopper } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { KLIO_DOCS_URL } from '~/lib/agentguard/mcp.constants';

import { completeOnboardingAction } from '../_lib/server-actions';

interface VerifyResponse {
  connected: boolean;
  agent_id?: string;
  execution_count?: number;
}

interface StepVerifyConnectionProps {
  accountSlug: string;
  onBack: () => void;
}

export function StepVerifyConnection({
  accountSlug,
  onBack,
}: StepVerifyConnectionProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/onboarding/verify?account=${encodeURIComponent(accountSlug)}`,
        );

        if (res.ok) {
          const data: VerifyResponse = await res.json();

          if (data.connected) {
            setConnected(true);
            setAgentId(data.agent_id ?? null);

            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch {
        // Silently retry
      }
    };

    // Poll immediately, then every 3s
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [accountSlug]);

  const handleFinish = async () => {
    setCompleting(true);

    try {
      await completeOnboardingAction({ accountSlug });
      router.push(`/home/${accountSlug}`);
    } catch {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Heading + description centered */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.step5Title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.step5Description')}
        </p>
      </motion.div>

      {/* Status area */}
      <motion.div
        className="flex flex-col items-center justify-center py-16"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {connected ? (
            <motion.div
              key="connected"
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <PartyPopper className="h-16 w-16 text-green-500" />
              </motion.div>

              <motion.h2
                className="text-2xl font-bold text-green-600 dark:text-green-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {t('onboarding.step5Connected')}
              </motion.h2>

              {agentId && (
                <motion.p
                  className="text-muted-foreground text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {t('onboarding.step5AgentDetected', { agentId })}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              className="flex flex-col items-center gap-4"
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <Loader2 className="text-muted-foreground h-12 w-12" />
              </motion.div>

              <p className="text-muted-foreground">
                {t('onboarding.step5Waiting')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dual CTAs.
          Verification is a confirmation, not a gate: the finish button must
          never be held hostage by the poller. A user whose agent has not
          connected yet (or whose connection the poller misses) can always
          enter the dashboard and wire agents from there. */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleFinish}
          disabled={completing}
          variant={connected ? 'default' : 'outline'}
          className="rounded-lg px-8"
          size="lg"
        >
          {completing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {connected ? t('onboarding.finish') : t('onboarding.step5SkipFinish')}
        </Button>

        {!connected && (
          <p className="text-muted-foreground text-xs">
            {t('onboarding.step5SkipHint')}
          </p>
        )}

        {connected ? (
          <a
            href={KLIO_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Go to Documentation
          </a>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t('onboarding.back')}
          </button>
        )}
      </motion.div>
    </div>
  );
}
