# Onboarding rebuild — design

**Status:** proposed, awaiting approval
**Date:** 2026-07-29
**Scope:** `apps/web/app/onboarding/**`, `lib/agentguard/onboarding.constants.ts`, `public/locales/en/agentguard.json`

---

## Goal

Take a new user from signup to a connected agent in **three screens instead of
six**, and stop the flow selling a product they did not sign up for.

Success is a user who reaches the dashboard understanding that Klio is shared
memory their agents read and write — and who has either connected one or knows
exactly how to.

---

## Why

Evidence from reading the current flow end to end.

### 1. Half the flow sells Vex reliability, not Klio

The first sentence a new user reads is hardcoded in `step-welcome.tsx`:

> "Observe, detect, and auto-correct hallucinations and drift in real time —
> before your agent makes a mistake that can't be taken back."

That is the reliability product. The same string also sits unused in the locale
file as `welcomeDescription`, so the wrong copy exists twice.

Screen 4 (`step-install-sdk.tsx`, 14 KB) teaches the Vex SDK — `pip install
vex-sdk`, `from vex import Vex`, `@guard.watch(...)`, `VexBlockError`,
confidence thresholds that block output. Both packages publish, so nothing
errors; it simply teaches the wrong product. Its own subtitle reads *"Two lines
of code to add runtime reliability to your agent."*

It lands **immediately after** screen 3, which correctly connects Klio over MCP.
Screen 3 already *is* the integration. Screen 4 contradicts it.

