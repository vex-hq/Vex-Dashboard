import Link from 'next/link';

import { Download, FileText } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { formatTimestamp } from '~/lib/agentguard/formatters';

import type { ArtifactCardRow } from '../_lib/server/memory-visibility.types';

/**
 * Artifact browser — cards, one per artifact, for whichever scope the calling
 * tab loaded.
 *
 * This component applies NO visibility rules of its own. It renders exactly
 * the rows it is handed, and each tab's loader has already restricted those
 * rows by the same scope predicate it uses for memories. Putting a filter here
 * would move a boundary out of SQL and into the view layer, which is the
 * pattern the user-silo design rules out.
 *
 * The download link is keyed on `memory_id`, NOT on `artifact.id`. The card
 * row is what carries the scope and the owner; an artifact id carries neither,
 * so a download route keyed on one would have nothing to authorise against.
 * The route re-checks entitlement server-side regardless of what this
 * component renders — a link is a suggestion, not a permission.
 */
function formatBytes(size: number | null): string | null {
  if (size === null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArtifactCards({
  artifacts,
  accountSlug,
}: {
  artifacts: ArtifactCardRow[];
  accountSlug: string;
}) {
  if (artifacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.noArtifacts" />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {artifacts.map((artifact) => {
        const size = formatBytes(artifact.size_bytes);

        return (
          <Card key={artifact.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <CardTitle className="flex items-start gap-2 text-sm leading-snug">
                <FileText
                  className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="break-words">{artifact.title}</span>
              </CardTitle>

              {artifact.kind ? (
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {artifact.kind}
                </Badge>
              ) : null}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-muted-foreground line-clamp-3 text-sm">
                {artifact.summary ?? '—'}
              </p>

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {artifact.mime_type ? <span>{artifact.mime_type}</span> : null}
                {size ? <span>{size}</span> : null}
                <span>{formatTimestamp(artifact.created_at)}</span>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href={`/api/agentguard/artifacts/${accountSlug}/${artifact.memory_id}`}
                  className="text-primary inline-flex items-center gap-1.5 text-xs hover:underline"
                  // A plain anchor, not a client fetch: the route answers with
                  // a 302 to a presigned URL, and the browser following it is
                  // the download. Large files therefore stream straight from
                  // object storage instead of through a blob in memory.
                  //
                  // NO `download` ATTRIBUTE, deliberately. It does nothing on
                  // the happy path — the browser ignores it on a cross-origin
                  // response, and both branches already send their own
                  // `Content-Disposition: attachment` (ours for inline text,
                  // `ResponseContentDisposition` on the presign for the rest).
                  // What it DID do was make every error path save a file: with
                  // `download` set the browser writes whatever comes back, so a
                  // 401, 404 or 503 body landed in the user's Downloads folder
                  // as an unopenable file named after the memory id. Without
                  // it, a refusal renders as a page the user can actually read.
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <Trans i18nKey="agentguard:memory.artifactDownload" />
                </a>

                <Link
                  href={`/home/${accountSlug}/memory/${artifact.memory_id}`}
                  className="text-muted-foreground text-xs hover:underline"
                >
                  <Trans i18nKey="agentguard:memory.artifactOpen" />
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
