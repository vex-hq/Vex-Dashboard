'use client';

import { useCallback, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import {
  FINAL_ONBOARDING_STEP,
  TOTAL_ONBOARDING_STEPS,
} from '~/lib/agentguard/onboarding.constants';

import { updateOnboardingStepAction } from '../_lib/server-actions';
import { StepApiKey } from './step-api-key';
import { StepConnectAgents } from './step-connect-agents';
import { StepInstallSdk } from './step-install-sdk';
import { StepInviteTeam } from './step-invite-team';
import { StepVerifyConnection } from './step-verify-connection';
import { StepWelcome } from './step-welcome';

const TOTAL_STEPS = TOTAL_ONBOARDING_STEPS;

interface OnboardingWizardProps {
  accountSlug: string;
  initialStep: number;
}

export function OnboardingWizard({
  accountSlug,
  initialStep,
}: OnboardingWizardProps) {
  // Clamp the resumed step into the valid range so a stale/out-of-range
  // persisted value (e.g. left over from a different wizard length) can never
  // land on the renderStep default and blank the onboarding screen.
  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(0, initialStep), FINAL_ONBOARDING_STEP),
  );
  const [apiKey, setApiKey] = useState<string | null>(null);

  const goNext = useCallback(async () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep < TOTAL_STEPS) {
      await updateOnboardingStepAction({
        accountSlug,
        step: nextStep,
      });
    }
  }, [currentStep, accountSlug]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome key="step-0" onNext={goNext} />;
      case 1:
        return (
          <StepInviteTeam
            key="step-1"
            accountSlug={accountSlug}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 2:
        return (
          <StepApiKey
            key="step-2"
            accountSlug={accountSlug}
            onNext={goNext}
            onBack={goBack}
            onKeyCreated={setApiKey}
          />
        );
      case 3:
        return (
          <StepConnectAgents
            key="step-3"
            accountSlug={accountSlug}
            apiKey={apiKey}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <StepInstallSdk
            key="step-4"
            apiKey={apiKey}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 5:
        return (
          <StepVerifyConnection
            key="step-5"
            accountSlug={accountSlug}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
