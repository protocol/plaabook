'use client';
// The design's list frame — toolbar + why-first rows + states — shared by the
// index, collection views, and member profiles. All filtering and visibility
// scoping happens server-side; URL state carries only opaque values (AC-2.2).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../pl-design-system/components';
import {
  Toolbar,
  ResourceRowsCard,
  RowsSkeleton,
  ZeroResults,
  EmptyCorpus,
  type ToolbarState,
} from '@/components/kb';
import { trackEvent } from '@/lib/analytics';
import { apiGet, normalizeList, type ResourceSummary } from '@/components/shared';

export interface BrowseViewProps {
  /** Extra query params pinning the scope (collection slug, submitter id, upvotedBy). */
  baseParams?: Record<string, string>;
  /** Reflect q/type/tag/sort in the URL (index only). */
  syncUrl?: boolean;
  /** Rendered above the toolbar; receives whether a search is active. */
  header?: (searching: boolean) => ReactNode;
  /** Custom empty state when the scope has no rows and no search is active. */
  emptyState?: ReactNode;
}

export function BrowseView({ baseParams = {}, syncUrl = false, header, emptyState }: BrowseViewProps) {
  const router = useRouter();
  const urlParams = useSearchParams();

  const [local, setLocal] = useState<ToolbarState>({ q: '', type: '', tag: '', sort: 'recent' });
  const state: ToolbarState = syncUrl
    ? {
        q: urlParams.get('q') ?? '',
        type: urlParams.get('type') ?? '',
        tag: urlParams.get('tag') ?? '',
        sort: urlParams.get('sort') ?? 'recent',
      }
    : local;

  // Debounced query so typing doesn't fetch per keystroke.
  const [debouncedQ, setDebouncedQ] = useState(state.q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(state.q), 250);
    return () => clearTimeout(t);
  }, [state.q]);

  const onChange = useCallback(
    (patch: Partial<ToolbarState>) => {
      if (syncUrl) {
        const next = new URLSearchParams(urlParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (patch.sort === 'recent') next.delete('sort');
        router.replace(next.size ? `/?${next.toString()}` : '/', { scroll: false });
      } else {
        setLocal((prev) => ({ ...prev, ...patch }));
      }
    },
    [syncUrl, urlParams, router]
  );

  const listUrl = useMemo(() => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) u.set(k, v);
    if (debouncedQ) u.set('q', debouncedQ);
    if (state.type) u.set('type', state.type);
    if (state.tag) u.set('tag', state.tag);
    if (state.sort === 'useful') u.set('sort', 'upvotes');
    return `/api/resources${u.size ? `?${u.toString()}` : ''}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(baseParams), debouncedQ, state.type, state.tag, state.sort]);

  const [items, setItems] = useState<ResourceSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const zeroTracked = useRef('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<unknown>(listUrl).then((data) => {
      if (cancelled) return;
      const { items: rows, nextCursor: cursor } = normalizeList<ResourceSummary>(data);
      setItems(rows);
      setNextCursor(cursor);
      setLoading(false);
      if (debouncedQ && rows.length === 0 && zeroTracked.current !== listUrl) {
        zeroTracked.current = listUrl;
        // Never the query text — length only (no PII / no free text in analytics).
        trackEvent('search_zero_results', { queryLength: debouncedQ.length });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listUrl, debouncedQ]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const sep = listUrl.includes('?') ? '&' : '?';
    const data = await apiGet<unknown>(`${listUrl}${sep}cursor=${encodeURIComponent(nextCursor)}`);
    const { items: more, nextCursor: cursor } = normalizeList<ResourceSummary>(data);
    setItems((prev) => [...prev, ...more]);
    setNextCursor(cursor);
  }, [listUrl, nextCursor]);

  const searching = Boolean(debouncedQ);
  /* pending Camille review */
  const summary =
    `${items.length} ${items.length === 1 ? 'resource' : 'resources'}` + (state.tag ? ` tagged #${state.tag}` : '');

  return (
    <div>
      {header?.(searching)}
      <Toolbar state={state} onChange={onChange} />
      {loading ? (
        <RowsSkeleton />
      ) : items.length > 0 ? (
        <>
          <ResourceRowsCard rows={items} summary={summary} />
          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      ) : searching ? (
        <ZeroResults query={debouncedQ} onClear={() => onChange({ q: '' })} />
      ) : (
        emptyState ?? <EmptyCorpus />
      )}
    </div>
  );
}
