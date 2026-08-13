'use client';

import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { KlioMark } from '~/components/klio-mark';

interface JoinWelcomeProps {
  workspaceName: string;
  onNext: () => void;
  onSkip: () => void;
  skipping: boolean;
}

export function JoinWelcome({
  workspaceName,
  onNext,
  onSkip,
  skipping,
}: JoinWelcomeProps) {
  const { t } = useTranslation('agentguard');

  return (
    <div className="flex flex-col items-center space-y-4">
      <motion.div
        className="flex justify-center"
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <KlioMark size={160} className="text-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.joinWelcomeTitle', { workspace: workspaceName })}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center text-base leading-relaxed">
          {t('onboarding.joinWelcomeDescription')}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Button
          onClick={onNext}
          disabled={skipping}
          className="rounded-lg px-8"
          size="lg"
        >
          {t('onboarding.joinConnectCta')}
        </Button>
        <button
          type="button"
          data-testid="join-onboarding-skip"
          onClick={onSkip}
          disabled={skipping}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t('onboarding.joinSkip')}
        </button>
      </motion.div>
    </div>
  );
}
