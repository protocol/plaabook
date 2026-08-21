'use client';
// Baseline PLN app analytics — per ai-app-starter-kit-v1.9 app-analytics skill.
// Fire-and-forget; a failure here must never affect the app.

const ANALYTICS_URL = 'https://api-directory.plnetwork.io/v1/ai-apps/track';

export function readAuthToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]*)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1]).replace(/^"|"$/g, '');
  return raw || null;
}

function getAnonId(): string {
  let id = localStorage.getItem('pln_anon_id');
  if (!id) {
    id = `anon:${crypto.randomUUID()}`;
    localStorage.setItem('pln_anon_id', id);
  }
  return id;
}

export function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  try {
    const token = readAuthToken();
    const body = JSON.stringify({ event: name, properties, anonId: token ? undefined : getAnonId() });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    fetch(ANALYTICS_URL, { method: 'POST', headers, body, keepalive: true }).catch(() => {});
  } catch {
    /* never throw into the caller */
  }
}

let initialized = false;
export function initAppAnalytics() {
  if (initialized) return;
  initialized = true;
  const openedAt = Date.now();
  trackEvent('opened');

  let errorCount = 0;
  const MAX_ERROR_EVENTS = 5;
  function trackErrorOnce(message: unknown, errorSource: string) {
    if (errorCount >= MAX_ERROR_EVENTS) return;
    errorCount += 1;
    trackEvent('error', { message: String(message).slice(0, 300), errorSource });
  }
  window.addEventListener('error', (e) => trackErrorOnce(e.message, 'window.onerror'));
  window.addEventListener('unhandledrejection', (e) =>
    trackErrorOnce(e.reason && (e.reason as Error).message ? (e.reason as Error).message : String(e.reason), 'unhandledrejection')
  );

  let closedSent = false;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !closedSent) {
      closedSent = true;
      trackEvent('closed', { durationMs: Date.now() - openedAt });
    } else if (document.visibilityState === 'visible') {
      closedSent = false;
    }
  });
}
