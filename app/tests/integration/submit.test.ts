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

  it('rejects sharing beyond PL Infra during the PL Infra-only phase', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'link',
        title: 'Too-wide audience',
        why: 'Verifies the current audience boundary',
        url: 'https://example.com/wide-audience',
        visibility: 'plaa_members',
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Resources can currently only be shared with PL Infra members.',
    });
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

  it('submitting with a collection slug joins that collection immediately', async () => {
    const { rows: cols } = await pool.query(
      'SELECT id, slug FROM collections WHERE auto_populate_rule IS NULL LIMIT 1'
    );
    if (cols.length === 0) return; // unseeded DB — nothing to assert against

    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'newsletter',
        title: 'Test newsletter in a collection',
        why: 'Checking collection membership on submit',
        url: 'https://example.com/test-submit-collection',
        collection: cols[0].slug,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    const { rows } = await pool.query(
      'SELECT 1 FROM collection_resources WHERE resource_id = $1 AND collection_id = $2',
      [body.id, cols[0].id]
    );
    expect(rows).toHaveLength(1);
  });

  it('rejects an unknown or rule-populated collection with 400', async () => {
    const res = await POST(
      jsonRequest(URL_BASE, 'POST', {
        type: 'link',
        title: 'Bad collection',
        why: 'Should not be accepted',
        url: 'https://example.com/test-bad-collection',
        collection: 'no-such-collection',
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
