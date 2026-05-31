'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Shield,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Scripted data                                                      */
/* ------------------------------------------------------------------ */

interface Ticket {
  id: number;
  phase: 1 | 2 | 3;
  text: string;
  classification: string;
  correctClassification?: string;
  confidence: number;
  status: 'pass' | 'flag' | 'corrected';
}

const TICKETS: Ticket[] = [
  // Phase 1: Normal operation
  {
    id: 1,
    phase: 1,
    text: "Can't login to my account",
    classification: 'Technical',
    confidence: 0.97,
    status: 'pass',
  },
  {
    id: 2,
    phase: 1,
    text: 'I want a refund for my last order',
    classification: 'Billing',
    confidence: 0.95,
    status: 'pass',
  },
  {
    id: 3,
    phase: 1,
    text: 'App crashes when I open settings',
    classification: 'Technical',
    confidence: 0.96,
    status: 'pass',
  },
  {
    id: 4,
    phase: 1,
    text: 'How do I cancel my subscription?',
    classification: 'Billing',
    confidence: 0.93,
    status: 'pass',
  },
  // Phase 2: Drift
  {
    id: 5,
    phase: 2,
    text: 'Payment failed on checkout',
    classification: 'Technical',
    correctClassification: 'Billing',
    confidence: 0.61,
    status: 'flag',
  },
  {
    id: 6,
    phase: 2,
    text: 'Charged twice for same item',
    classification: 'Technical',
    correctClassification: 'Billing',
    confidence: 0.58,
    status: 'flag',
  },
  // Phase 3: Correction
  {
    id: 7,
    phase: 3,
    text: 'Payment failed on checkout',
    classification: 'Billing',
    confidence: 0.92,
    status: 'corrected',
  },
  {
    id: 8,
    phase: 3,
    text: 'Charged twice for same item',
    classification: 'Billing',
    confidence: 0.94,
    status: 'corrected',
  },
];

interface LogEntry {
  phase: 1 | 2 | 3;
  text: string;
  type: 'info' | 'warn' | 'success';
}

