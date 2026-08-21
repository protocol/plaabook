// WG admin surface. Server-side gate: non-admins get 404 (never confirm the
// page exists). Data tables are wired to admin endpoints and degrade gracefully
// while the backend lands.

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getMember, isAdmin } from '@/lib/auth';
import { AdminTabs } from './AdminTabs';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // getMember takes a Request; synthesize one carrying the incoming cookies.
  const cookieHeader = cookies()
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
  const member = await getMember(new Request('http://localhost/', { headers: { cookie: cookieHeader } }));
  if (!member || !isAdmin(member.id)) notFound();

  return <AdminTabs />;
}
