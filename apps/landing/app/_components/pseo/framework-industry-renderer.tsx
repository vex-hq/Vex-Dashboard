import type { FrameworkIndustryGuide } from '~/lib/pseo/types';

import { CodeBlock } from './code-block';
import { CtaBanner } from './cta-banner';
import { SeverityBadge } from './severity-badge';

export function FrameworkIndustryRenderer({ guide }: { guide: FrameworkIndustryGuide }) {
  const { content } = guide;

  return (
    <div className="prose-container">
      {/* Intro */}
      <p className="mb-10 text-lg leading-relaxed text-[#a2a2a2]">{content.intro}</p>

      {/* Compliance Requirements */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">Compliance Requirements</h2>
      <div className="grid gap-4">
        {content.complianceRequirements.map((req, i) => (
          <div key={i} className="rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
            <h3 className="mb-1 text-sm font-bold text-white">{req.regulation}</h3>
            <p className="mb-2 text-sm text-[#a2a2a2]">{req.description}</p>
            <p className="text-xs text-emerald-500">How Vex Helps: {req.howVexHelps}</p>
          </div>
        ))}
      </div>

      {/* Industry Risks */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">Industry Risks</h2>
      <div className="grid gap-4">
        {content.industryRisks.map((risk, i) => (
          <div key={i} className="rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{risk.name}</h3>
              <SeverityBadge level={risk.severity} />
            </div>
            <p className="mb-2 text-sm text-[#a2a2a2]">{risk.description}</p>
            <p className="text-xs italic text-[#585858]">Example: {risk.example}</p>
          </div>
        ))}
      </div>

      {/* Implementation Steps */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">Implementation Steps</h2>
      <div className="grid gap-6">
        {content.implementation.map((step, i) => (
          <div key={i}>
            <h3 className="mb-1 text-base font-semibold text-white">
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-500">
                {i + 1}
              </span>
              {step.title}
            </h3>
            <p className="mb-2 pl-10 text-sm text-[#a2a2a2]">{step.description}</p>
            <div className="pl-10">
              <CodeBlock code={step.code} language={step.language} />
            </div>
          </div>
        ))}
      </div>

      {/* Case Study Scenario */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">
        {content.caseStudyScenario.heading}
      </h2>
      <div className="rounded-lg border-l-4 border-emerald-500 bg-[#0a0a0a] p-6">
        <p className="mb-4 text-sm text-[#a2a2a2]">{content.caseStudyScenario.scenario}</p>
        <p className="text-sm font-medium text-emerald-500">
          Outcome: {content.caseStudyScenario.outcome}
        </p>
      </div>

      {/* CTA */}
      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
