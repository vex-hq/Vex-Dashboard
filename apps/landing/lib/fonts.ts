import { IBM_Plex_Mono } from 'next/font/google';

import { cn } from '@kit/ui/utils';

/**
 * Klio runs on a single monospace family — IBM Plex Mono carries display,
 * body, code, and labels; hierarchy is weight + size only. The face is
 * exposed as the CSS variable `--font-plex-mono`, which the design tokens
 * in `styles/globals.css` resolve through (a distinct name avoids colliding
 * with the Tailwind `@theme --font-mono` token).
 */
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
  preload: true,
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export function getFontsClassName() {
  // Klio is a light editorial theme — no `dark` class.
  return cn(mono.variable);
}
