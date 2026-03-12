import type { ProblemFrameworkGuide } from '~/lib/pseo/types';

import { CodeBlock } from './code-block';
import { CtaBanner } from './cta-banner';

export function ProblemFrameworkRenderer({ guide }: { guide: ProblemFrameworkGuide }) {
  const { content } = guide;

  return (
    <div className="prose-container">
      {/* Intro */}
      <p className="mb-10 text-lg leading-relaxed text-[#a2a2a2]">{content.intro}</p>

      {/* How It Manifests */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">How It Manifests</h2>
      <div className="grid gap-4">
        {content.howItManifests.map((item, i) => (
          <div key={i} className="rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
            <h3 className="mb-1 text-sm font-semibold text-white">{item.scenario}</h3>
            <p className="mb-2 text-xs font-medium text-yellow-400">{item.symptom}</p>
            <p className="text-sm text-[#a2a2a2]">{item.impact}</p>
          </div>
        ))}
      </div>

      {/* Detection Methods */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">Detection Methods</h2>
      <div className="grid gap-6">
        {content.detection.map((method, i) => (
          <div key={i}>
            <h3 className="mb-1 text-base font-semibold text-white">
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-500">
                {i + 1}
              </span>
              {method.name}
            </h3>
            <p className="mb-2 pl-10 text-sm text-[#a2a2a2]">{method.description}</p>
            <div className="pl-10">
              <CodeBlock code={method.code} language={method.language} />
            </div>
          </div>
        ))}
      </div>

      {/* Fixes */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">Fixes</h2>
      <div className="grid gap-6">
        {content.fixes.map((fix, i) => (
          <div key={i}>
            <h3 className="mb-1 text-base font-semibold text-white">
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-500">
                {i + 1}
              </span>
              {fix.name}
            </h3>
            <p className="mb-2 pl-10 text-sm text-[#a2a2a2]">{fix.description}</p>
            <div className="pl-10">
              <CodeBlock code={fix.code} language={fix.language} />
            </div>
          </div>
        ))}
      </div>

      {/* Vex Automation */}
      <h2 className="mb-6 mt-14 text-2xl font-bold text-white">
        {content.vexAutomation.heading}
      </h2>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6">
        <p className="mb-4 text-sm text-[#a2a2a2]">{content.vexAutomation.description}</p>
        <CodeBlock code={content.vexAutomation.code} language={content.vexAutomation.language} />
      </div>

      {/* CTA */}
      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
