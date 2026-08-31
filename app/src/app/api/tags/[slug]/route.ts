// Admin-only: remove a tag from the controlled vocabulary. resource_tags rows
// cascade (FK ON DELETE CASCADE), so a deleted tag cleanly drops off resources.

import { requireMember, isAdmin } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { slug: string } }): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!isAdmin(member.id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  const { rows } = await query<{ slug: string }>('DELETE FROM tags WHERE slug = $1 RETURNING slug', [
    params.slug,
  ]);
  if (rows.length === 0) return Response.json({ error: 'No such tag.' }, { status: 404 });

  await writeAudit(pool, {
    actorMemberId: member.id,
    action: 'admin_delete_tag',
    entity: 'tag',
    metadata: { slug: params.slug },
  });

  return Response.json({ ok: true });
}
