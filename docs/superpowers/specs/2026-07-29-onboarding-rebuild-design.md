# Onboarding rebuild — design

**Status:** proposed, awaiting approval
**Date:** 2026-07-29
**Scope:** `apps/web/app/onboarding/**`, `lib/agentguard/onboarding.constants.ts`,
`lib/agentguard/mcp.constants.ts`, `public/locales/en/agentguard.json`

---

## Goal

Onboarding exists to **activate**, not to admit. A user who reaches the
dashboard having never seen a memory arrive has not been onboarded — they have
been let in.

So the flow drives to one moment: the user runs their own agent, watches the
first memory land, and is told they are done. Everything is arranged around
reaching that moment.

**Non-negotiable constraint:** guiding toward activation must never re-introduce
a gate. Every screen keeps a way out. Activation is the goal; admission is a
right.

---

## The five screens

```
0  What Klio is         →  the pitch, in Klio's words
1  Run it locally       →  key + one command, wires the local agents
2  Connect cloud agents →  OAuth, no key — ChatGPT, Claude.ai, any MCP client
3  Go use it            →  live wait, with instructions to actually go and chat
4  You're set           →  congratulate, then dashboard
```

---

## Why the current flow fails this

Read end to end on 2026-07-29.

### It sells the wrong product

The first sentence a new user reads is hardcoded in `step-welcome.tsx`:

> "Observe, detect, and auto-correct hallucinations and drift in real time —
> before your agent makes a mistake that can't be taken back."

That is Vex reliability. The identical string also sits unused in the locale
file as `welcomeDescription`, so the wrong copy exists twice.

Screen 4 (`step-install-sdk.tsx`, 14 KB) teaches the Vex SDK — `pip install
vex-sdk`, `@guard.watch(...)`, `VexBlockError`, confidence thresholds that block
output. Both packages publish, so nothing errors; it teaches the wrong product,
and it lands **immediately after** the screen that correctly connects Klio over
MCP. Its own subtitle: *"Two lines of code to add runtime reliability."*

