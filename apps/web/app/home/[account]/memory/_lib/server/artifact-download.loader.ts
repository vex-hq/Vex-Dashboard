import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  type MemoryViewer,
  loadMemoryDetailForViewer,
} from './memory-detail.loader';

/**
 * Resolving an artifact the viewer is ENTITLED to download.
 *
 * AN ARTIFACT'S VISIBILITY COMES FROM ITS CARD, NOT FROM THE ARTIFACT ROW.
 * `artifacts` has no `scope`, no `user_id` and no membership; the row that
 * governs who may see it is the `session_memories` card with
 * `memory_type = 'artifact'` and `metadata.artifact_id`. Anything that reads
 * `artifacts` by id alone is reading past the privacy boundary — every private
 * artifact in the org becomes downloadable by anyone who can guess a uuid.
 *
 * So the entitlement is not re-derived here. This module takes the id of the
 * CARD and hands it to `loadMemoryDetailForViewer`, which already enforces the
 * whole ladder in one SQL statement:
 *
 *   private  → only the owner. Org admins included: no override, ever.
 *   project  → project members only. No admin override, ever.
 *   anything → everyone in the org.
 *
 * That is deliberate reuse rather than a fourth copy of the predicate. A
 * separate `artifacts`-first query with its own CASE would be a second place
 * for the ladder to drift, and the download path is the worst possible place
 * for it to drift — a memory list that leaks shows a sentence, a download that
 * leaks hands over the file.
 *
 * The artifact row is fetched only AFTER the card has been authorised, and is
 * still constrained to the same `org_id`, so an artifact id colliding across
 * tenants cannot select another org's bytes.
 */

/** `artifacts.id` is a uuid column; anything else must not reach the query. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DownloadableArtifact {
  readonly id: string;
  readonly title: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  /** `s3://bucket/key`, or `null` for an artifact stored inline. */
  readonly storageUri: string | null;
  /** Present for small text artifacts, which never went to object storage. */
  readonly inlineText: string | null;
}

interface ArtifactQueryRow {
  id: string;
  title: string;
  mime_type: string | null;
  size_bytes: string | null;
  storage_uri: string | null;
  inline_text: string | null;
}

/**
 * The artifact behind one artifact card, or `null` when the viewer may not
 * have it.
 *
 * `null` covers every refusal — no such card, not yours, not an artifact card,
 * artifact retracted — so the route cannot be used to distinguish "this
 * private artifact exists and is not yours" from "this id is nothing". The
 * caller turns all of them into the same 404.
 *
 * @param memoryId - The CARD's id (`session_memories.id`), which is what the
 *   artifact cards already carry as `memory_id`. Deliberately not an
 *   `artifacts.id`: an artifact id has no owner and no scope, so a route keyed
 *   on one would have nothing to authorise against.
 */
export async function loadDownloadableArtifact(
  orgId: string,
  memoryId: string,
  viewer: MemoryViewer,
): Promise<DownloadableArtifact | null> {
  if (!UUID_RE.test(memoryId)) {
    return null;
  }

  const card = await loadMemoryDetailForViewer(orgId, memoryId, viewer);

  if (!card || card.memory_type !== 'artifact') {
    return null;
  }

  const artifactId = card.metadata?.artifact_id;

  if (typeof artifactId !== 'string' || !UUID_RE.test(artifactId)) {
    return null;
  }

  const pool = getAgentGuardPool();

  const result = await pool.query<ArtifactQueryRow>(
    `
    SELECT id, title, mime_type, size_bytes, storage_uri, inline_text
    FROM artifacts
    WHERE id = $1
      AND org_id = $2
      AND status = 'active'
    `,
    [artifactId, orgId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    storageUri: row.storage_uri,
    inlineText: row.inline_text,
  };
}
