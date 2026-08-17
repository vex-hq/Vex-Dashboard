/**
 * The palette the shell draws in.
 *
 * These are the same Linear/Zed values `context-split.tsx` and
 * `project-issues.tsx` already use, lifted to one module so the shell's seven
 * screens cannot drift apart from each other the way the Hub drifted from the
 * prototype. See `styles/shadcn-ui.css` for the token definitions these mirror.
 */
export const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  indigo: '#5e6ad2',
  warn: '#fc7840',
  ok: '#4cb782',
  danger: '#f2685c',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;
