// Server-side member resolution against the LabOS member-context endpoint.
// Safe fields only: id (opaque uid), displayName, avatarUrl. Never email.

const MEMBER_CONTEXT_URL = 'https://api-directory.os.pl.xyz/v1/ai-apps/me';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 500; // ponytail: bounded Map cache; LRU if member count outgrows this

export interface Member {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

const cache = new Map<string, { member: Member | null; expires: number }>();

function readAuthToken(req: Request): string | null {
  const cookie = req.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)authToken=([^;]*)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1]).replace(/^"|"$/g, '');
  return raw || null;
}

export async function getMember(req: Request): Promise<Member | null> {
  const token = readAuthToken(req);
  if (!token) {
    // Local-dev identity only — never authenticates anything in production (L4).
    if (process.env.DEV_MEMBER_ID && process.env.NODE_ENV !== 'production') {
      return {
        id: process.env.DEV_MEMBER_ID,
        displayName: process.env.DEV_MEMBER_NAME || 'Dev Member',
        avatarUrl: null,
      };
    }
    return null;
  }

  const cached = cache.get(token);
  if (cached && cached.expires > Date.now()) return cached.member;

  let member: Member | null = null;
  try {
    const res = await fetch(MEMBER_CONTEXT_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const body = (await res.json()) as { member?: { uid?: string; name?: string; image?: string } };
      const m = body.member;
      if (m?.uid) {
        member = { id: m.uid, displayName: m.name || 'Member', avatarUrl: m.image || null };
      }
    }
  } catch {
    member = null; // network error — treat as signed out (fail closed)
  }

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(token, { member, expires: Date.now() + CACHE_TTL_MS });
  return member;
}

/** Returns the member, or a 401 Response the route should return as-is. */
export async function requireMember(req: Request): Promise<Member | Response> {
  const member = await getMember(req);
  if (!member) {
    return Response.json(
      /* pending Camille review */
      { error: 'Sign in through the PL Directory to use the Knowledge Base.' },
      { status: 401 }
    );
  }
  return member;
}

// Admins baked into the app (survive redeploys without any LabOS env config).
// Add a member's opaque LabOS uid here to grant them the WG admin surface.
const DEFAULT_ADMIN_MEMBER_IDS: string[] = [
  'cmq8d7vhr00nlny4g33b74d9t', // owner / working-group admin
];

export function isAdmin(memberId: string): boolean {
  const envIds = (process.env.ADMIN_MEMBER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return DEFAULT_ADMIN_MEMBER_IDS.includes(memberId) || envIds.includes(memberId);
}
