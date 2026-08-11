/**
 * Use cases — the canonical data for /use-cases and /use-cases/[slug].
 *
 * Every page renders from this file, so a use case is added or corrected in
 * exactly one place. Copy rules, inherited from the docs repo's AGENTS.md and
 * the pricing page:
 *
 * - Scenario voice ("your agent…"), never adoption claims we cannot back.
 * - Terminology: workplace / shared memory, supersede / retire. Not "brain",
 *   not "delete".
 * - No hype words. State the limitation in the same voice as the feature.
 * - The diagram is the product's real shape: something writes, Klio keeps it,
 *   something later reads it. A use case that cannot be drawn that way does
 *   not belong here.
 */

export type UseCaseGroup =
  | 'solo'
  | 'team'
  | 'beyond-coding'
  | 'trust';

export const GROUPS: Record<
  UseCaseGroup,
  { label: string; blurb: string }
> = {
  solo: {
    label: 'For one developer',
    blurb:
      'Free forever for one person. These work the day you install, with no teammates required.',
  },
  team: {
    label: 'For teams',
    blurb:
      'One shared workplace. What any teammate’s agent learns, every other agent can read.',
  },
  'beyond-coding': {
    label: 'Beyond coding agents',
    blurb:
      'Klio speaks MCP, so any agent can use it — support, research, assistants, or agents you ship to your own users.',
  },
  trust: {
    label: 'Memory you can audit',
    blurb:
      'Nothing is edited in place. Beliefs are superseded, never silently overwritten — so history stays a record.',
  },
};

export interface HandoverSpec {
  /** Who produces the memory. */
  left: { title: string; sub: string };
  /** The Klio verb(s) in the middle. */
  verbs: string[];
  /** What Klio keeps, in a few words. */
  memory: string;
  /** Who consumes it later. */
  right: { title: string; sub: string };
}

export interface UseCase {
  slug: string;
  group: UseCaseGroup;
  title: string;
  /** One sentence for cards and meta descriptions. */
  tagline: string;
  /** The situation without Klio. */
  problem: string;
  /** What happens with Klio in the loop. Each step is one sentence. */
  steps: string[];
  /** What is different afterwards. */
  outcome: string;
  diagram: HandoverSpec;
  /** A runnable-shaped example: the tool call an agent makes. */
  example: { tool: string; payload: Record<string, unknown> };
  related: string[];
}

