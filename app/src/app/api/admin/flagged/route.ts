// WG admin: resources reported broken (F-3 AC-3.7). Flag-for-attention list —
// nothing is deleted here. Non-admins get 404.

import { requireMember, isAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!isAdmin(member.id)) {
    /* pending Camille review */
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  const { rows } = await query(
    `SELECT id, type, title, created_at, flagged_broken_at
       FROM resources
      WHERE flagged_broken_at IS NOT NULL AND removed_at IS NULL
      ORDER BY flagged_broken_at DESC
      LIMIT 200`
  );
  return Response.json({ items: rows });
}
