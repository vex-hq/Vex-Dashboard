'use client';

import { useSyncExternalStore } from 'react';

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

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.matchMedia !== 'function') return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

/**
 * The same preference as `prefersReducedMotion`, as reactive state.
 *
 * A component that only needs to decide "animate or don't" at mount can call
 * `prefersReducedMotion()` inside its effect. A component whose *render* differs
 * — one that shows a finished transcript instead of an animating one — cannot:
 * reading the preference in an effect and calling `setState` synchronously
 * causes a cascading render, and reading it during render breaks hydration,
 * because the server has no `matchMedia`.
 *
 * `useSyncExternalStore` is the shape React provides for exactly this. The
 * server snapshot is `true`, matching `prefersReducedMotion`'s conservative
 * default, so the server renders the still frame and the client takes over
 * without a mismatch. The subscription also means a preference changed while
 * the page is open takes effect, which the one-shot read never did.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
}
