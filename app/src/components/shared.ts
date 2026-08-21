'use client';
// Shared client-side helpers for KB pages. No PII ever leaves this module —
// analytics properties are counts/lengths only, never query text or names.

// Shapes mirror the API responses (camelCase; tags are slug strings).
export interface ResourceSummary {
  id: string;
  type: 'link' | 'file' | 'skill' | 'newsletter' | 'creator' | 'request';
  title: string;
  why: string;
  visibility?: 'pl_infra' | 'plaa_members';
  submitterMemberId?: string;
  submitterDisplayName: string;
  submitterAvatarUrl?: string | null;
  requestStatus?: 'open' | 'fulfilled' | 'withdrawn' | null;
  fulfilledByResourceId?: string | null;
  upvoteCount: number;
  createdAt: string;
  viewerHasUpvoted?: boolean;
  tags?: string[];
}

export interface ResourceDetail extends ResourceSummary {
  url?: string | null;
  visibility: 'pl_infra' | 'plaa_members';
  skillName?: string | null;
  skillDescription?: string | null;
  skillMd?: string | null;
  extractedPreview?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSizeBytes?: number | null;
  viewCount?: number;
  downloadCount?: number;
}

export interface TagRow {
  slug: string;
  label: string;
}

export interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  resourceCount?: number;
  curatorName?: string | null;
  preview?: string[];
  autoPopulated?: boolean;
}

// ---------------------------------------------------------------------------
// Design type map — label, icon glyph, tile tint, badge tone per post type.
// Semantic token classes only (design contract).

export type TypeKey = ResourceSummary['type'];

export interface TypeMeta {
  label: string;
  icon: 'globe' | 'cube' | 'diamond' | 'calendar' | 'user-circle' | 'search';
  tile: string; // tinted icon-tile classes
  badge: 'neutral' | 'info' | 'success' | 'warning';
}

/* pending Camille review — member-facing type labels */
export const TYPE_META: Record<TypeKey, TypeMeta> = {
  link: { label: 'Link', icon: 'globe', tile: 'bg-action-neutral-light text-secondary', badge: 'info' },
  file: { label: 'Doc', icon: 'cube', tile: 'bg-action-neutral-light text-secondary', badge: 'neutral' },
  skill: { label: 'Skill', icon: 'diamond', tile: 'bg-selected text-brand', badge: 'info' },
  newsletter: { label: 'Newsletter', icon: 'calendar', tile: 'bg-action-success-light text-trend-up', badge: 'success' },
  creator: { label: 'Creator', icon: 'user-circle', tile: 'bg-action-success-light text-trend-up', badge: 'success' },
  request: { label: 'Request', icon: 'search', tile: 'bg-action-warning-light text-action-warning-fg', badge: 'warning' },
};

/* pending Camille review — short visibility labels under the vote pill */
export const VIS_SHORT: Record<'pl_infra' | 'plaa_members', string> = {
  pl_infra: 'PL Infra',
  plaa_members: 'All PLAA members',
};

/** Relative "when" the way the design writes it: "3 days ago" → "in July". */
export function fmtWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 1) return 'just now';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 35) {
    const w = Math.round(days / 7);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  return `in ${new Date(iso).toLocaleDateString('en-US', { month: 'long' })}`;
}

/* pending Camille review — all labels below are member-facing */
export const TYPE_LABELS: Record<ResourceSummary['type'], string> = {
  link: 'Link',
  file: 'File',
  skill: 'Skill',
  newsletter: 'Newsletter',
  creator: 'Creator',
  request: 'Request',
};

/* pending Camille review */
export const VISIBILITY_LABELS: Record<ResourceDetail['visibility'], string> = {
  pl_infra: 'PL Infra members',
  plaa_members: 'All PLAA members',
};

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function fmtMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long' });
  } catch {
    return '';
  }
}

export function daysOld(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

/** Tolerant JSON fetch: returns null on any failure — pages degrade, never crash. */
export async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiSend<T>(url: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      /* empty body is fine */
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Accepts { items } | { resources } | bare array — backend built in parallel. */
export function normalizeList<T>(data: unknown): { items: T[]; nextCursor: string | null } {
  if (Array.isArray(data)) return { items: data as T[], nextCursor: null };
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const items = (d.items ?? d.resources ?? d.tags ?? d.collections ?? d.events ?? []) as T[];
    const nextCursor = (d.nextCursor ?? d.next_cursor ?? null) as string | null;
    return { items: Array.isArray(items) ? items : [], nextCursor };
  }
  return { items: [], nextCursor: null };
}
