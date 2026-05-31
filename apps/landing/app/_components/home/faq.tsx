import { FAQ } from '~/lib/site-meta';

/**
 * Home FAQ — the same canonical FAQ data (lib/site-meta), rendered in the
 * Klio editorial style with native <details> so it works without JS.
 */
export function HomeFaq() {
  return (
    <section id="faq" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Questions, answered honestly</p>
        <h2 className="k-h2 mt-4">FAQ</h2>

        <div className="border-border mt-10 overflow-hidden rounded-lg border">
          {FAQ.map((item, i) => (
            <details
              key={item.question}
              className={`group ${i > 0 ? 'border-border border-t' : ''}`}
            >
              <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-medium">
                {item.question}
                <span className="text-muted-foreground shrink-0 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="text-muted-foreground px-6 pb-6 text-[15px] leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
