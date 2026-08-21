'use client';
// Shared client-side helpers for KB pages. No PII ever leaves this module —
// analytics properties are counts/lengths only, never query text or names.

// Shapes mirror the API responses (camelCase; tags are slug strings).
export interface ResourceSummary {
  id: string;
  type: 'link' | 'file' | 'skill' | 'newsletter' | 'creator' | 'request';
  title: string;
  why: string;
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
