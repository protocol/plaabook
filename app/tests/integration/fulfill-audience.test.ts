import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '@/lib/db';
import { cleanupResource, jsonRequest } from '../helpers';

// M1: a 'plaa_members' request may only be fulfilled by a 'plaa_members'
// resource — otherwise the wider audience is handed a reference it can't see.
const { POST: fulfillPOST } = await import('@/app/api/requests/[id]/fulfill/route');

let requestId: string;
let narrowResourceId: string;
let wideResourceId: string;

beforeAll(async () => {
  const ins = async (sql: string) => (await pool.query<{ id: string }>(sql)).rows[0].id;
  requestId = await ins(`
    INSERT INTO resources (type, title, why, submitter_member_id, submitter_display_name, visibility, request_status)
    VALUES ('request', 'audience test request', 'test', 'other-member', 'Other Member', 'plaa_members', 'open')
    RETURNING id`);
  narrowResourceId = await ins(`
    INSERT INTO resources (type, title, why, url, submitter_member_id, submitter_display_name, visibility)
    VALUES ('link', 'infra-only resource', 'test', 'https://example.com/audience-narrow', 'other-member', 'Other Member', 'pl_infra')
    RETURNING id`);
  wideResourceId = await ins(`
    INSERT INTO resources (type, title, why, url, submitter_member_id, submitter_display_name, visibility)
    VALUES ('link', 'plaa-wide resource', 'test', 'https://example.com/audience-wide', 'other-member', 'Other Member', 'plaa_members')
    RETURNING id`);
});

afterAll(async () => {
  await cleanupResource(requestId);
  await cleanupResource(narrowResourceId);
  await cleanupResource(wideResourceId);
});

describe('F-5 fulfilment audience coverage (M1)', () => {
  it('rejects fulfilling a plaa_members request with a pl_infra-only resource', async () => {
    const res = await fulfillPOST(
      jsonRequest(`http://test.local/api/requests/${requestId}/fulfill`, 'POST', { resourceId: narrowResourceId }),
      { params: { id: requestId } }
    );
    expect(res.status).toBe(400);
    const { rows } = await pool.query(`SELECT request_status FROM resources WHERE id = $1`, [requestId]);
    expect(rows[0].request_status).toBe('open');
  });

  it('accepts a plaa_members resource for a plaa_members request', async () => {
    const res = await fulfillPOST(
      jsonRequest(`http://test.local/api/requests/${requestId}/fulfill`, 'POST', { resourceId: wideResourceId }),
      { params: { id: requestId } }
    );
    expect(res.status).toBe(200);
    const { rows } = await pool.query(`SELECT request_status, fulfilled_by_resource_id FROM resources WHERE id = $1`, [requestId]);
    expect(rows[0].request_status).toBe('fulfilled');
    expect(rows[0].fulfilled_by_resource_id).toBe(wideResourceId);
  });
});
