'use client';

import { useState } from 'react';

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

import type { VerifyResult } from '../_lib/use-verify';

interface VerificationCardProps {
  result: VerifyResult;
  visible: boolean;
}

export function VerificationCard({ result, visible }: VerificationCardProps) {
  const [checksExpanded, setChecksExpanded] = useState(false);

  if (!visible) return null;

  const confidence = result.confidence ?? 0;
  const action = result.action;

  const actionConfig: Record<
    string,
    {
      icon: typeof ShieldCheck;
      label: string;
      color: string;
      bg: string;
      border: string;
      barColor: string;
    }
  > = {
    pass: {
      icon: ShieldCheck,
      label: 'PASSED',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      barColor: 'bg-emerald-500',
    },
    flag: {
      icon: AlertTriangle,
      label: 'FLAGGED',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      barColor: 'bg-amber-500',
    },
    block: {
      icon: ShieldAlert,
      label: 'BLOCKED',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      barColor: 'bg-red-500',
    },
  };

  const config = actionConfig[action]!;
  const Icon = config.icon;

  const checks = Object.entries(result.checks);

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-xl border ${config.border} ${config.bg} p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#666]">Confidence</div>
          <div className={`text-lg font-bold ${config.color}`}>
            {(confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#222]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${config.barColor}`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>

      {/* Checks */}
      {checks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setChecksExpanded(!checksExpanded)}
            className="flex w-full items-center justify-between text-xs text-[#888] transition-colors hover:text-white"
          >
            <span>{checks.length} checks ran</span>
            {checksExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {checksExpanded && (
            <div className="mt-2 space-y-1.5">
              {checks.map(([name, check]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg bg-[#0a0a0a]/50 px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {check.passed ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <X className="h-3 w-3 text-red-400" />
                    )}
                    <span className="capitalize text-[#aaa]">
                      {name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span
                    className={
                      check.passed ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {(check.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Correction */}
      {result.corrected && result.original_output != null && (
        <div className="mt-4 space-y-3 border-t border-[#333] pt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            Auto-Corrected by Vex
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-red-400">
              Original (blocked)
            </div>
            <p className="text-xs text-[#888] line-through">
              {String(result.original_output)}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              Corrected (sent to customer)
            </div>
            <p className="text-xs text-[#ccc]">{String(result.output)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
