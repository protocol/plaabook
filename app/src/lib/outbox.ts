// F-6 outbox delivery. /* pending Javier review — points-linkage seam */
// Drains contribution_events to $POINTS_WEBHOOK_URL with HMAC signing.
// Runs in-process (instrumentation interval) — NO worker process (384Mi budget).
// Deliberately no connection to upvotes, views, or downloads.

import { pool } from './db';
import {
  toWebhookPayload,
  backoffDelayMs,
  signWebhookBody,
  MAX_DELIVERY_ATTEMPTS,
  type ContributionEventRow,
} from './contributions';

const BATCH_LIMIT = 20;

let warnedNoUrl = false;

interface OutboxRow extends ContributionEventRow {
  attempts: number;
}

export async function deliverPendingEvents(): Promise<void> {
  const url = process.env.POINTS_WEBHOOK_URL;
  if (!url) {
    if (!warnedNoUrl) {
      warnedNoUrl = true;
      console.log('[outbox] POINTS_WEBHOOK_URL not set — push delivery disabled; pull endpoint still serves events');
    }
    return;
  }
  const secret = process.env.POINTS_WEBHOOK_SECRET;
  if (!secret) return; // instrumentation fails startup; belt-and-braces here

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<OutboxRow>(
      `SELECT e.event_id, e.event_type, e.occurred_at, e.member_id, e.resource_id,
              r.type AS resource_type, e.activity_slug, e.visibility, e.review_status, e.attempts
         FROM contribution_events e
         JOIN resources r ON r.id = e.resource_id
        WHERE e.delivered_at IS NULL
          AND e.dead_lettered = FALSE
          AND e.next_attempt_at <= NOW()
        ORDER BY e.occurred_at
        LIMIT $1
        FOR UPDATE OF e SKIP LOCKED`,
      [BATCH_LIMIT]
    );

    for (const row of rows) {
      const body = JSON.stringify(toWebhookPayload(row));
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = signWebhookBody(body, secret);

      let status: number | null = null;
      let error: string | null = null;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PLAA-Signature': signature,
            'X-PLAA-Timestamp': timestamp,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        status = res.status;
        if (!res.ok) error = `HTTP ${res.status}`;
      } catch (err) {
        error = err instanceof Error ? err.message.slice(0, 300) : 'network error';
      }

      if (status !== null && status >= 200 && status < 300) {
        await client.query(
          `UPDATE contribution_events
              SET delivered_at = NOW(), attempts = attempts + 1, last_error = NULL
            WHERE event_id = $1`,
          [row.event_id]
        );
      } else if (status !== null && status >= 400 && status < 500) {
        // 4xx is a contract problem, not transient — dead-letter immediately (PRD F-6).
        await client.query(
          `UPDATE contribution_events
              SET attempts = attempts + 1, dead_lettered = TRUE, last_error = $2
            WHERE event_id = $1`,
          [row.event_id, error]
        );
      } else {
        // 5xx or network failure — retry with backoff; dead-letter after cap.
        const attempts = row.attempts + 1;
        if (attempts >= MAX_DELIVERY_ATTEMPTS) {
          await client.query(
            `UPDATE contribution_events
                SET attempts = $2, dead_lettered = TRUE, last_error = $3
              WHERE event_id = $1`,
            [row.event_id, attempts, error]
          );
        } else {
          const delaySecs = backoffDelayMs(attempts) / 1000;
          await client.query(
            `UPDATE contribution_events
                SET attempts = $2, next_attempt_at = NOW() + make_interval(secs => $3), last_error = $4
              WHERE event_id = $1`,
            [row.event_id, attempts, delaySecs, error]
          );
        }
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[outbox] delivery pass failed:', err instanceof Error ? err.message : err);
  } finally {
    client.release();
  }
}
