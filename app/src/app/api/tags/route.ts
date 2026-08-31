// F-1/F-2: controlled tag vocabulary (~12 seeded; WG-curated).
// GET is member-visible; POST is admin-only curation (add to the vocabulary).

import { requireMember, isAdmin } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { slugify } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const { rows } = await query<{ slug: string; label: string }>(
    'SELECT slug, label FROM tags WHERE curated = TRUE ORDER BY label'
  );
  return Response.json({ tags: rows });
}

export async function POST(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  // Non-admins never learn this route exists (matches the admin-page 404 gate).
  if (!isAdmin(member.id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  let body: { label?: unknown };
  try {
    body = (await req.json()) as { label?: unknown };
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) return Response.json({ error: 'A tag label is required.' }, { status: 400 });

  const slug = slugify(label);
  if (!slug) return Response.json({ error: 'That label has no usable letters or numbers.' }, { status: 400 });

  const { rows } = await query<{ slug: string; label: string }>(
    `INSERT INTO tags (slug, label, curated) VALUES ($1, $2, TRUE)
     ON CONFLICT (slug) DO NOTHING
     RETURNING slug, label`,
    [slug, label]
  );
  if (rows.length === 0) {
    return Response.json({ error: 'A tag with that name already exists.' }, { status: 409 });
  }

  await writeAudit(pool, {
    actorMemberId: member.id,
    action: 'admin_create_tag',
    entity: 'tag',
    metadata: { slug }, // slug is controlled vocabulary — not PII
  });

  return Response.json({ tag: rows[0] }, { status: 201 });
}
