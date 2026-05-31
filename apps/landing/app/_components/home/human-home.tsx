import { Compare } from './compare';
import { ClosingCta } from './closing-cta';
import { HomeFaq } from './faq';
import { Hero } from './hero';
import { HowMemoryWorks } from './how-memory-works';
import { Pricing } from './pricing';
import { Problem } from './problem';
import { Reliability } from './reliability';
import { Tools } from './tools';

/**
 * The human marketing home — memory → reliability, one causal story, in
 * Klio's cream/mono editorial system. Wrapped in `.landing` so the hero
 * dot-grid renders. Section order mirrors the Phase-1 design.
 */
export function HumanHome() {
  return (
    <div className="landing">
      <Hero />
      <Problem />
      <HowMemoryWorks />
      <Tools />
      <Reliability />
      <Compare />
      <Pricing />
      <HomeFaq />
      <ClosingCta />
    </div>
  );
}
