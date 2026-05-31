# Product Marketing Context — Klio

*Last updated: 2026-05-31*

> Source of truth for klio.tech positioning + messaging. The merged landing
> (re-skinned `apps/landing`) and all marketing copy should reference this.

## Decided direction (the one-paragraph version)

**Lead with collaboration: "one shared brain for all your AI agents."** Say it in
plain words a non-expert gets on first read. Today every agent is an island —
they forget between sessions AND they don't share what they learn with each
other, so Claude, Cursor, Gemini, and Codex each start from zero and trip over
each other's work. Klio is **one shared memory that every agent plugs into** —
what one learns, they all know. The hierarchy, ranked: **collaboration (the WHAT
— a shared brain across every agent you use) ← memory (the HOW — the mechanism)
→ reliability (the PAYOFF — less drift, fewer repeats); local-first + encrypted +
open-source is the TRUST pillar, not the headline.** We previously led with memory
(one of a crowded shelf) and with local-first/OSS (an objection-answer, not a
reason to want it) — both undersold the real, defensible category: the
collaboration layer that connects any agent. Keep "Your agents forget. Klio
remembers." as the hook; make the shared-brain-across-all-your-agents the lead.

## Product Overview
**One-liner:** Klio is one shared brain for all your AI agents — what one learns,
they all know.
**What it does:** Klio connects every AI agent you use (Claude Code, Cursor,
Codex, Cline, Zed, Gemini — any MCP agent) to one shared memory. It captures what
each agent does, stores it encrypted under a user-owned key, and serves it back
through MCP so agents remember across sessions and share context across tools —
they stop forgetting, repeating work, and contradicting each other.
**Product category:** The collaboration / shared-memory layer for AI agents.
Adjacent to the memory shelf (mem0 / Zep / Supermemory) but differentiated as
**cross-agent** (a shared brain, not single-agent recall), local-first, and open.
**Product type:** Open-core developer infrastructure. Local-first OSS engine +
hosted Klio Cloud.
**Business model:** Free forever, self-hosted (OSS, runs on your machine).
Klio Cloud is **live now** — sign up / sign in at **app.klio.tech** (magic-link,
free to start) — and adds managed hosting, SSO, and the cross-agent intelligence
layer, including **B2B2C per-end-user memory** for companies embedding Klio in
their own agent products (priced per end-user). Cloud is opt-in, not a waitlist.

## Target Audience
**Target companies:** Teams and solo developers building AI agents / agentic
workflows; and **agent-builder companies** embedding a memory layer for their
own users (B2B2C).
**Decision-makers:** Engineers / founding engineers / AI platform leads. Bottom-up,
developer-led adoption (OSS install first).
**Primary use case:** Give my agents memory that persists across sessions and is
shared across tools, so they stop repeating work, re-introducing bugs, and drifting.
**Jobs to be done:**
- "Stop my agents from forgetting context between sessions."
- "Let my different agents/tools share what each one learns."
- "Make my production agents reliable — fewer hallucinations, less drift."
- (B2B2C) "Give every one of MY product's users their own private agent memory."
**Use cases:** cross-session recall in Claude Code/Cursor/Codex; cross-agent
hand-off; per-end-user memory in an embedded agent product (e.g. a game studio
giving each player a remembering companion); team "shared brain" for a project.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Agent developer (user) | Agents that don't forget; low setup friction; privacy | Agents restart from zero, drift, repeat mistakes | Persistent shared memory in one command; encrypted, local |
| Agent-builder company (champion/buyer) | Per-user memory they don't have to build; isolation | Building+operating a memory layer is a distraction | Drop-in per-end-user memory via MCP, paid per end-user |
| Privacy/security-conscious dev | Data never leaving the machine; auditability | "Memory SaaS" means shipping their data out | Local-first, user-owned key, cryptographic audit chain |

## Problems & Pain Points
**Core problem:** AI agents are stateless and siloed — they forget across sessions
and don't share context across tools, so they drift, hallucinate, and redo work.
**Why alternatives fall short:**
- Single-agent memory tools (mem0/Zep) recall for one agent; they don't make
  *multiple* agents share a brain.
- Reliability/observability tools (LangSmith, Guardrails) watch or gate output
  *after* the agent acts — they don't fix the root cause (the agent has no memory).
- "Memory SaaS" ships your data to someone else's cloud.
**What it costs them:** wasted tokens/time on repeated work, production incidents
from drift, and the build-vs-buy cost of rolling their own memory layer.
**Emotional tension:** "My agent passed every eval, shipped, then quietly started
doing 90% of the job — and I found out from a user."

## Competitive Landscape
**Direct (memory):** mem0, Zep, Supermemory — single-agent recall; not cross-agent,
not local-first/encrypted by default, not MCP-native, closed.
**Secondary (reliability):** LangSmith, Langfuse, Guardrails AI, Braintrust, Galileo
— observe/guardrail after the fact; treat symptoms (drift/hallucination) rather
than the cause (no memory). Klio prevents drift by giving the agent context.
**Indirect:** rolling your own (Postgres + pgvector + glue) — works until you need
encryption, cross-agent pub/sub, audit, and per-user isolation.

