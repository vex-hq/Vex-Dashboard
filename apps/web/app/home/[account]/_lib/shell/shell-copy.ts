/**
 * Screen titles and subtitles, transcribed from the approved prototype.
 *
 * `klio-v4.html` holds these in one object and the spec quotes them verbatim:
 *
 *     const T={home:['Home','what your agents are working from'], …}
 *
 * They live in one module here for the same reason they lived in one object
 * there — so a screen cannot acquire a heading that was never approved, and so
 * a reviewer holding the prototype can check all seven at once.
 *
 * A test asserts this map against the literal strings. Changing a subtitle
 * means changing the test, which means saying out loud that the copy changed.
 */
export const SHELL_COPY = {
  home: {
    title: 'Home',
    subtitle: 'what your agents are working from',
  },
  projects: {
    title: 'Projects',
    subtitle: 'context by project',
  },
  context: {
    title: 'Context',
    subtitle: 'every item, freshest first',
  },
  shared: {
    title: 'Shared',
    subtitle: 'what your team can see, and what only you can',
  },
  proposals: {
    title: 'Proposals',
    subtitle: 'changes Klio suggests, with evidence',
  },
  agents: {
    title: 'Agents',
    subtitle: 'who is connected and what they claimed',
  },
  setup: {
    title: 'Setup',
    subtitle: 'keys and agents',
  },
} as const;

export type ShellScreen = keyof typeof SHELL_COPY;
