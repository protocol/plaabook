import { pool } from '@/lib/db';

export const TEST_MEMBER = 'test-member-plaabook';

export function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Delete everything a test created for a resource id (FK-safe order). */
export async function cleanupResource(id: string) {
  await pool.query('DELETE FROM contribution_events WHERE resource_id = $1', [id]);
  await pool.query('DELETE FROM audit_log WHERE entity_id = $1', [id]);
  await pool.query('DELETE FROM resources WHERE id = $1', [id]); // cascades tags/upvotes/files
}

export async function cleanupTestMemberRows() {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM resources WHERE submitter_member_id = $1',
    [TEST_MEMBER]
  );
  for (const r of rows) await cleanupResource(r.id);
  await pool.query('DELETE FROM audit_log WHERE actor_member_id = $1', [TEST_MEMBER]);
}

export async function countEvents(resourceId: string): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    'SELECT COUNT(*) AS n FROM contribution_events WHERE resource_id = $1',
    [resourceId]
  );
  return Number(rows[0].n);
}
