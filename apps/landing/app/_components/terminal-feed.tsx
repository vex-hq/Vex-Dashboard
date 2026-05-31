'use client';

import { useEffect, useRef, useState } from 'react';

interface TerminalLine {
  time: string;
  agent: string;
  details: string;
  status: 'pass' | 'block' | 'warn';
  extra?: string;
}

const lines: TerminalLine[] = [
  {
    time: '14:32:01',
    agent: 'support-router',
    details: 'confidence: 0.96 · action: PASS',
    status: 'pass',
  },
  {
    time: '14:32:03',
    agent: 'data-enrichment',
    details: 'confidence: 0.23 · drift: 0.78 (CRITICAL)',
    status: 'block',
    extra: 'action: BLOCKED → correction triggered',
  },
  {
    time: '14:32:05',
    agent: 'report-generator',
    details: 'confidence: 0.71 · issue: hallucinated metric',
    status: 'warn',
    extra: 'action: AUTO-CORRECT → re-prompting...',
  },
  {
    time: '14:32:06',
    agent: 'report-generator',
    details: 'attempt 2: confidence 0.93 · action: PASS',
    status: 'pass',
  },
  {
    time: '14:32:08',
    agent: 'billing-agent',
    details: 'confidence: 0.98 · action: PASS',
    status: 'pass',
  },
  {
    time: '14:32:10',
    agent: 'onboarding-bot',
    details: 'confidence: 0.91 · action: PASS',
    status: 'pass',
  },
];

const statusColor: Record<TerminalLine['status'], string> = {
  pass: 'text-foreground',
  block: 'text-red-400',
  warn: 'text-amber-500',
};

export function TerminalFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="overflow-hidden border border-border bg-card font-mono text-[13px] leading-relaxed"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          vex — verification feed
        </span>
      </div>

      <div className="overflow-x-auto p-5">
        {lines.map((line, i) => {
          const isPreFilled = i < 2;
          const shouldShow = isPreFilled || visible;
          if (!shouldShow) return null;
          return (
            <div
              key={i}
              className={
                isPreFilled
                  ? 'mb-3'
                  : 'mb-3 animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0'
              }
              style={
                isPreFilled
                  ? undefined
                  : { animationDelay: `${(i - 2) * 150}ms` }
              }
            >
              <pre className="m-0 font-mono text-[13px] leading-relaxed">
                <span className="text-muted-foreground">[{line.time}]</span>{' '}
                <span className="text-foreground">{line.agent}</span>
                {'\n  '}
                <span className={statusColor[line.status]}>{line.details}</span>
                {line.extra && (
                  <>
                    {'\n  '}
                    <span className={statusColor[line.status]}>
                      {line.extra}
                    </span>
                  </>
                )}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
