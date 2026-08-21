// F-1 duplicate check (AC-1.5). Informational, never blocking.

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { canonicalUrlHash } from '@/lib/urls';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ existing: null });
  }

  const hash = body.url ? canonicalUrlHash(body.url) : null;
  if (!hash) return Response.json({ existing: null });

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'resources');
  const { rows } = await query<{
    id: string;
    title: string;
    submitter_display_name: string;
    created_at: Date;
  }>(
    `SELECT id, title, submitter_display_name, created_at
     FROM resources
     WHERE canonical_url_hash = $1 AND ${scope.sql}
     ORDER BY created_at ASC LIMIT 1`,
    [hash, ...scope.params]
  );

  const existing = rows[0]
    ? {
        id: rows[0].id,
        title: rows[0].title,
        submitterDisplayName: rows[0].submitter_display_name,
        createdAt: new Date(rows[0].created_at).toISOString(),
      }
    : null;

  return Response.json({ existing });
}
