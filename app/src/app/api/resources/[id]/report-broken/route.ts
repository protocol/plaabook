// F-3 AC-3.7: flag a broken link for WG attention. Never deletes.

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const params = await props.params;
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(params.id)) return notFoundWithAudit(member.id, null);

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r');
  const { rows } = await query(
    `UPDATE resources r SET flagged_broken_at = COALESCE(r.flagged_broken_at, NOW())
     WHERE r.id = $1 AND ${scope.sql}
     RETURNING r.id`,
    [params.id, ...scope.params]
  );
  if (!rows[0]) return notFoundWithAudit(member.id, params.id);

  await writeAudit(pool, {
    actorMemberId: member.id,
    action: 'report_broken',
    entity: 'resource',
    entityId: params.id,
    metadata: null,
  });

  /* pending Camille review */
  return Response.json({ ok: true, message: 'Thanks — this has been flagged for working-group attention.' });
}
