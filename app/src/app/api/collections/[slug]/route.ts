// Admin-only: delete a hand-curated collection. collection_resources rows
// cascade (FK ON DELETE CASCADE) — the resources themselves are untouched.
// Auto-populated collections (open-requests) define their own membership and
// are refused: deleting one would silently drop the request-fulfilment surface.

import { requireMember, isAdmin } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { slug: string } }): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!isAdmin(member.id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  const { rows: found } = await query<{ id: string; auto_populate_rule: { type?: string } | null }>(
    'SELECT id, auto_populate_rule FROM collections WHERE slug = $1',
    [params.slug]
  );
  if (found.length === 0) return Response.json({ error: 'No such collection.' }, { status: 404 });
  if (found[0].auto_populate_rule) {
    return Response.json(
      { error: 'This collection fills itself and can’t be deleted.' },
      { status: 400 }
    );
  }

  await query('DELETE FROM collections WHERE id = $1', [found[0].id]);
  await writeAudit(pool, {
    actorMemberId: member.id,
    action: 'admin_delete_collection',
    entity: 'collection',
    entityId: found[0].id,
    metadata: { slug: params.slug },
  });

  return Response.json({ ok: true });
}
