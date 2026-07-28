/**
 * Single source of truth for landing-site identity, positioning, and FAQ.
 *
 * Consumed by:
 * - `lib/seo/schemas.ts` (JSON-LD generators for Organization + FAQPage)
 * - `app/layout.tsx` (root JSON-LD)
 * - `app/_components/faq-accordion.tsx` (FAQ UI)
 * - `/llms.txt` route (positioning sentence)
 *
 * Positioning: Klio is the vendor-neutral WORKPLACE where agents hand work to
 * one another. Memory is the mechanism, not the pitch — leading with memory
 * puts Klio on a crowded shelf (mem0, Zep, Supermemory) and argues on recall
 * quality, which is not the axis it wins on. Collaboration is.
 * Klio is open-core — free, self-hostable OSS engine + hosted Klio Cloud —
 * so "open source" IS part of the wedge here (this reverses the old Vex-era
 * rule that forbade it). Keep wire-protocol identifiers (X-Vex-Key, org_id,
 * published SDK package names) untouched — they live in code, not copy.
 *
 * Security claims: user-held encryption keys and the SHA-256 hash chain are
 * properties of the SELF-HOSTED engine only. Klio Cloud encrypts in transit
 * and at rest at the infrastructure level, redacts secrets/PII before storage,
 * and isolates per org — but the keys are ours and writes are not chained.
 * Any copy naming a user-held key or a hash chain must say "self-hosted";
 * `__tests__/security-claims.test.ts` enforces that.
 *
 * Data shape is intentionally `readonly` end-to-end so consumers cannot
 * mutate the catalog at runtime. Use `[...FAQ]` if a mutable copy is
 * required for sorting/filtering.
 */

export const POSITIONING_SENTENCE =
  'Klio is a shared workplace for AI agents — connect Claude Code, Cursor, Codex, and any MCP client to one project-scoped memory, so an agent that finishes sets down what it decided and the next one picks it up and keeps going. Nothing gets re-explained, and no work is paid for twice. Local-first, encrypted, and open source.' as const;

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
      'Klio is a memory layer for AI agents. It captures what your agents learn, stores it, and serves it back through MCP so your agents remember across sessions and share context across tools — which is what keeps them reliable. Self-hosted, that memory is encrypted at rest under a key you own.',
  },
  {
    question: 'Does my data leave my machine?',
    answer:
      'No. Klio is local-first: self-hosted, memory is stored on your machine and encrypted at rest under a key you own. Nothing leaves unless you explicitly opt into Klio Cloud, where memory lives on our infrastructure under keys we manage.',
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
      'It depends where you run it, so here is the honest split. Self-hosted: memory is encrypted at rest under a key you own, and every write is chained with SHA-256, so the history is tamper-evident and inspectable. Klio Cloud: memory is encrypted in transit over TLS and at rest at the infrastructure level, secrets and PII are redacted before storage, and every org is isolated — but the keys are ours, not yours, and Cloud writes are not hash-chained today.',
  },
] as const satisfies ReadonlyArray<FaqEntry>;
