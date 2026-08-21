// AC-6.7 / AC-6.C — the webhook payload carries opaque IDs only, exactly the
// contract keys, review_status always 'pending'. Verified against a REAL
// outbox row produced by a real submission.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as submitPOST } from '@/app/api/resources/route';
import { toWebhookPayload, type ContributionEventRow } from '@/lib/contributions';
import { pool } from '@/lib/db';
import { jsonRequest, cleanupResource } from '../helpers';

const CONTRACT_KEYS = [
  'event_id', 'event_type', 'occurred_at', 'member_id', 'resource_id',
  'resource_type', 'activity_slug', 'visibility', 'review_status', 'source',
].sort();

let resourceId: string;

beforeAll(async () => {
  const res = await submitPOST(
    jsonRequest('http://test.local/api/resources', 'POST', {
      type: 'link',
      title: 'Webhook payload schema test',
      why: 'payload schema test',
      url: 'https://example.com/webhook-schema-test',
    })
  );
  resourceId = (await res.json()).id;
});

afterAll(async () => {
  await cleanupResource(resourceId);
});

describe('compliance — webhook payload schema', () => {
  it('payload keys are EXACTLY the contract keys; review_status is pending', async () => {
    const { rows } = await pool.query<ContributionEventRow>(
      `SELECT ce.*, r.type AS resource_type
       FROM contribution_events ce JOIN resources r ON r.id = ce.resource_id
       WHERE ce.resource_id = $1`,
      [resourceId]
    );
    expect(rows).toHaveLength(1);
    const payload = toWebhookPayload(rows[0]);

    expect(Object.keys(payload).sort()).toEqual(CONTRACT_KEYS);
    expect(payload.review_status).toBe('pending'); // never an award
    expect(payload.source).toBe('plaa-knowledge-base');
    expect(payload.activity_slug).toBe('share-reusable-ai-resource');
    // No PII, titles, or free text anywhere in the serialized payload.
    const raw = JSON.stringify(payload);
    expect(raw).not.toContain('Webhook payload schema test'); // no title
    expect(raw).not.toContain('payload schema test'); // no why free text
    expect(raw).not.toMatch(/email|phone|name"/i);
  });
});
