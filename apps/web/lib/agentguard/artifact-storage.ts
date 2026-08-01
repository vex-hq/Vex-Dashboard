import 'server-only';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Presigned reads of the Klio artifact bucket.
 *
 * WHY THE DASHBOARD SIGNS THESE ITSELF. The alternative was a REST endpoint on
 * the engine called with a service key — one place owning the signing. It was
 * rejected because the engine would then have to trust a `user_id` the
 * dashboard asserts over the wire, and a client-declared identity is the exact
 * thing the user-silo work exists to remove: `X-Vex-Agent` is not allowed to
 * name a person for precisely this reason, and a service-key call carrying
 * `user_id=<whoever>` is the same mistake with a different header. Entitlement
 * belongs where the identity is real, which is the session — and that only
 * exists here.
 *
 * What is duplicated by signing here is a stateless function of (bucket, key):
 * no business logic, no scope rules, nothing that can drift into a different
 * ANSWER than the engine's. What is NOT duplicated is the entitlement check,
 * which lives once, in SQL, in `artifact-download.loader`.
 *
 * THE CREDENTIAL MUST BE READ-ONLY AND ARTIFACT-SCOPED. The dashboard never
 * writes an artifact; a key that can only `GetObject` on this one bucket means
 * a dashboard compromise cannot delete or overwrite a customer's files, and
 * cannot touch the trace bucket at all. That separation is why these variables
 * are `KLIO_ARTIFACT_S3_*` and not the `AGENTGUARD_S3_*` pair the trace routes
 * use: sharing one credential would make the separation impossible to express.
 *
 * A presigned URL IS A BEARER CREDENTIAL — anyone holding it reads that object.
 * The TTL is the mitigation, it matches the engine's 900s, and these URLs must
 * never be logged.
 */

/** Matches the engine's `PRESIGN_TTL_SECONDS`. */
export const PRESIGN_TTL_SECONDS = 900;

export const DEFAULT_ARTIFACT_BUCKET = 'klio-artifacts';

/**
 * Cloudflare R2 requires the literal region `auto`; the engine pins it per
 * deployment for the same reason. Getting it wrong fails signature validation
 * on every URL.
 */
const DEFAULT_REGION = 'auto';

export class ArtifactStorageNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `Artifact downloads are not configured: missing ${missing.join(', ')}. ` +
        'Provision a READ-ONLY credential scoped to the artifact bucket.',
    );
    this.name = 'ArtifactStorageNotConfiguredError';
  }
}

function requireEnv(): {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const endpoint = process.env.KLIO_ARTIFACT_S3_ENDPOINT;
  const accessKeyId = process.env.KLIO_ARTIFACT_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY;

  const missing = [
    ['KLIO_ARTIFACT_S3_ENDPOINT', endpoint],
    ['KLIO_ARTIFACT_S3_ACCESS_KEY_ID', accessKeyId],
    ['KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY', secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);

  // Fail loudly and early. Falling back to an empty credential (as the older
  // trace route does) produces a URL that looks fine and 403s on click, which
  // reads to a user as "the file is gone".
  if (missing.length > 0) {
    throw new ArtifactStorageNotConfiguredError(missing);
  }

  return {
    endpoint: endpoint!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  };
}

/**
 * Split `s3://bucket/key` into its parts.
 *
 * The bucket is taken from the URI rather than from config when it is present:
 * the row records where the bytes were actually put, and a config drift must
 * not silently point a download at a different bucket that happens to hold an
 * object with the same key.
 */
export function parseStorageUri(
  storageUri: string,
): { bucket: string; key: string } | null {
  if (!storageUri.startsWith('s3://')) {
    return null;
  }

  const withoutScheme = storageUri.slice('s3://'.length);
  const separator = withoutScheme.indexOf('/');

  if (separator <= 0 || separator === withoutScheme.length - 1) {
    return null;
  }

  return {
    bucket: withoutScheme.slice(0, separator),
    key: withoutScheme.slice(separator + 1),
  };
}

/**
 * A `Content-Disposition` value that cannot be talked into anything else.
 *
 * The title is customer-supplied and ends up in a response header, so it is
 * reduced to a conservative character set rather than escaped: a quote or a
 * CRLF in a filename is header injection, and `attachment` is the part that
 * matters. The engine forces a bare `attachment` for the same reason — Klio
 * must never persuade a browser to RENDER an uploaded file.
 */
export function attachmentDisposition(title: string): string {
  const safe = title
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

  return safe.length > 0
    ? `attachment; filename="${safe}"`
    : 'attachment';
}

/**
 * Mint a short-lived download URL for one stored object.
 *
 * The response headers are forced onto the URL itself, exactly as the engine's
 * `presign_get` does: `attachment` plus an opaque content type, so a stored
 * HTML artifact cannot be served as a page.
 */
export async function presignArtifactGet(params: {
  bucket: string;
  key: string;
  disposition: string;
}): Promise<string> {
  const { endpoint, accessKeyId, secretAccessKey } = requireEnv();

  const client = new S3Client({
    endpoint,
    region: process.env.KLIO_ARTIFACT_S3_REGION ?? DEFAULT_REGION,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ResponseContentDisposition: params.disposition,
      ResponseContentType: 'application/octet-stream',
    }),
    { expiresIn: PRESIGN_TTL_SECONDS },
  );
}
