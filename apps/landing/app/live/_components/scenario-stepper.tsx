'use client';

import { Check } from 'lucide-react';

interface ScenarioStepperProps {
  steps: Array<{ label: string; description: string }>;
  currentStep: number;
}

export function ScenarioStepper({ steps, currentStep }: ScenarioStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${isComplete ? 'bg-emerald-500' : 'bg-[#333]'}`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'border-2 border-emerald-500 text-emerald-500'
                      : 'border border-[#333] text-[#666]'
                }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  isActive ? 'font-medium text-white' : 'text-[#666]'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
