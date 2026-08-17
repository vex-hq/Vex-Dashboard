# Context surfaces — implementation report

**Date:** 2026-08-17
**Spec:** `2026-08-17-context-surfaces-addendum.md`, extending
`2026-08-11-context-workspace-design.md`
**Branch:** `feat/context-surfaces`
**Scope:** `apps/web` only. No engine change, no migration.

---

## What shipped

### 1. Shared vs private split — `/home/[account]/context`

Two labelled groups, **Shared with your team** and **Only you**, each with its
own total. Two loaders, two predicates, two queries — never one parameterised
query:

- `context/_lib/server/shared-context.loader.ts` — `scope = 'org'` hard-coded.
  Reads no private row, by construction.
- `context/_lib/server/my-private-context.loader.ts` — `scope = 'private' AND
  user_id = <signed-in caller>`, hard-coded, with a fail-closed assertion on a
  blank user id. No admin variant, no "as user" parameter.

The duplication between them is the safety property, per
`memory/_lib/server/private-memory.loader.ts`'s header. `context-surfaces.types.ts`
shares types only — no query helpers, no predicate builder.

The peek pane offers **Share with the team** on a private row the viewer owns,
and **Make private again** on a share the viewer themselves made. Anything else
gets no control at all.

### 2. Proposals — `/home/[account]/proposals`

`proposals/_lib/server/proposals.loader.ts` lists `status = 'open'` rows,
org-scoped, backed by the same `ix_memory_proposals_org_status` index the
engine's own `GET /proposals` uses. Each card renders its `diff`, its
`proposed_content` where present, and **every key of its `evidence` jsonb
inline** — a link to evidence is a different, worse product.

Empty is the normal state and reads as it: *"Nothing needs your attention"*,
with an explanation of what would put something there. A test asserts that copy
and fails on the words `error`, `failed`, `unavailable`, `broken`.

### 3. Per-item evidence

`context/_lib/server/item-evidence.loader.ts` returns, for one memory the
viewer is allowed to read:

- **recalled n** — `brain_recall_events` rows whose `memory_ids` array contains
  the id (migration 042).
- **used n** / **served-stale n** — `recall_outcomes` filtered on `used` and
  `served_stale`.
- the supersession chain as a **two-node chain**: what this replaced, what
  replaced it. That chain is the only graph here.

The ladder runs FIRST, in SQL, as a join condition — a count is a disclosure,
so evidence about a row the asker may not read returns `null`, indistinguishable
from an id that was never issued. The chain re-applies the ladder to each
neighbour, because a chain can cross scope.

**No verdict, no per-outcome agent attribution.** `recall_outcomes` carries
`used`, `usage_score` and `served_stale` and nothing else, so the pane says
"Recalled", "Used by an agent" and "Served after it was replaced". `usage_score`
is deliberately not surfaced: a nullable numeric with no documented scale is a
number on screen making a claim the schema does not support. A standing test
reads the rendered evidence pane as text and fails on `verdict`, `passed`,
`failed`, `graded`, `score`, and agent-naming phrasings.

### 4. Project sections

The `decision → Decisions`, `plan → Plans`, `fact → Constraints` mapping already
exists in `projects/[projectId]/_lib/server/context-view.loader.ts` and is
unchanged. What this change adds is the honesty the addendum asks for: the empty
state now says plainly that existing rows are not reclassified, rather than
implying the project never decided anything.

## What I could not build, and why

**Approve does not apply `add` or `revise` proposals.**

The dashboard has no way to call the engine over HTTP. `app.proposals`
authenticates with `X-Vex-Key` or an OAuth principal; API keys are stored as
SHA-256 hashes and are unrecoverable by design, there is no internal/service
token anywhere in the engine, and no engine base URL is configured in
`apps/web`. Every existing dashboard write (project grants, for instance) goes
straight to the engine database, so these do too — as ports of the engine's own
code, guard for guard.

That works for `retire` and for `reject`, which are pure SQL. It does not work
for `add` and `revise`: both write memory CONTENT, and in the engine that means
redaction plus an embedding before the CAS guard runs
(`_prepare_cas_write`). Reproducing that here would mean a second write path
with its own redaction and its own embedding, drifting from the engine's, storing
rows recall cannot rank.

So those two kinds are **refused before the claim is taken** — the proposal stays
`open` and reviewable — and the card disables Approve with copy that says why:
*"This one writes new memory content, so it has to be approved from an agent —
the dashboard does not write content. Rejecting it here still works."* A
disabled button that explains itself beats a button that fails on click.

