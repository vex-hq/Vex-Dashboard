# Product Marketing Context — Klio

*Last updated: 2026-08-11*

> Source of truth for klio.tech positioning + messaging. The landing, docs,
> changelog and all marketing copy should reference this.

## Decided direction (the one-paragraph version)

**Klio is context management infrastructure for the agentic era.** Not a
token-saving tool, not a recall tool: the platform where a team's working
context — decisions, constraints, rejected approaches, live state — is kept,
kept current, and handed to whoever needs it next, agent or human. Token
reduction is a feature; it is never the lead. The analogy we build by: **Linear
vs Jira/ClickUp.** Project management existed; Linear won by making the
experience precise, fast and beautiful. Context management exists too — it is
scattered across Slack, docs and heads. Klio wins by making it a first-class,
beautiful experience. The hierarchy: **context management (the WHAT) ← shared
memory (the HOW) → instant onboarding (the PROOF).** Trust pillar unchanged:
open-core, MCP-native, org-boundary isolation.

## The primary use case: onboarding

The sharpest demonstration of context management done right: **a project's full
working context, transferred in minutes.** A new team member — or a new agent —
joins a project that lives in Klio and comes out understanding it: what was
decided and why, what was rejected, what constraints are live, what is
mid-flight. Target claim: **onboarded in 15–20 minutes.**

> **Validation flag (internal, honest):** the 15–20 minute figure is a design
> target, not a measured result. Production data (2026-08-07) showed the team
> loop essentially unexercised. Before this number goes on a public surface,
> time a real onboarding against a real project. Until then, public copy says
> "in minutes" and demos it rather than quoting an unmeasured number.

Supporting use cases (all live at klio.tech/use-cases): cross-tool continuity,
session pickup, "we already tried that", constraint memory, decision
archaeology, handover across teammates, auditable belief history.

## The company-intelligence narrative (approved copy, 2026-08-11)

Klio becomes smarter the more your company uses it. It learns your people,
processes, questions, recurring issues and agreed solutions — building a
continuously improving, company-specific knowledge base. Proven solutions are
remembered and made available to the next person or agent, reducing
duplication, improving consistency — and, as a consequence, reducing token
usage and AI costs over time (a supporting benefit, never the lead).

**The future-proofing pillar (elevate this — it is the strategic gem):** as AI
models, providers and technology change, your company's accumulated knowledge,
processes and solutions remain yours. Klio is a durable intelligence layer
that works with whatever AI comes next. This is our cross-vendor
differentiator stated as a buyer's insurance policy, and no model vendor can
credibly say it.

**Approved closing line:**
> Klio doesn't just give your company AI. It helps your company build its own
> intelligence.

**Audience staging (internal, honest):** this narrative addresses the whole
company — staff, onboarding, HR, operations. The product today serves
agent-running dev teams, and the human surface that HR/ops would need is
roadmap, not shipped. Use the company framing for vision surfaces (deck,
about, investor conversations); keep acquisition surfaces (landing, docs)
aimed at the dev-team beachhead until the context view exists. Selling to ops
today would outrun the product.

## Product Overview
**One-liner:** Klio is where your team's context lives — every decision,
constraint and lesson, kept current and handed to whoever needs it next, agent
or human.
**What it does:** Klio connects every AI agent a team uses (Claude Code,
Cursor, Codex — any MCP client) to one shared, project-scoped context store. It
captures what happens, keeps beliefs current by superseding what changed rather
than deleting it, and serves context back through MCP to agents and — the 2026
H2 focus — visually to people.
**Product category:** Context management platform for AI-agent teams. We name
the category rather than shelving with memory tools (mem0 / Zep /
Supermemory): they sell recall quality to a single agent; we sell the managed
context experience for a team.
**Product type:** Open-core developer infrastructure. AGPL core engine +
hosted Klio Cloud (graph, hybrid recall, artifacts, compression,
reconciliation).
**Business model:** Free forever for one person (unlimited memories, retention
forever). Team $20/seat/mo or $200/seat/yr. Platform: per end-user, sales-led,
for companies embedding Klio in their own agent products.

