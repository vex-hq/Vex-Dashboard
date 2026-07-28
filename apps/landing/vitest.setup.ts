import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `matchMedia`. Components are written to degrade
 * when it is missing (see `survey/motion.ts`), but a shim keeps tests
 * exercising the real code path rather than only the fallback.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
