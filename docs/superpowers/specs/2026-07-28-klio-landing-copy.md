# Klio Landing Copy — built on the category-of-one positioning

**Date:** 2026-07-28
**Positioning:** agents are workers → give them a workplace (not a better memory)
**ICP:** engineering teams (~10–50 devs) running multiple AI agents across vendors on a shared codebase
**Constraint:** copy + section order only. No colour/type/layout changes.

## Banned (owned by mem0 / Zep / Supermemory)
memory layer · local-first *(as a headline)* · open source *(as a headline)* · persistent/long-term memory · knowledge graph · stateful agents · "agents that remember" · recall *(as the product noun)*

## Section order — 3 moves

Current: Hero → **Proof** → Problem → SharedBrain → HowMemoryWorks → Tools → Reliability → Security → Compare → Cloud → Pricing → FAQ → CTA

Proposed: Hero → **Problem** → **SharedBrain** → **HowMemoryWorks** → Proof → Tools → Compare → Reliability → Security → Cloud → Pricing → FAQ → CTA

1. **Proof moves down.** Logos before the pain is stated is wasted — nobody cares who uses it until they recognise the problem.
2. **Problem → reframe → mechanism runs uninterrupted.** That's the persuasion spine; nothing should sit between those three.
3. **Reliability becomes an outcome section**, after the mechanism — not a co-equal pillar.

---

## HERO

**Eyebrow:** The vendor-neutral workplace for AI agents

**H1:** Your agents don't need better memories.
They need somewhere to work together.

**Sub:** Klio is a shared workplace for Claude Code, Cursor, Codex, and any MCP agent. One finishes, the next starts where it left off — no re-explaining, no contradictions, no paying twice for thinking that was already done.

**Primary CTA:** Start free · **Secondary:** `npx @klio-tech/klio@latest init`

**Footnote line:** Works with the agents you already use. Self-host it or let us run it.

> Note: "memory" deliberately does not appear. That word puts you on the crowded shelf.

---

## PROBLEM — the old way

**Eyebrow:** The old way

**H2:** Every agent keeps a private notebook.

**Body:** Every vendor built memory for its own agent, inside its own product. Your Claude context stays in Claude. Your editor's context stays in your editor. No vendor has any reason to hand your work to a competitor's agent.

So you become the integration layer:

- **You re-explain.** The same decisions, every session, to every tool.
- **They contradict each other.** One agent undoes what another just decided.
- **You pay twice.** Tokens and time burned re-examining work that was already done.

**Kicker:** The re-explaining is the symptom. Rework is the bill.

---

## SHARED BRAIN — the new way *(load-bearing section)*

**Eyebrow:** The new way

**H2:** Agents are workers. Give them a workplace.

**Body:** Work belongs to the job, not to the tool that happened to do it. In Klio an agent clocks into a shared, vendor-neutral workspace, takes what's relevant to the project, does the work, and leaves the result behind for whoever works next.

**Pull quote:** The next agent starts where the last one finished.

**Support line:** Klio sits between the vendors instead of inside one — so the workspace is the same whether the next shift is Claude Code, Cursor, or something you built yourself.

---

## HOW MEMORY WORKS → **The Handover Loop** *(load-bearing section)*

**Eyebrow:** The mechanism

**H2:** The Handover Loop

**Intro:** Six steps, every one of them running today.

1. **Clock in** — Any agent connects over MCP. Claude Code, Cursor, Codex, your own. No vendor owns the door.
2. **Capture** — Work is recorded as it happens. Secrets and personal data are stripped before anything is stored.
3. **File to the job** — Everything lands under a project or space. The job's knowledge stays with the job, instead of one global pile every agent has to wade through.
4. **Distil** — Raw activity becomes the handful of durable facts worth keeping, so the next agent inherits conclusions instead of transcripts.
5. **Retire** — When a newer decision contradicts an older one, the old one is superseded. Nobody acts on stale truth.
6. **Hand over** — The next agent picks up current state and keeps going. One agent writes; the next one to look already sees it. No sync step.

**Kicker:** Steps 4 and 5 are the ones a plain store can't do. Anyone can keep text. Almost nobody retires it when it stops being true.

---

## PROOF / TOOLS

**H2:** Connect any agent *(keep — it's on-message)*

**Sub:** Claude Code · Cursor · Codex · Claude Desktop · any MCP client. One command locally, or point a remote client at the endpoint.

---

## COMPARE

**H2:** How Klio compares

**Restructure the axis** from a vendor grid to old-way vs new-way rows — position against the approach, not the logo:

| | Private notebook | Shared workplace |
|---|---|---|
| Who the knowledge belongs to | the tool that made it | the job |
| Second agent, different vendor | starts cold | starts where the first finished |
| Contradicting decisions | both persist | older one retires |
| Raw activity | stored as-is | distilled into durable facts |
| Scope | one global pile | project / space |

---

## RELIABILITY — reframed as outcome

**Eyebrow:** What it's worth

**H2:** Why it matters

**Body:** Agents that share a workplace stop drifting apart. Decisions stay consistent across tools, work stops getting redone, and the token bill for re-establishing context goes away. Fewer contradictions is not a nice-to-have — it's the difference between agents that compound and agents that fight.

---

## SECURITY — keep as-is (already corrected, honest)

**H2:** Private by default

- **Self-hosted:** encrypted at rest under a key you hold — we never see it. Every write chained with SHA-256, so history is tamper-evident.
- **Klio Cloud:** encrypted in transit and at rest, secrets and personal data redacted before storage, every org isolated. The keys are ours, and Cloud writes are not hash-chained today.

---

## CLOUD

**H2:** Run it yourself, or let us run it.

**Body:** The engine is yours to self-host, free, forever. Or use Klio Cloud — hosted, magic-link sign-in, nothing to install.

---

## PRICING — unchanged (canonical `PLANS`)

Add one line above the table: **Priced on what your agents actually do — memories captured and recalls served.**

---

## FAQ — rewrite two entries

**"How is Klio different from mem0, Zep, or observability tools?"**
> They give one agent a better memory. Klio gives many agents a shared workplace. The difference shows up the moment a second agent — from a different vendor — needs to continue the first one's work.

**"What happens when two agents disagree?"**  *(new)*
> The newer decision wins and the older one is retired, so the next agent that looks sees current state rather than a pile of contradictions. Genuine conflict policies — auto-merge versus flag-for-review — are what we're building next.

---

## CLOSING CTA

**H2:** Give your agents somewhere to work together.

**Sub:** One command. Works with the agents you already use.

**CTA:** Start free · `npx @klio-tech/klio@latest init`

---

## Claims check

✅ No banned phrases · ✅ every mechanism step traces to shipped code · ✅ "real time" stated as availability, not push · ✅ encryption claims stay scoped to self-host · ✅ no fabricated metrics or customers

⚠️ **Missing:** a customer proof point. One team saying *"our agents stopped contradicting each other and our token spend dropped"* would carry more weight than any sentence here.
