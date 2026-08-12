import type { HandoverSpec } from '~/lib/use-cases';

/**
 * The one diagram every use case shares: something writes, Klio keeps it,
 * something later reads it.
 *
 * One component rather than sixteen bespoke SVGs, on purpose. The product has
 * exactly this shape — producer, verb, record, consumer — and a use case that
 * cannot be drawn as a handover is a use case we should not be claiming. The
 * per-case content is the labels, so every page gets a distinct visual in a
 * single consistent style.
 *
 * HTML boxes rather than an <svg>: they reflow (three columns on desktop,
 * a vertical stack on mobile), inherit the theme tokens for free, and stay
 * readable to screen readers without a parallel text description. The arrows
 * are the only drawn elements, and they rotate with the layout.
 */
export function HandoverStrip({
  spec,
  compact = false,
}: {
  spec: HandoverSpec;
  compact?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`${spec.left.title} ${spec.left.sub}; Klio keeps ${spec.memory}; ${spec.right.title} ${spec.right.sub}.`}
      className={
        compact
          ? 'grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1.2fr_auto_1fr]'
          : 'grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr]'
      }
    >
      {/* Producer */}
      <EndCard title={spec.left.title} sub={spec.left.sub} compact={compact} />

      <Arrow compact={compact} />

      {/* Klio, in the middle */}
      <div
        className={`border-foreground/60 bg-foreground text-background flex flex-col items-center justify-center rounded-xl border ${
          compact ? 'px-3 py-3' : 'px-5 py-5'
        }`}
      >
        <div
          className={`mb-2 flex flex-wrap items-center justify-center gap-1.5 ${
            compact ? '' : 'md:gap-2'
          }`}
        >
          {spec.verbs.map((verb) => (
            <code
              key={verb}
              className={`border-background/30 rounded-full border px-2 py-0.5 font-mono ${
                compact ? 'text-[11px]' : 'text-[11px] md:text-xs'
              }`}
            >
              {verb}
            </code>
          ))}
        </div>
        <div
          className={`text-center leading-snug opacity-80 ${
            compact ? 'text-[11px]' : 'text-[13px]'
          }`}
        >
          {spec.memory}
        </div>
        {!compact && (
          <div className="mt-2 text-[10px] font-medium tracking-widest uppercase opacity-60">
            kept in Klio
          </div>
        )}
      </div>

      <Arrow compact={compact} />

      {/* Consumer */}
      <EndCard
        title={spec.right.title}
        sub={spec.right.sub}
        compact={compact}
      />
    </div>
  );
}

function EndCard({
  title,
  sub,
  compact,
}: {
  title: string;
  sub: string;
  compact: boolean;
}) {
  return (
    <div
      className={`border-border bg-card flex flex-col items-center justify-center rounded-xl border text-center ${
        compact ? 'px-3 py-3' : 'px-5 py-5'
      }`}
    >
      <div
        className={`text-foreground font-semibold ${
          compact ? 'text-[13px]' : 'text-[15px]'
        }`}
      >
        {title}
      </div>
      <div
        className={`text-muted-foreground mt-1 leading-snug ${
          compact ? 'text-[11px]' : 'text-[13px]'
        }`}
      >
        {sub}
      </div>
    </div>
  );
}

/** Points right in the row layout, down when stacked. Decorative only. */
function Arrow({ compact }: { compact: boolean }) {
  return (
    <div
      aria-hidden
      className={`text-muted-foreground flex items-center justify-center ${
        compact ? 'sm:px-0.5' : 'md:px-1'
      }`}
    >
      <svg
        width={compact ? 14 : 18}
        height={compact ? 14 : 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`rotate-90 ${compact ? 'sm:rotate-0' : 'md:rotate-0'}`}
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  );
}
