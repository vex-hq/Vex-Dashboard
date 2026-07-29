import 'server-only';

import { Pool } from 'pg';

let pool: Pool | undefined;

/**
 * Returns a singleton PostgreSQL connection pool for querying AgentGuard's
 * TimescaleDB instance.  The pool is created lazily on first access and
 * reused across all server-side requests within the same process.
 */
export function getAgentGuardPool(): Pool {
  if (!pool) {
    const connectionString = process.env.AGENTGUARD_DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'AGENTGUARD_DATABASE_URL environment variable is not set. ' +
          'Please configure it in .env.development or your environment.',
      );
    }

    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      // Neon suspends idle endpoints; a cold resume routinely takes longer
      // than the old 5s budget, and blowing it turned the whole dashboard
      // into an error page for whoever arrived first after a quiet period.
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
    });
  }

  return pool;
}