## Target Audience
**Target companies:** Teams running coding agents on shared codebases; agent
platform teams; agent-builder companies (B2B2C).
**Decision-makers:** Engineers and founding engineers; bottom-up, OSS-first
adoption. The Team tier is bought when the second person joins.
**Primary use case:** Onboard a person or an agent into a project's full
context in minutes.
**Jobs to be done:**
- "Get a new teammate (or agent) productive on this project today, not next week."
- "Stop my agents re-litigating settled decisions and repeating dead ends."
- "Let every tool I use share one picture of the project."
- (B2B2C) "Give each of MY product's users their own remembering agent."

## Problems & Pain Points
**Core problem:** A team's working context is its most valuable asset and it is
managed nowhere — scattered across Slack, closed PRs, stale docs and people's
heads. Agents make this acute: they consume context voraciously and regenerate
it wrongly when it is missing.
**Why alternatives fall short:**
- Memory tools (mem0/Zep): single-agent recall; no team model, no supersession,
  no human surface.
- Docs/wikis: written once, never current, invisible to agents.
- "The context is in the repo": code answers *what*, never *why* or *what was
  rejected*.
**What it costs them:** weeks-long onboarding; agents repeating rejected work;
decisions contradicted silently.

## Competitive Landscape
**The analogy that frames us:** Linear vs Jira/ClickUp. Same shelf existed;
the refined experience won the modern segment. Klio does this to context
management: the category exists as scattered practice, and we win it with the
experience.
**Direct:** mem0, Zep, Supermemory — recall for one agent; fall short on team
scoping, supersession, and any human-facing surface.
**Secondary:** Notion/Confluence + "keep the docs updated" — dead on arrival
with agents; nobody updates them and agents can't read intent from them.
**Indirect:** vendor-native memory (Cursor rules, Claude memory) — per-tool
silos; the exact fragmentation we exist to end. Also our biggest commoditisation
risk: the passive layer WILL be cloned by vendors. The defensible layer is
cross-vendor scope + supersession + the human surface.

## Differentiation
- **Cross-vendor by construction** (MCP-native; no lock-in incentive we could
  even act on).
- **Beliefs are managed, not just stored**: supersede/retire with the record
  intact; the curator judges direct contradictions. Anyone can keep text;
  almost nobody retires it.
- **One boundary that holds**: org isolation, project scoping, private scope
  with no admin override.
- **(Roadmap) The human surface**: context you can see, browse and trust —
  the "beautify" half of the Linear analogy.
- **Future-proof by neutrality**: knowledge accumulated in Klio survives any
  model or vendor change. The switching cost lives with us, not the LLM
  provider — the inverse of every vendor-native memory.

## Messaging rules
**Lead with:** context management, onboarding-in-minutes, handover, retired
stale truth.
**Demote to feature copy:** token/context-window savings, compression,
embedding details. True, useful, never the headline.
**Words to use:** workplace, context, handover, supersede/retire, onboarded.
**Words to avoid:** "brain" (public copy), "token reduction" as a lead,
"never hallucinates", hype adjectives (per docs AGENTS.md).
**Where the old lead survives and must be fixed:** the OSS README (3 token
mentions), any deck slide leading with cost; sweep them to the new hierarchy.

## Roadmap implication (the UX requirement)
The positioning requires a product investment, agreed 2026-08-11: **resurface
context for humans.** Today Klio is backend-heavy — agents get a great
interface (MCP) and people get very little. To sell context management we must
show it:
1. **Project context view** — one screen per project: current decisions, live
   constraints, what's mid-flight, what changed this week. This IS the demo of
   the onboarding claim.
2. **Belief timeline** — the supersession chain made visible; why is it like
   this, what did we reject, when did it change.
3. **Onboarding flow** — "join project → read the brief → you're current",
   timed, so the 15–20 min claim becomes a measured fact.
Engine remains feature-frozen (decision 2026-08-07); this work lives in the
dashboard/web layer, which is exactly where the freeze points investment.

## Proof Points
**Real and citable now:** hybrid recall (exact identifiers + meaning);
supersession with intact history; org-boundary isolation; free tier genuinely
unlimited; open-core with a public AGPL engine.
**Internal only until measured:** onboarding minutes; team adoption numbers.
**Investor-safe color:** 50k+ memories under management in production
dogfooding; reconciliation running conservatively by design.

## Goals
**Business goal:** first paying teams on the $20/seat tier.
**Conversion action:** connect an agent → create a project → invite the second
person.
**Leading metric to watch:** second-seat invitations, and
`klio_lexical_arm_contributed_total` / recall usage as engagement signals.
