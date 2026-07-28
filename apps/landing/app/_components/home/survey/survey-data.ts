/**
 * Every word printed on the survey plates, kept out of the markup so the copy
 * can be reviewed as copy. Claims here are load-bearing — each one is checked
 * against what the engine actually does before it ships:
 *
 *  - redaction runs before persistence and fails closed
 *  - a newer decision supersedes an older one (the supersedes graph)
 *  - memory is scoped org → project, never a single global pile
 *  - propagation is immediate on write; there is no push notification, so the
 *    claim is "the next agent to look already sees it", never "agents are
 *    notified"
 */

export interface Observation {
  readonly ordinal: string;
  readonly text: string;
}

export const OBSERVATIONS: readonly Observation[] = [
  {
    ordinal: 'Observation i',
    text: 'You re-explain the same decisions, every session, to every tool.',
  },
  {
    ordinal: 'Observation ii',
    text: 'They contradict each other. One agent quietly undoes what another just decided.',
  },
  {
    ordinal: 'Observation iii',
    text: 'You pay twice — tokens and hours — re-examining work that was already done.',
  },
];

export interface LedgerEntry {
  readonly time: string;
  readonly agent: string;
  readonly what: string;
  readonly disposition: string;
  /** The single row printed in the oxide, so the handover reads at a glance. */
  readonly handover?: boolean;
}

export const LEDGER: readonly LedgerEntry[] = [
  {
    time: '14:32',
    agent: 'claude-code',
    what: 'left 3 decisions, 1 repo rule',
    disposition: 'clocked out',
  },
  {
    time: '14:33',
    agent: 'cursor',
    what: 'picked up 3 decisions, 1 repo rule',
    disposition: 'clocked in',
    handover: true,
  },
  {
    time: '14:51',
    agent: 'cursor',
    what: 'superseded 1 stale decision',
    disposition: 'retired',
  },
  {
    time: '15:02',
    agent: 'codex',
    what: 'picked up 3 decisions, 1 repo rule',
    disposition: 'clocked in',
  },
];

export interface Movement {
  readonly title: string;
  readonly text: string;
}

/** The handover loop. Movements iv and v are the ones a plain store cannot do. */
export const MOVEMENTS: readonly Movement[] = [
  {
    title: 'Clock in',
    text: 'Any agent connects over MCP. Claude Code, Cursor, Codex, your own. No vendor owns the door.',
  },
  {
    title: 'Capture',
    text: 'Work is recorded as it happens. Secrets and personal data are stripped before anything is stored.',
  },
  {
    title: 'File to the job',
    text: "Everything lands under a project. The job's knowledge stays with the job, not in one global pile.",
  },
  {
    title: 'Distil',
    text: 'Raw activity becomes the few durable facts worth keeping — the next agent inherits conclusions, not transcripts.',
  },
  {
    title: 'Retire',
    text: 'When a newer decision contradicts an older one, the old one is superseded. Nobody acts on stale truth.',
  },
  {
    title: 'Hand over',
    text: 'The next agent picks up current state and keeps going. One writes; the next to look already sees it.',
  },
];

export interface SpecColumn {
  readonly heading: string;
  readonly items: readonly string[];
  /** Printed in the oxide — this column is what Klio refuses to do. */
  readonly refusal?: boolean;
}

export const SPECIFICATION: readonly (readonly [SpecColumn, SpecColumn])[] = [
  [
    {
      heading: 'Kept',
      items: [
        'Decisions — what was chosen, and why',
        'Repo rules — conventions the job must hold to',
        'Plans — the shape of work in flight',
        'Durable facts about the project',
      ],
    },
    {
      heading: 'Never kept',
      refusal: true,
      items: [
        'Secrets, keys, tokens — stripped before storage',
        'Personal data — redacted at the door',
        'Transcripts, tool calls, file reads',
        'Anything a newer decision has retired',
      ],
    },
  ],
  [
    {
      heading: 'Scoped to',
      items: [
        "A project — the job's knowledge stays with the job",
        'A team — shared by the people on it, not the internet',
        'An agent identity — you can see who wrote what',
      ],
    },
    {
      heading: 'Open to',
      items: [
        'Any MCP client — Claude Code, Cursor, Codex, yours',
        'Any vendor — we are not one of them',
        'Your own hardware — the engine is open source',
      ],
    },
  ],
];
