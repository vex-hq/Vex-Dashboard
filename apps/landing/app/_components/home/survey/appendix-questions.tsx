import { FAQ } from '~/lib/site-meta';

/**
 * Appendix — questions put to the surveyor.
 *
 * Rendered from the same FAQ constant that `faqPageSchema()` serialises into
 * JSON-LD in the root layout. Keeping them on one source means the structured
 * data always describes text a visitor can actually see, which is the whole
 * requirement for FAQ rich results.
 */
export function AppendixQuestions() {
  return (
    <section className="k-plate" id="faq">
      <p className="k-pnum">
        <b>Appendix</b> &nbsp;— questions put to the surveyor
      </p>

      <div className="k-qa">
        {FAQ.map((entry) => (
          <details key={entry.question}>
            <summary>{entry.question}</summary>
            <p>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
