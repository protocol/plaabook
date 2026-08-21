'use client';
// Directory-style shell: top navbar, left-rail section nav, footer.
// Snapshot status bar deliberately OMITTED — this app surfaces no points (PRD §4.2).

import { useEffect, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { PageShell, Navbar, NavItem, Button, cn } from '../../pl-design-system/components';

/* pending Camille review */
const RAIL_ITEMS = [
  { href: '/', label: 'Browse' },
  { href: '/#collections', label: 'Collections' },
  { href: '/requests', label: 'Requests' },
  { href: '/submit', label: 'Share something' },
];

const ADMIN_ITEM = { href: '/admin', label: 'Admin' };

function LeftRail({ extra }: { extra?: ReactNode }) {
  const pathname = usePathname();
  // Admin nav only for admins (L3) — the admin routes 404 everyone else anyway.
  const [showAdmin, setShowAdmin] = useState(false);
  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setShowAdmin(Boolean(d?.member?.isAdmin)))
      .catch(() => {});
  }, []);
  const items = showAdmin ? [...RAIL_ITEMS, ADMIN_ITEM] : RAIL_ITEMS;
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Knowledge Base sections" className="rounded-lg border border-border bg-surface p-2 shadow-card">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href.replace(/#.*$/, '')) && item.href !== '/#collections';
            return (
              <li key={item.href}>
                <NextLink
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-base tracking-body',
                    active ? 'bg-selected text-brand font-medium' : 'text-secondary hover:bg-surface-sunken'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </NextLink>
              </li>
            );
          })}
        </ul>
      </nav>
      {extra}
    </div>
  );
}

export function AppShell({ children, railExtra }: { children: ReactNode; railExtra?: ReactNode }) {
  return (
    <>
      <PageShell
        navbar={
          <Navbar
            label="PLAAbook"
            logo={
              <NextLink href="/" className="flex items-center gap-2 no-underline">
                <span className="flex size-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-inverse">
                  PL
                </span>
                {/* pending Camille review */}
                <span className="text-lg font-semibold tracking-title text-primary">
                  PLAAbook — Knowledge Base
                </span>
              </NextLink>
            }
            actions={
              <NextLink href="/submit">
                {/* pending Camille review */}
                <Button variant="primary" size="sm">
                  Share something
                </Button>
              </NextLink>
            }
          >
            <NavItem href="/">Browse</NavItem>
            <NavItem href="/requests">Requests</NavItem>
          </Navbar>
        }
        sidebar={<LeftRail extra={railExtra} />}
      >
        {children}
        <footer className="mt-10 border-t border-border pt-4 pb-2">
          {/* pending Camille review */}
          <p className="text-sm text-tertiary tracking-body">
            PLAAbook — a members-only knowledge base for the PL Network. Shared resources are
            visible to the audience chosen at submission.
          </p>
        </footer>
      </PageShell>
    </>
  );
}
