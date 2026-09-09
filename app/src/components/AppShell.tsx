'use client';
// Shell: slim top bar (LabOS Directory nav is a placeholder — deliberately not
// reproduced) + the design's left rail (Browse / Yours groups with live counts).
// Snapshot status bar deliberately OMITTED — this app surfaces no points (PRD §4.2).

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageShell, Navbar, NavItem, Button, Icon, cn, type IconName } from '../../pl-design-system/components';
import { SubmitProvider, useSubmit } from '@/components/SubmitModal';
import { apiGet } from '@/components/shared';

interface Stats {
  everything: number;
  collections: number;
  requests: number;
  mine: number;
  useful: number;
}

type RailKey = 'everything' | 'collections' | 'requests' | 'mine' | 'useful' | 'admin' | null;

function useRailKey(selfId: string | null): RailKey {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname.startsWith('/collections')) return 'collections';
  if (pathname.startsWith('/admin')) return 'admin';
  if (selfId && pathname === `/members/${selfId}`) return 'mine';
  if (pathname === '/') {
    if (params.get('useful') === '1') return 'useful';
    if (params.get('type') === 'request') return 'requests';
    return 'everything';
  }
  return null;
}

function RailButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  count: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-10 border-none px-3',
        'text-base font-medium tracking-body transition-colors',
        active ? 'bg-selected text-brand' : 'bg-transparent text-secondary hover:bg-brand-faint'
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon name={icon} size={16} />
        {label}
      </span>
      {count !== null && (
        <span className={cn('text-xs tracking-body', active ? 'text-brand' : 'text-tertiary')}>{count}</span>
      )}
    </button>
  );
}

function LeftRail() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const active = useRailKey(selfId);

  useEffect(() => {
    apiGet<Stats>('/api/stats').then(setStats);
    apiGet<{ member?: { id?: string; isAdmin?: boolean } | null }>('/api/me').then((d) => {
      setSelfId(d?.member?.id ?? null);
      setShowAdmin(Boolean(d?.member?.isAdmin));
    });
  }, []);

  return (
    <nav aria-label="Knowledge Base sections" className="flex flex-col gap-1">
      <RailButton
        active={active === 'everything'}
        icon="cube"
        label="Everything"
        count={stats?.everything ?? null}
        onClick={() => router.push('/')}
      />
      <RailButton
        active={active === 'collections'}
        icon="diamond"
        label="Collections"
        count={stats?.collections ?? null}
        onClick={() => router.push('/collections')}
      />
      <RailButton
        active={active === 'requests'}
        icon="search"
        label="Requests"
        count={stats?.requests ?? null}
        onClick={() => router.push('/?type=request')}
      />
      <div className="mx-3 my-3.5 h-px bg-border" />
      {/* pending Camille review */}
      <div className="px-3 pb-2 text-[11px] font-semibold leading-4 text-tertiary tracking-body">Yours</div>
      <RailButton
        active={active === 'mine'}
        icon="user-circle"
        label="Shared by you"
        count={stats?.mine ?? null}
        onClick={() => selfId && router.push(`/members/${selfId}`)}
      />
      <RailButton
        active={active === 'useful'}
        icon="arrow-fat-up"
        label="Found useful"
        count={stats?.useful ?? null}
        onClick={() => router.push('/?useful=1')}
      />
      {showAdmin && (
        <>
          <div className="mx-3 my-3.5 h-px bg-border" />
          <RailButton active={active === 'admin'} icon="grid" label="Admin" count={null} onClick={() => router.push('/admin')} />
        </>
      )}
    </nav>
  );
}

function ShareButton() {
  const { open } = useSubmit();
  return (
    /* pending Camille review */
    <Button variant="primary" size="sm" iconStart={<Icon name="plus" size={14} />} onClick={() => open()}>
      Share something
    </Button>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  return (
    <PageShell
      navbar={
        <Navbar
          label="PLaybook"
          logo={
            <NextLink href="/" className="flex items-center gap-2 no-underline">
              <span className="flex size-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-inverse">
                PL
              </span>
              {/* pending Camille review */}
              <span className="text-lg font-semibold tracking-title text-primary">PLaybook</span>
            </NextLink>
          }
          actions={<ShareButton />}
        >
          <NavItem href="/">Knowledge Base</NavItem>
        </Navbar>
      }
      sidebar={<LeftRail />}
    >
      {children}
    </PageShell>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SubmitProvider>
      <Suspense>
        <ShellInner>{children}</ShellInner>
      </Suspense>
    </SubmitProvider>
  );
}
