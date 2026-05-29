'use client';

import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { KlioMark } from '~/components/klio-mark';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  const { t } = useTranslation('agentguard');

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* V logo with zoom-out animation */}
      <motion.div
        className="flex justify-center"
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <KlioMark size={160} className="text-foreground" />
      </motion.div>

      {/* Welcome text */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.welcomeTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center text-base leading-relaxed">
          <span className="text-foreground font-medium">
            Observe, detect, and auto-correct
          </span>{' '}
          hallucinations and drift in real time —{' '}
          <span className="text-foreground font-medium">before</span> your agent
          makes{' '}
          <span className="text-foreground font-medium">
            a mistake that can&apos;t be taken back.
          </span>
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Button onClick={onNext} className="rounded-lg px-8" size="lg">
          {t('onboarding.getStarted')}
        </Button>
      </motion.div>
    </div>
  );
}
