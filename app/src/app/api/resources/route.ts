// F-1 Submit a Resource (POST) + F-2 Browse & Search (GET).

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql } from '@/lib/visibility';
import { withTransaction, query } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { canonicalUrlHash } from '@/lib/urls';
import { parseSkillUpload } from '@/lib/skills';
import { enqueueContributionEvent } from '@/lib/contributions';
import type { VisibilityScope } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const RESOURCE_TYPES = ['link', 'file', 'skill', 'newsletter', 'creator', 'request'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];
const URL_TYPES: ResourceType[] = ['link', 'newsletter', 'creator'];
const UPLOAD_TYPES: ResourceType[] = ['file', 'skill'];
const SUBMISSION_SCOPE: VisibilityScope = 'pl_infra';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'md', 'txt', 'docx', 'csv', 'zip'];
const TEXT_EXTENSIONS = ['md', 'txt', 'csv'];

/* pending Camille review */
const VISIBILITY_LABELS: Record<VisibilityScope, string> = {
  pl_infra: 'Visible to PL Infra members',
  plaa_members: 'Visible to all PLAA members',
};

function bad(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

interface SubmitInput {
  type: ResourceType;
  title: string;
  why: string;
  url: string | null;
  visibility: VisibilityScope;
  tags: string[];
  confidentialityAck: boolean;
  file: File | null;
}

async function readSubmitInput(req: Request): Promise<SubmitInput | Response> {
  const contentType = req.headers.get('content-type') || '';
  let raw: Record<string, unknown> = {};
  let file: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (v instanceof File) {
        if (k === 'file') file = v;
      } else {
        raw[k] = v;
      }
    }
    if (typeof raw.tags === 'string') {
      try {
        raw.tags = JSON.parse(raw.tags as string);
      } catch {
        raw.tags = (raw.tags as string).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
  } else {
    try {
      raw = await req.json();
    } catch {
      return bad('Invalid request body.');
    }
  }

  const type = raw.type as ResourceType;
  if (!RESOURCE_TYPES.includes(type)) return bad('Unknown resource type.');

  const why = typeof raw.why === 'string' ? raw.why.trim() : '';
  if (why.length < 1 || why.length > 200) {
    /* pending Camille review */
    return bad('Please add one line on why this is worth someone\u2019s time (up to 200 characters).');
  }

  const visibility = (raw.visibility as VisibilityScope) || SUBMISSION_SCOPE;
  if (visibility !== SUBMISSION_SCOPE) {
    /* pending Camille review — phase 1 is PL Infra-only. */
    return bad('Resources can currently only be shared with PL Infra members.');
  }

  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]).map(String) : [];
  const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const confidentialityAck = raw.confidentialityAck === true || raw.confidentialityAck === 'true';

  return { type, title, why, url, visibility, tags, confidentialityAck, file };
}