Same framing in `step2Description` ("Ship reliable agents together"),
`step5Title` ("Go Live"), and orphaned `step1Description` ("monitor, verify, and
secure your AI agents").

### It never asks the user to actually use the product

The final screen polls for a connection while saying *"Listening for your first
event…"* — and never tells the user to go and do anything. The one action that
would activate them is the one thing the screen omits.

### Dead wiring

- `progress-indicator.tsx` is fully built and **never imported**. Six screens,
  no progress affordance.
- Nine orphaned locale keys, including `step1Title: "Name Your Workspace"` for a
  screen that does not exist.
- Locale numbering is off by one against wizard indices (`step3*` → screen 2,
  `step4*` → screen 4). Editing a key edits a different screen than its name
  implies.
- `step-invite-team.tsx` drops its back button (`onBack` destructured as
  `_onBack`).

---

## Screen specs

### 0 — What Klio is

Keep the mark animation. Replace the copy, and move it out of JSX into the
locale file so it is translatable and single-sourced.

- **Title:** `Welcome to Klio`
- **Body:**
  > One shared memory for every AI agent your team uses. What one learns, the
  > others know — so nobody re-explains the same decision to a second tool.
- **CTA:** `Get started`

### 1 — Run it locally

The CLI's cloud mode **prompts for an API key and verifies it** against
`CLOUD_VERIFY_URL` with the `X-Vex-Key` header. So the key and the command
belong on the same screen — a separate key step just makes the user carry it.

- **Title:** `Start on your machine`
- **Body:** `One command wires every AI coding agent on this machine to your shared memory.`
- **Key card:** auto-minted, copy button, "shown once" warning, Retry on failure
  *(already shipped)*.
- **Command card:**
  ```
  npx @klio-tech/klio@latest init
  ```
- **Note:** `Paste the key above when it asks. It detects and wires Claude Code, Claude Desktop, Cursor, Codex, OpenCode and OpenClaw.`
  *(That list is the CLI's actual adapter set — `src/adapters/`.)*
- **CTA:** `Continue` · secondary `Skip for now`

### 2 — Connect cloud agents

**This is the screen the current flow gets right, plus OAuth given its due.**

OAuth discovery is live in production — verified 2026-07-29:

```
GET https://mcp.klio.tech/.well-known/oauth-protected-resource → 200
{"resource":"https://mcp.klio.tech/mcp",
 "authorization_servers":["https://…supabase.co/auth/v1"],
 "bearer_methods_supported":["header"], "scopes_supported":["openid"]}
```

Any MCP client implementing the authorization spec connects with **no API key** —
the user signs in and approves. That covers ChatGPT connectors, Claude.ai custom
connectors, and anything else speaking the spec.

- **Title:** `Connect the agents that aren't on your machine`
- **Body:** `Anything that speaks MCP can join the same memory. Sign in and approve — no key to paste.`
- **Primary block — OAuth (lead with this):**
  - Connector URL: `https://mcp.klio.tech/mcp`
  - `In ChatGPT, Claude.ai, or any MCP client: add a custom connector, paste the URL, and approve access.`
- **Secondary block — API key header**, for clients that do not do OAuth:
  endpoint, `X-Vex-Key` header, config snippet *(existing copy, it is accurate)*.
- **CTA:** `Continue` · secondary `Back`

**Correction to make while here:** the comment in `mcp.constants.ts` claiming
consumer ChatGPT "cannot add an arbitrary remote MCP server" describes the
custom-header path only, and now reads as a blanket exclusion. It must be
rewritten to say header-auth is unavailable there but OAuth is the path.

### 3 — Go use it

The activation moment. The current screen waits silently; this one gives the
user a job.

- **Title:** `Try it now`
- **Body:**
  > Open Claude Code, Cursor, or any agent you just connected, and ask it
  > something about your work. We're watching for the first memory to arrive.
- **Waiting state:** `Waiting for your first memory…`
- **Arrived state:** agent id + what landed, as today.
- **Escape hatch:** `Skip for now — go to dashboard`, always enabled
  *(shipped this morning; must survive)*.

### 4 — You're set

- **Title:** `You're set`
- **Body:** `Everything your agents learn from here is shared. Any agent you connect can read it.`
- **CTA:** `Go to dashboard`

Reached automatically when a memory arrives on screen 3. If the user skipped,
they go straight to the dashboard and never see this screen — celebration
without an accomplishment is noise.

---

## Not shipped, and therefore not promised

The brief named **Notion and Jira** as ingestion sources. Those do not exist:

- No Notion or Jira connector anywhere in the engine (`services/`, `shared/`).
- The only integration in the dashboard is **Slack, and it is outbound** — alert
  rules posting to a channel, not ingestion.
- Notion and Jira are not MCP *clients*; they cannot connect to Klio the way
  ChatGPT and Claude.ai do. Feeding Klio from them requires Klio to **pull**,
  which is a connector feature that has not been built.

Naming them in onboarding would fail users at the worst possible moment. Screen
2 therefore promises MCP clients only — which is genuinely everything that
speaks MCP, and is a large claim honestly made.

If pull-based SaaS ingestion is the roadmap, it is its own project.

---

## What gets deleted

| File / key | Reason |
| --- | --- |
| `_components/step-install-sdk.tsx` | Teaches the Vex SDK. Screens 1–2 are the integration. |
| `_components/step-invite-team.tsx` | Duplicates `/members` (`InviteMembersDialogContainer`). Premature ask. |
| `sendInvitesAction` | Sole caller is the invite step — **see the security note below**. |
| Locale `step1*`, `step2*`, `step4*`, `stepOf`, `step3Copied`, `step3CopyKey`, `step5Executions`, `connectAgentsCopied` | Orphaned or belonging to deleted screens. |

`step-api-key.tsx` is **not** deleted — it becomes the key card on screen 1.
`progress-indicator.tsx` is **kept and finally wired**: five dots that mean
something.

---

## What must not break

**The escape hatch.** Every screen keeps a skip, and screen 3's finish stays
enabled regardless of connection state. Driving activation must not undo this
morning's fix.

**Resume for users mid-flow.** `accounts.onboarding_step` persists; anyone at
step 5 holds an index outside the new 0–4 range. The wizard already clamps
(`Math.min(Math.max(0, initialStep), FINAL_ONBOARDING_STEP)`), so they land on
the last screen and can leave. **No migration needed — but verify, don't
assume.**

**Security coverage must not silently shrink.** `sendInvitesAction` carries four
authorisation tests, including cross-tenant cases from the tenancy campaign.
Deleting the action deletes them. That is only acceptable if `/members` invites
run through Makerkit's own guarded path with equivalent membership enforcement —
**confirm before removing.** If it does not hold, the action stays and only the
screen goes.

---

## Out of scope

- **Brand discontinuity.** Dashboard is dark-only (Space Grotesk + Playfair);
  landing is cream paper (Fraunces + Martian Mono). Real, larger than onboarding.
- **Pull-based SaaS ingestion** (Notion, Jira). Own project.
- **Non-English locales.** Only `en` exists.

---

## Open decisions

1. **Does invite disappear entirely, or return as a post-activation nudge?**
   Recommendation: gone from onboarding; a nudge after the first memory lands is
   better and is separate work.
2. **Does the Vex SDK content survive anywhere?** It documents a real published
   SDK. Recommendation: the docs site, not a Klio user's first run.
3. **Screen 3 auto-advance timing.** Advance to screen 4 the instant a memory
   arrives, or hold ~2s so the user sees *what* landed? Recommendation: hold,
   showing the memory — the proof is the point.

---

## Test plan

- [ ] `tsc --noEmit` clean; full web suite passes (baseline 140)
- [ ] `server-actions.test.ts` updated for removed `sendInvitesAction`
- [ ] Fresh account walks 5 screens, key mints, reaches dashboard
- [ ] **Every screen exits without connecting anything**
- [ ] Resume with persisted `onboarding_step` 5 → lands on final screen, can exit
- [ ] Key-mint failure → Retry works, Continue still enabled
- [ ] OAuth discovery still 200 after deploy (`/.well-known/oauth-protected-resource`)
- [ ] Progress dots render and advance across five steps
- [ ] No orphaned locale keys; no referenced key missing
