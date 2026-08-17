/**
 * Cross-language test fixture for the WebSocket handshake token format.
 *
 * NOT A CREDENTIAL. `secret` below is a fixture value that exists only to
 * prove the TypeScript minter (`./ws-token.ts`) and the Python verifier
 * (engine repo, `services/dashboard-api/app/ws_auth.py`, `TEST_VECTOR`)
 * produce byte-for-byte identical tokens for the same input. It signs
 * nothing that runs in production; the real signing secret is supplied at
 * runtime only via `AGENTGUARD_WS_TOKEN_SECRET`.
 *
 * Both suites mint a token from `secret` / `orgId` / `exp` and assert its
 * signature against `signatureBytes`, so a change to encoding, padding,
 * separator or field order on either side goes red in CI instead of
 * reaching production as "the live charts stopped updating". Do not delete
 * this cross-language drift check, and keep this file's values identical to
 * the engine's `TEST_VECTOR`.
 *
 * `signatureBytes` is the HMAC-SHA256 digest as raw bytes rather than as its
 * base64url encoding. A 43-character base64url string is structurally
 * indistinguishable from a live secret and trips high-entropy-secret
 * scanners (this exact value was GitGuardian incident 36205184); an array of
 * small integers carries no such shape and reads unambiguously as test data,
 * while still pinning the exact same 32 bytes.
 *
 * This value lives in its own file, outside `ws-token.ts` (the
 * implementation module that is imported at runtime), so that its sole
 * purpose — supplying test data — is unambiguous, and so it can be named as
 * a narrow, explained exception in `.gitguardian.yaml` rather than requiring
 * a blanket test-file exclusion (real credentials do leak into test files).
 */
export const WS_TOKEN_TEST_VECTOR = {
  secret: 'test-secret-do-not-use', // pragma: allowlist secret
  orgId: '11111111-2222-3333-4444-555555555555',
  exp: 1_700_000_000,
  /**
   * HMAC-SHA256("test-secret-do-not-use",
   * "v1.MTExMTExMTEtMjIyMi0zMzMzLTQ0NDQtNTU1NTU1NTU1NTU1.1700000000"),
   * as raw bytes. Derived with Python's `hmac`/`hashlib`, not
   * hand-transcribed; see the mirrored comment in the engine's
   * `TEST_VECTOR`.
   */
  signatureBytes: [
    139, 18, 212, 255, 228, 226, 77, 220, 72, 110, 50, 226, 112, 228, 143,
    228, 251, 40, 91, 48, 122, 168, 243, 120, 211, 163, 8, 239, 40, 139, 150,
    175,
  ],
} as const;
