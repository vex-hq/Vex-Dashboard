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

## Category: coordination, not memory (decided 2026-08-13)

**Klio is the coordination layer for multi-agent work — for agents and humans
on the same context.** It is not a memory product. Memory is the substrate;
coordination is the job.

Why this and not "memory": the memory category is commoditising fast and every
attribute is matched (see Competitive Landscape). Coordination is a
**distributed-systems** problem — locking, consistency, conflict resolution,
propagation. The memory vendors are solving a *retrieval* problem, which is an
ML problem. Different discipline, different hires, and it does not commoditise
when the next model ships.

**Framing that lands:** agents today are engineers with no standup, no ticket
board and no Slack. Enterprises run ~12 agents on average and roughly half
operate alone. Klio is where they coordinate.

### Coordination primitives — four shipped, four missing

| Have | Missing |
| --- | --- |
| Shared context | **Claims / leases** — "I'm refactoring auth", so two agents don't do the same work twice |
| Scoped visibility (private / project / org) | **Concurrency control** — two agents writing contradicting beliefs at once |
| Provenance (who or what asserted this) | **Handoff** — next agent resumes with state instead of re-deriving |
| Supersession | **Approval gates** — human in the loop before a high-blast-radius org-wide write |

The four we have were built because coordination was the real problem; the
memory framing came later and undersold them.

**Claims are where the semantic advantage shows.** Exact-key locking is useless
when "auth refactor" and "fixing login token expiry" are the same work under two
names. We have embeddings, so we can detect *semantic* collision — "agent B
claimed something 0.89 similar, 20 minutes ago." A conventional lock manager
cannot do that; the memory vendors are not thinking about locking at all.

### Enforcement: deterministic local, probabilistic cloud

This distinction is load-bearing and must be stated accurately — do not
overclaim it.

- **Local agents (Claude Code, Cursor, Codex, self-built): deterministic.** The
  harness runs our code, the model is not consulted. `SessionStart` injects
  before the agent thinks; `UserPromptSubmit` refreshes every turn;
  **`PreToolUse` can outright block** an edit to a file another agent has
  claimed. That last one is genuine mutual exclusion, not advisory.
