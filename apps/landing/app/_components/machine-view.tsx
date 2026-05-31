import { FAQ, ORG, POSITIONING_SENTENCE } from '~/lib/site-meta';

/**
 * Machine view — the same URL, structured for LLM/agent ingestion. No
 * marketing prose or decoration: titled sections, key-value blocks, and
 * tables an agent can parse into clean facts. Served when ?view=machine or
 * a bot/agent User-Agent is detected (see lib/view-mode.ts).
 */
const IDENTITY: [string, string][] = [
  ['name', ORG.name],
  ['homepage', ORG.url],
  ['repo', 'https://github.com/klio-tech/klio'],
  ['license', 'AGPL-3.0-or-later (engine), Apache-2.0 (MCP shim)'],
  ['author', 'Abhishek Singh'],
  ['category', 'AI agent memory layer'],
  ['contact', ORG.contactEmail],
];

const HOW: string[] = [
  'Captures session activity over MCP + lightweight hooks.',
  'Stores memory encrypted under a user-owned key (Postgres + pgvector).',
  'Serves it back through MCP so agents recall before acting.',
  'Memory is scoped by org → project, shared across agents on that project.',
  'Cross-agent collaboration via Redis pub/sub.',
  'Cryptographically auditable via a SHA-256 hash chain.',
];

const TOOLS: [string, string][] = [
  ['recall', 'Retrieve relevant prior context before acting.'],
  ['remember', 'Persist a fact across sessions.'],
  ['observe', 'Log raw session activity.'],
  ['plan', 'Record a plan for the next agent to build on.'],
  ['decide', 'Capture a decision so it is not re-litigated.'],
  ['note', 'Store a durable note scoped to the project.'],
  ['space', 'Open or switch a scoped memory store.'],
];

const COMPARE: [string, string][] = [
  ['Cross-agent shared memory', 'Klio: yes · mem0/Zep/Supermemory: no'],
  ['Local-first', 'Klio: yes · mem0/Zep/Supermemory: no'],
  ['Encrypted under user-owned key', 'Klio: yes · others: no'],
  ['MCP-native', 'Klio: yes · others: no'],
  ['Open source', 'Klio: yes · Zep: yes · mem0/Supermemory: no'],
];

export function MachineView() {
  return (
    <article className="k-machine">
      <h1>Klio</h1>
      <p>
        <em>{POSITIONING_SENTENCE}</em>
      </p>

      <h2>Identity</h2>
      <div className="k-machine__kv">
        {IDENTITY.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>

      <h2>What it is</h2>
      <p>
        Klio is a memory layer for AI coding agents (Claude Code, Cursor,
        Codex, and any MCP client). It gives them persistent, shared memory —
        what one agent learns, the others know — so they stop forgetting,
        drifting, and contradicting earlier decisions. Memory is the cause;
        reliability is the effect.
      </p>

      <h2>How it works</h2>
      <ul>
        {HOW.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <h2>MCP tools</h2>
      <table>
        <thead>
          <tr>
            <th>tool</th>
            <th>purpose</th>
          </tr>
        </thead>
        <tbody>
          {TOOLS.map(([t, p]) => (
            <tr key={t}>
              <td>{t}</td>
              <td>{p}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Quick start</h2>
      <pre>{`npx @klio-tech/klio init   # wires Klio into your agent
# or self-host the engine:
git clone https://github.com/klio-tech/klio.git
cd klio && make first-run`}</pre>

      <h2>Compared to alternatives</h2>
      <table>
        <thead>
          <tr>
            <th>capability</th>
            <th>support</th>
          </tr>
        </thead>
        <tbody>
          {COMPARE.map(([c, s]) => (
            <tr key={c}>
              <td>{c}</td>
              <td>{s}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>FAQ</h2>
      {FAQ.map((f) => (
        <div key={f.question}>
          <h3>{f.question}</h3>
          <p>{f.answer}</p>
        </div>
      ))}

      <h2>Links</h2>
      <ul>
        <li>
          Docs: <a href="https://docs.klio.tech">https://docs.klio.tech</a>
        </li>
        <li>
          Repo:{' '}
          <a href="https://github.com/klio-tech/klio">
            https://github.com/klio-tech/klio
          </a>
        </li>
        <li>
          App: <a href="https://app.klio.tech">https://app.klio.tech</a>
        </li>
      </ul>
    </article>
  );
}
