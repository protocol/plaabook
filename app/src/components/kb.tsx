'use client';
// KB list-frame building blocks shared by index, collection view, and profile:
// toolbar, why-first resource rows, zero-result / empty states, collections
// strip, and a small toast. Every row renders the why line (AC-2.6).

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SearchInput,
  Tabs,
  TabList,
  Tab,
  Select,
  Badge,
  Tag,
  Avatar,
  Icon,
  Button,
  cn,
  type IconName,
} from '../../pl-design-system/components';
import { useSubmit } from '@/components/SubmitModal';
import {
  apiSend,
  daysOld,
  fmtWhen,
  TYPE_META,
  VIS_SHORT,
  type CollectionRow,
  type ResourceSummary,
} from '@/components/shared';

// ---------------------------------------------------------------------------
// Type tabs + sort (design toolbar)

/* pending Camille review — tab labels (design, verbatim) */
export const TYPE_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'link', label: 'Links' },
  { value: 'file', label: 'Docs' },
  { value: 'reading', label: 'Reading' },
  { value: 'request', label: 'Requests' },
];

/* pending Camille review */
export const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'useful', label: 'Most useful' },
];

export interface ToolbarState {
  q: string;
  type: string;
  tag: string;
  sort: string;
}

export function Toolbar({
  state,
  onChange,
}: {
  state: ToolbarState;
  onChange: (patch: Partial<ToolbarState>) => void;
}) {
  const [input, setInput] = useState(state.q);
  useEffect(() => setInput(state.q), [state.q]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <SearchInput
          value={input}
          onChange={(e) => {
            setInput(e.currentTarget.value);
            onChange({ q: e.currentTarget.value });
          }}
          onClear={() => {
            setInput('');
            onChange({ q: '' });
          }}
          /* pending Camille review */
          placeholder="Search titles, notes, tags, and file contents"
          containerClassName="max-w-[420px] flex-none max-md:max-w-full"
        />
        <Tabs appearance="fill" value={state.type || 'all'} onValueChange={(v) => onChange({ type: v === 'all' ? '' : v })}>
          <TabList label="Type">
            {TYPE_TABS.map((t) => (
              <Tab key={t.value} value={t.value}>
                {t.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <div className="ml-auto">
          <Select
            options={SORT_OPTIONS}
            value={state.sort || 'recent'}
            onChange={(v) => onChange({ sort: v })}
            className="w-[150px]"
          />
        </div>
      </div>
      {state.tag && (
        <div className="flex items-center gap-2 pb-4">
          {/* pending Camille review */}
          <span className="text-xs text-tertiary tracking-body">Filtered by</span>
          <Tag tone="brand" onClick={() => onChange({ tag: '' })}>
            #{state.tag}
            <Icon name="close" size={12} />
          </Tag>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Resource rows — the single white card with why-first rows.

function VotePill({
  resource,
  size = 'sm',
}: {
  resource: ResourceSummary;
  size?: 'sm' | 'lg';
}) {
  const [voted, setVoted] = useState(Boolean(resource.viewerHasUpvoted));
  const [count, setCount] = useState(resource.upvoteCount);
  useEffect(() => {
    setVoted(Boolean(resource.viewerHasUpvoted));
    setCount(resource.upvoteCount);
  }, [resource.id, resource.viewerHasUpvoted, resource.upvoteCount]);

  // Optimistic idempotent toggle (AC-3.5). Emits NO contribution event by design.
  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = !voted;
      setVoted(next);
      setCount((n) => n + (next ? 1 : -1));
      const res = await apiSend<{ upvoteCount?: number }>(`/api/resources/${resource.id}/upvote`, next ? 'POST' : 'DELETE');
      if (!res.ok) {
        setVoted(!next);
        setCount((n) => n + (next ? -1 : 1));
      } else if (typeof res.data?.upvoteCount === 'number') {
        setCount(res.data.upvoteCount);
      }
    },
    [resource.id, voted]
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={voted}
      /* pending Camille review — recognition only, never a reward */
      aria-label="Useful"
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-pill border font-medium tracking-body transition-colors',
        size === 'lg' ? 'h-10 px-3.5 text-base' : 'h-8 px-2.5 text-sm',
        voted
          ? 'border-border-brand bg-selected text-brand'
          : 'border-border bg-action-neutral-light text-secondary hover:bg-hover'
      )}
    >
      <Icon name="arrow-fat-up" size={size === 'lg' ? 18 : 16} className={voted ? 'fill-current' : undefined} />
      {count}
    </button>
  );
}

function statusBadge(r: ResourceSummary): ReactNode {
  if (r.type !== 'request') return null;
  if (r.requestStatus === 'fulfilled') {
    /* pending Camille review */
    return <Badge tone="success">Fulfilled</Badge>;
  }
  const days = Math.floor(daysOld(r.createdAt));
  if (days > 30) {
    /* pending Camille review */
    return <Badge tone="warning">Open {days} days</Badge>;
  }
  /* pending Camille review */
  return <Badge tone="warning">Open request</Badge>;
}

export function ResourceRow({ resource: r }: { resource: ResourceSummary }) {
  const router = useRouter();
  const meta = TYPE_META[r.type];
  const stale = r.type === 'request' && r.requestStatus === 'open' && daysOld(r.createdAt) > 30;

  return (
    <div
      onClick={() => router.push(`/resources/${r.id}`)}
      className={cn(
        'flex cursor-pointer gap-4 border-t border-border-subtle px-6 py-5 transition-colors first:border-t-0 hover:bg-brand-faint',
        stale && 'opacity-55'
      )}
    >
      <div className={cn('flex size-11 flex-none items-center justify-center rounded-10', meta.tile)}>
        <Icon name={meta.icon} size={20} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <NextLink
            href={`/resources/${r.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium leading-[18px] text-secondary no-underline tracking-body hover:text-primary"
          >
            {r.title}
          </NextLink>
          {statusBadge(r)}
        </div>
        {/* The why line — what makes a result judgeable at a glance (AC-2.6). */}
        <p className="m-0 max-w-[660px] text-[17px] leading-[26px] tracking-[-0.35px] text-primary [text-wrap:pretty]">
          {r.why}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-px">
          <Avatar name={r.submitterDisplayName} src={r.submitterAvatarUrl ?? undefined} size="xs" shape="circle" />
          {r.submitterMemberId ? (
            <NextLink
              href={`/members/${r.submitterMemberId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-secondary no-underline tracking-body hover:text-primary"
            >
              {r.submitterDisplayName}
            </NextLink>
          ) : (
            <span className="text-sm font-medium text-secondary tracking-body">{r.submitterDisplayName}</span>
          )}
          <span aria-hidden className="size-[3px] rounded-full bg-tertiary" />
          <span className="text-sm text-tertiary tracking-body">{meta.label}</span>
          <span aria-hidden className="size-[3px] rounded-full bg-tertiary" />
          <span className="text-sm text-tertiary tracking-body">{fmtWhen(r.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-none flex-col items-end gap-2.5">
        <VotePill resource={r} />
        <span className="whitespace-nowrap text-[11px] text-tertiary tracking-body">
          {VIS_SHORT[r.visibility ?? 'pl_infra']}
        </span>
      </div>
    </div>
  );
}

export function ResourceRowsCard({
  rows,
  summary,
}: {
  rows: ResourceSummary[];
  summary: string;
}) {
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {rows.map((r) => (
          <ResourceRow key={r.id} resource={r} />
        ))}
      </div>
      <div className="px-1 pt-4">
        <span className="text-xs text-tertiary tracking-body">{summary}</span>
      </div>
    </>
  );
}

export function RowsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse gap-4 border-t border-border-subtle px-6 py-5 first:border-t-0">
          <div className="size-11 flex-none rounded-10 bg-surface-sunken" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <div className="h-2.5 w-[30%] rounded-pill bg-surface-sunken" />
            <div className="h-3.5 w-[72%] rounded-pill bg-surface-sunken" />
            <div className="h-2.5 w-[40%] rounded-pill bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty states (design copy, verbatim)

export function ZeroResults({ query, onClear }: { query: string; onClear: () => void }) {
  const { open } = useSubmit();
  return (
    <div className="rounded-xl bg-surface px-10 py-14 text-center shadow-card">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-selected text-brand">
        <Icon name="search" size={22} />
      </div>
      {/* pending Camille review */}
      <h3 className="m-0 mb-2 text-[22px] font-medium leading-[30px] tracking-title text-primary">
        Nothing here for “{query}” yet
      </h3>
      {/* pending Camille review */}
      <p className="mx-auto mb-6 mt-0 max-w-[460px] text-base leading-[22px] text-secondary tracking-body [text-wrap:pretty]">
        That is worth knowing. Ask the network — requests show up in “Asked for, not yet found,” and they tell
        the working group what to go find next.
      </p>
      <div className="flex items-center justify-center gap-2.5">
        <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => open({ type: 'request', q: query })}>
          {/* pending Camille review */}
          Ask the network for this
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Clear search
        </Button>
      </div>
      {/* pending Camille review */}
      <div className="mt-5 text-[11px] text-tertiary tracking-body">
        Logged as search.zero_results — the seeding backlog builds itself.
      </div>
    </div>
  );
}

export function EmptyCorpus() {
  const { open } = useSubmit();
  return (
    <div className="rounded-xl bg-surface px-10 py-12 text-center shadow-card">
      {/* pending Camille review */}
      <h3 className="m-0 mb-2 text-[22px] font-medium leading-[30px] tracking-title text-primary">
        The Collections are ready. The shelves are not.
      </h3>
      {/* pending Camille review */}
      <p className="mx-auto mb-6 mt-0 max-w-[460px] text-base leading-[22px] text-secondary tracking-body">
        Four Collections are waiting for their first entries. Anything you have already sent someone in a DM
        this month qualifies.
      </p>
      <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => open()}>
        {/* pending Camille review */}
        Share the first one
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collections

export function collectionVisual(c: CollectionRow): { icon: IconName; tile: string } {
  if (c.autoPopulated || c.slug.includes('asked')) return { icon: 'search', tile: TYPE_META.request.tile };
  if (c.slug.includes('skill')) return { icon: 'diamond', tile: TYPE_META.skill.tile };
  if (c.slug.includes('newsletter')) return { icon: 'calendar', tile: TYPE_META.newsletter.tile };
  return { icon: 'globe', tile: TYPE_META.link.tile };
}

export function collectionMeta(c: CollectionRow): string {
  const n = c.resourceCount ?? 0;
  const items = `${n} ${n === 1 ? 'item' : 'items'}`;
  const first = c.curatorName ? c.curatorName.split(' ')[0] : null;
  /* pending Camille review */
  return first ? `${items} · curated by ${first}` : items;
}

export function CollectionsStrip({ collections }: { collections: CollectionRow[] }) {
  const router = useRouter();
  if (collections.length === 0) return null;
  return (
    <div className="pb-8">
      <div className="flex items-baseline justify-between pb-3">
        {/* pending Camille review */}
        <h2 className="m-0 text-sm font-semibold leading-5 text-secondary tracking-body">Collections</h2>
        <NextLink
          href="/collections"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand no-underline"
        >
          View all
          <Icon name="arrow-right" size={12} />
        </NextLink>
      </div>
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        {collections.map((c) => {
          const v = collectionVisual(c);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => router.push(`/collections/${encodeURIComponent(c.slug)}`)}
              className={cn(
                'flex cursor-pointer flex-col gap-3 rounded-xl border-none bg-surface p-4 text-left shadow-card',
                'transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-raised'
              )}
            >
              <span className={cn('inline-flex size-8 items-center justify-center rounded-lg', v.tile)}>
                <Icon name={v.icon} size={16} />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[15px] font-semibold leading-[22px] tracking-title text-primary">
                  {c.title}
                </span>
                <span className="text-xs leading-[18px] text-tertiary tracking-body">{collectionMeta(c)}</span>
              </span>
              {c.preview && c.preview.length > 0 && (
                <span className="flex flex-col gap-[5px] pt-0.5">
                  {c.preview.slice(0, 3).map((title) => (
                    <span key={title} className="flex items-center gap-1.5 overflow-hidden text-xs leading-[18px] text-secondary tracking-body">
                      <span className="size-[3px] flex-none rounded-full bg-tertiary" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{title}</span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast — fixed bottom-right (design). Composes the design-system Toast.

export function ToastHost({
  toast,
  onDismiss,
}: {
  toast: { title: string; body: string } | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-overlay">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-base font-semibold text-primary tracking-body">{toast.title}</p>
            <p className="m-0 pt-1 text-sm leading-normal text-secondary tracking-body">{toast.body}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex size-6 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-tertiary hover:bg-hover hover:text-primary"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
