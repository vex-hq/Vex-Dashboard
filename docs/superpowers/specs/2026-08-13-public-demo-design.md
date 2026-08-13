# Public demo — design

**Date:** 2026-08-13
**Status:** Approved in conversation. Ready for an implementation plan.
**Origin:** The 2026-08-12 BattleTime call. The screen-share demo failed for a
specific, repeatable reason — **every differentiating feature was shown
empty.** Activity was "not anything." Artifacts: "I don't have any artifacts
right now." Replaced: nothing. The one feature that proves the thesis had no
content in it, on a server slow enough to apologise for.

---

## Goal

A public page at **`klio.tech/demo`** where a visitor chats with an agent
backed by real Klio recall, and *watches the context being fetched*. No signup,
no call, no salesperson. It replaces the screen-share demo rather than
supplementing it.

**The success test:** a visitor who has never heard of Klio understands, within
30 seconds and without reading anything, why a Claude.md doesn't do this.

## Why a chat and not a video

The pitch is *"the context writes itself and comes back when needed."* A video
asserts that; a chat lets the visitor catch it happening to them. The write
moment (below) cannot be faked convincingly and cannot be experienced passively.

## The four moments

Ordered by how quickly they pay off. Each must work without the visitor being
told what to do.

### 1. Grounded answer — value in ~10 seconds

Visitor lands inside a seeded project with three suggested prompts. They ask
*"why did we pick X?"* and get a specific answer citing a dated decision with
its reasoning. The right-hand panel shows the facts that produced it, with
scores.

**The panel is the product.** Without it this is an ordinary chatbot. With it,
the visitor watches retrieval happen.

### 2. The A/B toggle — the single most important element on the page

A control: **With Klio / Without Klio**. Same question, both ways.

- *Without*: the model hedges generically — it has no project knowledge.
- *With*: specific, cited, dated.

This is the entire argument, delivered in ten seconds, requiring no trust and
no explanation. It is precisely the argument that failed to land in the call.
If only one moment ships, it is this one.

### 3. Supersession — what competitors cannot show

One seeded question whose answer changed. The response gives the current
belief, the belief it replaced, why it died, and when. The panel shows the
chain.

This is also the standing answer to *"won't automatic writing fill it with
garbage?"* — so it must be reachable from a suggested prompt, not only by luck.

### 4. The write loop — the thesis, made self-evident

