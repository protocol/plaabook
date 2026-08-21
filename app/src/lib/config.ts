// Versioned config reader (e.g. confidentiality_nudge_copy — editable without
// a deploy so Camille can revise wording).

import { query } from './db';

const TTL_MS = 60 * 1000;
const cache = new Map<string, { value: string | null; expires: number }>();

export async function getConfig(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const { rows } = await query<{ value: string }>('SELECT value FROM config WHERE key = $1', [key]);
  const value = rows[0]?.value ?? null;
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}
