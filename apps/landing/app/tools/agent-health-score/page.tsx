'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

const questions = [
  {
    category: 'Monitoring',
    question: 'Do you have production monitoring for your AI agent?',
    options: [
      { label: 'No monitoring', score: 0 },
      { label: 'Basic logging (stdout/file)', score: 1 },
      { label: 'LLM tracing (LangSmith, Langfuse, etc.)', score: 2 },
      { label: 'Full observability (traces + metrics + alerts)', score: 3 },
    ],
  },
  {
    category: 'Monitoring',
    question: "How do you detect when your agent's behavior changes?",
    options: [
      { label: "We don't — we wait for user reports", score: 0 },
      { label: 'Manual spot-checks', score: 1 },
      { label: 'Automated alerts on output metrics', score: 2 },
      { label: 'Continuous behavioral drift detection', score: 3 },
    ],
  },
  {
    category: 'Safety',
    question: 'How do you prevent hallucinations in production?',
    options: [
      { label: 'Nothing — we trust the model', score: 0 },
      { label: 'Prompt engineering only', score: 1 },
      { label: 'Output validation / schema checks', score: 2 },
      { label: 'Runtime guardrails with auto-correction', score: 3 },
    ],
  },
  {
    category: 'Safety',
    question: 'How do you handle agent failures in production?',
    options: [
      { label: 'No handling — errors propagate to users', score: 0 },
      { label: 'Simple retry logic', score: 1 },
      { label: 'Fallback responses', score: 2 },
      { label: 'Auto-correction with graceful degradation', score: 3 },
    ],
  },
  {
    category: 'Testing',
    question: 'Do you run evaluations on your agent?',
    options: [
      { label: 'No evaluations', score: 0 },
      { label: 'Manual testing before deploy', score: 1 },
      { label: 'Automated pre-deploy eval suite', score: 2 },
      { label: 'Continuous production evaluations', score: 3 },
    ],
  },
  {
    category: 'Testing',
    question: 'How comprehensive is your test coverage?',
    options: [
      { label: 'No test cases', score: 0 },
      { label: '< 20 test cases for happy paths', score: 1 },
      { label: '20-100 cases including edge cases', score: 2 },
      { label: '100+ cases with adversarial inputs', score: 3 },
    ],
  },
  {
    category: 'Operations',
    question: 'How do you deploy agent updates?',
    options: [
      { label: 'Direct push to production', score: 0 },
      { label: 'Staging environment first', score: 1 },
      { label: 'Canary deploy with rollback', score: 2 },
      { label: 'Blue-green with behavioral comparison', score: 3 },
    ],
  },
  {
    category: 'Operations',
    question: 'How do you respond to production incidents?',
    options: [
      { label: 'Wait for user reports', score: 0 },
      { label: 'Periodic manual checks', score: 1 },
      { label: 'Automated alerts with manual response', score: 2 },
      { label: 'Auto-detection with auto-remediation', score: 3 },
    ],
  },
];

const categories = ['Monitoring', 'Safety', 'Testing', 'Operations'] as const;

const recommendations: Record<
  string,
  { low: string; medium: string; high: string }
> = {
  Monitoring: {
    low: 'Your agent is flying blind. Add production monitoring to see what your agent is actually doing. Vex provides real-time behavioral monitoring with zero setup.',
    medium:
      "You have basic visibility, but you're missing behavioral drift detection. Vex can detect when your agent's behavior shifts before users notice.",
    high: 'Strong monitoring setup. Consider adding continuous drift detection to catch subtle behavioral changes that metrics alone miss.',
  },
  Safety: {
    low: 'Your agent has no safety net. Hallucinations and bad outputs reach users directly. Add runtime guardrails — Vex auto-corrects bad output in real-time.',
    medium:
      "Good foundation, but validation alone can't catch semantic drift. Vex adds behavioral guardrails that go beyond schema validation.",
    high: 'Solid safety layer. Make sure your guardrails adapt over time — Vex learns baselines and adjusts thresholds automatically.',
  },
  Testing: {
    low: 'No evals means no confidence in production quality. Start with a basic eval suite and consider continuous production testing with Vex.',
    medium:
      'Pre-deploy evals are a good start. Add continuous production evaluations to catch issues that only appear with real-world data.',
    high: 'Excellent eval coverage. Pair your test suite with runtime monitoring to close the gap between eval performance and production behavior.',
  },
  Operations: {
    low: 'Direct deploys with no incident response is risky. Add staged deployments and automated alerting. Vex provides instant drift alerts.',
    medium:
      'Staged deploys are good. Add behavioral comparison between versions and automated rollback triggers.',
    high: 'Mature operations. Ensure your deployment pipeline includes behavioral regression checks alongside functional tests.',
  },
};

