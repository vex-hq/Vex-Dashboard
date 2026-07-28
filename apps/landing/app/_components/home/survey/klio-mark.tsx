/**
 * The Klio mark: three bars, the middle one short — one hand setting work down,
 * the next picking it up. Rendered flat here; `MarkSpecimen` builds the same
 * three bars as a solid for the opening plate.
 */
export function KlioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="3" y="6" width="18" height="2" />
      <rect x="8" y="11" width="13" height="2" />
      <rect x="3" y="16" width="18" height="2" />
    </svg>
  );
}

/** The mark plus the wordmark, for footers and colophons. */
export function KlioLockup({ className }: { className?: string }) {
  return (
    <span className={`k-mark ${className ?? ''}`.trim()}>
      <KlioMark />
      <span className="k-mark__wm">Klio</span>
    </span>
  );
}
