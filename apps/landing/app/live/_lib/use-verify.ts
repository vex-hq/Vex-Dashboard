'use client';

import { useCallback, useState } from 'react';

import { VEX_API_URL, VEX_DEMO_KEY } from './scenarios';
import type { Scenario } from './scenarios';

export interface CheckResult {
  check_type: string;
  score: number;
  passed: boolean;
  details: Record<string, unknown>;
}

export interface VerifyResult {
  execution_id: string;
  confidence: number | null;
  action: 'pass' | 'flag' | 'block';
  output: unknown;
  checks: Record<string, CheckResult>;
  corrected: boolean;
  original_output: unknown | null;
  correction_attempts: Array<{
    layer: number;
    layer_name: string;
    corrected_output: unknown;
    confidence: number | null;
    action: string;
    success: boolean;
    latency_ms: number;
  }> | null;
}

export type VerifyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: VerifyResult }
  | { status: 'error'; error: string };

export function useVerify() {
  const [state, setState] = useState<VerifyState>({ status: 'idle' });

  const verify = useCallback(async (scenario: Scenario) => {
    setState({ status: 'loading' });

    try {
      const response = await fetch(VEX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vex-Key': VEX_DEMO_KEY,
        },
        body: JSON.stringify({
          agent_id: 'demo-support-bot',
          task: 'Answer customer support questions about company refund policy',
          output: scenario.agentOutput,
          ground_truth: scenario.groundTruth,
          metadata: {
            correction: scenario.correction,
            transparency: 'transparent',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: VerifyResult = await response.json();
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, verify, reset };
}
