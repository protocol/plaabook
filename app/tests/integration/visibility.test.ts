import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { pool } from '@/lib/db';
import { cleanupResource, TEST_MEMBER } from '../helpers';

// Narrow the viewer to pl_infra only — the stub grants both scopes, so the
// out-of-scope case is exercised by mocking the adapter (per task spec).
vi.mock('@/lib/membership', () => ({
  membership: { getScopes: async (member: unknown) => (member ? ['pl_infra'] : []) },
}));

const { GET: listGET } = await import('@/app/api/resources/route');
const { GET: detailGET } = await import('@/app/api/resources/[id]/route');

let outOfScopeId: string;

beforeAll(async () => {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO resources (type, title, why, url, submitter_member_id, submitter_display_name, visibility)
     VALUES ('link', 'PLAA-wide secret-scope test row', 'visibility leak test', 'https://example.com/vis-test',
             'other-member', 'Other Member', 'plaa_members')
     RETURNING id`
  );
  outOfScopeId = rows[0].id;
});

afterAll(async () => {
  await cleanupResource(outOfScopeId);
  vi.restoreAllMocks();
});

describe('F-4 visibility enforcement (server-side, raw payload)', () => {
  it('out-of-scope resource is absent from the raw list payload (AC-4.1, AC-2.4)', async () => {
    const res = await listGET(new Request('http://test.local/api/resources'));
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain(outOfScopeId);
    expect(raw).not.toContain('secret-scope test row');
  });

  it('out-of-scope detail returns 404 (not 403) and writes an audit entry (AC-3.2, AC-4.C)', async () => {
    const before = await pool.query(
      `SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'denied_access' AND entity_id = $1`,
      [outOfScopeId]
    );
    const res = await detailGET(new Request(`http://test.local/api/resources/${outOfScopeId}`), {
      params: { id: outOfScopeId },
    });
    expect(res.status).toBe(404);
    const after = await pool.query(
      `SELECT COUNT(*)::int AS n, MAX(actor_member_id) AS actor
       FROM audit_log WHERE action = 'denied_access' AND entity_id = $1`,
      [outOfScopeId]
    );
    expect(after.rows[0].n).toBe(before.rows[0].n + 1);
    expect(after.rows[0].actor).toBe(TEST_MEMBER);
  });

  it('unauthenticated scope resolution fails closed to nothing', async () => {
    const { membership } = await import('@/lib/membership');
    expect(await membership.getScopes(null)).toEqual([]);
  });
});
