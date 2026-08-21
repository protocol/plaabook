// Rail counts for the left navigation. Visibility-scoped, soft-deletes excluded.
// "mine"/"useful" are the viewer's own submissions/upvotes — never anyone else's.

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r'); // $1 = viewer member id

  const { rows } = await query<{
    everything: string;
    requests: string;
    mine: string;
    useful: string;
    collections: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM resources r WHERE ${scope.sql}) AS everything,
       (SELECT COUNT(*) FROM resources r WHERE r.type = 'request' AND ${scope.sql}) AS requests,
       (SELECT COUNT(*) FROM resources r WHERE r.submitter_member_id = $1 AND ${scope.sql}) AS mine,
       (SELECT COUNT(*) FROM upvotes u JOIN resources r ON r.id = u.resource_id
         WHERE u.member_id = $1 AND ${scope.sql}) AS useful,
       (SELECT COUNT(*) FROM collections) AS collections`,
    [member.id, ...scope.params]
  );

  const r = rows[0];
  return Response.json({
    everything: Number(r.everything),
    collections: Number(r.collections),
    requests: Number(r.requests),
    mine: Number(r.mine),
    useful: Number(r.useful),
  });
}
