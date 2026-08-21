'use client';
// F-5: Requests — "does anyone have…?" Demand the corpus can't satisfy yet.
// Fulfilling copy reads as helping a colleague, never as claiming a reward.

import { Suspense, useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import {
  PageHeader,
  ListGrid,
  EmptyState,
  SkeletonCard,
  Button,
  Modal,
  SearchInput,
  Alert,
  Badge,
  Card,
  MetaRow,
  cn,
} from '../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import {
  apiGet,
  apiSend,
  normalizeList,
  type ResourceSummary,
  fmtDate,
  daysOld,
} from '@/components/shared';

function RequestCard({ request, onFulfill }: { request: ResourceSummary; onFulfill: (r: ResourceSummary) => void }) {
  const open = request.requestStatus === 'open';
  const stale = open && daysOld(request.createdAt) > 30;
  return (
    <Card className={cn('flex flex-col gap-3', stale && 'opacity-60')}>
      <div className="flex items-center gap-2">
        {/* pending Camille review */}
        <Badge tone={open ? 'info' : 'success'}>{open ? 'Looking for this' : 'Fulfilled'}</Badge>
      </div>
      <NextLink href={`/resources/${request.id}`} className="no-underline">
        <h3 className="text-lg font-semibold tracking-title text-primary">{request.title}</h3>
      </NextLink>
      <p className="text-base text-secondary tracking-body">{request.why}</p>
      <MetaRow items={[request.submitterDisplayName, fmtDate(request.createdAt)]} />
      {open ? (
        <div>
          {/* pending Camille review — helping a colleague, not claiming anything */}
          <Button size="sm" variant="secondary" onClick={() => onFulfill(request)}>
            I have something for this
          </Button>
        </div>
      ) : request.fulfilledByResourceId ? (
        <NextLink href={`/resources/${request.fulfilledByResourceId}`} className="text-sm text-link underline">
          {/* pending Camille review */}
          See what answered it
        </NextLink>
      ) : null}
    </Card>
  );
}

function FulfillModal({
  request,
  onClose,
  onFulfilled,
}: {
  request: ResourceSummary;
  onClose: () => void;
  onFulfilled: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResourceSummary[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiGet<unknown>(`/api/resources?q=${encodeURIComponent(query.trim())}`).then((d) =>
        setResults(
          normalizeList<ResourceSummary>(d)
            .items.filter((r) => r.type !== 'request')
            .slice(0, 5)
        )
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const fulfill = useCallback(
    async (resourceId: string) => {
      setBusy(true);
      setError('');
      const res = await apiSend(`/api/requests/${request.id}/fulfill`, 'POST', { resourceId });
      setBusy(false);
      if (res.ok) onFulfilled();
      /* pending Camille review */ else setError("That didn't work — the resource may not be visible to this request's audience.");
    },
    [request.id, onFulfilled]
  );

  return (
    <Modal
      open
      onClose={onClose}
      /* pending Camille review */
      title="Answer this request"
      supporting={`Point ${request.submitterDisplayName} at something that already exists, or share something new.`}
    >
      <div className="flex flex-col gap-4">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onClear={() => setQuery('')}
          placeholder="Search the Knowledge Base"
        />
        {results.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-primary tracking-body">{r.title}</p>
              <p className="truncate text-sm text-tertiary tracking-body">{r.why}</p>
            </div>
            <Button size="sm" variant="secondary" loading={busy} onClick={() => fulfill(r.id)}>
              Use this
            </Button>
          </div>
        ))}
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="border-t border-border pt-3">
          <NextLink href={`/submit?fulfills=${encodeURIComponent(request.id)}`}>
            {/* pending Camille review */}
            <Button variant="primary">Share something new for it</Button>
          </NextLink>
        </div>
      </div>
    </Modal>
  );
}

function RequestsInner() {
  const [items, setItems] = useState<ResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [fulfilling, setFulfilling] = useState<ResourceSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<unknown>('/api/resources?type=request').then((d) => {
      if (cancelled) return;
      if (d === null) setDegraded(true);
      else {
        setDegraded(false);
        const rows = normalizeList<ResourceSummary>(d).items;
        // Open first (fresh before stale), then fulfilled.
        rows.sort((a, b) => {
          const ao = a.requestStatus === 'open' ? 0 : 1;
          const bo = b.requestStatus === 'open' ? 0 : 1;
          if (ao !== bo) return ao - bo;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setItems(rows);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <AppShell>
      <PageHeader
        /* pending Camille review */
        title="Requests"
        description="Things colleagues are looking for. If you have it, share it — someone is waiting on it."
        actions={
          <NextLink href="/submit?type=request">
            {/* pending Camille review */}
            <Button variant="primary">Ask for something</Button>
          </NextLink>
        }
      />

      {degraded && (
        /* pending Camille review */
        <Alert tone="warning" className="mb-4">
          Requests couldn&apos;t be loaded right now. Try again in a moment.
        </Alert>
      )}

      {loading ? (
        <ListGrid>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ListGrid>
      ) : items.length === 0 && !degraded ? (
        <EmptyState
          /* pending Camille review */
          title="No open requests"
          description="Looking for a doc, Skill, or recommendation that isn't in the Knowledge Base? Ask the network."
          action={
            <NextLink href="/submit?type=request">
              <Button variant="primary">Ask for something</Button>
            </NextLink>
          }
        />
      ) : (
        <ListGrid>
          {items.map((r) => (
            <RequestCard key={r.id} request={r} onFulfill={setFulfilling} />
          ))}
        </ListGrid>
      )}

      {fulfilling && (
        <FulfillModal
          request={fulfilling}
          onClose={() => setFulfilling(null)}
          onFulfilled={() => {
            setFulfilling(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </AppShell>
  );
}

export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsInner />
    </Suspense>
  );
}
