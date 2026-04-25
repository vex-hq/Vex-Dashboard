import { describe, expect, it } from 'vitest';
import { GET } from '~/llms.txt/route';

describe('GET /llms.txt', () => {
  it('returns 200 with text/plain', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('body contains positioning sentence and plan names', async () => {
    const res = GET();
    const text = await res.text();
    expect(text).toContain('Vex helps founders');
    expect(text).toContain('Free');
    expect(text).toContain('Pro');
  });

  it('sets a public Cache-Control header', () => {
    const res = GET();
    const cc = res.headers.get('cache-control') ?? '';
    expect(cc).toMatch(/public/i);
  });
});
