import type { ProblemGuide } from '~/lib/pseo/types';

import { CodeBlock } from './code-block';
import { CtaBanner } from './cta-banner';

export function ProblemGuideRenderer({ guide }: { guide: ProblemGuide }) {
  const { content } = guide;

  return (
    <div>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">{content.intro}</p>

      {/* What Is It */}
      <h2 className="mb-4 mt-14 text-2xl font-bold text-foreground">{content.whatIsIt.heading}</h2>
      <p className="mb-6 text-muted-foreground">{content.whatIsIt.explanation}</p>
      <div className="mb-10 grid gap-3">
        {content.whatIsIt.examples.map((ex, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">{ex.scenario}</p>
            <p className="mt-1 text-xs text-red-400">Consequence: {ex.consequence}</p>
          </div>
        ))}
      </div>

      {/* How To Detect */}
      <h2 className="mb-4 mt-14 text-2xl font-bold text-foreground">{content.howToDetect.heading}</h2>
      <div className="mb-10 grid gap-3">
        {content.howToDetect.methods.map((method, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{method.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    method.effectiveness === 'high'
                      ? 'bg-foreground/10 text-foreground'
                      : method.effectiveness === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-border text-muted-foreground'
                  }`}
                >
                  {method.effectiveness} effectiveness
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How To Fix */}
      <h2 className="mb-4 mt-14 text-2xl font-bold text-foreground">{content.howToFix.heading}</h2>
      <div className="mb-10 grid gap-6">
        {content.howToFix.strategies.map((strategy, i) => (
          <div key={i}>
            <h3 className="mb-1 text-base font-semibold text-foreground">{strategy.name}</h3>
            <p className="mb-2 text-sm text-muted-foreground">{strategy.description}</p>
            {strategy.code && (
              <CodeBlock code={strategy.code} language={strategy.language ?? 'python'} />
            )}
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <h2 className="mb-4 mt-14 text-2xl font-bold text-foreground">{content.bestPractices.heading}</h2>
      <ul className="mb-10 grid gap-3">
        {content.bestPractices.tips.map((tip, i) => (
          <li key={i} className="flex gap-3 rounded-lg border border-[#1a1a1a] p-3">
            <span className="mt-0.5 text-foreground">&#10003;</span>
            <div>
              <span className="text-sm font-medium text-foreground">{tip.title}</span>
              <p className="mt-0.5 text-sm text-muted-foreground">{tip.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
