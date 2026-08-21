// F-1/F-2: controlled tag vocabulary (~12 seeded; WG-curated).

import { requireMember } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const { rows } = await query<{ slug: string; label: string }>(
    'SELECT slug, label FROM tags WHERE curated = TRUE ORDER BY label'
  );
  return Response.json({ tags: rows });
}
