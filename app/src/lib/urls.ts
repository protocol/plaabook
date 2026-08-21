// URL normalization + canonical hash for duplicate detection (F-1 AC-1.5).

import { createHash } from 'node:crypto';

/**
 * Normalize a URL for dedupe: lowercase host, strip fragment, strip utm_*
 * params, sort remaining query params, drop trailing slash, drop default ports.
 * Returns null for unparseable input.
 */
export function normalizeUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith('utm_'))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [k, v] of kept) url.searchParams.append(k, v);

  let out = url.toString();
  // strip trailing slash on the path (but keep bare origin canonical too)
  out = out.replace(/\/(\?|#|$)/, '$1');
  return out;
}

export function canonicalUrlHash(input: string): string | null {
  const normalized = normalizeUrl(input);
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}
