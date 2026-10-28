// F-3 Resource detail. Out-of-scope or removed → 404 + audit (AC-3.2).
// View counter increments here; NO contribution event (AC-6.8).

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const params = await props.params;
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(params.id)) return notFoundWithAudit(member.id, null);

  const scopes = await visibleScopesFor(member as Member);
  const scope = scopeFilterSql(scopes, 2, 'r'); // $1 = id, $2 = viewer member id

  const { rows } = await query<any>(
    `SELECT r.id, r.type, r.title, r.why, r.url, r.file_path, r.file_size_bytes, r.file_mime,
            r.skill_name, r.skill_description,
            CASE WHEN r.type = 'skill' THEN r.extracted_text END AS skill_md,
            CASE WHEN r.type = 'file' THEN left(r.extracted_text, 600) END AS extracted_preview,
            r.submitter_member_id, r.submitter_display_name, r.submitter_avatar_url,
            r.visibility, r.request_status, r.fulfilled_by_resource_id, r.fulfilled_at,
            r.upvote_count, r.view_count, r.download_count, r.flagged_broken_at, r.created_at,
            EXISTS (SELECT 1 FROM upvotes u WHERE u.resource_id = r.id AND u.member_id = $2) AS viewer_has_upvoted,
            COALESCE((SELECT array_agg(t.slug ORDER BY t.slug)
                      FROM resource_tags rt JOIN tags t ON t.id = rt.tag_id
                      WHERE rt.resource_id = r.id), '{}') AS tags,
            COALESCE((SELECT array_agg(c.slug ORDER BY c.sort_order)
                      FROM collection_resources cr JOIN collections c ON c.id = cr.collection_id
                      WHERE cr.resource_id = r.id), '{}') AS collections
     FROM resources r
     WHERE r.id = $1 AND ${scope.sql}`,
    [params.id, member.id, ...scope.params]
  );

  const r = rows[0];
  if (!r) return notFoundWithAudit(member.id, params.id);

  // Fire-and-forget view counter — never an event, never blocks the response.
  query('UPDATE resources SET view_count = view_count + 1 WHERE id = $1', [params.id]).catch(() => {});

  return Response.json({
    id: r.id,
    type: r.type,
    title: r.title,
    why: r.why,
    url: r.url,
    fileName: r.file_path,
    fileSizeBytes: r.file_size_bytes !== null ? Number(r.file_size_bytes) : null,
    fileMime: r.file_mime,
    skillName: r.skill_name,
    skillDescription: r.skill_description,
    skillMd: r.skill_md,
    extractedPreview: r.extracted_preview,
    submitterMemberId: r.submitter_member_id, // opaque id (for author-only UI affordances)
    submitterDisplayName: r.submitter_display_name,
    submitterAvatarUrl: r.submitter_avatar_url,
    visibility: r.visibility,
    requestStatus: r.request_status,
    fulfilledByResourceId: r.fulfilled_by_resource_id,
    fulfilledAt: r.fulfilled_at ? new Date(r.fulfilled_at).toISOString() : null,
    upvoteCount: r.upvote_count,
    viewCount: r.view_count,
    downloadCount: r.download_count,
    flaggedBrokenAt: r.flagged_broken_at ? new Date(r.flagged_broken_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    viewerHasUpvoted: r.viewer_has_upvoted,
    tags: r.tags,
    collections: r.collections,
  });
}
