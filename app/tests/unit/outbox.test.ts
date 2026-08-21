import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  backoffDelayMs,
  signWebhookBody,
  toWebhookPayload,
  MAX_DELIVERY_ATTEMPTS,
  ACTIVITY_SLUG,
} from '@/lib/contributions';

describe('backoff schedule (AC-6.3)', () => {
  it('follows 1s, 4s, 16s, 1m, 5m, 30m', () => {
    expect(backoffDelayMs(1)).toBe(1_000);
    expect(backoffDelayMs(2)).toBe(4_000);
    expect(backoffDelayMs(3)).toBe(16_000);
    expect(backoffDelayMs(4)).toBe(60_000);
    expect(backoffDelayMs(5)).toBe(300_000);
    expect(backoffDelayMs(6)).toBe(1_800_000);
  });

  it('repeats the final step beyond the named schedule, capped at 8 attempts', () => {
    expect(backoffDelayMs(7)).toBe(1_800_000);
    expect(backoffDelayMs(8)).toBe(1_800_000);
    expect(MAX_DELIVERY_ATTEMPTS).toBe(8);
  });
});

describe('HMAC signing (AC-6.2)', () => {
  it('matches an independently computed HMAC-SHA256 hex digest', () => {
    const body = JSON.stringify({ event_id: 'abc', event_type: 'resource.submitted' });
    const secret = 'test-secret';
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    expect(signWebhookBody(body, secret)).toBe(expected);
  });

  it('changes with the secret', () => {
    expect(signWebhookBody('x', 'a')).not.toBe(signWebhookBody('x', 'b'));
  });
});

describe('toWebhookPayload shape (AC-6.7)', () => {
  const row = {
    event_id: 'e1',
    event_type: 'resource.submitted',
    occurred_at: '2026-07-24T14:22:03Z',
    member_id: 'm1',
    resource_id: 'r1',
    resource_type: 'skill',
    activity_slug: ACTIVITY_SLUG,
    visibility: 'pl_infra',
    review_status: 'pending',
  };

  it('emits exactly the contract keys — no PII fields possible', () => {
    const payload = toWebhookPayload(row);
    expect(Object.keys(payload).sort()).toEqual(
      [
        'event_id', 'event_type', 'occurred_at', 'member_id', 'resource_id',
        'resource_type', 'activity_slug', 'visibility', 'review_status', 'source',
      ].sort()
    );
    expect(payload.review_status).toBe('pending'); // never an award
    expect(payload.source).toBe('plaa-knowledge-base');
    expect(payload.occurred_at).toBe('2026-07-24T14:22:03.000Z');
  });
});
