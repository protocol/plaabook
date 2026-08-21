// WG admin: contribution-event delivery state (dead-letters + pending count)
// and manual retry. Delivery status only — no points, totals, or Rights.
// Non-admins get 404 (never confirm the surface exists).

import { requireMember, isAdmin } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: Request): Promise<{ id: string } | Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!isAdmin(member.id)) {
    /* pending Camille review */
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }
  return member;
}

export async function GET(req: Request): Promise<Response> {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const [dead, pending] = await Promise.all([
    query<{
      event_id: string;
      event_type: string;
      resource_id: string;
      occurred_at: string;
      attempts: number;
      last_error: string | null;
    }>(
      `SELECT event_id, event_type, resource_id, occurred_at, attempts, last_error
         FROM contribution_events
        WHERE dead_lettered = TRUE
        ORDER BY occurred_at DESC
        LIMIT 200`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM contribution_events
        WHERE delivered_at IS NULL AND dead_lettered = FALSE`
    ),
  ]);

  return Response.json({
    items: dead.rows,
    pendingCount: parseInt(pending.rows[0].count, 10),
  });
}

export async function POST(req: Request): Promise<Response> {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  let eventId: string | undefined;
  try {
    const body = (await req.json()) as { event_id?: string };
    eventId = body.event_id;
  } catch {
    /* fall through to validation */
  }
  if (!eventId) return Response.json({ error: 'event_id is required.' }, { status: 400 });

  const { rows } = await query<{ event_id: string }>(
    `UPDATE contribution_events
        SET dead_lettered = FALSE, attempts = 0, next_attempt_at = NOW(), last_error = NULL
      WHERE event_id = $1 AND dead_lettered = TRUE
      RETURNING event_id`,
    [eventId]
  );
  if (rows.length === 0) return Response.json({ error: 'No dead-lettered event with that id.' }, { status: 404 });

  await writeAudit(pool, {
    actorMemberId: admin.id,
    action: 'admin_retry_event',
    entity: 'contribution_event',
    entityId: eventId,
    metadata: null,
  });

  return Response.json({ ok: true });
}
