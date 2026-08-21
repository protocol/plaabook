// F-6 pull/backfill endpoint. /* pending Javier review — points-linkage seam:
// items are PENDING contribution events for the Activities review workflow;
// this app never awards points or asserts an outcome. */
// Service-token auth ONLY — a member session must NEVER authenticate here (AC-6.6).

import { timingSafeEqual } from 'node:crypto';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { toWebhookPayload, type ContributionEventRow } from '@/lib/contributions';

export const dynamic = 'force-dynamic';

function tokenValid(header: string | null): boolean {
  const expected = process.env.CONTRIBUTIONS_SERVICE_TOKEN;
  if (!expected || !header || !header.startsWith('Bearer ')) return false;
  const provided = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

export async function GET(req: Request): Promise<Response> {
  if (!tokenValid(req.headers.get('authorization'))) {
    try {
      await writeAudit(pool, {
        actorMemberId: null,
        action: 'denied_access',
        entity: 'contributions_pull',
        metadata: { reason: 'invalid_service_token' },
      });
    } catch {
      /* audit failure must not mask the 401 */
    }
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const since = params.get('since');
  const cursor = params.get('cursor'); // event_id of the last item seen
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '100', 10) || 100, 1), 200);

  const where: string[] = [];
  const args: unknown[] = [];
  if (since) {
    const d = new Date(since);
    if (isNaN(d.getTime())) return Response.json({ error: 'Invalid since timestamp.' }, { status: 400 });
    args.push(d.toISOString());
    where.push(`e.occurred_at >= $${args.length}`);
  }
  if (cursor) {
    // Keyset over (occurred_at, event_id): everything after the cursor row.
    args.push(cursor);
    where.push(
      `(e.occurred_at, e.event_id) > (SELECT c.occurred_at, c.event_id FROM contribution_events c WHERE c.event_id = $${args.length})`
    );
  }
  args.push(limit);

  const { rows } = await query<ContributionEventRow>(
    `SELECT e.event_id, e.event_type, e.occurred_at, e.member_id, e.resource_id,
            r.type AS resource_type, e.activity_slug, e.visibility, e.review_status
       FROM contribution_events e
       JOIN resources r ON r.id = e.resource_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.occurred_at, e.event_id
      LIMIT $${args.length}`,
    args
  );

  // EXACT webhook payload shape — push and pull identical (TeamWork.md contract).
  const items = rows.map(toWebhookPayload);
  return Response.json({
    items,
    nextCursor: rows.length === limit ? rows[rows.length - 1].event_id : null,
  });
}
