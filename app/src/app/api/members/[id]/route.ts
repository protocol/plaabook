// Member profile — SAFE FIELDS ONLY (display name + avatar from denormalized
// resource attribution; never email or any private profile field, PRD §0).
// Stats are visibility-scoped so a profile never leaks out-of-scope activity.

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r'); // $1 = profile member id

  // Identity comes from what they shared: self-view works even with no posts.
  const { rows: idRows } = await query<{ display_name: string; avatar_url: string | null }>(
    `SELECT r.submitter_display_name AS display_name, r.submitter_avatar_url AS avatar_url
     FROM resources r WHERE r.submitter_member_id = $1 AND ${scope.sql}
     ORDER BY r.created_at DESC LIMIT 1`,
    [params.id, ...scope.params]
  );

  let displayName = idRows[0]?.display_name ?? null;
  let avatarUrl = idRows[0]?.avatar_url ?? null;
  if (!displayName) {
    if (params.id === member.id) {
      displayName = member.displayName;
      avatarUrl = member.avatarUrl;
    } else {
      /* pending Camille review */
      return Response.json({ error: 'Not found.' }, { status: 404 });
    }
  }

  const { rows } = await query<{ shared: string; answered: string; curated: string }>(
    `SELECT
       (SELECT COUNT(*) FROM resources r
         WHERE r.submitter_member_id = $1 AND r.type <> 'request' AND ${scope.sql}) AS shared,
       (SELECT COUNT(*) FROM resources req
         JOIN resources r ON r.id = req.fulfilled_by_resource_id
         WHERE req.type = 'request' AND req.request_status = 'fulfilled'
           AND r.submitter_member_id = $1 AND ${scope.sql}
           AND req.removed_at IS NULL) AS answered,
       (SELECT COUNT(*) FROM collections c WHERE c.curator_member_id = $1) AS curated`,
    [params.id, ...scope.params]
  );

  return Response.json({
    id: params.id,
    displayName,
    avatarUrl,
    stats: {
      shared: Number(rows[0].shared),
      requestsAnswered: Number(rows[0].answered),
      collectionsCurated: Number(rows[0].curated),
    },
  });
}
