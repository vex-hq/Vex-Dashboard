import { afterEach, describe, expect, it } from 'vitest';

import {
  ArtifactStorageNotConfiguredError,
  attachmentDisposition,
  parseStorageUri,
  presignArtifactGet,
} from './artifact-storage';

describe('parseStorageUri', () => {
  it('splits an s3 uri into bucket and key', () => {
    expect(parseStorageUri('s3://klio-artifacts/org-1/artifact-1/v3')).toEqual({
      bucket: 'klio-artifacts',
      key: 'org-1/artifact-1/v3',
    });
  });

  it('refuses anything that is not an s3 uri', () => {
    // A download must never be pointed at an arbitrary URL that happened to
    // land in the column.
    expect(parseStorageUri('https://evil.example/payload')).toBeNull();
    expect(parseStorageUri('file:///etc/passwd')).toBeNull();
    expect(parseStorageUri('s3://bucket-only')).toBeNull();
    expect(parseStorageUri('s3:///no-bucket')).toBeNull();
    expect(parseStorageUri('s3://bucket/')).toBeNull();
  });
});

describe('attachmentDisposition', () => {
  it('always forces an attachment', () => {
    expect(attachmentDisposition('report.pdf')).toBe(
      'attachment; filename="report.pdf"',
    );
  });

  it('cannot be talked out of the header by a hostile title', () => {
    const disposition = attachmentDisposition(
      'a"; filename="x\r\nSet-Cookie: hacked=1',
    );

    // The title is customer-supplied and lands in a response header. Quotes
    // and CRLF are header injection, so the value is reduced rather than
    // escaped.
    expect(disposition).not.toContain('\r');
    expect(disposition).not.toContain('\n');
    expect(disposition.match(/"/g)).toHaveLength(2);
    expect(disposition.startsWith('attachment; filename="')).toBe(true);
  });

  it('falls back to a bare attachment when nothing survives sanitising', () => {
    expect(attachmentDisposition('🙂🙂')).toBe('attachment');
    expect(attachmentDisposition('   ')).toBe('attachment');
  });

  it('bounds the filename length', () => {
    expect(attachmentDisposition('a'.repeat(500))).toBe(
      `attachment; filename="${'a'.repeat(100)}"`,
    );
  });
});

describe('presignArtifactGet', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses to sign when the artifact credential is not provisioned', async () => {
    delete process.env.KLIO_ARTIFACT_S3_ENDPOINT;
    delete process.env.KLIO_ARTIFACT_S3_ACCESS_KEY_ID;
    delete process.env.KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY;

    // An empty-credential fallback would mint a URL that looks fine and 403s
    // on click, which reads to a user as "the file is gone".
    await expect(
      presignArtifactGet({
        bucket: 'klio-artifacts',
        key: 'org/artifact/v1',
        disposition: 'attachment',
      }),
    ).rejects.toBeInstanceOf(ArtifactStorageNotConfiguredError);
  });

  it('names every missing variable so the failure is actionable', async () => {
    process.env.KLIO_ARTIFACT_S3_ENDPOINT = 'https://r2.example';
    delete process.env.KLIO_ARTIFACT_S3_ACCESS_KEY_ID;
    delete process.env.KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY;

    await expect(
      presignArtifactGet({
        bucket: 'klio-artifacts',
        key: 'org/artifact/v1',
        disposition: 'attachment',
      }),
    ).rejects.toThrow(
      /KLIO_ARTIFACT_S3_ACCESS_KEY_ID, KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY/,
    );
  });

  it('signs a URL that carries the attachment headers and a bounded TTL', async () => {
    process.env.KLIO_ARTIFACT_S3_ENDPOINT = 'https://r2.example';
    process.env.KLIO_ARTIFACT_S3_ACCESS_KEY_ID = 'test-key';
    process.env.KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY = 'test-secret'; // pragma: allowlist secret
    process.env.KLIO_ARTIFACT_S3_REGION = 'auto';

    const url = new URL(
      await presignArtifactGet({
        bucket: 'klio-artifacts',
        key: 'org-1/artifact-1/v1',
        disposition: 'attachment; filename="report.pdf"',
      }),
    );

    expect(url.pathname).toBe('/klio-artifacts/org-1/artifact-1/v1');
    expect(url.searchParams.get('response-content-disposition')).toBe(
      'attachment; filename="report.pdf"',
    );
    // Klio never executes an artifact, and a browser following this link must
    // not be talked into rendering someone's uploaded HTML on our origin.
    expect(url.searchParams.get('response-content-type')).toBe(
      'application/octet-stream',
    );
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    // SigV4, not SigV2 — R2 rejects the latter outright.
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
  });
});