export const USE_CASES: UseCase[] = [
  // ── For one developer ────────────────────────────────────────────
  {
    slug: 'cross-tool-continuity',
    group: 'solo',
    title: 'Cross-tool continuity',
    tagline:
      'Claude Code, Cursor and Codex share one memory, so a decision made in one is known to the rest.',
    problem:
      'Each coding tool keeps its own context. Decide something in Cursor, open Claude Code, and you are explaining it again — or worse, the second tool quietly contradicts the first.',
    steps: [
      'You settle a question in one tool, and its agent sets the decision down in Klio.',
      'You open a different tool on the same project.',
      'Its agent recalls the project before acting and starts from what was already decided.',
    ],
    outcome:
      'Your tools stop being silos. The decision travels with the project, not with the window you happened to make it in.',
    diagram: {
      left: { title: 'Cursor', sub: 'settles a decision' },
      verbs: ['decide'],
      memory: 'the decision, with rationale',
      right: { title: 'Claude Code', sub: 'recalls before acting' },
    },
    example: {
      tool: 'decide',
      payload: {
        content: 'API errors return RFC 7807 problem+json, not ad-hoc shapes.',
        rationale: 'Three handlers already do this; the rest should match.',
      },
    },
    related: ['session-pickup', 'already-tried-that'],
  },
  {
    slug: 'session-pickup',
    group: 'solo',
    title: 'Session-to-session pickup',
    tagline:
      'The 9am agent continues where the 6pm agent stopped, without you re-explaining the project.',
    problem:
      'Sessions end. The next one starts empty, and the first twenty minutes go to reconstructing what was decided, what was tried, and what was mid-flight.',
    steps: [
      'As you work, capture hooks record what happened; decisions and plans are set down explicitly.',
      'The session ends. Nothing else is required of you.',
      'The next session recalls the project and picks up the open plan instead of asking you to repeat it.',
    ],
    outcome:
      'Mornings start where evenings ended. The re-explaining tax is gone.',
    diagram: {
      left: { title: 'Yesterday, 6pm', sub: 'session ends mid-plan' },
      verbs: ['plan', 'observe'],
      memory: 'open plan, decisions, state',
      right: { title: 'Today, 9am', sub: 'recalls and continues' },
    },
    example: {
      tool: 'plan',
      payload: {
        content:
          'Migration 038 is applied; next: repoint the four quota tests at a metered plan, then push.',
      },
    },
    related: ['cross-tool-continuity', 'constraint-memory'],
  },
  {
    slug: 'already-tried-that',
    group: 'solo',
    title: '“We already tried that”',
    tagline:
      'An agent proposes an approach you rejected weeks ago — recall surfaces the rejection and the why.',
    problem:
      'Agents are confidently repetitive. Without a record of rejected approaches, every session is free to re-propose last month’s dead end, and you are the only thing standing in its way.',
    steps: [
      'When an approach is rejected, the agent records the rejection and the reason as a decision.',
      'Weeks later, another agent starts down the same path.',
      'Recall returns the rejection before code gets written, and the agent routes around it.',
    ],
    outcome:
      'Settled questions stay settled. You stop being the institutional memory for your own tools.',
    diagram: {
      left: { title: 'Agent, week 1', sub: 'rejects an approach' },
      verbs: ['decide'],
      memory: 'what was rejected, and why',
      right: { title: 'Agent, week 4', sub: 'recalls before proposing' },
    },
    example: {
      tool: 'decide',
      payload: {
        content: 'Do not use LISTEN/NOTIFY for cache invalidation.',
        rationale:
          'Our pooled Postgres endpoint drops session-level features; it failed in staging on 2026-08-04.',
      },
    },
    related: ['constraint-memory', 'decision-archaeology'],
  },
  {
    slug: 'constraint-memory',
    group: 'solo',
    title: 'Constraint memory',
    tagline:
      'Hard-won operational facts reach every future agent before it repeats the mistake.',
    problem:
      'The expensive lessons — the API that rate-limits at 100/min, the pooler that rejects startup parameters — live in the head of whoever got burned. Agents relearn them by failing.',
    steps: [
      'The moment a constraint is discovered, it is set down as a fact with the incident behind it.',
      'Any agent recalling the affected system gets the constraint alongside the code context.',
      'Exact-match search means pasting the error string finds the memory that names it.',
    ],
    outcome:
      'A lesson is paid for once. Every agent after that inherits it for free.',
    diagram: {
      left: { title: 'The incident', sub: 'a constraint discovered' },
      verbs: ['remember'],
      memory: 'the constraint, verbatim',
      right: { title: 'Every later agent', sub: 'recalls it before deploying' },
    },
    example: {
      tool: 'remember',
      payload: {
        content:
          'Neon’s pooled endpoint refuses libpq startup parameters — apply session settings with SET on connect.',
      },
    },
    related: ['already-tried-that', 'exact-recall'],
  },
  {
    slug: 'decision-archaeology',
    group: 'solo',
    title: 'Decision archaeology',
    tagline:
      'Not “what does the code do” but why it is this way, what was rejected, and when it changed.',
    problem:
      'Code answers what. It never answers why, what else was on the table, or when the answer changed. Git blame gives you a commit message if you are lucky.',
    steps: [
      'Decisions accumulate with rationale as you work — each one a dated, attributed record.',
      'When a decision is reversed, the old one is superseded by the new one, not erased.',
      'Ask an agent why something is the way it is, and explore walks the record: current belief, what it replaced, when.',
    ],
    outcome:
      'The project’s reasoning becomes queryable. New answers point back at the old ones they retired.',
    diagram: {
      left: { title: 'Months of work', sub: 'decisions, supersessions' },
      verbs: ['decide', 'supersede'],
      memory: 'the belief history, intact',
      right: { title: 'You, later', sub: 'asks “why is it like this?”' },
    },
    example: {
      tool: 'explore',
      payload: { entity: 'auth service' },
    },
    related: ['auditable-history', 'retiring-stale-truth'],
  },
  {
    slug: 'exact-recall',
    group: 'solo',
    title: 'Exact-identifier recall',
    tagline:
      'Paste a flag name, an error string or a commit hash — recall finds the memory that contains it.',
    problem:
      'Meaning-based search is weakest exactly where agents search most: rare literals. The one memory naming your error string loses to five memories that are merely about the same topic.',
    steps: [
      'Recall runs two searches at once — one over meaning, one over the exact wording.',
      'A rare literal matches the memory that contains it, adjacent and in order.',
      'A paraphrased question still works the way it always did.',
    ],
    outcome:
      'Your memory becomes greppable. Identifiers, hashes and error strings are first-class queries.',
    diagram: {
      left: { title: 'Past session', sub: 'named the flag once' },
      verbs: ['observe'],
      memory: 'KLIO_METRICS_TOKEN, in context',
      right: { title: 'You, now', sub: 'pastes the identifier' },
    },
    example: {
      tool: 'recall',
      payload: { query: 'unsupported startup parameter' },
    },
    related: ['constraint-memory', 'session-pickup'],
  },

  // ── For teams ────────────────────────────────────────────────────
  {
    slug: 'agent-handover',
    group: 'team',
    title: 'Handover across teammates',
    tagline:
      'Your agent finishes and sets down what it decided. Your teammate’s agent picks it up and keeps going.',
    problem:
      'Two people, two agents, one codebase — and the agents cannot see each other’s reasoning. Your teammate’s agent re-derives what yours settled this morning, or contradicts it.',
    steps: [
      'Your agent finishes a piece of work and records the decisions in the project’s shared memory.',
      'Your teammate starts on the next piece, in their own tool, under their own account.',
      'Their agent recalls the project and builds on your agent’s decisions instead of rediscovering them.',
    ],
    outcome:
      'The handover happens through the workplace, not through a Slack summary nobody wrote.',
    diagram: {
      left: { title: 'Your agent', sub: 'finishes, sets it down' },
      verbs: ['decide', 'share'],
      memory: 'project-scoped decisions',
      right: { title: 'Teammate’s agent', sub: 'picks it up, keeps going' },
    },
    example: {
      tool: 'share',
      payload: { memory_id: '60a0fa87-…', to: 'org' },
    },
    related: ['parallel-agents', 'onboarding-compression'],
  },
  {
    slug: 'onboarding-compression',
    group: 'team',
    title: 'Onboarding compression',
    tagline:
      'A new hire’s agent recalls months of decisions and constraints on day one.',
    problem:
      'New people learn a codebase by making its old mistakes. The context that would prevent that lives in departed teammates, closed PRs and channels nobody rereads.',
    steps: [
      'The team’s decisions, constraints and rejected approaches accumulate in shared memory as a side effect of working.',
      'A new teammate connects their agent to the project.',
      'Their first recall returns the settled decisions and live constraints — the parts of onboarding nobody ever writes down.',
    ],
    outcome:
      'Day one starts from the team’s current understanding, not from an archaeology project.',
    diagram: {
      left: { title: 'The team, over months', sub: 'decisions accumulate' },
      verbs: ['decide', 'remember'],
      memory: 'the project’s working knowledge',
      right: { title: 'New hire’s agent', sub: 'recalls it on day one' },
    },
    example: {
      tool: 'recall',
      payload: { query: 'how do we handle auth errors in the API?' },
    },
    related: ['agent-handover', 'decision-archaeology'],
  },
  {
    slug: 'parallel-agents',
    group: 'team',
    title: 'Parallel-agent coordination',
    tagline:
      'Subagent fleets and CI agents on one codebase share one project memory instead of colliding.',
    problem:
      'Fan out five agents and each one starts blind. Two solve the same problem differently, a third undoes a decision the first one made, and the merge is where you find out.',
    steps: [
      'Each agent works its own task and records decisions into the same project scope as it goes.',
      'A write is visible to the next agent that reads — no push, no coordination channel to build.',
      'Later agents recall before deciding, so earlier settlements constrain the fan-out.',
    ],
    outcome:
      'Parallel work converges instead of colliding, because the agents share a record instead of a hope.',
    diagram: {
      left: { title: 'Agent fleet', sub: 'five tasks in flight' },
      verbs: ['decide', 'recall'],
      memory: 'one project scope',
      right: { title: 'The same fleet', sub: 'reads before it writes' },
    },
    example: {
      tool: 'recall',
      payload: { query: 'error envelope shape', project: 'api-gateway' },
    },
    related: ['agent-handover', 'cross-project-intelligence'],
  },
  {
    slug: 'cross-project-intelligence',
    group: 'team',
    title: 'Cross-project patterns',
    tagline:
      'What a team learns in one project is recallable in the next, scoped so nothing leaks.',
    problem:
      'Teams solve the same problem in every repo. The ranking approach that worked in project A gets reinvented — worse — in project B, because the learning stayed behind.',
    steps: [
      'Durable, project-independent lessons are recorded at org scope; project-specific ones stay filed under their project.',
      'An agent in a new project recalls org-wide memory alongside the project’s own.',
      'The visibility ladder holds the line: private stays private, projects stay theirs, org is deliberate.',
    ],
    outcome:
      'The second project starts smarter than the first. Scope rules decide what travels, not luck.',
    diagram: {
      left: { title: 'Project A', sub: 'a pattern proves out' },
      verbs: ['note'],
      memory: 'org-scoped lesson',
      right: { title: 'Project B', sub: 'recalls it at the start' },
    },
    example: {
      tool: 'note',
      payload: {
        content:
          'For rank fusion across incomparable scores, use RRF — weighted blends drift as the corpus grows.',
        scope: 'org',
      },
    },
    related: ['parallel-agents', 'onboarding-compression'],
  },

  // ── Beyond coding agents ─────────────────────────────────────────
  {
    slug: 'support-ops-agents',
    group: 'beyond-coding',
    title: 'Support and ops agents',
    tagline:
      'An agent handling a customer or an incident recalls every prior decision about that account or system.',
    problem:
      'Support agents greet the tenth ticket from a customer like the first. Ops agents rediscover the workaround for a flaky system every time it pages.',
    steps: [
      'Each interaction records what was decided — the workaround applied, the exception granted, the root cause found.',
      'Klio is MCP-native, so the same memory works whatever the agent is built on.',
      'The next agent touching that account or system recalls its history before responding.',
    ],
    outcome:
      'Case knowledge compounds instead of evaporating with each session.',
    diagram: {
      left: { title: 'Incident agent, May', sub: 'finds the workaround' },
      verbs: ['decide'],
      memory: 'per-system case history',
      right: { title: 'Incident agent, August', sub: 'recalls it on page one' },
    },
    example: {
      tool: 'decide',
      payload: {
        content:
          'For ACME-Corp: gateway timeouts are their proxy, not us — confirmed 2026-07-12. Point them at their proxy logs first.',
      },
    },
    related: ['research-agents', 'constraint-memory'],
  },
  {
    slug: 'research-agents',
    group: 'beyond-coding',
    title: 'Research agents that accumulate',
    tagline:
      'Long-running research keeps its findings, dead ends and sources across runs — and across vendors.',
    problem:
      'A research agent’s findings die with its context window. The next run re-reads the same sources, repeats the same dead ends, and calls it progress.',
    steps: [
      'Each run sets down findings, sources and dead ends as it goes.',
      'The next run recalls before searching, so it extends the map instead of redrawing it.',
      'Because memory is vendor-neutral MCP, switching models does not reset the work.',
    ],
    outcome:
      'Research becomes cumulative. Ten runs build one body of knowledge instead of ten disposable ones.',
    diagram: {
      left: { title: 'Run 4', sub: 'rules out a source' },
      verbs: ['note'],
      memory: 'findings and dead ends',
      right: { title: 'Run 5', sub: 'starts past them' },
    },
    example: {
      tool: 'note',
      payload: {
        content:
          'The 2607.29377 baseline comparison is unnamed in the abstract — treat its 57.6% claim as unreplicated.',
      },
    },
    related: ['support-ops-agents', 'personal-continuity'],
  },
  {
    slug: 'personal-continuity',
    group: 'beyond-coding',
    title: 'Personal assistant continuity',
    tagline:
      'Preferences and standing decisions survive across every assistant surface you use.',
    problem:
      'Every assistant keeps its own model of you, and none of them share. Preferences repeat, standing instructions drift, and switching tools means starting over.',
    steps: [
      'Durable preferences and standing decisions are recorded once, in memory you control.',
      'Any MCP-connected assistant recalls them at the start of a session.',
      'When a preference changes, the old one is superseded — assistants stop acting on the stale version.',
    ],
    outcome:
      'You are explained once. The assistants adapt to the record instead of each keeping their own.',
    diagram: {
      left: { title: 'One assistant', sub: 'learns a preference' },
      verbs: ['remember'],
      memory: 'your standing decisions',
      right: { title: 'Every assistant', sub: 'recalls the same record' },
    },
    example: {
      tool: 'remember',
      payload: {
        content:
          'Status updates as short bullet lists with a one-line summary first — never prose walls.',
      },
    },
    related: ['cross-tool-continuity', 'retiring-stale-truth'],
  },
  {
    slug: 'embedded-memory',
    group: 'beyond-coding',
    title: 'Memory for agents you ship',
    tagline:
      'Give every end-user of your agent product their own isolated memory, without building the substrate.',
    problem:
      'If you ship an agent, your users expect it to remember them. Building that means scoping, retention, redaction and supersession — none of which is your product.',
    steps: [
      'Your agent writes and recalls through Klio’s MCP surface, one org per tenant.',
      'Each end-user’s memory is isolated by the same boundary that isolates every Klio org.',
      'Secret redaction, retention rules and supersession come with the substrate.',
    ],
    outcome:
      'Your agent remembers its users, and your roadmap stays pointed at your own product. This is the Platform lane — per end-user, and we set it up with you.',
    diagram: {
      left: { title: 'Your product’s agent', sub: 'serves your users' },
      verbs: ['remember', 'recall'],
      memory: 'isolated, per end-user',
      right: { title: 'The same agent', sub: 'remembers each user' },
    },
    example: {
      tool: 'recall',
      payload: { query: 'what did this user ask for last time?' },
    },
    related: ['personal-continuity', 'auditable-history'],
  },

  // ── Memory you can audit ─────────────────────────────────────────
  {
    slug: 'retiring-stale-truth',
    group: 'trust',
    title: 'Retiring stale truth',
    tagline:
      'When a newer decision contradicts an older one, the old one is retired — not silently kept, not erased.',
    problem:
      'Append-only memory rots: the store fills with contradictions and agents act on whichever surfaces first. Mutable memory is worse — the wrong belief simply replaces the right one, invisibly.',
    steps: [
      'A new fact arrives that overlaps an older one.',
      'The curator asks one narrow question: do these directly contradict, such that both cannot be true now?',
      'If yes, the old row is marked superseded by the new one. Recall stops returning it; the record keeps it.',
    ],
    outcome:
      'Agents act on current belief by default, and the retired belief is still there to consult. Anyone can keep text; retiring it is the hard part.',
    diagram: {
      left: { title: 'March', sub: '“we deploy on Fridays”' },
      verbs: ['supersede'],
      memory: 'old row retired, linked forward',
      right: { title: 'August', sub: 'recalls only the current rule' },
    },
    example: {
      tool: 'decide',
      payload: {
        content: 'No production deploys on Fridays.',
        rationale: 'Two of the last three Friday deploys paged the weekend.',
      },
    },
    related: ['auditable-history', 'decision-archaeology'],
  },
  {
    slug: 'auditable-history',
    group: 'trust',
    title: 'Auditable belief history',
    tagline:
      'What did the agent believe when it acted — and what has changed since? Answerable, because nothing is edited in place.',
    problem:
      'When an agent’s action is questioned, most memory systems can only show you what they believe now. The belief that actually drove the action is gone — overwritten by its successor.',
    steps: [
      'Every memory is a dated, attributed row; changes of mind are new rows pointing back at what they replaced.',
      'Provenance marks what was stated by a person versus inferred by a model.',
      'To reconstruct a moment, walk the supersession chain back to it.',
    ],
    outcome:
      'Reviews get evidence instead of recollection. The record shows the belief, its source, and its retirement — with dates.',
    diagram: {
      left: { title: 'The agent, then', sub: 'acts on belief v1' },
      verbs: ['observe', 'supersede'],
      memory: 'v1 → v2 → v3, all kept',
      right: { title: 'The review, later', sub: 'walks the chain back' },
    },
    example: {
      tool: 'explore',
      payload: { entity: 'deploy policy' },
    },
    related: ['retiring-stale-truth', 'embedded-memory'],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}

export function useCasesByGroup(group: UseCaseGroup): UseCase[] {
  return USE_CASES.filter((u) => u.group === group);
}

export const GROUP_ORDER: UseCaseGroup[] = [
  'solo',
  'team',
  'beyond-coding',
  'trust',
];
