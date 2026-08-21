// Contribution-event outbox writer (F-6). /* pending Javier review */
// A row here is a PENDING contribution — never an award. The Activities
// review workflow decides what (if anything) is credited. This module has
// deliberately NO connection to upvotes, views, or downloads.

import { createHmac } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { VisibilityScope } from './membership';

export const ACTIVITY_SLUG = 'share-reusable-ai-resource';

// Delivery contract (TeamWork.md): retries 1s, 4s, 16s, 1m, 5m, 30m… capped
// at 8 attempts, then dead-letter. Attempts beyond the named schedule repeat
// the final 30m step.
export const MAX_DELIVERY_ATTEMPTS = 8;
const BACKOFF_MS = [1_000, 4_000, 16_000, 60_000, 300_000, 1_800_000];

/** Delay before retry number `attempt` (1-based: attempt 1 → 1s). */
export function backoffDelayMs(attempt: number): number {
  const idx = Math.max(0, Math.min(attempt - 1, BACKOFF_MS.length - 1));
  return BACKOFF_MS[idx];
}

/** HMAC-SHA256 over the raw request body → hex, for X-PLAA-Signature. */
export function signWebhookBody(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export type ContributionEventType = 'resource.submitted' | 'request.fulfilled';

export interface EnqueueArgs {
  eventType: ContributionEventType;
  memberId: string; // opaque LabOS id only — NO PII
  resourceId: string;
  resourceType: string;
  visibility: VisibilityScope;
}

/**
 * Insert an outbox row. MUST be called with the same transaction client that
 * writes the resource (transactional outbox — AC-6.1).
 */
export async function enqueueContributionEvent(client: PoolClient, args: EnqueueArgs): Promise<void> {
  await client.query(
    `INSERT INTO contribution_events
       (event_type, member_id, resource_id, activity_slug, visibility, review_status, next_attempt_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
    [args.eventType, args.memberId, args.resourceId, ACTIVITY_SLUG, args.visibility]
  );
}

export interface ContributionEventRow {
  event_id: string;
  event_type: string;
  occurred_at: Date | string;
  member_id: string;
  resource_id: string;
  resource_type: string; // joined from resources.type when selecting from the outbox
  activity_slug: string;
  visibility: string;
  review_status: string;
}

/**
 * EXACT webhook payload shape (push and pull identical — TeamWork.md contract).
 * Opaque IDs only: no names, emails, titles, free text, or file contents.
 * A schema test asserts no extra fields ever appear (AC-6.7).
 */
export function toWebhookPayload(row: ContributionEventRow) {
  return {
    event_id: row.event_id,
    event_type: row.event_type,
    occurred_at: new Date(row.occurred_at).toISOString(),
    member_id: row.member_id,
    resource_id: row.resource_id,
    resource_type: row.resource_type,
    activity_slug: row.activity_slug,
    visibility: row.visibility,
    review_status: 'pending' as const, // never an award
    source: 'plaa-knowledge-base' as const,
  };
}