The visitor mentions something durable in passing (*"we're on a two-week
sprint"*). The panel shows **remembered** — they never asked it to. Later in
the same conversation they ask about it and it comes back.

This is *"nobody updates it"* experienced rather than argued, and it is the
moment that converts. It is also the act that was never performed in the call.

## Architecture

```
browser ──► /api/demo/chat (Next route handler, server-only)
                 │  server-held KLIO_DEMO_API_KEY   ← never NEXT_PUBLIC
                 ├─► Klio engine: recall (shared demo project + visitor scope)
                 ├─► LLM via litellm.oppla.dev (cheap model, capped output)
                 └─► Klio engine: write (scope='agent', visitor's agent_id)
```

**Files:**
- Replace `apps/landing/app/demo/page.tsx` (currently Vex-era drift detection)
- Create `apps/landing/app/demo/_components/` — chat, recall panel, A/B toggle
- Create `apps/landing/app/api/demo/chat/route.ts` — the only network surface
- Create `apps/landing/app/demo/_lib/seed/` — the seeded corpus as data

**Visitor identity.** A random id in an httpOnly cookie (`klio_demo_visitor`,
24h). It is passed to the engine as `agent_id`.

**Why `agent_id` and not a new concept:** `scope='agent'` already exists and is
tested (`services/shared/shared/memory.py:1084`) — rows are visible only to the
agent that wrote them. A visitor's writes are therefore isolated by the
production code path, not by demo-specific logic. Recall returns the shared
demo project plus that visitor's own rows. **No engine change is required**,
which keeps this inside the 2026-08-07 engine freeze.

## Security

**The key must be server-side.** `apps/landing/app/live/_lib/verify-action.ts`
currently reads `NEXT_PUBLIC_VEX_DEMO_KEY` — `NEXT_PUBLIC_*` is inlined into the
client bundle, so that credential is being shipped to every browser. Do not
copy that pattern. Audit and rotate that key as part of this work.

**Anonymous visitors get no shared-scope writes.** Everything a visitor writes
is `scope='agent'` and expires with the demo org's retention. They cannot
modify the seeded corpus.

**Prompt injection.** Visitor text reaches an LLM with tool access. The demo
agent gets recall and agent-scoped write only — no org-scope write, no
artifacts, no project administration. Treat all visitor input as hostile.

## Abuse and cost control

Rate limiting today exists **only** on the OAuth path
(`services/mcp-server/app/oauth_middleware.py`). Recall has none. This page
needs its own, at the route handler:

- **Per IP:** 20 messages / 10 minutes
- **Per visitor session:** 30 messages, then a "start over" prompt
- **Per message:** capped output tokens; capped conversation history
- **Global:** a daily spend ceiling and an env kill switch
  (`DEMO_ENABLED=false`) that degrades the page to a recorded walkthrough
  rather than erroring

Expected cost is small — measured extraction is ~$0.0007/write and the chat
model is cheap — but the page is public and therefore unbounded. The ceiling
exists for the runaway case, not the normal one.

## Seeded content

A fictional engineering project, ~60–100 memories. Fictional rather than
Klio's own context: zero leak risk, and every demo moment can be guaranteed to
land instead of depending on what a visitor happens to ask.

**Project: "Harbor"** — a B2B logistics SaaS. Legible to any developer without
domain explanation.

Must contain:
- **Architecture decisions with reasoning** — the database, the queue, the auth
  model, the mobile framework. Each with *why*, not just *what*.
- **At least three rejected approaches** — "we tried X, it failed because Y."
  This is the material a repo cannot hold.
- **At least two supersession chains**, one of which is reachable from a
  suggested prompt. Example shape: *tenant isolation moved from Postgres RLS to
  application-layer scoping after connection-pooler problems at scale* — the
  old belief, the new one, the reason, the date.
- **Live constraints** — "must stay under 200ms p95", "no PII in logs."
- **Two or three artifacts** so the artifact surface is never empty.

**Hard rule: no screen in this demo may ever render empty.** That failure is
the reason this spec exists. Empty states must be impossible by construction,
not avoided by careful clicking.

## What happens to the existing pages

Both current demo routes are Vex-era and pitch a product we no longer sell.
Neither is in the sitemap or linked from nav, but both are live by URL.

- **`/demo`** — replaced by this page.
- **`/live`** — retire, and rotate the exposed demo key.

## Testing

1. **Visitor isolation** — visitor A writes; visitor B's recall never returns
   it. This is the load-bearing security test; if it fails, the page ships a
   cross-tenant leak.
2. **A/B honesty** — the "without Klio" arm must genuinely run without recall,
   not a canned weak answer. A staged failure would be a lie about our own
   product, and one visitor reading the network tab would find it.
3. **Supersession** — the seeded chain returns both the current and superseded
   belief with the reason.
4. **Write loop** — an unprompted durable statement is persisted and recalled
   later in the same session.
5. **Rate limits** — per-IP and per-session return 429 with a usable message.
6. **Kill switch** — `DEMO_ENABLED=false` degrades gracefully.
7. **No empty states** — every panel renders populated on a cold visit.
8. **No key in the bundle** — assert no Klio credential appears in client JS.

## Out of scope

- Letting visitors connect their own repo or agent (that is the signup flow).
- Persisting anything beyond the cookie TTL.
- The project context view — roadmap, tracked in `product-marketing.md`. This
  demo deliberately does not depend on it.