Closing this properly needs an engine-side path the dashboard can authenticate
to. That is an engine change and was out of scope here.

**The reverse of a share has no engine counterpart.** `shared/promotion.py` is
one-way. The addendum requires reversibility, so `demoteMemory` is written as the
exact mirror of the promote UPDATE with one extra guard: it will only pull back a
row whose `metadata->>'shared_by'` names the caller. A row somebody else shared,
or one that was born org-scoped, is not this viewer's to withdraw.

**Browser verification did not happen.** `pnpm build` compiles successfully but
cannot complete page-data collection in this checkout: `/robots.txt` and `/join`
fail on missing `NEXT_PUBLIC_SITE_URL` and `EMAIL_SENDER`. Verified pre-existing
by running the same build at the base commit — same failures, same untouched
routes. Compilation of every new route succeeded.

## Engine paths called

| Action | Engine original | How it is reached |
| --- | --- | --- |
| Share | `shared/promotion.py::promote_memory` (MCP `share`) | ported verbatim to `lib/agentguard/memory-promotion.ts::promoteMemory`, same guards, same refusal codes |
| Un-share | *(none — one-way in the engine)* | `demoteMemory`, mirror of the above plus a `shared_by = caller` guard |
| Approve `retire` | `app/proposals.py::approve_proposal` → `shared/memory.py::retract_memory` | ported to `lib/agentguard/proposal-decisions.ts`: claim-before-apply, `_authorize_scoped_action` ladder, revert-on-failure |
| Approve `add`/`revise` | `write_scoped_memory` / `supersede_with_revision` | **not called** — refused with `engine_required`, see above |
| Reject | `app/proposals.py::reject_proposal` | ported: same CAS claim, same `decided_by` attribution |

## Tests

**556 passing, 66 files** (baseline on this branch's parent: 495 / 61). Nothing
dropped; +61 new.

### Adversarial visibility — and proof they fail under mutation

`context/_lib/server/context-visibility.integration.test.ts` runs against a real
Postgres (PGlite, in-process) because the thing under test is a SQL predicate. A
mocked `pool.query` would prove the TypeScript mapping and nothing else. Every
"must not appear" case carries a distinctive literal and is paired with a
positive control proving the fixture IS findable by its owner.

Each mutation was applied, the suite run, and the mutation reverted:

| Mutation | Result |
| --- | --- |
| `my-private-context.loader` drops `AND m.user_id = $2` | 3 failed / 11 passed |
| `shared-context.loader` widened to `scope = ANY(ARRAY[$2,'private'])` | 2 failed / 12 passed |
| `item-evidence.loader` private arm → `TRUE` | 1 failed / 13 passed |
| `proposals.loader` drops org + status filter | 2 failed / 12 passed |
| `promoteMemory` UPDATE drops `AND user_id = $4` | 9 failed / 14 passed |
| `claimProposal` drops `AND status = 'open'` | 1 failed / 11 passed |

That last one is worth a note. The first version of the CAS test was sequential
and passed *with the guard deleted*, because the pre-flight status read already
caught the replay. A concurrent-decider test was added — both callers read `open`
before either writes — and only that one actually fails without the guard. The
sequential case tested the wrong thing and would have shipped a green suite over
a broken guard.

A related near-miss: PGlite reports write counts as `affectedRows` while `pg`
reports `rowCount`. The first mock passed PGlite's result straight through, so
every `rowCount === 0` guard evaluated `undefined === 0` and silently passed
whether or not it matched a row. The mock now translates.

### Empty states

- no proposals → asserts *"Nothing needs your attention"* and the explanation,
  and fails on failure language.
- org with nothing shared → asserts *"Nothing shared yet"* and what sharing is
  for.
- viewer with no private context → asserts the reassuring line.
- project with no decisions → asserts the not-reclassified explanation, and that
  it disappears once decisions exist.

### Evidence rendering

With recalls and stale serves (274 / 3 / 14), and without (0 / 0 / 0, plus the
"no agent has been served this yet" line). Chain rendered with both nodes, and
omitted entirely when there is none. Plus the no-fiction copy guard.

## Explicitly not built

Per the spec, and for the reasons it gives: no knowledge graph, no standalone
traces or outcomes pages, no charts, no claims surface.

## Checks

- `pnpm typecheck` — clean.
- `pnpm lint` (`apps/web`) — clean. `apps/landing` has pre-existing errors in
  `app/variants/`, untracked work from another session and untouched here.
- `pnpm vitest run` — 556 passed, 66 files.