export default function AgentHealthScore() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === questions.length;

  const scores = useMemo(() => {
    const categoryScores: Record<string, { earned: number; max: number }> = {};
    categories.forEach((cat) => {
      categoryScores[cat] = { earned: 0, max: 0 };
    });

    questions.forEach((q, i) => {
      const cs = categoryScores[q.category];
      if (!cs) return;
      cs.max += 3;
      if (answers[i] !== undefined) {
        cs.earned += answers[i]!;
      }
    });

    const totalEarned = Object.values(categoryScores).reduce(
      (s, c) => s + c.earned,
      0,
    );
    const totalMax = Object.values(categoryScores).reduce(
      (s, c) => s + c.max,
      0,
    );
    const overall = Math.round((totalEarned / totalMax) * 100);

    return { categoryScores, overall };
  }, [answers]);

  const scoreColor =
    scores.overall < 40
      ? 'text-red-500'
      : scores.overall < 70
        ? 'text-amber-500'
        : 'text-emerald-500';
  const scoreLabel =
    scores.overall < 40
      ? 'Needs Attention'
      : scores.overall < 70
        ? 'Getting There'
        : 'Production Ready';

  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'AI Agent Health Score',
            description:
              "Score your AI agent's production readiness in 2 minutes.",
            url: 'https://tryvex.dev/tools/agent-health-score',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            author: {
              '@type': 'Organization',
              name: 'Vex',
              url: 'https://tryvex.dev',
            },
          }),
        }}
      />

      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Free Tool
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          AI Agent Health Score
        </h1>
        <p className="mb-12 text-lg text-[#a2a2a2]">
          Score your AI agent&apos;s production readiness in 2 minutes. Answer 8
          questions and get personalized recommendations.
        </p>

        {!showResults ? (
          <div className="space-y-8">
            {questions.map((q, qi) => (
              <div
                key={qi}
                className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6"
              >
                <div className="mb-1 text-[11px] font-medium tracking-widest text-emerald-500/60 uppercase">
                  {q.category}
                </div>
                <p className="mb-4 text-[15px] font-medium text-white">
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [qi]: opt.score }))
                      }
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        answers[qi] === opt.score
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-[#252525] text-[#a2a2a2] hover:border-[#585858] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowResults(true)}
              disabled={!allAnswered}
              className={`w-full rounded-lg py-4 text-[15px] font-semibold transition-colors ${
                allAnswered
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'cursor-not-allowed bg-[#252525] text-[#585858]'
              }`}
            >
              {allAnswered
                ? 'Get Your Score'
                : `Answer all questions (${totalAnswered}/${questions.length})`}
            </button>
          </div>
        ) : (
          <div>
            {/* Overall score */}
            <div className="mb-12 text-center">
              <div className={`text-7xl font-bold ${scoreColor}`}>
                {scores.overall}
              </div>
              <div className="mt-2 text-lg text-[#a2a2a2]">{scoreLabel}</div>
            </div>

            {/* Category breakdown */}
            <h2 className="mb-6 text-xl font-semibold text-white">
              Category Breakdown
            </h2>
            <div className="mb-12 space-y-4">
              {categories.map((cat) => {
                const catScore = scores.categoryScores[cat];
                if (!catScore) return null;
                const pct = Math.round((catScore.earned / catScore.max) * 100);
                const level = pct < 40 ? 'low' : pct < 70 ? 'medium' : 'high';

                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {cat}
                      </span>
                      <span className="text-sm text-[#a2a2a2]">{pct}%</span>
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#252525]">
                      <div
                        className={`h-full rounded-full ${
                          pct < 40
                            ? 'bg-red-500'
                            : pct < 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm leading-relaxed text-[#a2a2a2]">
                      {recommendations[cat]?.[level]}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
              <h3 className="mb-2 text-lg font-semibold text-white">
                Improve Your Score with Vex
              </h3>
              <p className="mb-6 text-sm text-[#a2a2a2]">
                Vex adds runtime monitoring, drift detection, and
                auto-correction to any AI agent in 5 minutes.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="https://app.tryvex.dev"
                  className="inline-flex h-12 items-center rounded-lg bg-emerald-500 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-400"
                >
                  Try Vex Free
                </Link>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setAnswers({});
                  }}
                  className="inline-flex h-12 items-center rounded-lg border border-[#252525] px-7 text-[15px] font-medium text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
                >
                  Retake Assessment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
