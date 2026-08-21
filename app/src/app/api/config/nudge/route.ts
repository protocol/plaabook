// Confidentiality nudge copy — versioned in the config table so Camille can
// revise it without a deploy (F-1). /* pending Camille review */

import { requireMember } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await requireMember(req);
  if (member instanceof Response) return member;

  const copy = await getConfig('confidentiality_nudge_copy');
  return Response.json({ copy });
}
