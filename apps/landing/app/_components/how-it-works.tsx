'use client';

import { useEffect, useRef, useState } from 'react';

interface TerminalLine {
  time: string;
  agent: string;
  details: string;
  status: 'pass' | 'block' | 'warn';
  extra?: string;
  layer: number;
}

const lines: TerminalLine[] = [
  {
    time: '14:32:01',
    agent: 'support-router',
    details: 'confidence: 0.96 · action: PASS',
    status: 'pass',
    layer: 1,
  },
  {
    time: '14:32:03',
    agent: 'data-enrichment',
    details: 'confidence: 0.23 · drift: 0.78 (CRITICAL)',
    status: 'block',
    extra: 'action: BLOCKED → correction triggered',
    layer: 2,
  },
  {
    time: '14:32:05',
    agent: 'report-generator',
    details: 'confidence: 0.71 · issue: hallucinated metric',
    status: 'warn',
    extra: 'action: AUTO-CORRECT → re-prompting...',
    layer: 2,
  },
  {
    time: '14:32:06',
    agent: 'report-generator',
    details: 'attempt 2: confidence 0.93 · action: PASS',
    status: 'pass',
    layer: 1,
  },
  {
    time: '14:32:08',
    agent: 'billing-agent',
    details: 'confidence: 0.98 · action: PASS',
    status: 'pass',
    layer: 1,
  },
  {
    time: '14:32:10',
    agent: 'onboarding-bot',
    details: 'confidence: 0.41 · drift: 0.52',
    status: 'warn',
    extra: 'action: AUTO-CORRECT → optimizing prompt...',
    layer: 3,
  },
];

const statusColor: Record<TerminalLine['status'], string> = {
  pass: 'text-foreground',
  block: 'text-red-400',
  warn: 'text-amber-500',
};

const layers = [
  {
    num: '1',
    title: 'Observation',
    desc: 'Watches every interaction. Detects drift in milliseconds, not days.',
  },
  {
    num: '2',
    title: 'Correction',
    desc: 'Blocks bad output before users see it. Auto-corrects mid-flight.',
  },
  {
    num: '3',
    title: 'Optimization',
    desc: 'Rebuilds system prompts from failure patterns. Agents improve over time.',
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeLayer, setActiveLayer] = useState<number>(0);
  const [hoverLayer, setHoverLayer] = useState<number>(0);
  const [shownLines, setShownLines] = useState(2);
  const [animDone, setAnimDone] = useState(false);

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

  useEffect(() => {
    if (!visible) return;

    setActiveLayer(lines[1]?.layer ?? 1);

    let lineIndex = 2;
    const interval = setInterval(() => {
      if (lineIndex >= lines.length) {
        clearInterval(interval);
        setActiveLayer(0);
        setAnimDone(true);
        return;
      }
      const line = lines[lineIndex];
      if (line) {
        setActiveLayer(line.layer);
        setShownLines(lineIndex + 1);
      }
      lineIndex++;
    }, 600);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
      {/* Layers */}
      <div className="flex flex-col justify-center gap-4">
        {layers.map((layer) => {
          const displayLayer = hoverLayer || activeLayer;
          const isActive = displayLayer === Number(layer.num);
          return (
            <div
              key={layer.num}
              onMouseEnter={() => animDone && setHoverLayer(Number(layer.num))}
              onMouseLeave={() => setHoverLayer(0)}
              className={`flex cursor-pointer gap-4 border p-4 transition-all duration-300 ${
                isActive
                  ? 'border-border/30 bg-foreground/[0.06]'
                  : 'border-border bg-transparent'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'border-border/50 bg-foreground/25 text-foreground'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {layer.num}
              </div>
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-foreground">
                  {layer.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {layer.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal */}
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
            if (i >= shownLines) return null;
            const isPreFilled = i < 2;
            return (
              <div
                key={i}
                className={
                  isPreFilled
                    ? 'mb-3'
                    : 'mb-3 animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0'
                }
                style={isPreFilled ? undefined : { animationDelay: '0ms' }}
              >
                <pre className="m-0 font-mono text-[13px] leading-relaxed">
                  <span className="text-muted-foreground">[{line.time}]</span>{' '}
                  <span className="text-foreground">{line.agent}</span>
                  {'\n  '}
                  <span className={statusColor[line.status]}>
                    {line.details}
                  </span>
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
    </div>
  );
}
