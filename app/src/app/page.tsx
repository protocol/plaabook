'use client';
// F-2: Browse & Search — Collections, full-text search, filters, resource list.
// All filtering/visibility happens server-side; this page only reflects it.
// URL state carries only queries/filters/opaque ids — never PII (AC-2.2).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PageHeader,
  SearchInput,
  ListGrid,
  EntityCard,
  EmptyState,
  SkeletonCard,
  Button,
  Alert,
  FilterPanel,
  FilterSection,
  CheckboxList,
  CheckboxListItem,
  Field,
  Select,
} from '../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { ResourceCard } from '@/components/ResourceCard';
import { trackEvent } from '@/lib/analytics';
import {
  apiGet,
  normalizeList,
  type ResourceSummary,
  type TagRow,
  type CollectionRow,
  TYPE_LABELS,
} from '@/components/shared';

const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [ResourceSummary['type'], string][];

const SORT_OPTIONS = [
  /* pending Camille review */
  { value: 'recent', label: 'Most recent' },
  { value: 'useful', label: 'Most useful' },
];

function BrowseInner() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'recent';
  const collection = params.get('collection') ?? '';

  const [input, setInput] = useState(q);
  const [items, setItems] = useState<ResourceSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const zeroTracked = useRef('');

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(next.size ? `/?${next.toString()}` : '/', { scroll: false });
    },
    [params, router]
  );

  const listUrl = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (type) u.set('type', type);
    if (tag) u.set('tag', tag);
    if (sort !== 'recent') u.set('sort', sort);
    if (collection) u.set('collection', collection);
    return `/api/resources${u.size ? `?${u.toString()}` : ''}`;
  }, [q, type, tag, sort, collection]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<unknown>(listUrl).then((data) => {
      if (cancelled) return;
      if (data === null) {
        setDegraded(true);
        setItems([]);
        setNextCursor(null);
      } else {
        setDegraded(false);
        const { items: rows, nextCursor: cursor } = normalizeList<ResourceSummary>(data);
        setItems(rows);
        setNextCursor(cursor);
        if (q && rows.length === 0 && zeroTracked.current !== listUrl) {
          zeroTracked.current = listUrl;
          // Never the query text — length only (no PII / no free text in analytics).
          trackEvent('search_zero_results', { queryLength: q.length });
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [listUrl, q]);

  useEffect(() => {
    apiGet<unknown>('/api/tags').then((d) => setTags(normalizeList<TagRow>(d).items));
    apiGet<unknown>('/api/collections').then((d) => setCollections(normalizeList<CollectionRow>(d).items));
  }, []);

  useEffect(() => setInput(q), [q]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const sep = listUrl.includes('?') ? '&' : '?';
    const data = await apiGet<unknown>(`${listUrl}${sep}cursor=${encodeURIComponent(nextCursor)}`);
    const { items: more, nextCursor: cursor } = normalizeList<ResourceSummary>(data);
    setItems((prev) => [...prev, ...more]);
    setNextCursor(cursor);
  }, [listUrl, nextCursor]);

  const hasFilters = Boolean(q || type || tag || collection);
  const emptyCorpus = !loading && !degraded && items.length === 0 && !hasFilters;

  const filterRail = (
    <FilterPanel
      onClearAll={hasFilters ? () => router.replace('/', { scroll: false }) : undefined}
      appliedCount={[q, type, tag, collection].filter(Boolean).length}
    >
      <FilterSection title="Type">
        <CheckboxList label="Type">
          {TYPE_OPTIONS.map(([value, label]) => (
            <CheckboxListItem
              key={value}
              checked={type === value}
              onChange={(checked) => setParam('type', checked ? value : '')}
            >
              {label}
            </CheckboxListItem>
          ))}
        </CheckboxList>
      </FilterSection>
      <FilterSection title="Tag">
        <CheckboxList label="Tag" maxHeight={260}>
          {tags.map((t) => (
            <CheckboxListItem
              key={t.slug}
              checked={tag === t.slug}
              onChange={(checked) => setParam('tag', checked ? t.slug : '')}
            >
              {t.label}
            </CheckboxListItem>
          ))}
        </CheckboxList>
      </FilterSection>
      <FilterSection title="Sort">
        <Field label="Sort by" orientation="stacked">
          <Select options={SORT_OPTIONS} value={sort} onChange={(v) => setParam('sort', v)} />
        </Field>
      </FilterSection>
    </FilterPanel>
  );

  return (
    <AppShell railExtra={filterRail}>
      <PageHeader
        /* pending Camille review */
        title="Knowledge Base"
        description="What the network has found worth sharing — docs, Skills, newsletters, and creators."
        actions={
          <NextLink href="/submit">
            {/* pending Camille review */}
            <Button variant="primary">Share something</Button>
          </NextLink>
        }
      />

      {degraded && (
        /* pending Camille review */
        <Alert tone="warning" title="Search is temporarily unavailable" className="mb-4">
          Showing what we can. Try again in a moment.
        </Alert>
      )}

      {collections.length > 0 && (
        <section id="collections" className="mb-6">
          <h2 className="mb-3 text-lg font-semibold tracking-title text-primary">Collections</h2>
          <ListGrid>
            {collections.map((c) => (
              <EntityCard
                key={c.slug}
                title={c.title}
                href={`/?collection=${encodeURIComponent(c.slug)}`}
                description={c.description ?? undefined}
                badge={typeof c.resourceCount === 'number' ? `${c.resourceCount} resources` : undefined}
              />
            ))}
          </ListGrid>
        </section>
      )}

      <SearchInput
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setParam('q', input.trim());
        }}
        onBlur={() => {
          if (input.trim() !== q) setParam('q', input.trim());
        }}
        onClear={() => {
          setInput('');
          setParam('q', '');
        }}
        placeholder="Search titles, context, tags, and file text"
        containerClassName="mb-4"
      />

      {loading ? (
        <ListGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ListGrid>
      ) : items.length === 0 && q ? (
        <EmptyState
          /* pending Camille review */
          title={`Nothing here yet for “${q}”`}
          description="No one has shared this yet — ask the network and someone may have it."
          action={
            <NextLink href={`/submit?type=request&q=${encodeURIComponent(q)}`}>
              {/* pending Camille review */}
              <Button variant="primary">Ask the network for it</Button>
            </NextLink>
          }
        />
      ) : emptyCorpus ? (
        <EmptyState
          /* pending Camille review */
          title="The Knowledge Base is just getting started"
          description="Be the first to share a doc, Skill, or reading recommendation."
          action={
            <NextLink href="/submit">
              <Button variant="primary">Share something</Button>
            </NextLink>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          /* pending Camille review */
          title="No resources match these filters"
          description="Try removing a filter or broadening your search."
          action={<Button onClick={() => router.replace('/', { scroll: false })}>Clear filters</Button>}
        />
      ) : (
        <>
          <ListGrid>
            {items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </ListGrid>
          {nextCursor && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseInner />
    </Suspense>
  );
}
