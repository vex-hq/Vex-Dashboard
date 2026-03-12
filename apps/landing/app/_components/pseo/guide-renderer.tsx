import type { FrameworkGuide } from '~/lib/pseo/types';

import { CodeBlock } from './code-block';
import { CtaBanner } from './cta-banner';
import { SeverityBadge } from './severity-badge';

export function GuideRenderer({ guide }: { guide: FrameworkGuide }) {
  const { content } = guide;

  return (
    <div className="prose-container">
      {/* Intro */}
      <p className="mb-10 text-lg leading-relaxed text-[#a2a2a2]">{content.intro}</p>

      {/* Why Guardrails */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">{content.whyGuardrails.heading}</h2>
      <div className="grid gap-4">
        {content.whyGuardrails.points.map((point, i) => (
          <div key={i} className="rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
            <h3 className="mb-1 text-sm font-semibold text-white">{point.title}</h3>
            <p className="text-sm text-[#a2a2a2]">{point.explanation}</p>
          </div>
        ))}
      </div>

      {/* Common Failures */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">{content.commonFailures.heading}</h2>
      <div className="grid gap-4">
        {content.commonFailures.failures.map((failure, i) => (
          <div key={i} className="rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{failure.name}</h3>
              <SeverityBadge level={failure.severity} />
            </div>
            <p className="mb-2 text-sm text-[#a2a2a2]">{failure.description}</p>
            <p className="text-xs italic text-[#585858]">Example: {failure.example}</p>
          </div>
        ))}
      </div>

      {/* Integration Steps */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">{content.integration.heading}</h2>
      <div className="grid gap-6">
        {content.integration.steps.map((step, i) => (
          <div key={i}>
            <h3 className="mb-1 text-base font-semibold text-white">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                {i + 1}
              </span>
              {step.title}
            </h3>
            <p className="mb-2 pl-8 text-sm text-[#a2a2a2]">{step.description}</p>
            <div className="pl-8">
              <CodeBlock code={step.code} language={step.language} />
            </div>
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">{content.bestPractices.heading}</h2>
      <ul className="grid gap-3">
        {content.bestPractices.tips.map((tip, i) => (
          <li key={i} className="flex gap-3 rounded-lg border border-[#1a1a1a] p-3">
            <span className="mt-0.5 text-emerald-500">&#10003;</span>
            <div>
              <span className="text-sm font-medium text-white">{tip.title}</span>
              <p className="mt-0.5 text-sm text-[#a2a2a2]">{tip.description}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
