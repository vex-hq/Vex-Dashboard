# Project membership — decision required

**Date:** 2026-08-12
**Status:** Open. Needs a ruling from Abhishek before the engine work is scheduled.
**Found by:** live diagnosis of app.klio.tech after connecting a new repo.

---

## The observation

The home screen's "What's moving" rail says *"No project activity in the last 7
days"* while the stream directly beside it shows project-tagged items written
seconds earlier. The rail is not broken in the ordinary sense: it is asking a
question that production data can never answer yes to.

Measured in production on 2026-08-12:

| Fact | Value |
| --- | --- |
| Rows in `project_members`, entire database | **1** |
| Projects with at least one member | **1** |
| `project`-scope memories, last 30 days | 12 |
| `private`-scope memories, last 30 days | 15,865 |
| `org`-scope memories, last 30 days | 14,533 |

Every project a user has ever seen in the product — `relio`, `moonforge-prod`,
`sunflower-land-api`, and the rest — has zero members.

## Why it happens

Two code paths, and only one of them writes membership.

1. **Implicit creation (the path everyone actually uses).**
   `services/shared/shared/brain.py:219` upserts a `projects` row from the
   client's git remote or repo root on write. It inserts the project and
   nothing else. The principal doing the writing is never enrolled.
2. **Explicit grant (the path nobody calls).**
   `services/shared/shared/projects.py:175` is the only `INSERT INTO
   project_members` in the engine, reached solely through the `project_grant`
   MCP tool. Its docstring is explicit that authorization is the caller's job —
   it is a storage primitive waiting for an operation that, in practice, no one
   invokes.

So membership is a first-class concept with a real table, a real role model, an
audit row, and a grant API — and an implicit creation path that bypasses all of
it. The dashboard then gates on membership correctly (that gate was added
deliberately in review, because without it the rail leaked the names and metrics
of projects the viewer had no relationship to), and the correct gate matches
nothing.

## Why this matters beyond one empty panel

- **The middle rung of the visibility ladder is dead.** org / project / private
  is the model; `project` scope holds 12 rows against ~30,000 in the other two.
  Agents are writing private-or-org because project scope has no working
  membership behind it.
- **The onboarding pitch depends on it.** "Join the project, read the brief,
  you're current" is the demo. Today there is no join, so there is no project to
  read a brief for — the context view works only because org admins bypass
  membership entirely.
- **Two adjacent widgets already disagree.** The usage strip lists every project
  in the org to every member (org-level by design, per spec); the rail lists
  none. Both are behaving as specified. The spec is what is inconsistent.

## The question

**What makes someone a member of a project?** The answer is a product decision,
not an implementation detail, because it determines who can see a project's name
and activity at all.

## Options

**A. Enrol the writer at creation time (engine change).**
When `brain.py` upserts a project, also grant the writing principal as its
first member. Correct and intuitive, and the only option that later supports
inviting a teammate who has not written anything yet — which is the actual
onboarding story. Two costs: it needs the engine freeze lifted, and it only
works when a *user* principal exists. OAuth (Bearer) writes resolve to a user;
API-key writes resolve to an org and an agent, and may have no user to enrol —
so key-only workspaces would still produce memberless projects.

**B. Derive membership from authorship.**
You are a member of a project if you have written to it. No migration, no engine
change, and it is retroactively true for every project that exists today. It
also matches how the product is actually used right now: one person, many
agents, many repos. The cost is that it is a change to the visibility ladder —
"participation implies membership" — and it cannot express an invitation, so it
solves the rail but not onboarding.

**C. A then B as a backfill.**
Enrol going forward, and backfill existing projects from authorship. Correct end
state, most work, and the backfill needs B's heuristic anyway.

**D. Accept that projects are not an isolation boundary.**
The published security model already says the org is the boundary nothing
crosses and that subdivisions below it are for relevance, not isolation
(`AGENTS.md`, accuracy rule 5). If that is the real contract, then gating
project *names* behind membership is stricter than what we document, and the
usage strip — which lists all org projects to all members — is the widget that
matches the docs. Item-level visibility would stay exactly as it is; only the
project listing opens up.

## Recommendation

**B now, A when the engine unfreezes**, and treat D as the question to settle
first, because it decides whether B is a loosening or simply the documented
behaviour. B makes the rail correct for real users today without touching the
engine; A is what makes invitations — and therefore the onboarding demo —
possible later. C is A plus a backfill that B's predicate gives you for free.

If D is ruled true, B costs nothing in policy terms and becomes the obvious
interim answer.

## What ships regardless

The dashboard now grants org admins the same project-listing bypass the project
detail page has always had (`fix/home-connection-signals`). That fixes the rail
for owners and admins today. It does **not** fix it for a non-admin teammate,
who will keep seeing an empty rail until this decision lands.

## Decision

> _To be filled in by Abhishek._

**Ruling:**

**Date:**
