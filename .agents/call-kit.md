# Klio call kit

*Last updated: 2026-08-13. Open this before the call, not during.*

> Reference lives in [`product-marketing.md`](./product-marketing.md). That doc
> is 200 lines and nobody reads it mid-conversation — which is how the
> 2026-08-12 call led with token savings (a thing the doc explicitly forbids)
> and never gave the objection answer (a thing the doc already contained).
> **This page is the operational one. It fits on a screen.**

---

## Before you share your screen

Ask these three. Do not open a browser until you have the answers.

1. **"When someone new joins a project, how long before they're actually useful?"**
2. **"How many agents are running across your team on a normal day?"**
3. **"When did an agent last redo something you'd already decided against?"**

**If all three come back soft** — onboarding is fine, one or two agents, no
repeated work — **it is a no.** Say so warmly and give them the 25 minutes back.
That is a better outcome than a 30-minute pitch ending in "I'll think about it."

**A soft answer to #3 with a hard answer to #2** is the best signal there is:
many agents, no shared context, and they haven't noticed the cost yet.

---

## The 40 seconds

When they say *"we use GitHub and a Claude.md"* — and they will:

> "Honest answer: GitHub works. It's not the wrong tool — it just has you in
> the loop.
>
> To keep Claude.md current, someone has to notice a decision changed, stop,
> edit the file, commit, push — and everyone else has to pull. Five deliberate
> acts, competing with shipping. So it doesn't happen, and the file drifts
> behind reality. That's not a discipline problem. The write path costs human
> attention.
>
> Klio's writes are a side effect. Your agent records the decision as it's
> made, because it's already there. Nobody has to remember.
>
> **Last month our own agents wrote about 31,000 memories. How many times did
> your team edit its Claude.md?"**

Then stop talking. They answer it themselves.

**Order is fixed: diagnosis → proof → expansion.**
Write path first. Supersession only when they ask about noise. Scope only when
the team or tool count makes it bite.

---

## Objections

| They say | You say |
| --- | --- |
| "Why doesn't GitHub work?" | The 40 seconds, above. Agree with the tool, indict the write path. |
| "Won't it fill with garbage?" | Contradictions supersede — old belief and the reason it died both stay readable. Show it. |
| "We're not spending much on tokens." | "Then that's not your reason to buy this." Drop it and move on. |
| "How do we stop someone wrecking it?" | Roles + private/project/org scope. Show the members UI. **Never say branches or PRs.** |
| "Isn't this Cursor rules / Claude memory?" | Per-tool silos. "You use Claude Code and Codex — what do those two share today?" |
| "Is this lock-in?" | AGPL engine, MCP-native, export. The knowledge survives any model change. |

---

## Do not say

- **Don't lead with token savings.** Especially after they've said cost isn't a
  problem. It reads as not listening, and it's not our argument.
- **Don't say branches, PRs, or merges.** Klio has scopes, roles and
  supersession. Promising git semantics we don't have gets checked.
- **Don't name Mem0 or Supermemory unprompted** — and never cite their funding
  rounds. Fundraising is not a buyer benefit; you're handing over a shopping
  list.
- **Don't apologise for the price.** "Only tens of dollars", "if it's worth $50
  and no more, that's fine" — this signals you don't believe in it, and a low
  price never fixes an unproven value case. It's $20/seat. Breakeven is 3
  seats. Say it flat.
- **Don't demo an empty screen.** No "I don't have any artifacts right now", no
  "this is a work in progress", no apologising for server speed. If it isn't
  populated and fast, send the demo link instead.
- **Don't run two products in one call.** Klio and the Moonforge skill are
  separate conversations with separate buyers.

---

## The close

Never end on *"give it some thought."* End on all three:

1. **The link** — the public demo. They can try it with nobody watching.
2. **The install** — five minutes, one MCP config block, their own repo.
3. **A date** — "Thursday, 15 minutes, you tell me if it's useful." Named day,
   in the calendar before the call ends.

If they won't take a date, you didn't clear the objection. Say what you think
the blocker is and ask directly whether that's it.

---

## What good looks like

The call is going well when **they** start describing a workflow you didn't
mention. In the 2026-08-12 call that happened once — *"if I forget the password
to your site, I can just open Claude Code and ask"* — and nobody picked it up.
When a buyer imagines the product out loud, stop pitching and follow them.
