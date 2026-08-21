// F-4 AC-4.4: visibility change — author or admin only, fully audit-logged.

import { requireMember, isAdmin, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { withTransaction, query } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import type { VisibilityScope } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES: VisibilityScope[] = ['pl_infra', 'plaa_members'];

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(params.id)) return notFoundWithAudit(member.id, null);

  let body: { visibility?: VisibilityScope };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const next = body.visibility;
  if (!next || !SCOPES.includes(next)) {
    return Response.json({ error: 'Unknown visibility scope.' }, { status: 400 });
  }

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r');
  const { rows } = await query<{ id: string; submitter_member_id: string; visibility: VisibilityScope }>(
    `SELECT r.id, r.submitter_member_id, r.visibility FROM resources r WHERE r.id = $1 AND ${scope.sql}`,
    [params.id, ...scope.params]
  );
  const resource = rows[0];
  if (!resource) return notFoundWithAudit(member.id, params.id);

  if (resource.submitter_member_id !== member.id && !isAdmin(member.id)) {
    /* pending Camille review */
    return Response.json({ error: 'Only the submitter or a working-group admin can change visibility.' }, { status: 403 });
  }

  if (resource.visibility !== next) {
    await withTransaction(async (client) => {
      await client.query('UPDATE resources SET visibility = $1 WHERE id = $2', [next, params.id]);
      await writeAudit(client, {
        actorMemberId: member.id,
        action: 'visibility_change',
        entity: 'resource',
        entityId: params.id,
        metadata: { previous: resource.visibility, next },
      });
    });
  }

  return Response.json({ id: params.id, visibility: next });
}
