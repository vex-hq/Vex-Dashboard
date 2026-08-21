# Klio: the coordination layer for concurrent agents — completion spec

**Date:** 2026-08-13
**Status:** Draft for review.
**Basis:** Code audit of `vex_private/vex_engine` (2026-08-13) against the
Mukta architecture (versioned memory workspace + out-of-band dreaming). The
audit found **~70% of the architecture built, 0% of the learning loop wired**.
This spec is the remaining 30%, plus the concurrency and enforcement layer
that makes Klio safe for many agents working at once.

**The sentence this spec exists to earn:**

> Your agents work in parallel without stepping on each other, and the system
> gets measurably better every week — and can show you the evidence.

---

## What exists already (do not rebuild)

Verified in code:

| Capability | Where |
| --- | --- |
| Scopes: org / project / private / agent | `capture.py:235`, migration 040 |
| Provenance: user, agent, session, timestamp | `shared/models.py:73-76` |
| Supersession (memories, artifacts, graph) | `memory.py`, `artifacts.py`, `graph_store.py` |
| Hybrid retrieval + compression | migration 037, `compression_cache.py` |
| In-band capture (events + transcript distillation, redacted) | `capture.py:603,686` |
| Out-of-band consolidation (curator: keyset cursor, batched) | `curator.py` |
| Graders: 6-check verification + confidence + 3-layer correction | `verification-engine/` |
| Async infra: workers, storage-worker (Postgres + S3), alerting | `services/` |

## The five builds

Ordered by dependency. 1 is the foundation everything else consumes.

---

### Build 1 — Evidence retention (the fuel)

**Problem:** `POST /capture/transcript` distils and discards. Dreaming's input
is transcripts + tool calls + outcomes; today that input is destroyed on
arrival. Every day unretained is unrecoverable.

**Build:**
- New table `session_traces`: `id, org_id, project_id, user_id, agent_id,
  session_id, started_at, ended_at, transcript_ref (S3), tool_calls_ref (S3),
  redaction_version, retention_class`.
- `capture_transcript` gains a persist step: after redaction, store the full
  redacted transcript + tool-call log to S3 via the existing `storage-worker`
  path, row in `session_traces`. Distillation continues unchanged.
- Redaction happens BEFORE storage (the existing `shared.redaction.redact`
  chokepoint), and `redaction_version` is recorded so a redaction bug can be
  scoped to affected traces.
- Retention: traces live under the org's plan retention (`plan_limits.py`);
  free-tier traces expire with the 30-day sweep. Traces are billing-exempt
  storage (internal fuel, not user-facing artifacts).

**Acceptance:** a session captured via the Stop hook produces a `session_traces`
row whose S3 object replays the full redacted transcript and every tool call.

---

### Build 2 — The outcome join (the signal)

**Problem:** Vex grades outputs; nothing links a verdict to the memories that
were in context when the output was produced. Without the join there is no
evidence, no dreaming, no "prove it" pitch.

**Build:**
- New table `recall_outcomes`: `id, org_id, recall_event_id (fk
  brain_recall_events), memory_ids uuid[], session_id, verdict
  (pass|flag|block|unknown), confidence numeric, graded_at, grader_version`.
- Every recall already logs to `brain_recall_events`; extend the row to record
  WHICH memory ids were served (today only the query is kept).
- New async-worker job `outcome_grader`: at session end, take the session's
  final outputs from the trace (Build 1), run the verification-engine pipeline,
  and write one `recall_outcomes` row per recall event in that session.
- Retroactive staleness: when a memory is superseded, mark every
  `recall_outcomes` row that served it after the fact-change as
  `served_stale = true`. This is the silent-failure counter no competitor has.

**Acceptance:** for any memory id you can answer: how many times was it
recalled, what verdicts followed, and how often was it served stale.

---

### Build 3 — Optimistic concurrency (the git move)

**Problem:** two agents writing the same belief race; last-writer-wins with the
curator mopping up later. Mukta's pattern: hash on read, check-and-set on
write, reload on mismatch — exactly how git prevents lost updates.

**Build:**
- Add `revision uuid` + `content_hash` (sha256 of canonicalised content) to
  `session_memories`. Every write bumps `revision`.
- Recall responses include `revision` per memory.
- Write tools (`remember`, `decide`, `note`, `observe`) accept optional
  `base_revision`. Semantics:
  - absent → today's behaviour (create; dedup path unchanged) — zero breakage
    for every existing client.
  - present and current → the write supersedes that revision atomically
    (`UPDATE ... WHERE id = :id AND revision = :base` guard; supersession
    machinery unchanged underneath).
  - present and stale → **409-style tool error** carrying the current content,
    revision, and who changed it: "this belief changed while you worked —
    re-read and re-assert." The agent retries from fresh state, which is
    Mukta's loop exactly.
- Conflict metric: `klio_write_conflicts_total` — this number is the sales
  demo for "your agents are stepping on each other."

