/**
 * Whether motion should be suppressed.
 *
 * Returns `true` when the preference cannot be read at all — during SSR, or in
 * an environment without `matchMedia` (jsdom, older embedded webviews). The
 * conservative default matters twice over: motion is decoration here, and a
 * component that assumes `matchMedia` exists throws on mount rather than
 * degrading, taking the whole page down with it.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
