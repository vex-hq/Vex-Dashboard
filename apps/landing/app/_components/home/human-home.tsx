import { ClosingCta } from './closing-cta';
import { Cloud } from './cloud';
import { Compare } from './compare';
import { HomeFaq } from './faq';
import { Hero } from './hero';
import { HowMemoryWorks } from './how-memory-works';
import { Pricing } from './pricing';
import { Problem } from './problem';
import { Proof } from './proof';
import { Reliability } from './reliability';
import { Security } from './security';
import { SharedBrain } from './shared-brain';
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
      <Proof />
      <Problem />
      <HowMemoryWorks />
      <SharedBrain />
      <Tools />
      <Reliability />
      <Security />
      <Compare />
      <Cloud />
      <Pricing />
      <HomeFaq />
      <ClosingCta />
    </div>
  );
}
