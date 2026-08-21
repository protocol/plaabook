// F-3 upvote toggle. Recognition signal ONLY — structurally severed from the
// contribution pipeline: this file must NEVER import contributions.ts, and no
// event of any kind is emitted here (AC-3.6, AC-6.8).

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { query, withTransaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveInScope(req: Request, id: string): Promise<{ memberId: string } | Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(id)) return notFoundWithAudit(member.id, null);

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 1, 'r');
  const { rows } = await query(
    `SELECT r.id FROM resources r WHERE r.id = $1 AND ${scope.sql}`,
    [id, ...scope.params]
  );
  if (!rows[0]) return notFoundWithAudit(member.id, id);
  return { memberId: member.id };
}

async function toggle(id: string, memberId: string, add: boolean): Promise<Response> {
  const upvoteCount = await withTransaction(async (client) => {
    if (add) {
      await client.query(
        'INSERT INTO upvotes (resource_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, memberId]
      );
    } else {
      await client.query('DELETE FROM upvotes WHERE resource_id = $1 AND member_id = $2', [id, memberId]);
    }
    // Recompute from source of truth — idempotent under races (AC-3.5).
    const { rows } = await client.query<{ upvote_count: number }>(
      `UPDATE resources
       SET upvote_count = (SELECT COUNT(*)::int FROM upvotes WHERE resource_id = $1)
       WHERE id = $1
       RETURNING upvote_count`,
      [id]
    );
    return rows[0].upvote_count;
  });

  return Response.json({ upvoteCount, viewerHasUpvoted: add });
}

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const resolved = await resolveInScope(req, params.id);
  if (resolved instanceof Response) return resolved;
  return toggle(params.id, resolved.memberId, true);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const resolved = await resolveInScope(req, params.id);
  if (resolved instanceof Response) return resolved;
  return toggle(params.id, resolved.memberId, false);
}
