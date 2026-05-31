import type { ConceptComparison } from '~/lib/pseo/types';

import { CtaBanner } from './cta-banner';

export function ConceptComparisonRenderer({ comparison }: { comparison: ConceptComparison }) {
  const { content } = comparison;

  return (
    <div>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">{content.intro}</p>

      {/* Side-by-side approaches */}
      <div className="mb-10 grid gap-6 md:grid-cols-2">
        {[content.approachA, content.approachB].map((approach) => (
          <div key={approach.name} className="rounded-xl border border-border bg-background p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">{approach.name}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{approach.description}</p>
            <div className="mb-3">
              <h3 className="mb-2 text-xs font-medium tracking-widest text-foreground uppercase">
                Strengths
              </h3>
              <ul className="grid gap-1">
                {approach.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-foreground">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium tracking-widest text-red-400 uppercase">
                Weaknesses
              </h3>
              <ul className="grid gap-1">
                {approach.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-red-400">-</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mb-10 overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_1fr_1fr] bg-card px-6 py-3 text-sm font-medium">
          <span className="text-muted-foreground">Dimension</span>
          <span className="text-foreground">{content.approachA.name}</span>
          <span className="text-muted-foreground">{content.approachB.name}</span>
        </div>
        {content.comparison.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_1fr_1fr] px-6 py-3 text-sm ${
              i % 2 === 0 ? 'bg-background' : 'bg-[#0f0f0f]'
            }`}
          >
            <span className="font-medium text-foreground">{row.dimension}</span>
            <span className="text-muted-foreground">{row.approachA}</span>
            <span className="text-muted-foreground">{row.approachB}</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mb-10 rounded-xl border border-border/20 bg-foreground/5 p-6">
        <h2 className="mb-2 text-lg font-bold text-foreground">{content.recommendation.heading}</h2>
        <p className="text-sm text-muted-foreground">{content.recommendation.summary}</p>
      </div>

      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
