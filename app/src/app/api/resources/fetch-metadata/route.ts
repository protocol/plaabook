// F-1 paste-to-autofill: server-side OG-tag fetch. Any failure → 200 {ok:false},
// never 5xx — the form must stay usable with manual entry (AC-1.2).

import { requireMember } from '@/lib/auth';
import { normalizeUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;

function extract(html: string, url: URL) {
  const meta = (prop: string): string | null => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
      'i'
    );
    const m = html.match(re);
    return m ? (m[1] ?? m[2] ?? null) : null;
  };
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const decode = (s: string | null) =>
    s
      ? s
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : null;

  const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  let favicon: string | null = null;
  try {
    favicon = new URL(iconMatch ? iconMatch[1] : '/favicon.ico', url.origin).toString();
  } catch {
    favicon = null;
  }

  return {
    title: decode(meta('og:title')) || decode(titleTag ? titleTag[1] : null),
    description: decode(meta('og:description')) || decode(meta('description')),
    favicon,
  };
}

export async function POST(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false });
  }

  const normalized = body.url ? normalizeUrl(body.url) : null;
  if (!normalized) return Response.json({ ok: false });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(normalized, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PLAAbook-metadata/1.0', Accept: 'text/html' },
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) return Response.json({ ok: false });

    // Cap the read at 512KB.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks).toString('utf8');
    const parsed = extract(html, new URL(normalized));
    if (!parsed.title && !parsed.description) return Response.json({ ok: false });
    return Response.json({ ok: true, ...parsed });
  } catch {
    return Response.json({ ok: false });
  }
}
