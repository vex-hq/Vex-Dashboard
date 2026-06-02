/**
 * Encode an `agent_id` for use in the catch-all route segment
 * `memory/agent/[...agentId]`. Each '/'-delimited part is percent-encoded
 * individually so the path keeps real '/' separators (which Next.js parses
 * into the catch-all `string[]`), while any in-part special chars are escaped.
 */
export function encodeAgentIdPath(agentId: string): string {
  return agentId.split('/').map(encodeURIComponent).join('/');
}

/**
 * Inverse of `encodeAgentIdPath`. Next.js gives the catch-all param as a
 * `string[]` of already-URL-decoded segments in most cases, but we call
 * `decodeURIComponent` defensively so the helper is correct whether or not the
 * runtime pre-decoded the segments, then rejoin with '/'.
 */
export function decodeAgentIdPath(segments: string[]): string {
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        // Malformed escape sequence — fall back to the raw segment.
        return segment;
      }
    })
    .join('/');
}