Reliability framing also appears in `step2Description` ("Ship reliable agents
together"), `step5Title` ("Go Live"), and the orphaned `step1Description`
("monitor, verify, and secure your AI agents").

### 2. Six screens for a two-step job

The real path is: get a key → point an agent at MCP. Everything else is
optional and already lives in the product.

**Invite Your Team is screen 2** — naming colleagues before seeing anything
work. It also has no back button: `onBack` is destructured as `_onBack` and
dropped.

### 3. Dead wiring

- `progress-indicator.tsx` is fully built and **never imported**. Six screens
  with no progress affordance.
- Nine orphaned locale keys, including `step1Title: "Name Your Workspace"` for a
  screen that does not exist and `stepOf` for the dead indicator.
- Locale numbering is off by one against wizard indices: `step2*` → screen 1,
  `step3*` → screen 2, `step4*` → screen 4, `connectAgents*` → screen 3. Editing
  "step3Title" edits a different screen than the name implies.

### 4. Nothing being cut needs building

| Cut | Already exists |
| --- | --- |
| Invite Team | `/home/[account]/members` — `InviteMembersDialogContainer` |
| API key display | `/home/[account]/settings/api-keys` |
| Connect instructions | `memory/_components/agent-activity.tsx` empty state, already renders `KLIO_INIT_COMMAND` |

This is a deletion, not a construction.

---

## Proposed flow

```
0  Welcome        →  what Klio is, in Klio's words
1  Connect        →  key + the three connection paths, one screen
2  Confirm        →  live detection, always exitable
```

`TOTAL_ONBOARDING_STEPS` goes 6 → 3.

### Screen 0 — Welcome

Keep the existing mark animation. Replace the copy.

- **Title:** `Welcome to Klio` *(unchanged)*
- **Body:**
  > One shared memory for every AI agent your team uses. What one learns, the
  > others know — so nobody re-explains the same decision to a second tool.
- **CTA:** `Get started`

Body moves out of JSX into `welcomeDescription` so it is translatable and
single-sourced. This mirrors the landing hero's plain-language framing.

### Screen 1 — Connect

Screen 3 today is the only screen that is right. It absorbs the key.

**Layout:**
1. **Your API key** — auto-minted on mount, copy button, "shown once" warning.
   Failure state gets a Retry (already shipped) and never blocks Continue.
2. **Local coding agents** — `npx @klio-tech/klio@latest init` + copy.
3. **Any other MCP agent** — endpoint, `X-Vex-Key` header, client config block.
4. **Claude.ai custom connector** — connector URL + the Settings → Connectors
   steps.

Cards 2–4 keep their current copy and constants; they are accurate. The key card
is `step-api-key.tsx` reduced to a card.

- **Title:** `Connect your agents`
- **Subtitle:** `Wire up every agent you use over MCP — so what one learns, they all remember.` *(unchanged)*
- **CTA:** `Continue` · secondary `Back`

### Screen 2 — Confirm

`step-verify-connection.tsx` with reliability framing removed.

- **Title:** `You're set up` *(was "Go Live")*
- **Description:** `Run any connected agent and it will appear here.` *(was "Klio will detect it automatically")*
- **Waiting:** `Waiting for your first agent…` *(was "Listening for your first event...")*
- **Connected:** `Connected!` *(was "You're live!")*
- Buttons unchanged — the always-enabled finish shipped earlier today stays.

---

## What gets deleted

| File / key | Reason |
| --- | --- |
| `_components/step-install-sdk.tsx` | Teaches the Vex SDK. Screen 1 is the integration. |
| `_components/step-invite-team.tsx` | Duplicates `/members`. Premature ask. |
| `_components/step-api-key.tsx` | Absorbed into screen 1 as a card. |
| `sendInvitesAction` | Sole caller was the invite step. `/members` uses Makerkit's own path. |
| Locale: `step1*`, `step2*`, `step4*`, `stepOf`, `step3Copied`, `step3CopyKey`, `step5Executions`, `connectAgentsCopied` | Orphaned or belonging to deleted screens. |

`progress-indicator.tsx` is **kept and finally wired** into the wizard — three
dots now mean something.

---

## What must not break

**Resume for users mid-flow.** `accounts.onboarding_step` persists. Anyone
sitting at step 3–5 will hold an index outside the new 0–2 range. The wizard
already clamps (`Math.min(Math.max(0, initialStep), FINAL_ONBOARDING_STEP)`), so
they land on the final screen rather than a blank — acceptable, since that
screen now always lets them out. **No migration required**, but this must be
verified explicitly rather than assumed.

`UpdateStepSchema` bounds on `FINAL_ONBOARDING_STEP`, so a stale client posting
step 5 after deploy would be rejected. The wizard only posts steps it renders,
so this affects a tab left open across the deploy. Behaviour: the step write
fails, onboarding still completes. Acceptable; noted so it is not a surprise.

**Locale renumbering.** New keys are named for what they are
(`connectTitle`, `confirmTitle`) rather than `stepN*`, so the off-by-one cannot
recur.

**Security coverage must not silently shrink.** `sendInvitesAction` carries four
authorisation tests in `server-actions.test.ts`, including cross-tenant cases
added during the tenancy fix campaign. Deleting the action deletes those tests.
That is only acceptable because `/members` invites run through Makerkit's own
guarded path — **which must be confirmed to have equivalent membership
enforcement before the action is removed**, not assumed. If it does not, the
action stays and only the onboarding screen goes.

---

## Explicitly out of scope

- **Brand discontinuity.** The dashboard is dark-only (black, Space Grotesk +
  Playfair) while the landing is cream paper (Fraunces + Martian Mono). Real
  problem, much larger than onboarding, needs its own decision.
- **The dashboard itself.** Untouched.
- **Non-English locales.** Only `en` exists today.

---

## Open decisions

1. **Invite — drop entirely, or keep as a dismissible dashboard prompt?**
   Recommendation: drop from onboarding; `/members` already does it. A
   post-activation nudge is a separate piece of work worth doing once someone
   has felt the product.

2. **Does the Vex SDK step survive anywhere?** It documents a real, published
   SDK. Recommendation: delete from onboarding, and if the reliability product
   still needs it, it belongs in the docs site, not a Klio user's first run.

3. **Screen 0 body copy** — the wording above mirrors the landing hero the Phil
   test is validating. If that test moves the wording, this moves with it.

---

## Test plan

- [ ] `tsc --noEmit` clean
- [ ] Full web suite passes (baseline 140)
- [ ] `server-actions.test.ts` updated for the removed `sendInvitesAction`
- [ ] Fresh account: 3 screens, reaches dashboard, key mints
- [ ] Resume with a persisted `onboarding_step` of 4 and 5 — lands on the final
      screen and can exit
- [ ] Key-mint failure: Retry works, Continue still enabled
- [ ] Finish with no agent connected still enters the dashboard
- [ ] Progress dots render and advance
- [ ] No orphaned locale keys remain; no key referenced that does not exist
