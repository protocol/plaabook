// Safe-fields-only viewer context for the shell (display name, avatar, admin
// flag for nav gating). Never email or any private profile field (PRD §0).

import { getMember, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const member = await getMember(req);
  if (!member) return Response.json({ member: null });
  return Response.json({
    member: {
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      isAdmin: isAdmin(member.id),
    },
  });
}