export async function POST(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const input = await readSubmitInput(req);
  if (input instanceof Response) return input;

  const { type, why, url, visibility, tags, confidentialityAck, file } = input;
  let { title } = input;

  if (URL_TYPES.includes(type) && !url) return bad('A URL is required for this type.');

  // Upload handling (file/skill)
  let fileBuffer: Buffer | null = null;
  let fileMime: string | null = null;
  let fileName: string | null = null;
  let extractedText: string | null = null;
  let skillName: string | null = null;
  let skillDescription: string | null = null;

  if (UPLOAD_TYPES.includes(type)) {
    if (!confidentialityAck) {
      /* pending Camille review */
      return bad('Please acknowledge the confidentiality note before uploading.');
    }
    if (!file) return bad('A file is required for this type.');
    if (file.size > MAX_FILE_BYTES) {
      /* pending Camille review */
      return bad(
        `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is ${MAX_FILE_BYTES / (1024 * 1024)}MB.`
      );
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      /* pending Camille review */
      return bad(`That file type isn\u2019t supported. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}.`);
    }
    fileBuffer = Buffer.from(await file.arrayBuffer());
    fileMime = file.type || 'application/octet-stream';
    fileName = file.name;

    if (type === 'skill') {
      const parsed = await parseSkillUpload(fileBuffer, file.name);
      if (parsed) {
        skillName = parsed.name;
        skillDescription = parsed.description;
        extractedText = parsed.skillMd;
        if (!title) title = parsed.name;
      }
      // Malformed/absent frontmatter: graceful manual fallback (AC-1.4) — still accepted.
    } else if (TEXT_EXTENSIONS.includes(ext)) {
      extractedText = fileBuffer.toString('utf8');
    }
    // pdf/docx/zip (non-skill): no text extraction in v1 — skipped gracefully.
    if (!title) title = file.name.replace(/\.[^.]+$/, '');
  }

  if (!title) return bad('A title is required.');
  if (title.length > 300) return bad('Title is too long (300 characters max).');

  const urlHash = url ? canonicalUrlHash(url) : null;
  const requestStatus = type === 'request' ? 'open' : null;
  const ackAt = UPLOAD_TYPES.includes(type) ? new Date() : null;

  // Validate tags against the controlled vocabulary.
  let tagIds: string[] = [];
  if (tags.length > 0) {
    const { rows } = await query<{ id: string; slug: string }>(
      'SELECT id, slug FROM tags WHERE slug = ANY($1)',
      [tags]
    );
    if (rows.length !== new Set(tags).size) {
      return bad('One or more tags are not in the tag vocabulary.');
    }
    tagIds = rows.map((r) => r.id);
  }

  const resourceId = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO resources
         (type, title, why, url, canonical_url_hash, file_path, file_size_bytes, file_mime,
          extracted_text, skill_name, skill_description,
          submitter_member_id, submitter_display_name, submitter_avatar_url,
          visibility, confidentiality_ack_at, request_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        type, title, why, url, urlHash,
        fileName, fileBuffer ? fileBuffer.length : null, fileMime,
        extractedText, skillName, skillDescription,
        member.id, member.displayName, member.avatarUrl,
        visibility, ackAt, requestStatus,
      ]
    );
    const id = rows[0].id;

    for (const tagId of tagIds) {
      await client.query('INSERT INTO resource_tags (resource_id, tag_id) VALUES ($1, $2)', [id, tagId]);
    }
    if (fileBuffer) {
      await client.query('INSERT INTO resource_files (resource_id, data) VALUES ($1, $2)', [id, fileBuffer]);
    }
    await writeAudit(client, {
      actorMemberId: member.id,
      action: 'submit',
      entity: 'resource',
      entityId: id,
      metadata: { type, visibility },
    });
    // Requests emit no event on creation — fulfilment does (F-5).
    if (type !== 'request') {
      await enqueueContributionEvent(client, {
        eventType: 'resource.submitted',
        memberId: member.id,
        resourceId: id,
        resourceType: type,
        visibility,
      });
    }
    return id;
  });

  /* pending Camille review — status copy contract: "Sent for review", never stronger */
  return Response.json(
    {
      id: resourceId,
      title,
      visibilityLabel: VISIBILITY_LABELS[visibility],
      status: type === 'request' ? 'Posted' : 'Sent for review',
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// GET /api/resources — list/search (F-2)

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64url');
}
function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const [createdAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const scopes = await visibleScopesFor(member as Member);
  const urlObj = new URL(req.url);
  const q = (urlObj.searchParams.get('q') || '').trim();
  const type = urlObj.searchParams.get('type');
  const tag = urlObj.searchParams.get('tag');
  const submitter = urlObj.searchParams.get('submitter'); // opaque member id only — no PII in URLs
  const status = urlObj.searchParams.get('status');
  const collection = urlObj.searchParams.get('collection');
  const sort = urlObj.searchParams.get('sort') === 'upvotes' ? 'upvotes' : 'recent';
  const cursor = urlObj.searchParams.get('cursor');
  const LIMIT = 20;

  const params: unknown[] = [];
  const scope = scopeFilterSql(scopes, params.length, 'r');
  params.push(...scope.params);
  const where: string[] = [scope.sql];

  if (q) {
    params.push(q);
    where.push(`r.search_vector @@ websearch_to_tsquery('english', $${params.length})`);
  }
  if (type === 'reading') {
    // "Reading" tab groups newsletters + creators (design contract).
    where.push(`r.type IN ('newsletter'::resource_type, 'creator'::resource_type)`);
  } else if (type && RESOURCE_TYPES.includes(type as ResourceType)) {
    params.push(type);
    where.push(`r.type = $${params.length}::resource_type`);
  }
  if (tag) {
    params.push(tag);
    where.push(
      `EXISTS (SELECT 1 FROM resource_tags rt JOIN tags t ON t.id = rt.tag_id
        WHERE rt.resource_id = r.id AND t.slug = $${params.length})`
    );
  }
  if (submitter) {
    params.push(submitter);
    where.push(`r.submitter_member_id = $${params.length}`);
  }
  if (status && ['open', 'fulfilled'].includes(status)) {
    params.push(status);
    where.push(`r.request_status = $${params.length}::request_status`);
  }
  // "Found useful" — viewer's own upvotes only. Never someone else's (no PII in URLs).
  if (urlObj.searchParams.get('upvotedBy') === 'me') {
    params.push(member.id);
    where.push(`EXISTS (SELECT 1 FROM upvotes uv WHERE uv.resource_id = r.id AND uv.member_id = $${params.length})`);
  }
  if (collection) {
    // Curated membership OR the auto-populated open-requests collection.
    params.push(collection);
    const p = params.length;
    where.push(
      `(EXISTS (SELECT 1 FROM collection_resources cr JOIN collections c ON c.id = cr.collection_id
          WHERE cr.resource_id = r.id AND c.slug = $${p})
        OR EXISTS (SELECT 1 FROM collections c WHERE c.slug = $${p}
          AND c.auto_populate_rule->>'type' = 'open_requests'
          AND r.type = 'request' AND r.request_status = 'open'))`
    );
  }

  // Keyset pagination on (created_at, id) — applies to the recency ordering.
  // Ranked search results are capped at one page (search rarely paginates).
  let usesCursor = false;
  if (cursor && !q && sort === 'recent') {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      params.push(decoded.createdAt, decoded.id);
      where.push(`(r.created_at, r.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
      usesCursor = true;
    }
  }

  let orderBy = 'r.created_at DESC, r.id DESC';
  let rankSelect = '';
  if (q) {
    rankSelect = `, ts_rank(r.search_vector, websearch_to_tsquery('english', $2)) AS rank`;
    orderBy = 'rank DESC, r.created_at DESC, r.id DESC';
  } else if (sort === 'upvotes') {
    orderBy = 'r.upvote_count DESC, r.created_at DESC, r.id DESC';
  }

  params.push(member.id);
  const viewerParam = params.length;

  const sql = `
    SELECT r.id, r.type, r.title, r.why, r.submitter_member_id, r.submitter_display_name, r.submitter_avatar_url,
           r.created_at, r.upvote_count, r.visibility, r.request_status, r.fulfilled_by_resource_id,
           EXISTS (SELECT 1 FROM upvotes u WHERE u.resource_id = r.id AND u.member_id = $${viewerParam}) AS viewer_has_upvoted,
           COALESCE(
             (SELECT array_agg(t.slug ORDER BY t.slug) FROM resource_tags rt JOIN tags t ON t.id = rt.tag_id
               WHERE rt.resource_id = r.id),
             '{}'
           ) AS tags
           ${rankSelect}
    FROM resources r
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ${LIMIT + 1}`;

  let rows: any[];
  try {
    ({ rows } = await query(sql, params));
  } catch {
    // Malformed query must never 500 (F-2 error state): fall back to recency browse.
    const fallbackParams: unknown[] = [];
    const fb = scopeFilterSql(scopes, 0, 'r');
    fallbackParams.push(...fb.params, member.id);
    ({ rows } = await query(
      `SELECT r.id, r.type, r.title, r.why, r.submitter_member_id, r.submitter_display_name, r.submitter_avatar_url,
              r.created_at, r.upvote_count, r.visibility, r.request_status, r.fulfilled_by_resource_id,
              EXISTS (SELECT 1 FROM upvotes u WHERE u.resource_id = r.id AND u.member_id = $2) AS viewer_has_upvoted,
              '{}'::text[] AS tags
       FROM resources r WHERE ${fb.sql}
       ORDER BY r.created_at DESC, r.id DESC LIMIT ${LIMIT + 1}`,
      fallbackParams
    ));
  }

  const hasMore = rows.length > LIMIT;
  const page = rows.slice(0, LIMIT);
  const items = page.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    why: r.why,
    tags: r.tags,
    submitterMemberId: r.submitter_member_id, // opaque id — profile routing only
    submitterDisplayName: r.submitter_display_name,
    submitterAvatarUrl: r.submitter_avatar_url,
    createdAt: new Date(r.created_at).toISOString(),
    upvoteCount: r.upvote_count,
    visibility: r.visibility,
    requestStatus: r.request_status,
    fulfilledByResourceId: r.fulfilled_by_resource_id,
    viewerHasUpvoted: r.viewer_has_upvoted,
  }));

  const zeroResults = q.length > 0 && items.length === 0;
  if (zeroResults) {
    // AC-2.3: seeding-backlog signal. Metadata holds no free text beyond length.
    writeAudit(
      (await import('@/lib/db')).pool,
      { actorMemberId: member.id, action: 'search_zero_results', entity: 'search', metadata: { qLength: q.length } }
    ).catch(() => {});
  }

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && !q && sort === 'recent' && last
      ? encodeCursor(new Date(last.created_at).toISOString(), last.id)
      : null;

  return Response.json({ items, nextCursor, zeroResults, usesCursor: usesCursor || undefined });
}
