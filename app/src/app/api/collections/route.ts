// F-2 Collections, with visibility-scoped resource counts. The
// "Asked for, not yet found" collection auto-resolves open requests.

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { query } from '@/lib/db';

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
