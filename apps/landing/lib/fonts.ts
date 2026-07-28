import { Archivo, Fraunces, Martian_Mono } from 'next/font/google';

import { cn } from '@kit/ui/utils';

/**
 * Klio's landing reads as a printed field survey: a display serif for the
 * plates, a machine mono for the data recorded on them.
 *
 * Fraunces is a variable display serif with an optical-size axis, so one face
 * covers a 70px plate headline and a 21px step title without either looking
 * like the other merely scaled. Its `SOFT`/`WONK` axes stay at their defaults
 * — the voice wants the high-contrast end of its range, not the wonky end.
 *
 * Martian Mono is a wide, engineered monospace. It is deliberately NOT the
 * default coder mono: on a ledger of timestamps, agent names and dispositions,
 * its squared terminals read as machine output rather than as prose.
 *
 * Archivo carries one job — the oversized ghost wordmark in the closing plate
 * — so it is never preloaded. Its width axis is what lets that wordmark
 * stretch rather than be faked with a transform.
 *
 * Exposed as `--font-fraunces` / `--font-martian` / `--font-archivo`, which
 * the tokens in `styles/globals.css` resolve through (distinct names avoid
 * colliding with the Tailwind `@theme --font-*` tokens).
 */
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  preload: true,
  display: 'swap',
  axes: ['opsz'],
  style: ['normal', 'italic'],
});

const mono = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
  preload: true,
  display: 'swap',
});

const wordmark = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  fallback: ['ui-sans-serif', 'Helvetica Neue', 'Arial', 'sans-serif'],
  // Below the fold in the closing plate only — never worth a preload.
  preload: false,
  display: 'swap',
  axes: ['wdth'],
});

export function getFontsClassName() {
  // Klio runs a single warm-paper theme — no light/dark switching.
  return cn(display.variable, mono.variable, wordmark.variable);
}
