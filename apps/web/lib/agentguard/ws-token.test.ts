import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WS_TOKEN_TEST_VECTOR } from './ws-token.fixture';
import {
  WS_SUBPROTOCOL,
  WS_TOKEN_TTL_SECONDS,
  WsTokenSecretMissingError,
  getWsTokenSecret,
  issueWsToken,
  mintWsToken,
} from './ws-token';

// A literal chosen for this file, never deployed anywhere. The real signing
// secret lives only in AGENTGUARD_WS_TOKEN_SECRET.
const SECRET = 'unit-test-signing-secret'; // pragma: allowlist secret
const ORG = 'org-aaaa-1111';

describe('mintWsToken', () => {
  it('matches the engine test vector byte for byte', () => {
    // THE CROSS-LANGUAGE CONTRACT. The same fixed vector is asserted by
    // services/dashboard-api/tests/test_websocket.py against the Python
    // verifier. If either side changes its encoding, padding, separator or
    // field order, one of the two suites goes red — rather than the mismatch
    // shipping and surfacing as "the live charts stopped updating".
    const token = mintWsToken({
      orgId: WS_TOKEN_TEST_VECTOR.orgId,
      secret: WS_TOKEN_TEST_VECTOR.secret,
      expiresAt: WS_TOKEN_TEST_VECTOR.exp,
    });

    const [version, encodedOrgId, exp, signature] = token.split('.');

    // Version, org id and expiry are low-entropy and asserted as plain
    // values. Only the signature is pinned as bytes — see the fixture's
    // `signatureBytes` for why.
    expect(version).toBe('v1');
    expect(exp).toBe(String(WS_TOKEN_TEST_VECTOR.exp));
    expect(Buffer.from(encodedOrgId!, 'base64url').toString('utf8')).toBe(
      WS_TOKEN_TEST_VECTOR.orgId,
    );
    expect([...Buffer.from(signature!, 'base64url')]).toEqual([
      ...WS_TOKEN_TEST_VECTOR.signatureBytes,
    ]);
  });

  it('produces four dot-separated parts with the version first', () => {
    const parts = mintWsToken({
      orgId: ORG,
      secret: SECRET,
      expiresAt: 1_700_000_000,
    }).split('.');

    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
    expect(parts[2]).toBe('1700000000');
  });

  it('emits only characters legal in a Sec-WebSocket-Protocol value', () => {
    // The token travels as a subprotocol. RFC 7230 token characters only —
    // no '=', no '+', no '/'. Padded or standard base64 would break the
    // handshake outright, and it would break it in the browser, not in CI.
    const token = mintWsToken({
      orgId: 'org with spaces/and+slashes=',
      secret: SECRET,
      expiresAt: 1_700_000_000,
    });

    expect(token).toMatch(/^[A-Za-z0-9\-_.]+$/);
    expect(WS_SUBPROTOCOL).toMatch(/^[A-Za-z0-9\-_.]+$/);
  });

  it('gives different orgs different signatures under the same secret', () => {
    const a = mintWsToken({ orgId: 'org-a', secret: SECRET, expiresAt: 1 });
    const b = mintWsToken({ orgId: 'org-b', secret: SECRET, expiresAt: 1 });

    expect(a).not.toBe(b);
  });

  it('gives the same org different signatures under different secrets', () => {
    const a = mintWsToken({ orgId: ORG, secret: 'secret-one', expiresAt: 1 });
    const b = mintWsToken({ orgId: ORG, secret: 'secret-two', expiresAt: 1 });

    expect(a).not.toBe(b);
  });

  it('refuses to sign an empty org', () => {
    expect(() =>
      mintWsToken({ orgId: '', secret: SECRET, expiresAt: 1 }),
    ).toThrow();
  });

  it('refuses to sign with an empty secret', () => {
    expect(() => mintWsToken({ orgId: ORG, secret: '', expiresAt: 1 })).toThrow(
      WsTokenSecretMissingError,
    );
  });

  it('round-trips a non-ASCII org id through the encoding', () => {
    const orgId = 'org-ünïcode-🔒';
    const token = mintWsToken({ orgId, secret: SECRET, expiresAt: 1 });
    const decoded = Buffer.from(token.split('.')[1]!, 'base64url').toString(
      'utf8',
    );

    expect(decoded).toBe(orgId);
  });
});

describe('getWsTokenSecret', () => {
  const original = process.env.AGENTGUARD_WS_TOKEN_SECRET;

  beforeEach(() => {
    delete process.env.AGENTGUARD_WS_TOKEN_SECRET;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AGENTGUARD_WS_TOKEN_SECRET;
    } else {
      process.env.AGENTGUARD_WS_TOKEN_SECRET = original;
    }
  });

  it('throws rather than falling back to a default', () => {
    // A default secret here would be a signing key in a public repo, which is
    // the same as no authentication — and it would fail OPEN.
    expect(() => getWsTokenSecret()).toThrow(WsTokenSecretMissingError);
  });

  it('treats a blank secret as missing', () => {
    process.env.AGENTGUARD_WS_TOKEN_SECRET = '';

    expect(() => getWsTokenSecret()).toThrow(WsTokenSecretMissingError);
  });

  it('returns the configured value', () => {
    process.env.AGENTGUARD_WS_TOKEN_SECRET = SECRET;

    expect(getWsTokenSecret()).toBe(SECRET);
  });
});

describe('issueWsToken', () => {
  const original = process.env.AGENTGUARD_WS_TOKEN_SECRET;

  beforeEach(() => {
    process.env.AGENTGUARD_WS_TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AGENTGUARD_WS_TOKEN_SECRET;
    } else {
      process.env.AGENTGUARD_WS_TOKEN_SECRET = original;
    }
  });

  it('expires within the engine-enforced ceiling', () => {
    // The engine refuses a token claiming more than 15 minutes of life even
    // when the signature is valid. A TTL bump past that would mint tokens
    // that are rejected on arrival.
    const now = 1_700_000_000_000;
    const { expiresAt } = issueWsToken(ORG, now);

    expect(expiresAt).toBe(1_700_000_000 + WS_TOKEN_TTL_SECONDS);
    expect(WS_TOKEN_TTL_SECONDS).toBeLessThanOrEqual(15 * 60);
  });

  it('signs the org it was given and the expiry it reports', () => {
    const now = 1_700_000_000_000;
    const { token, expiresAt } = issueWsToken(ORG, now);

    expect(token).toBe(mintWsToken({ orgId: ORG, secret: SECRET, expiresAt }));
  });

  it('propagates a missing secret instead of minting an unsigned token', () => {
    delete process.env.AGENTGUARD_WS_TOKEN_SECRET;

    expect(() => issueWsToken(ORG)).toThrow(WsTokenSecretMissingError);
  });
});
