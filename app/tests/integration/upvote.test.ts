import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as submitPOST } from '@/app/api/resources/route';
import { POST as upvotePOST, DELETE as upvoteDELETE } from '@/app/api/resources/[id]/upvote/route';
import { GET as detailGET } from '@/app/api/resources/[id]/route';
import { pool } from '@/lib/db';
import { jsonRequest, cleanupResource, countEvents } from '../helpers';

// A request-type resource emits no event on creation, so ANY event appearing
// later must have come from upvote/view — the exact leak AC-6.8 forbids.
let resourceId: string;

beforeAll(async () => {
  const res = await submitPOST(
    jsonRequest('http://test.local/api/resources', 'POST', {
      type: 'request',
      title: 'Upvote test target',
      why: 'upvote idempotency test',
    })
  );
  resourceId = (await res.json()).id;
});

afterAll(async () => {
  await cleanupResource(resourceId);
});

function ctx() {
  return { params: { id: resourceId } };
}

describe('F-3 upvote toggle', () => {
  it('double POST is idempotent — count stays 1 (AC-3.5)', async () => {
    const first = await upvotePOST(jsonRequest(`http://test.local/api/resources/${resourceId}/upvote`, 'POST'), ctx());
    expect(first.status).toBe(200);
    expect((await first.json()).upvoteCount).toBe(1);

    const second = await upvotePOST(jsonRequest(`http://test.local/api/resources/${resourceId}/upvote`, 'POST'), ctx());
    expect((await second.json()).upvoteCount).toBe(1);

    const { rows } = await pool.query('SELECT upvote_count FROM resources WHERE id = $1', [resourceId]);
    expect(rows[0].upvote_count).toBe(1);
  });

  it('DELETE removes the upvote', async () => {
    const res = await upvoteDELETE(jsonRequest(`http://test.local/api/resources/${resourceId}/upvote`, 'DELETE'), ctx());
    const body = await res.json();
    expect(body.upvoteCount).toBe(0);
    expect(body.viewerHasUpvoted).toBe(false);
  });

  it('upvote, view, and download emit NO contribution events (AC-3.6, AC-6.8)', async () => {
    await upvotePOST(jsonRequest(`http://test.local/api/resources/${resourceId}/upvote`, 'POST'), ctx());
    await detailGET(new Request(`http://test.local/api/resources/${resourceId}`), ctx()); // view
    // give the fire-and-forget view counter a tick
    await new Promise((r) => setTimeout(r, 100));
    expect(await countEvents(resourceId)).toBe(0);
  });
});
