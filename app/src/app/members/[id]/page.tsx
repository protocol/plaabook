'use client';
// Member profile — safe fields only (display name + avatar), stats card, and
// the member's shared resources. "Shared by you" routes here for the viewer.

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Icon } from '../../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { BrowseView } from '@/components/BrowseView';
import { apiGet } from '@/components/shared';

interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  stats: { shared: number; requestsAnswered: number; collectionsCurated: number };
}

function ProfileInner() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    apiGet<Profile>(`/api/members/${encodeURIComponent(id)}`).then(setProfile);
  }, [id]);

  /* pending Camille review — stat labels (design, verbatim) */
  const stats = profile
    ? [
        { value: profile.stats.shared, label: 'Resources shared' },
        { value: profile.stats.requestsAnswered, label: 'Requests answered' },
        { value: profile.stats.collectionsCurated, label: 'Collections curated' },
      ]
    : [];

  return (
    <BrowseView
      baseParams={{ submitter: id }}
      emptyState={
        <div className="rounded-xl bg-surface px-10 py-12 text-center shadow-card">
          {/* pending Camille review */}
          <p className="m-0 text-base text-secondary tracking-body">Nothing shared yet.</p>
        </div>
      }
      header={() => (
        <div className="pb-6">
          <NextLink
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-secondary no-underline hover:text-primary"
          >
            <Icon name="caret-left" size={14} />
            {/* pending Camille review */}
            Knowledge Base
          </NextLink>
          {profile && (
            <>
              <div className="flex items-center gap-4">
                <Avatar name={profile.displayName} src={profile.avatarUrl ?? undefined} size="xl" shape="circle" />
                <h1 className="m-0 text-[30px] font-medium leading-[38px] tracking-[-0.9px] text-primary">
                  {profile.displayName}
                </h1>
              </div>
              <div className="mt-6 flex gap-10 rounded-xl border border-border bg-surface px-6 py-4">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5">
                    <div className="text-[22px] font-medium leading-7 tracking-title text-primary">{s.value}</div>
                    <div className="text-xs text-tertiary tracking-body">{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    />
  );
}

export default function MemberProfilePage() {
  return (
    <AppShell>
      <ProfileInner />
    </AppShell>
  );
}