const LOGS: LogEntry[] = [
  { phase: 1, text: 'session started — model: gpt-4o-mini', type: 'info' },
  { phase: 1, text: 'check: confidence 0.97 → action: pass', type: 'info' },
  { phase: 1, text: 'check: confidence 0.95 → action: pass', type: 'info' },
  { phase: 1, text: 'check: confidence 0.96 → action: pass', type: 'info' },
  { phase: 1, text: 'check: confidence 0.93 → action: pass', type: 'info' },
  {
    phase: 2,
    text: '⚠ drift_score: 0.45 — confidence dropping',
    type: 'warn',
  },
  {
    phase: 2,
    text: 'check: confidence 0.61 → action: flag',
    type: 'warn',
  },
  {
    phase: 2,
    text: 'check: confidence 0.58 → action: flag',
    type: 'warn',
  },
  {
    phase: 3,
    text: 'correction cascade triggered — L1 prompt refinement',
    type: 'success',
  },
  {
    phase: 3,
    text: 're-classify ticket #5 → Billing (0.92)',
    type: 'success',
  },
  {
    phase: 3,
    text: 're-classify ticket #6 → Billing (0.94)',
    type: 'success',
  },
  {
    phase: 3,
    text: '✓ 2 issues caught, 2 auto-corrected, 0 reached production',
    type: 'success',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LiveDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [ticketIndex, setTicketIndex] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intersection Observer — trigger once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Playback interval
  useEffect(() => {
    if (!started || done) return;

    let tIdx = 0;
    let lIdx = 0;

    intervalRef.current = setInterval(() => {
      // Advance whichever is behind, preferring logs for pacing
      const ticketPhase = TICKETS[tIdx]?.phase ?? 4;
      const logPhase = LOGS[lIdx]?.phase ?? 4;

      if (lIdx < LOGS.length && logPhase <= ticketPhase) {
        lIdx++;
        setLogIndex(lIdx);
      } else if (tIdx < TICKETS.length) {
        tIdx++;
        setTicketIndex(tIdx);
      } else if (lIdx < LOGS.length) {
        lIdx++;
        setLogIndex(lIdx);
      }

      if (tIdx >= TICKETS.length && lIdx >= LOGS.length) {
        setDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started, done]);

  const replay = () => {
    setTicketIndex(0);
    setLogIndex(0);
    setDone(false);
    setStarted(true);
  };

  const visibleTickets = TICKETS.slice(0, ticketIndex);
  const visibleLogs = LOGS.slice(0, logIndex);
  const currentPhase = done
    ? 3
    : (visibleLogs[visibleLogs.length - 1]?.phase ?? 1);

  return (
    <div ref={containerRef}>
      {/* Phase indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-3">
          {[
            { phase: 1, label: 'Normal' },
            { phase: 2, label: 'Drift Detected' },
            { phase: 3, label: 'Auto-Corrected' },
          ].map((p) => (
            <div
              key={p.phase}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentPhase === p.phase
                  ? p.phase === 1
                    ? 'bg-foreground/20 text-foreground'
                    : p.phase === 2
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-foreground/20 text-foreground'
                  : 'bg-[#1a1a1a] text-muted-foreground'
              }`}
            >
              {p.label}
            </div>
          ))}
        </div>

        {done && (
          <button
            onClick={replay}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Replay
          </button>
        )}
      </div>

      {/* Split panel */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Ticket Feed */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Shield className="h-4 w-4 text-foreground" />
            Incoming Tickets
          </div>

          <div className="space-y-3">
            {visibleTickets.length === 0 && !started && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Scroll down to start the demo…
              </p>
            )}

            {visibleTickets.length === 0 && started && !done && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Processing…
              </p>
            )}

            {visibleTickets.map((ticket) => (
              <div
                key={`${ticket.id}-${ticket.phase}`}
                className="animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] rounded-lg border border-border bg-[#0f0f0f] p-3 opacity-0"
              >
                <div className="mb-2 text-sm text-foreground">
                  &quot;{ticket.text}&quot;
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        ticket.status === 'pass'
                          ? 'bg-foreground/10 text-foreground'
                          : ticket.status === 'flag'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-foreground/10 text-foreground'
                      }`}
                    >
                      {ticket.status === 'corrected' ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          corrected
                        </span>
                      ) : (
                        ticket.status
                      )}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      → {ticket.classification}
                    </span>

                    {ticket.correctClassification && (
                      <span className="text-xs text-red-400 line-through">
                        (was {ticket.classification})
                      </span>
                    )}
                  </div>

                  <span
                    className={`font-mono text-xs ${
                      ticket.confidence >= 0.9
                        ? 'text-foreground'
                        : ticket.confidence >= 0.7
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {ticket.confidence.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Vex Monitor */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-foreground" />
            Vex Monitor
          </div>

          {/* Confidence meter */}
          <div className="mb-4 rounded-lg border border-border bg-[#0f0f0f] p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Model Confidence</span>

              <span
                className={`font-mono ${
                  currentPhase === 2 ? 'text-amber-400' : 'text-foreground'
                }`}
              >
                {currentPhase === 2
                  ? '0.58'
                  : currentPhase === 3
                    ? '0.92'
                    : '0.95'}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  currentPhase === 2 ? 'bg-amber-500' : 'bg-foreground'
                }`}
                style={{
                  width:
                    currentPhase === 2
                      ? '58%'
                      : currentPhase === 3
                        ? '92%'
                        : '95%',
                }}
              />
            </div>
          </div>

          {/* Drift alert */}
          {currentPhase >= 2 && (
            <div
              className={`mb-4 flex animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] items-center gap-2 rounded-lg border p-3 text-xs opacity-0 ${
                currentPhase === 2
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                  : 'border-border/30 bg-foreground/5 text-foreground'
              }`}
            >
              {currentPhase === 2 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Model drift detected — confidence below threshold
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Drift resolved — corrections applied successfully
                </>
              )}
            </div>
          )}

          {/* Terminal log */}
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Terminal
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
              {visibleLogs.map((log, i) => (
                <div
                  key={i}
                  className={`animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0 ${
                    log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                >
                  <span className="mr-2 text-muted-foreground">$</span>
                  {log.text}
                </div>
              ))}

              {visibleLogs.length === 0 && (
                <div className="text-muted-foreground">
                  <span className="mr-2">$</span>
                  awaiting session…
                </div>
              )}
            </div>
          </div>

          {/* Summary (Phase 3 complete) */}
          {done && (
            <div className="mt-4 animate-[termLine_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] rounded-lg border border-border/30 bg-foreground/5 p-3 opacity-0">
              <div className="flex items-center justify-around text-center text-xs">
                <div>
                  <div className="text-lg font-bold text-foreground">2</div>
                  <div className="text-muted-foreground">Issues caught</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-foreground">2</div>
                  <div className="text-muted-foreground">Auto-corrected</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-foreground">0</div>
                  <div className="text-muted-foreground">Reached production</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
