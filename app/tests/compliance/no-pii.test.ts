// AC-1.C / AC-2.C — no email/phone-shaped keys in any API response payload.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as submitPOST, GET as listGET } from '@/app/api/resources/route';
import { GET as detailGET } from '@/app/api/resources/[id]/route';
import { toWebhookPayload, type ContributionEventRow } from '@/lib/contributions';
import { pool } from '@/lib/db';
import { jsonRequest, cleanupResource } from '../helpers';

const PII_KEY = /email|phone/i;

function collectKeys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      collectKeys(v, out);
    }
  }
  return out;
}

let resourceId: string;

beforeAll(async () => {
  const res = await submitPOST(
    jsonRequest('http://test.local/api/resources', 'POST', {
      type: 'link',
      title: 'PII scan target',
      why: 'pii key scan',
      url: 'https://example.com/pii-scan-test',
    })
  );
  resourceId = (await res.json()).id;
});

afterAll(async () => {
  await cleanupResource(resourceId);
});

describe('compliance — no PII keys in payloads', () => {
  it('list payload has no email/phone keys', async () => {
    const res = await listGET(new Request('http://test.local/api/resources'));
    const keys = collectKeys(await res.json());
    expect(keys.filter((k) => PII_KEY.test(k))).toEqual([]);
  });

  it('detail payload has no email/phone keys', async () => {
    const res = await detailGET(new Request(`http://test.local/api/resources/${resourceId}`), {
      params: { id: resourceId },
    });
    expect(res.status).toBe(200);
    const keys = collectKeys(await res.json());
    expect(keys.filter((k) => PII_KEY.test(k))).toEqual([]);
  });

  it('contribution payloads have no email/phone keys', async () => {
    const { rows } = await pool.query<ContributionEventRow>(
      `SELECT ce.*, r.type AS resource_type
       FROM contribution_events ce JOIN resources r ON r.id = ce.resource_id
       WHERE ce.resource_id = $1`,
      [resourceId]
    );
    const keys = collectKeys(rows.map(toWebhookPayload));
    expect(keys.filter((k) => PII_KEY.test(k))).toEqual([]);
  });
});
