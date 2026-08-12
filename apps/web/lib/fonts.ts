import { Inter, JetBrains_Mono } from 'next/font/google';

import { cn } from '@kit/ui/utils';

/**
 * @sans
 * @description Inter — product UI (Linear design language). Google Fonts'
 * variable build is the free equivalent of Linear's self-hosted "Inter Variable".
 */
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans-fallback',
  fallback: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial'],
  preload: true,
});

/**
 * @heading
 * @description Inter — marketing/display headings (Linear design language)
 */
const heading = Inter({
  subsets: ['latin'],
  variable: '--font-heading',
  fallback: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial'],
  preload: true,
});

/**
 * @mono
 * @description JetBrains Mono — code blocks
 */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  fallback: ['Fira Code', 'Cascadia Code', 'monospace'],
  preload: true,
  weight: ['400', '500'],
});

// we export these fonts into the root layout
export { sans, heading, mono };

/**
 * @name getFontsClassName
 * @description Get the class name for the root layout — always dark mode.
 */
export function getFontsClassName(_theme?: string) {
  const font = [sans.variable, heading.variable, mono.variable].reduce<
    string[]
  >((acc, curr) => {
    if (acc.includes(curr)) return acc;
    return [...acc, curr];
  }, []);

  return cn(...font, 'dark');
}
