import { NextResponse } from 'next/server';

import { getLogger } from '@kit/shared/logger';

import { loadAccountViewer } from '~/home/[account]/_lib/server/account-viewer';
import { loadDownloadableArtifact } from '~/home/[account]/memory/_lib/server/artifact-download.loader';
import {
  ArtifactStorageNotConfiguredError,
  attachmentDisposition,
  parseStorageUri,
  presignArtifactGet,
} from '~/lib/agentguard/artifact-storage';
import { AccountMembershipError } from '~/lib/agentguard/require-account-membership';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

/**
 * GET /api/agentguard/artifacts/[account]/[memoryId]
 *
 * Downloads one artifact, as the signed-in user.
 *
 * THE ROUTE IS KEYED ON THE CARD, NOT THE ARTIFACT. `memoryId` is the
 * `session_memories` row with `memory_type = 'artifact'` — the row that
 * carries the scope and the owner. An `artifacts.id` has neither, so a route
 * keyed on one would have nothing to authorise against and every private
 * artifact would be one guessed uuid away from anybody in the org.
 *
 * Two gates, both in SQL, both upstream of anything being signed:
 *
 *  1. `resolveOrgId` asserts the caller is a member of the account. The slug
 *     arrives in the URL, so this is the tenancy gate — without it a member of
 *     org A could name org B's slug.
 *  2. `loadDownloadableArtifact` runs the visibility ladder over the card:
 *     private → owner only (org admins included, no override); project →
 *     members or an org admin; everything else → the org.
 *
 * EVERY REFUSAL IS A 404 with one message. "Not yours", "no such card", "not
 * an artifact" and "retracted" are indistinguishable from outside, so this
 * cannot be used to probe for the existence of somebody's private artifacts.
 *
 * The response is a 302 to a short-lived presigned URL. That URL is a bearer
 * credential and is never logged, and `Cache-Control: no-store` keeps the
 * redirect itself out of shared caches.
 */

const NOT_FOUND = { error: 'Artifact not found' };

function notFound() {
  return NextResponse.json(NOT_FOUND, {
    status: 404,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Next's `redirect()` signals itself by throwing an error carrying a
 * `NEXT_REDIRECT` digest. The session helpers this route depends on call it
 * when there is no session, which is right for a page and wrong here.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/**
 * An expired session must fail as a status, never as a redirect.
 *
 * The Download control is an `<a download>` link, and a browser does not
 * follow a sign-in bounce for a download — it saves whatever comes back. A
 * redirect therefore lands the sign-in page in the user's Downloads folder,
 * named after the memory id with an extension guessed from the content type,
 * as a file that will not open. That reads as "the artifact is corrupt" or
 * "the file is gone" when the truth is only "sign in again", which is the
 * same illegible failure the comment above `requireEnv()` in
 * `artifact-storage.ts` argues against for the older trace route.
 */
function unauthenticated() {
  return NextResponse.json(
    { error: 'Sign in to download this artifact' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account: string; memoryId: string }> },
) {
  const { account, memoryId } = await params;

  let orgId: string;
  let viewer: Awaited<ReturnType<typeof loadAccountViewer>>;

  try {
    [orgId, viewer] = await Promise.all([
      resolveOrgId(account),
      loadAccountViewer(account),
    ]);
  } catch (error) {
    if (error instanceof AccountMembershipError) {
      // Same 404 as everything else: whether this workspace exists is not
      // something a non-member gets to learn from a download URL.
      return notFound();
    }

    // No session. The helpers above redirect, which is correct for a page and
    // corrupt for a download; see `unauthenticated()`.
    if (isRedirectError(error)) {
      return unauthenticated();
    }

    throw error;
  }

  const artifact = await loadDownloadableArtifact(orgId, memoryId, {
    userId: viewer.userId,
    isOrgAdmin: viewer.isOrgAdmin,
  });

  if (!artifact) {
    return notFound();
  }

  const disposition = attachmentDisposition(artifact.title);

  // Small text artifacts never reached object storage; there is nothing to
  // presign, so the bytes are served straight back under the same headers.
  if (artifact.storageUri === null) {
    if (artifact.inlineText === null) {
      return notFound();
    }

    return new NextResponse(artifact.inlineText, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
        // The artifact is customer-supplied content served from our origin.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const location = parseStorageUri(artifact.storageUri);

  if (!location) {
    const logger = await getLogger();

    logger.error(
      {
        name: 'artifacts.download',
        orgId,
        artifactId: artifact.id,
      },
      'Artifact storage_uri is not an s3:// URI',
    );

    return NextResponse.json(
      { error: 'Artifact storage location is unreadable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const url = await presignArtifactGet({ ...location, disposition });

    const logger = await getLogger();

    // Deliberately records WHO downloaded WHAT, and deliberately not the URL.
    logger.info(
      {
        name: 'artifacts.download',
        orgId,
        artifactId: artifact.id,
        memoryId,
        actorUserId: viewer.userId,
      },
      'Artifact download presigned',
    );

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof ArtifactStorageNotConfiguredError) {
      const logger = await getLogger();

      logger.error({ name: 'artifacts.download', orgId }, error.message);

      return NextResponse.json(
        { error: 'Artifact downloads are not configured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    throw error;
  }
}
