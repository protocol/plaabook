// F-2 Collections, with visibility-scoped resource counts. The
// "Asked for, not yet found" collection auto-resolves open requests.

import { requireMember, isAdmin, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { slugify } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 0, 'r');

  const { rows } = await query<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    auto_populate_rule: { type?: string } | null;
    sort_order: number;
    resource_count: string;
    curator_name: string | null;
    preview: string[];
  }>(
    `SELECT c.id, c.slug, c.title, c.description, c.auto_populate_rule, c.sort_order,
            CASE
              WHEN c.auto_populate_rule->>'type' = 'open_requests' THEN
                (SELECT COUNT(*) FROM resources r
                 WHERE r.type = 'request' AND r.request_status = 'open' AND ${scope.sql})
              ELSE
                (SELECT COUNT(*) FROM collection_resources cr
                 JOIN resources r ON r.id = cr.resource_id
                 WHERE cr.collection_id = c.id AND ${scope.sql})
            END AS resource_count,
            (SELECT r.submitter_display_name FROM resources r
              WHERE r.submitter_member_id = c.curator_member_id AND ${scope.sql}
              ORDER BY r.created_at DESC LIMIT 1) AS curator_name,
            CASE
              WHEN c.auto_populate_rule->>'type' = 'open_requests' THEN
                COALESCE((SELECT array_agg(t.title) FROM (
                  SELECT r.title FROM resources r
                  WHERE r.type = 'request' AND r.request_status = 'open' AND ${scope.sql}
                  ORDER BY r.created_at DESC LIMIT 3) t), '{}')
              ELSE
                COALESCE((SELECT array_agg(t.title) FROM (
                  SELECT r.title FROM collection_resources cr
                  JOIN resources r ON r.id = cr.resource_id
                  WHERE cr.collection_id = c.id AND ${scope.sql}
                  ORDER BY cr.sort_order, r.created_at DESC LIMIT 3) t), '{}')
            END AS preview
     FROM collections c
     ORDER BY c.sort_order, c.title`,
    scope.params
  );

  return Response.json({
    collections: rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      autoPopulated: c.auto_populate_rule?.type === 'open_requests',
      resourceCount: Number(c.resource_count),
      curatorName: c.curator_name, // display name only — safe field
      preview: c.preview,
    })),
  });
}

// Admin-only: create a hand-curated collection ("category"). Auto-populated
// collections (open-requests) are seeded, never created here.
export async function POST(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!isAdmin((member as Member).id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  let body: { title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as { title?: unknown; description?: unknown };
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return Response.json({ error: 'A collection title is required.' }, { status: 400 });
  const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;

  const slug = slugify(title);
  if (!slug) return Response.json({ error: 'That title has no usable letters or numbers.' }, { status: 400 });

  // New collections sort after everything that already exists.
  const { rows } = await query<{ id: string; slug: string; title: string; description: string | null }>(
    `INSERT INTO collections (slug, title, description, curator_member_id, sort_order)
     SELECT $1, $2, $3, $4, COALESCE(MAX(sort_order), -1) + 1 FROM collections
     ON CONFLICT (slug) DO NOTHING
     RETURNING id, slug, title, description`,
    [slug, title, description, (member as Member).id]
  );
  if (rows.length === 0) {
    return Response.json({ error: 'A collection with that name already exists.' }, { status: 409 });
  }

  await writeAudit(pool, {
    actorMemberId: (member as Member).id,
    action: 'admin_create_collection',
    entity: 'collection',
    entityId: rows[0].id,
    metadata: { slug },
  });

  return Response.json(
    {
      collection: {
        id: rows[0].id,
        slug: rows[0].slug,
        title: rows[0].title,
        description: rows[0].description,
        autoPopulated: false,
        resourceCount: 0,
        curatorName: (member as Member).displayName,
        preview: [],
      },
    },
    { status: 201 }
  );
}
