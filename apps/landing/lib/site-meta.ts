/**
 * Single source of truth for landing-site identity, positioning, and FAQ.
 *
 * Consumed by:
 * - `lib/seo/schemas.ts` (JSON-LD generators for Organization + FAQPage)
 * - `app/layout.tsx` (root JSON-LD)
 * - `app/_components/faq-accordion.tsx` (FAQ UI)
 * - `/llms.txt` route (positioning sentence)
 *
 * Positioning: Klio leads with memory and sells reliability as the result.
 * Klio is open-core — free, self-hostable OSS engine + hosted Klio Cloud —
 * so "open source" IS part of the wedge here (this reverses the old Vex-era
 * rule that forbade it). Keep wire-protocol identifiers (X-Vex-Key, org_id,
 * published SDK package names) untouched — they live in code, not copy.
 *
 * Data shape is intentionally `readonly` end-to-end so consumers cannot
 * mutate the catalog at runtime. Use `[...FAQ]` if a mutable copy is
 * required for sorting/filtering.
 */

export const POSITIONING_SENTENCE =
  'Klio is the memory layer that keeps AI agents reliable — it gives Claude Code, Cursor, Codex, and any MCP client persistent, shared memory so they stop forgetting, drifting, and repeating mistakes. Local-first, encrypted, and open source.' as const;

export interface Organization {
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly contactEmail: string;
}

export const ORG = {
  name: 'Klio',
  url: 'https://klio.tech',
  logo: 'https://klio.tech/icon.svg',
  contactEmail: 'contact@klio.tech',
} as const satisfies Organization;

export const SAME_AS = [
  'https://github.com/klio-tech',
  'https://x.com/klio_tech',
] as const satisfies ReadonlyArray<string>;

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export const FAQ = [
  {
    question: 'What is Klio?',
    answer:
      'Klio is a memory layer for AI agents. It captures what your agents learn, stores it encrypted under a key you own, and serves it back through MCP so your agents remember across sessions and share context across tools — which is what keeps them reliable.',
  },
  {
    question: 'Does my data leave my machine?',
    answer:
      'No. Klio is local-first: memory is stored on your machine, encrypted under a user-owned key. Nothing leaves unless you explicitly opt into Klio Cloud.',
  },
  {
    question: 'How is Klio different from mem0, Zep, or observability tools?',
    answer:
      'Memory tools like mem0 and Zep recall for a single agent. Observability tools watch output after the agent acts. Klio gives multiple agents a shared, persistent memory — preventing drift at the source instead of recalling for just one agent or flagging problems after the fact.',
  },
  {
    question: 'How long does it take to set up?',
    answer:
      'One command: `npx @klio-tech/klio init`. It wires Klio into Claude Code, Cursor, or Codex and starts remembering from the next session.',
  },
  {
    question: 'Which agents does Klio work with?',
    answer:
      'Klio is MCP-native, so it works with Claude Code, Cursor, Codex, and any MCP client out of the box.',
  },
  {
    question: 'Can I change the embedding model?',
    answer:
      'Yes. Embeddings are pluggable per space — nomic-embed-text by default, with snowflake-arctic-embed2, OpenAI text-embedding-3-small, and others supported. Pick the model that fits each store.',
  },
  {
    question: 'Does Klio run on Windows?',
    answer:
      'The self-hosted engine runs anywhere Docker does, including Windows via WSL2. If you’d rather not run anything locally, Klio Cloud works from any OS with zero install.',
  },
  {
    question: 'Is it really encrypted?',
    answer:
      'Yes — memory is encrypted at rest under a key you own, and every write is chained with SHA-256 so the history is tamper-evident and inspectable. It’s auditable by design, not “trust us”.',
  },
] as const satisfies ReadonlyArray<FaqEntry>;