## Differentiation
**Key differentiators:**
- **Cross-agent shared memory** (Redis pub/sub) — not just per-agent recall.
- **Local-first + encrypted under a user-owned key** — data stays on the machine.
- **MCP-native** — works with Claude Code, Cursor, Codex out of the box.
- **Cryptographically auditable** (SHA-256 hash chain) — inspectable, not "trust us".
- **Open-core** — free self-host; paid Cloud only when we host.
- **Reliability as a built-in outcome**, plus a runtime-verification engine for Cloud.
**How we do it differently:** memory is the foundation, reliability is the result.
**Why customers choose us:** they get a remembering, reliable agent in one command,
without shipping their data out or building the layer themselves.

## Objections
| Objection | Response |
|-----------|----------|
| "Does my data leave my machine?" | No — local-first, encrypted under your key; nothing leaves unless you opt into Cloud. |
| "Isn't this just another memory SaaS?" | It's OSS and runs on your laptop; Cloud is opt-in. And it's cross-agent, not single-agent. |
| "Reliability tools already exist." | They watch output after the fact. Klio prevents drift by giving the agent memory/context. |
| "Setup looks heavy (Docker)." | One command: `npx @klio-tech/klio init`. ~30s warm. |

**Anti-persona:** a non-technical buyer wanting a turnkey hosted SaaS with zero
setup and no interest in local-first/OSS — not the wedge (yet).

## Switching Dynamics
**Push:** agents forget, drift, repeat mistakes; rolling your own memory is a tax.
**Pull:** one-command shared memory, local + encrypted, MCP-native, reliability payoff.
**Habit:** "I just re-paste context each session" / "we built a little memory hack."
**Anxiety:** "Is my code/data safe?" → answered by local-first + user-owned key + audit.

## Customer Language
**How they describe the problem:**
- "My agent forgets everything between sessions."
- "It keeps re-introducing the same bug / contradicting earlier decisions."
- "It passed evals then drifted in prod."
**How they describe us (aspirational):**
- "One shared brain for my agents." / "All my agents share what they learn."
- "Shared memory for my agents." / "It just remembers."
**Voice rule — keep it plain.** A non-expert should get it on first read. Prefer
everyday words ("one shared brain," "every agent you use," "what one learns, they
all know," "plug in," "work together") over jargon. Lead with the simple picture,
then back it with the technical specifics.
**Words to use:** shared brain, shared memory, connect, plug in, every agent, work
together, what one learns they all know, cross-agent, remember, recall, persistent,
local-first, encrypted, open source, MCP.
**Words to avoid:** "sandbox" (implies an *isolated* throwaway space — the opposite
of shared/connective); coined jargon without a gloss (e.g. "unibrain") as the lead;
"AI-powered" hype, "revolutionary"; "guardrails"/"reliability" as the lead (payoff,
not wedge); leading with "local-first/open-source" (trust pillar, not the headline);
Vex / legacy brand terms.
**Glossary:**
| Term | Meaning |
|------|---------|
| recall / remember / observe / plan / decide / note / space | The 7 MCP memory tools |
| space | A scoped memory store |
| cross-agent | Memory shared across multiple agents/tools |

## Brand Voice
**Tone:** technical, candid, anti-hype ("Questions, answered honestly").
**Style:** direct, developer-first, shows real specimens (real recall output,
ciphertext, vectors) instead of claims.
**Personality:** precise, trustworthy, understated, craft-driven, a little contrarian.

## Proof Points
**Metrics/specs:** 7 MCP tools; 768-d embeddings; ~4ms recall; SHA-256 audit chain;
one-command install; 0 telemetry; per-space pluggable embedding models.
**Customers:** early — embed case (per-end-user memory for an agent product).
**Value themes:**
| Theme | Proof |
|-------|-------|
| It remembers across sessions/agents | recall() specimens, cross-agent pub/sub diagram |
| Private by default | local-first, user-owned key, encrypted-at-rest, audit chain |
| Reliability as a result | the reliability knowledge hub (former pSEO) + Cloud verification engine |
| Open + zero-lock-in | OSS, self-host free forever |

## Goals
**Business goal:** developer-led adoption of OSS Klio → conversion to Klio Cloud
(esp. B2B2C per-end-user).
**Conversion action:** two live paths, both surfaced on the landing —
(1) OSS: `npx @klio-tech/klio init`; (2) Klio Cloud: **sign up** at
app.klio.tech/auth/sign-up (free to start, magic-link), with **Sign in**
persistently available in the nav for returning Cloud users.
**Current metrics:** pre-launch / early.

---

## How this shapes the merged klio.tech (the landing direction)

- **Home = memory-led, one causal story:** hero leads with cross-agent shared
  memory → the reliability payoff. Not two co-equal pillars.
- **Keep Klio's aesthetic + HUMAN/MACHINE dual-mode** as the home spine.
- **The 1,200 reliability pages = the "Agent Reliability" knowledge hub**, reframed
  as "why agents fail (no memory/context)" → "how Klio fixes it," rebranded
  Vex→Klio. They power SEO and feed the funnel — not abandoned, not the headline.
- **Reuse Vex's conversion muscle** (problem framing, how-it-works, interactive
  demo, pricing, comparison) re-skinned into Klio's look and re-told around memory.
- **Surface Klio Cloud, not just the OSS install:** persistent **Sign in** +
  **Get started / Sign up** in the nav (→ app.klio.tech/auth), a dedicated Cloud
  section (managed, hosted, cross-agent, per-end-user), and Cloud CTAs in pricing
  and the closing block. Two clear paths: self-host (OSS) or Cloud (sign up).
- **Social share card (OG image):** a branded klio.tech preview image renders
  when the URL is shared anywhere — Klio mark + "Your agents forget. Klio
  remembers." on the cream/mono card — generated via Next `opengraph-image`.