- **Cloud agents (claude.ai, ChatGPT, hosted): probabilistic.** Reads *and*
  writes both work — they are tool calls, and the proactive-write instruction at
  `mcp_app.py:141` gets the agent writing unprompted. What is impossible is
  server-initiated push: the MCP spec leaves delivery to the client
  ("application-driven"), Claude Code's experimental `notifications/claude/channel`
  does not reach model context ([claude-code#45563](https://github.com/anthropics/claude-code/issues/45563)),
  and the Messages API connector supports **tool calls only**.

So: Klio works everywhere, and can only *guarantee* it locally. Say exactly
that. The honest line is **"both directions work in both places; only the
certainty differs."**

**Distribution follows from this.** The local injection ladder, strongest first:
hooks where the harness has them → enriched tool responses everywhere else
(every Klio call returns its answer *plus* what changed) → a local proxy as the
ceiling. Static rule files carry an instruction but cannot carry fresh data, so
they buy almost nothing for us. Caveman proves the shape works across 30+ agents
with a one-command install.

## The core objection and its answer (decided 2026-08-13)

Every technical buyer asks the same question, and it is the only one that
matters: **"We already use GitHub and a Claude.md. Why doesn't that work?"**

It was asked three times in the 2026-08-12 BattleTime call and never answered.
The call was lost on it. This is the scripted answer; it is the lead.

**The answer is the write path — nobody updates it.**

> GitHub works. It is not the wrong tool — it just has a human in the loop.
> Keeping a Claude.md current takes five deliberate acts: notice the decision
> changed, stop, edit, commit, push — and everyone else has to pull. That
> competes with shipping, so it loses, and the file drifts behind reality. Not
> a discipline problem: the write path costs human attention.
>
> Klio's writes are a side effect. The agent records the decision as it is
> made, because it is already there. Nobody has to remember.
>
> *"Last month our own agents wrote ~31,000 memories. How many times did your
> team edit its Claude.md?"*

**Why this answer and not the others.** It is the only one that reframes the
question rather than accepting it. "Better retrieval", "we supersede", "we
scope" all invite *"I could approximate that with a script"* — and a good
engineer can. The write path can't be scripted away, because the fix is
architectural: writing has to happen without anyone deciding to do it. It is
also the only answer the buyer cannot dispute without claiming their team
reliably updates docs as they work. Nobody claims that aloud.

**It is verified, not aspirational.** `services/mcp-server/app/capture.py` is
the automatic capture path, and `mcp_app.py:141` ships
`"PROACTIVELY persist durable knowledge as it arises — without being asked"`
to every connected client.

**Say "our own agents", never a customer stat.** The ~31,000 is internal
dogfooding. Stated as a lived fact it is strong and honest; dressed up as
customer proof it collapses under one follow-up.

**The one-two-three.** Diagnosis → proof → expansion, in that order:
1. **Nobody updates it** (the write path) — the lead.
2. **It can't forget** (supersession) — the *proof*, and the answer to the
   inevitable "won't it fill with garbage?". Never the opener: it only matters
   once the buyer accepts that docs go stale.
3. **It's a single-player save file** (scope, cross-tool) — the *expansion*,
   how the pain grows with people and tools. Weak as an opener against a small
   team sharing one repo.

Token efficiency is **not** on this list. See Messaging rules.

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
**Product category:** Context management platform for AI-agent teams.
*Corrected 2026-08-13:* this line previously read "they sell recall quality to a
single agent; we sell the managed context experience for a team." That is no
longer true — Sentra and memory.store both sell team-scoped memory. The
distinction that survives is **where the memory comes from**: they sync it out
of human tools, we capture it from agents as they work. See Competitive
Landscape.
**Product type:** Open-core developer infrastructure. AGPL core engine +
hosted Klio Cloud (graph, hybrid recall, artifacts, compression,
reconciliation).
**Business model:** Free for one person — unlimited memories, **30-day
retention, 3 projects, basic vector recall**. Team $20/seat/mo or $200/seat/yr:
retention forever, unlimited projects, the intelligence layer. Platform: per
end-user, sales-led, for companies embedding Klio in their own agent products.

> **Source of truth for limits is `2026-08-13-klio-pricing-spec.md`, not this
> file.** An earlier version of this line said Free was "unlimited memories,
> retention forever" — written before the pricing work landed and contradicting
> it. Retention is the primary upgrade lever; never describe Free as forever.

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
### The Linear analogy is retired (2026-08-13)

It read: *"Project management before Linear looked like context management does
today — real need, miserable tooling. Jira proved the category; Linear proved
the experience wins it. Klio is that move for your team's context."*

Three reasons it no longer holds:

1. **Linear had an incumbent; we don't.** Every Linear prospect already had
   Jira, already paid for it, and already hated it — category, budget and pain
   all pre-existed, so Linear only had to win on experience. Nobody switches
   *from* a context manager. There is no line item to redirect. That is
   category creation, which is a slower and more expensive game than the
   analogy implies, and the 2026-08-12 BattleTime call is what it feels like.
2. **The shelf is not empty.** The old wording said the category "exists as
   scattered practice." As of 2026-08-13 it exists as products — Sentra and
   memory.store are selling it now. This is an early race, not a refinement
   play.
3. **It aims investment at the wrong thing — the real damage.** Linear won on
   experience, so the analogy says "make it beautiful." Our researched
   differentiator is not experience, it is **where the memory comes from**.
   Steering by this analogy would have us polishing UI, or worse, chasing
   Sentra's 200+ connectors, while the one thing we own goes uninvested.

### What replaces it

No analogy. A position:

> **Klio is an early entrant in a real, now-contested category. No single
> attribute is unmatched; the combination is — for now.** Agent-native capture,
> shared across a team of humans, sold to that team directly, at $20/seat.

**Be precise about the write path — it does not differentiate us from
everyone.** Mem0 also captures from agents during work; that is exactly what
`mem0.add()` is. The distinction is two-sided and must be stated per competitor:

- **vs Sentra / memory.store (same buyer, team memory):** they are
  connector-first, syncing Slack, Gmail, Notion and Drive — artifacts humans
  already produced. Here the agent-native write path is a real difference.
- **vs Mem0 / Zep / Letta / Supermemory (agent-native too):** the write path is
  *not* a difference. What differs is who it serves. They sell an API to a
  developer embedding memory in *their own product*, about *that product's end
  users* — Mem0's scopes are user / session / agent. Klio is bought by a working
  team, and the memory is about *the team's work*, shared between colleagues.

**Say this plainly and do not overreach:** every attribute we have is matched by
someone. Supersession by Zep and Sentra, open source by Cognee, team scope by
Sentra and memory.store, agent capture by Mem0. A combination is a position, not
a moat, and positions erode. Treat the current lead as time to earn a real one,
not as one we already hold.

**Races we explicitly decline to run:**

- **Connector count.** Sentra has 200+. We will not catch that and should not
  try; connectors are their moat by construction, and matching them would make
  us a worse version of them.
- **Graph sophistication.** Zep and Sentra are both bi-temporal. Ours is
  adequate; parity here buys nothing a buyer can feel.
- **Being the most open.** Cognee has 30k stars and a head start on the
  open-source position.

**What we invest in instead:** capture quality and coverage on the agent write
path — more of what matters recorded, with less effort, from more agents. That
is the axis where being first and being agent-native compounds.

**What survives from the old frame:** the human-surface investment
(project context view, belief timeline, onboarding flow) is still worth doing —
but as *proof* that the captured context is real and trustworthy, not as an
experience bet against an incumbent. Note we have **not** verified how good the
competitors' human surfaces are; do not claim theirs is weak without looking.
### Researched landscape (2026-08-13, primary sources)

Every row below was read off the vendor's own site, not a listicle. The
previous version of this section — "mem0, Zep, Supermemory: recall for one
agent; fall short on team scoping, supersession, and any human-facing surface"
— was **wrong on all three counts** and is corrected here.

| | Headline (verbatim) | Pricing | Shape |
| --- | --- | --- | --- |
| **Sentra** | "The Company Brain for your teams and agents" | not published | connector-sync, bi-temporal graph |
| **memory.store** | "One shared memory for your teammates, and agents" | **$150/user/mo**; free for individuals | connector-sync |
| **Mem0** | — | $0 / $19 / $249 / custom | **usage-based**, unlimited end users |
| **Zep** | "Agent memory, at enterprise scale." | not published | developer SDK (Python/TS/Go) |
| **Cognee** | "Open Source Memory Platform for Agents" | $0 (1M tokens) / $2.50 per 1M tokens | **token-based**, 30k GitHub stars |
| **Supermemory** | "The memory layer for AI agents…" | $0 / $19 / $100 / $399 | **usage-based**, teammate caps (2, then 10) |

**Direct — same job, same buyer:**
- **Sentra** (sentra.app) is the closest competitor that exists. Bi-temporal
  facts (valid-from and valid-until, invalidated not deleted, provenance
  first-class), MCP and REST, cloud / isolated VPC / air-gapped on-prem, 200+
  integrations, sold to engineering *and* sales, finance, ops, legal, exec.
- **memory.store** — team memory, MCP, Gmail/Slack/Granola/Fathom/Linear, but
  at $150/user/mo against our $20, with no self-host offered.

**Adjacent — infrastructure sold to builders, not to teams:** Mem0, Zep, Letta,
Supermemory. They sell an API to developers embedding memory in *their* product.
Different buyer, different sale, different pricing axis. More likely something
we sit on than something we lose to.

**Secondary:** Notion/Confluence + "keep the docs updated" — dead on arrival
with agents; nobody updates them and agents can't read intent from them.

**Indirect:** vendor-native memory (Cursor rules, Claude memory, Anthropic
Memory, OpenAI memory) — per-tool silos; the exact fragmentation we exist to
end. Free, zero-install, already inside the tool, and still our biggest
commoditisation risk.

### Three claims this research kills

1. **"Nobody manages change / supersession is ours."** False twice. Zep
   invalidates outdated facts and can answer what was true on any past date.
   Sentra is bi-temporal with first-class provenance. Supersession is **table
   stakes**, not a differentiator. Do not build a pitch on it.
2. **"Open core is ours."** Cognee is open source with 30k GitHub stars, an MCP
   server and a graph. Sentra ships air-gapped on-prem; Supermemory self-hosts
   at $399. Contested.
3. **"They're single-agent, we're the team one."** Sentra and memory.store are
   explicitly team-scoped. That sentence is no longer true of the field.

### What actually survives

**The write path — and it is the only differentiator the evidence supports.**
Sentra, memory.store and Supermemory are all *connector-first*: they sync
Slack, Gmail, Notion and Drive, aggregating artifacts humans already produced
somewhere else. Klio's primary write path is the **coding agent, during the
work** (`services/mcp-server/app/capture.py`; the proactive-write instruction
at `mcp_app.py:141`).

They capture what people **said**. Klio captures what agents **did**. That is a
different data source, not a different feature — which is why it is defensible
and why it is also the answer to the GitHub objection above. One argument, two
jobs.

Second, weaker but real: **$20/seat against memory.store's $150** — and per-seat
pricing is itself rare, since Mem0, Cognee and Supermemory all price on usage or
tokens.

**Not verified — do not assert:** Zep's and Sentra's pricing (neither
publishes); whether Sentra's capture includes agents writing during work or only
connector sync; Mem0's open-source licence terms.

## Differentiation

Ordered by how well the 2026-08-13 competitive research supports each. Lead with
the top one; the lower ones are contested and must not carry a pitch alone.

- **Agent-native capture, shared across a team of humans. This is the lead —
  but it is the pair that matters, not either half.** Against Sentra and
  memory.store, the difference is agent-native: they are connector-first,
  syncing what humans already wrote in Slack, Gmail, Notion and Drive. Against
  Mem0, Zep and Letta, agent capture is *not* a difference — `mem0.add()` is the
  same act — and the difference is instead that their memory is about an app's
  end users, sold to the developer embedding it, while ours is about a team's
  work, sold to the team. Never claim the write path alone; it is only half an
  argument and the wrong half depending on who you are talking to.
- **Cross-vendor by construction** (MCP-native; no lock-in incentive we could
  even act on).
- **One boundary that holds**: org isolation, project scoping, private scope
  with no admin override, members-only projects.
- **Price shape**: $20/seat against memory.store's $150/user — and per-seat is
  itself unusual in a field pricing on tokens and API calls.
- ~~**Beliefs are managed, not just stored**~~ — *demoted 2026-08-13.* Still
  true of the product (supersede/retire with the record intact; the curator
  judges direct contradictions) but no longer differentiating: Zep invalidates
  outdated facts with historical query, and Sentra is bi-temporal with
  first-class provenance. The old line "anyone can keep text; almost nobody
  retires it" is false. Keep the capability, drop the claim.
- **One boundary that holds**: org isolation, project scoping, private scope
  with no admin override.
- **(Roadmap) The human surface**: context you can see, browse and trust —
  the "beautify" half of the Linear analogy.
- **Future-proof by neutrality**: knowledge accumulated in Klio survives any
  model or vendor change. The switching cost lives with us, not the LLM
  provider — the inverse of every vendor-native memory.

## Objections

| Objection | Response |
| --- | --- |
| **"We use GitHub + Claude.md and it works."** | The scripted answer above. Agree with the tool, indict the write path, then ask how often they actually edit it. Never argue that GitHub is bad. |
| **"Won't automatic writing fill it with garbage?"** | Contradictions supersede with the reasoning kept — the old belief and the cause of death stay retrievable. This is the part a script can't do, which is why it follows the write-path answer rather than leading. |
| **"We're not spending much on tokens."** | Agree and drop it immediately. It is not our argument, and pressing it after the buyer has said cost isn't a pain reads as not listening. Cost reduction is a consequence we mention after value is established, never a lead. |
| **"How do we stop someone wrecking the knowledge base?"** | Roles — read / write / manage / admin — plus private, project and org scope. **Do not say branches, PRs or merges.** Klio has none of these; a technical buyer will check and find nothing. Show the members UI instead. |
| **"Isn't this what Cursor rules / Claude memory already do?"** | Per-tool silos — the exact fragmentation we exist to end. If they use two agents (Claude Code *and* Codex is common), ask what those two share today. The honest answer is usually "a Claude.md, I guess." |
| **"Can we just self-host / is this lock-in?"** | Engine is AGPL and public; MCP-native by construction. The accumulated knowledge is portable across any model or vendor — the inverse of vendor-native memory. Note Cognee is also open source and Sentra ships air-gapped on-prem, so do not present this as unique. |
| **"How is this different from Sentra / memory.store?"** | Where the memory comes from. They sync Slack, Gmail, Notion and Drive — what people already wrote down somewhere else. Klio is written by your agents while they work, so it captures the reasoning that never got written down anywhere. Then: price — $20/seat against memory.store's $150/user. Do **not** answer with supersession or open source; both are contested. |

## Anti-persona

Not our buyer, and pitching them costs credibility:

- **Solo developers not in pain.** One person, one repo, a Claude.md that fits
  in their head. Nothing here beats what they have.
- **Teams running one agent, occasionally.** The value scales with agent count
  and people; below the threshold it is theoretical.
- **Teams whose context genuinely fits in one repo.** If code answers *what*
  and nobody needs *why*, we are solving a problem they don't have.
- **Buyers shopping on token cost.** They will churn to whoever is cheaper, and
  the savings claim is not defensible as a primary value.

**Qualify out loud and early.** BattleTime (2026-08-12) sat close to this line —
small team, one shared repo, a working Claude.md, explicitly no cost pain — and
was pitched for 30 minutes anyway. Three diagnostic questions would have caught
it. Disqualifying fast is a win, not a loss.

## Switching Dynamics

- **Push** — a new hire takes weeks to get productive; agents redo work that
  was already decided against; two tools hold two versions of the truth; the
  doc that was supposed to prevent this is three months stale.
- **Pull** — the context writes itself; a new person or agent is current in
  minutes; what changed and why is visible rather than folklore.
- **Habit (strongest force, and the one we keep losing to)** — they already
  have *something*: a Claude.md, a Drive folder, skills, a docs convention. It
  is not good, but it exists, it is free, and it is theirs. **Never attack it.**
  Concede it works and locate the failure in the write path, which is not their
  fault and not fixable by trying harder.
- **Anxiety** — another dependency in the critical path; a black box deciding
  what my agent knows; noise polluting a context that is currently clean; what
  happens to our knowledge if this company dies. Answer with: open-core engine,
  visible recall, supersession you can inspect, export.

## Customer Language

**How they describe the problem (verbatim, BattleTime 2026-08-12):**
- *"I guess I don't understand the part, why the GitHub approach doesn't work."*
- *"It's not very clear to me how much value it will add to our team yet."*
- *"I haven't seen the urgency to lower the token cost."*
- *"We kind of have a Claude.md, and then it has reference to other docs…
  many people have come up with ways to let agents share information. I don't
  know."* ← the crack: they have no confident answer for cross-tool sharing.
- *"How do you prevent someone who's not familiar with the project accidentally
  changing the shared knowledge base?"*
- *"So Klio will be the only authoritative knowledge base?"*

**What this tells us:** buyers do not arrive feeling the pain we describe. They
arrive with a workaround they believe in, and the job is to show them its seam
— not to describe our features better.

## Messaging rules
**Lead with:** context management, onboarding-in-minutes, handover, retired
stale truth.
**Demote to feature copy:** token/context-window savings, compression,
embedding details. True, useful, never the headline.
**Words to use:** workplace, context, handover, supersede/retire, onboarded.
**Words to avoid:** "brain" (public copy), "token reduction" as a lead,
"never hallucinates", hype adjectives (per docs AGENTS.md).

**On "brain" — the ban stays, and now for a stronger reason (2026-08-13).**
It is the most effective word we have in conversation; people understand "one
brain your agents share" instantly, and it keeps surfacing under pressure. But
**Sentra's headline is "The Company Brain for your teams and agents"** and
memory.store's is "One shared memory for your teammates, and agents." Both
phrasings we gravitate toward are now a competitor's masthead. Using either
makes us read as the copy, regardless of who built first. Use it in a room if it
unlocks understanding; never in published copy or a headline.
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
