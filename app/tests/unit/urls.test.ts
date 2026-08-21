import { describe, it, expect } from 'vitest';
import { normalizeUrl, canonicalUrlHash } from '@/lib/urls';

describe('normalizeUrl', () => {
  it('strips utm_* params', () => {
    expect(normalizeUrl('https://example.com/a?utm_source=x&utm_medium=y&keep=1')).toBe(
      'https://example.com/a?keep=1'
    );
  });

  it('strips fragments', () => {
    expect(normalizeUrl('https://example.com/a#section-2')).toBe('https://example.com/a');
  });

  it('drops trailing slash on the path', () => {
    expect(normalizeUrl('https://example.com/a/')).toBe('https://example.com/a');
  });

  it('sorts query params so ordering does not defeat dedupe', () => {
    expect(normalizeUrl('https://example.com/a?b=2&a=1')).toBe(
      normalizeUrl('https://example.com/a?a=1&b=2')
    );
  });

  it('lowercases the host', () => {
    expect(normalizeUrl('https://EXAMPLE.com/Path')).toBe('https://example.com/Path');
  });

  it('returns null for unparseable or non-http input', () => {
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('ftp://example.com/x')).toBeNull();
  });
});

describe('canonicalUrlHash', () => {
  it('gives the same hash for equivalent URLs', () => {
    const a = canonicalUrlHash('https://Example.com/a/?utm_source=tw&b=2&a=1#frag');
    const b = canonicalUrlHash('https://example.com/a?a=1&b=2');
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it('is a sha256 hex digest', () => {
    expect(canonicalUrlHash('https://example.com')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns null for invalid input', () => {
    expect(canonicalUrlHash('nope')).toBeNull();
  });
});