**Acceptance:** two concurrent writers against the same revision — exactly one
wins, the loser gets the conflict payload, no row is lost, and the test proves
it with a real race (two sessions, barrier, commit).

---

### Build 4 — Claims (who is doing what)

**Problem:** parallel agents duplicate work because nothing records intent.
Biggest waste in multi-agent setups; nobody in the memory category has it.

**Build:**
- New table `work_claims`: `id, org_id, project_id, agent_id, user_id,
  description text, embedding vector(1024), created_at, expires_at,
  released_at`.
- New MCP tools:
  - `claim(description, ttl_minutes=15)` → registers intent, embeds it, and
    returns any live claim with cosine similarity ≥ 0.85 as a
    `possible_collision` warning (semantic, not exact-key — "auth refactor"
    collides with "fix login token expiry").
  - `release(claim_id)`; TTL + renew-on-activity handles crashed agents.
- **Injection, not politeness:** active project claims ride along on every
  `recall` and `capture/recall` response (same pattern as the visibility
  ladder). Agents already recall before working; they cannot not see claims.
- Honesty rule carried from the pressure-test: claims are **advisory
  awareness** on cloud, and only local `PreToolUse` hooks upgrade them to
  actual blocking. Never market them as mutual exclusion.

**Acceptance:** agent B claiming semantically-near work gets agent A's live
claim back in the same tool response; expiry frees it without any cleanup job.

---

### Build 5 — Dreaming (proposals, not edits)

**Problem:** the curator consolidates what was *said*; it cannot see what
*worked*, and it writes directly with no review. Mukta's dreaming analyses
many runs and produces evidence-backed **proposals**.

**Build (deliberately thin — the graders and the batch loop already exist):**
- New async-worker job `dreamer`, scheduled (nightly per org, or after N
  graded sessions). Inputs: `session_traces` (1), `recall_outcomes` (2),
  current memory + graph. Partitioned strictly per org — the permission
  boundary is the tenant boundary, no cross-org analysis ever.
- Detection pass (LLM over batches, curator-style budgets): recurring
  failures, memories with bad outcome ratios, stale-serves, missing knowledge
  (repeated questions with empty recalls), duplication.
- Output: rows in new table `memory_proposals`: `id, org_id, scope, kind
  (add|revise|retire), diff text, evidence jsonb (trace refs + prevalence +
  outcome stats), confidence, status (open|approved|rejected|auto)`.
- Routing by blast radius: agent/private scope may auto-apply; project and org
  scope require a human click in the dashboard (approval surface = a list +
  diff view + approve/reject; the existing dashboard stack).
- Approved proposals apply through the **Build 3** check-and-set path — the
  dreamer obeys the same concurrency rules as every other writer.

**Acceptance:** a seeded org with three sessions repeating the same tool
failure yields one open proposal citing those traces with prevalence ≥ 3, and
approving it supersedes the stale memory.

---

## Enforcement surface (ships alongside, from the earlier debate)

`npx klio init` — detects harness; Claude Code gets hooks (`SessionStart`
inject, `UserPromptSubmit` refresh, `PreToolUse` claim-check with block),
others get MCP config + rule-file fallback; custom agents get the two-line
base-URL/SDK snippet. Steal caveman's install safety: `settings.json.bak`,
JSONC-tolerant parse, validate-before-write, SHA-256 manifest. Local bridge
daemon (`~/.klio/bridge.sock`) is the performance ceiling — cache-warm
injection, offline recall — and ships after the hooks prove the loop.

## Sequencing and effort

| Phase | Builds | Why this order |
| --- | --- | --- |
| 1 (now) | **1 + 2** | Retention can't be backfilled; every un-instrumented day is lost moat. No UX risk. |
| 2 | **3 + 4** | The concurrency story — makes "multiple agents at once" true rather than aspirational. |
| 3 | **5** | Needs 1+2's data to have anything to dream about. |

Rough sizing: 1+2 ≈ small (plumbing over existing services); 3 ≈ medium
(schema + tool contract + race tests); 4 ≈ medium; 5 ≈ large (LLM job +
approval UI), but it is the one that produces the "take my credit card"
demo: *a proposal on screen saying "12 sessions hit this same failure — here
is the fix, here is the evidence, approve?"*

## Engine freeze note

Builds 1–5 all touch the engine, which is feature-frozen (2026-08-07). This
spec is the case for lifting the freeze deliberately: the freeze pointed
investment at surfaces while the category commoditised; the audit shows the
differentiating 30% is engine work. Decision needed, not assumed.

## Out of scope

- Building an agent runtime / Manus competitor (decided against, 2026-08-13).
- Connector sync (Slack/Gmail/Drive) — the competitors' moat, declined.
- Cross-org learning — explicitly excluded until legal/consent design exists.
- Markdown-file storage migration — Mukta prefers files; our substrate already
  delivers the same properties (readable content, versions, provenance) and a
  migration buys no user-visible value now.
