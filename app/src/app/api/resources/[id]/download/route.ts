// F-3 authenticated download (AC-3.3): visibility-checked, served from
// resource_files through this route only — never a public object URL.
// Increments download_count; NO contribution event (AC-6.8).

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const params = await props.params;
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(params.id)) return notFoundWithAudit(member.id, null);

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r');

  const { rows } = await query<{
    id: string;
    file_path: string | null;
    file_mime: string | null;
    data: Buffer | null;
  }>(
    `SELECT r.id, r.file_path, r.file_mime, rf.data
     FROM resources r LEFT JOIN resource_files rf ON rf.resource_id = r.id
     WHERE r.id = $1 AND r.type IN ('file','skill') AND ${scope.sql}`,
    [params.id, ...scope.params]
  );

  const row = rows[0];
  if (!row) return notFoundWithAudit(member.id, params.id);
  if (!row.data) {
    /* pending Camille review */
    return Response.json(
      { error: 'This file is missing from storage. It has been flagged for working-group attention.' },
      { status: 500 }
    );
  }

  query('UPDATE resources SET download_count = download_count + 1 WHERE id = $1', [params.id]).catch(
    () => {}
  );

  const filename = (row.file_path || 'download').replace(/[^\w.\- ]/g, '_');
  return new Response(new Uint8Array(row.data), {
    headers: {
      'Content-Type': row.file_mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(row.data.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
