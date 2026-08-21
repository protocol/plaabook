import { describe, it, expect, afterAll } from 'vitest';
import { POST } from '@/app/api/resources/route';
import { pool } from '@/lib/db';
import { jsonRequest, cleanupTestMemberRows, countEvents, TEST_MEMBER } from '../helpers';

const URL_BASE = 'http://test.local/api/resources';

afterAll(async () => {
  await cleanupTestMemberRows();
});

describe('POST /api/resources — F-1 submit', () => {
  it('link submit writes resource + contribution event in the same transaction (AC-6.1)', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'link',
        title: 'Test link resource',
        why: 'Worth a look for testing',
        url: 'https://example.com/test-submit-tx',
        visibility: 'pl_infra',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('Sent for review'); // exact status copy contract
    expect(body.id).toBeTruthy();

    const { rows } = await pool.query('SELECT * FROM resources WHERE id = $1', [body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].submitter_member_id).toBe(TEST_MEMBER);

    const { rows: events } = await pool.query(
      'SELECT * FROM contribution_events WHERE resource_id = $1',
      [body.id]
    );
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('resource.submitted');
    expect(events[0].member_id).toBe(TEST_MEMBER);
    expect(events[0].review_status).toBe('pending');
  });

  it('rejects an empty why-line with 400 (AC-1.6)', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'link',
        title: 'No why',
        why: '',
        url: 'https://example.com/no-why',
      })
    );
    expect(res.status).toBe(400);
  });

  it('rejects file submission without confidentiality ack with 400 (AC-1.7)', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'file',
        title: 'A file',
        why: 'test',
        confidentialityAck: false,
      })
    );
    expect(res.status).toBe(400);
  });

  it('rejects skill submission without confidentiality ack with 400 (AC-1.7)', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'skill',
        title: 'A skill',
        why: 'test',
        confidentialityAck: false,
      })
    );
    expect(res.status).toBe(400);
  });

  it('request type emits NO contribution event (F-5: fulfilment credits, not asking)', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'request',
        title: 'Does anyone have a test fixture?',
        why: 'Need it for a test',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(await countEvents(body.id)).toBe(0);
    expect(body.status).not.toBe('Sent for review'); // requests are not contributions
  });
});
