// F-5 request fulfilment. Emits request.fulfilled credited to the FULFILLER
// (AC-5.4) — except self-fulfilment, which emits no event (anti-gaming).

import { requireMember, type Member } from '@/lib/auth';
import { visibleScopesFor, scopeFilterSql, notFoundWithAudit } from '@/lib/visibility';
import { withTransaction, query } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { enqueueContributionEvent } from '@/lib/contributions';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const params = await props.params;
  const member = await requireMember(req);
  if (member instanceof Response) return member;
  if (!UUID_RE.test(params.id)) return notFoundWithAudit(member.id, null);

  let body: { resourceId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.resourceId || !UUID_RE.test(body.resourceId)) {
    return Response.json({ error: 'A resourceId is required.' }, { status: 400 });
  }

  const scopes = await visibleScopesFor(member as Member);

  // The request itself must be in scope, a request, and open.
  const reqScope = scopeFilterSql(scopes, 1, 'r');
  const { rows: requestRows } = await query<{
    id: string;
    submitter_member_id: string;
    request_status: string;
    visibility: string;
  }>(
    `SELECT r.id, r.submitter_member_id, r.request_status, r.visibility
     FROM resources r WHERE r.id = $1 AND r.type = 'request' AND ${reqScope.sql}`,
    [params.id, ...reqScope.params]
  );
  const request = requestRows[0];
  if (!request) return notFoundWithAudit(member.id, params.id);
  if (request.request_status !== 'open') {
    /* pending Camille review */
    return Response.json({ error: 'This request has already been answered.' }, { status: 400 });
  }

  // The fulfilling resource must exist, be in scope, not itself be a request,
  // and its visibility must cover the request's audience: a 'plaa_members'
  // request may only be fulfilled by a 'plaa_members' resource (M1 — otherwise
  // viewers of the request could be handed a reference they can't see).
  const resScope = scopeFilterSql(scopes, 1, 'r');
  const { rows: resourceRows } = await query<{ id: string; type: string; visibility: string }>(
    `SELECT r.id, r.type, r.visibility FROM resources r WHERE r.id = $1 AND ${resScope.sql}`,
    [body.resourceId, ...resScope.params]
  );
  const fulfilling = resourceRows[0];
  const coversAudience =
    fulfilling && (request.visibility !== 'plaa_members' || fulfilling.visibility === 'plaa_members');
  if (!fulfilling || fulfilling.type === 'request' || !coversAudience) {
    /* pending Camille review */
    return Response.json(
      { error: 'That resource can\u2019t be used to answer this request — it may not be visible to this request\u2019s audience.' },
      { status: 400 }
    );
  }

  const selfFulfilment = request.submitter_member_id === member.id;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE resources
       SET request_status = 'fulfilled', fulfilled_by_resource_id = $1, fulfilled_at = NOW()
       WHERE id = $2`,
      [body.resourceId, params.id]
    );
    await writeAudit(client, {
      actorMemberId: member.id,
      action: 'request_fulfilled',
      entity: 'resource',
      entityId: params.id,
      metadata: { fulfilledByResourceId: body.resourceId, selfFulfilment },
    });
    if (!selfFulfilment) {
      // Credited to the FULFILLER, never the requester (AC-5.4). /* pending Javier review */
      await enqueueContributionEvent(client, {
        eventType: 'request.fulfilled',
        memberId: member.id,
        resourceId: params.id,
        resourceType: 'request',
        visibility: request.visibility as 'pl_infra' | 'plaa_members',
      });
    }
  });

  /* pending Camille review — helping a colleague, never claiming a reward */
  return Response.json({ id: params.id, status: 'fulfilled', fulfilledByResourceId: body.resourceId });
}
