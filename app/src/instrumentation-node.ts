// Node-runtime startup: fail loudly on missing signing secret, then start the
// in-process outbox drain interval.

import { deliverPendingEvents } from './lib/outbox';

declare global {
  // eslint-disable-next-line no-var
  var __plaabookOutboxTimer: NodeJS.Timeout | undefined;
}

// Fail startup loudly rather than deliver unsigned events (PRD F-6).
if (process.env.POINTS_WEBHOOK_URL && !process.env.POINTS_WEBHOOK_SECRET) {
  throw new Error(
    'POINTS_WEBHOOK_URL is set but POINTS_WEBHOOK_SECRET is missing — refusing to start rather than deliver unsigned contribution events.'
  );
}

if (!globalThis.__plaabookOutboxTimer) {
  globalThis.__plaabookOutboxTimer = setInterval(() => {
    deliverPendingEvents().catch(() => {});
  }, 15_000);
  globalThis.__plaabookOutboxTimer.unref();
}
