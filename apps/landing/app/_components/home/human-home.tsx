import { AppendixQuestions } from './survey/appendix-questions';
import { ClosingMonolith } from './survey/closing-monolith';
import { PlateApparatus } from './survey/plate-apparatus';
import { PlateComparison } from './survey/plate-comparison';
import { PlateCondition } from './survey/plate-condition';
import { PlateInstruments } from './survey/plate-instruments';
import { PlateLedger } from './survey/plate-ledger';
import { PlateSchedule } from './survey/plate-schedule';
import { PlateShiftChange } from './survey/plate-shift-change';
import { PlateSite } from './survey/plate-site';
import { PlateSpecification } from './survey/plate-specification';
import { PlateTerminal } from './survey/plate-terminal';

/**
 * The human home, set as a field survey of agent labour.
 *
 * The plates run as one argument: here is the site (I), here is what is wrong
 * with it (II), here is evidence it can work otherwise (III), here is the
 * mechanism (IV), a breath (V), the instruments it exposes (V·B), what it
 * refuses to keep (VI), how it differs in shape from the shelf (VI·B), what it
 * costs (VII), the questions people ask, and the claim made plainly (VIII).
 *
 * The survey brings its own opening and closing plates but NOT site chrome:
 * `SiteHeader` and `SiteFooter` in the root layout still own navigation for
 * every page, this one included.
 */

/**
 * Printed on Plate I. A constant rather than `new Date()`: a date that changed
 * every render would be non-deterministic between server and client, and would
 * claim a survey that never happened. Update it when the plates are revised.
 */
const SURVEYED_ON = '2026·07·28';

export function HumanHome() {
  return (
    <div className="k-survey">
      <span className="k-reg k-reg--tl" aria-hidden="true" />
      <span className="k-reg k-reg--tr" aria-hidden="true" />
      <span className="k-reg k-reg--bl" aria-hidden="true" />
      <span className="k-reg k-reg--br" aria-hidden="true" />

      <PlateSite surveyedOn={SURVEYED_ON} />
      <PlateTerminal />
      <PlateCondition />
      <PlateLedger />
      <PlateApparatus />
      <PlateShiftChange />
      <PlateInstruments />
      <PlateSpecification />
      <PlateComparison />
      <PlateSchedule />
      <AppendixQuestions />
      <ClosingMonolith />
    </div>
  );
}
