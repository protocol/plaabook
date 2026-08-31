'use client';
// F-1 Submit — the design's 880px modal: type picker → compose (two-column,
// live preview) → receipt. Status copy is exactly "Sent for review" (PRD §4.2).
// Visibility is fixed to PL Infra for phase 1 — the wider option is not rendered.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Modal,
  Button,
  Input,
  TextArea,
  Checkbox,
  Alert,
  Avatar,
  Icon,
  Select,
  Tag,
  cn,
} from '../../pl-design-system/components';
import { trackEvent } from '@/lib/analytics';
import {
  apiGet,
  apiSend,
  normalizeList,
  TYPE_META,
  fmtWhen,
  type CollectionRow,
  type TagRow,
  type TypeKey,
} from '@/components/shared';

// ---------------------------------------------------------------------------
// Context — every "Share something" button opens the same modal in place.

export interface SubmitOpenOptions {
  type?: TypeKey;
  q?: string;
  fulfills?: string;
}

const SubmitCtx = createContext<{ open: (opts?: SubmitOpenOptions) => void }>({ open: () => {} });

export function useSubmit() {
  return useContext(SubmitCtx);
}

// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE = '.pdf,.md,.txt,.docx,.csv,.zip';
const ACCEPTED_SKILL = '.md,.zip';
const DRAFT_KEY = 'plaabook_submit_draft';

type Step = 'type' | 'compose' | 'receipt';

interface DuplicateHit {
  id: string;
  title?: string;
  submitterDisplayName?: string;
  createdAt?: string;
}

interface SubmitState {
  step: Step;
  type: TypeKey | null;
  url: string;
  title: string;
  why: string;
  ask: string;
  tags: string[];
  collection: string;
  ack: boolean;
  file: File | null;
  fetching: boolean;
  fetchingLabel: string;
  metaReady: boolean;
  suggestedWhy: string | null;
  dup: DuplicateHit | null;
  fulfills: string | null;
  newId: string | null;
  elapsed: number;
  error: string;
}

const FRESH: SubmitState = {
  step: 'type',
  type: null,
  url: '',
  title: '',
  why: '',
  ask: '',
  tags: [],
  collection: '',
  ack: false,
  file: null,
  fetching: false,
  fetchingLabel: '',
  metaReady: false,
  suggestedWhy: null,
  dup: null,
  fulfills: null,
  newId: null,
  elapsed: 0,
  error: '',
};

/* pending Camille review — type tiles, labels and hints (design copy, verbatim) */
const TYPE_TILES: { key: TypeKey; label: string; hint: string }[] = [
  { key: 'link', label: 'A link', hint: 'Article, doc, repo — anything with a URL' },
  { key: 'file', label: 'A file', hint: 'PDF, Markdown, docx, CSV, zip' },
  /* Skill submissions hidden for now — backend support unchanged. */
  { key: 'newsletter', label: 'A newsletter or creator', hint: 'A newsletter, video channel, or TikTok — someone worth following' /* pending Camille review */ },
  { key: 'request', label: 'A request', hint: 'Something that should exist and does not' },
];

/** Parse SKILL.md frontmatter client-side for the autofill helper (graceful). */
function parseFrontmatter(text: string): { name?: string; description?: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: { name?: string; description?: string } = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(name|description):\s*(.+)$/);
    if (kv) out[kv[1] as 'name' | 'description'] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function SubmitModalInner({
  initial,
  onClose,
}: {
  initial: SubmitOpenOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const t0 = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<SubmitState>(FRESH);
  const [tick, setTick] = useState(0);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [nudgeCopy, setNudgeCopy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dupOverride, setDupOverride] = useState(false);

  const patch = useCallback((p: Partial<SubmitState>) => setS((prev) => ({ ...prev, ...p })), []);

  // Initialize from open options (zero-result → request prefill, fulfils deep link)
  // or restore a saved draft (network-failure resilience).
  useEffect(() => {
    let base: SubmitState = { ...FRESH, fulfills: initial.fulfills ?? null };
    if (initial.type === 'request') {
      base = { ...base, step: 'compose', type: 'request', ask: initial.q ?? '' };
    } else if (initial.type) {
      base = { ...base, step: 'compose', type: initial.type };
    } else {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as Partial<SubmitState>;
          if (d.type && (d.url || d.title || d.why || d.ask)) {
            base = {
              ...base,
              step: 'compose',
              type: d.type as TypeKey,
              url: d.url ?? '',
              title: d.title ?? '',
              why: d.why ?? '',
              ask: d.ask ?? '',
              tags: Array.isArray(d.tags) ? d.tags : [],
              collection: d.collection ?? '',
            };
          }
        }
      } catch {
        /* corrupt draft — start fresh */
      }
    }
    t0.current = Date.now();
    setS(base);
  }, [initial]);

  // Persist the draft while composing.
  useEffect(() => {
    if (s.step !== 'compose') return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          type: s.type,
          url: s.url,
          title: s.title,
          why: s.why,
          ask: s.ask,
          tags: s.tags,
          collection: s.collection,
        })
      );
    } catch {
      /* best-effort */
    }
  }, [s.step, s.type, s.url, s.title, s.why, s.ask, s.tags, s.collection]);

  // Live timer while composing.
  useEffect(() => {
    if (s.step !== 'compose') return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [s.step]);

  useEffect(() => {
    apiGet<unknown>('/api/tags').then((d) => setTags(normalizeList<TagRow>(d).items));
    // Rule-populated collections manage their own membership — not offered here.
    apiGet<unknown>('/api/collections').then((d) =>
      setCollections(normalizeList<CollectionRow>(d).items.filter((c) => !c.autoPopulated))
    );
  }, []);

  const needsUpload = s.type === 'file' || s.type === 'skill';

  // Nudge copy is versioned config, fetched — never hardcoded (Camille can revise).
  useEffect(() => {
    if (!needsUpload || nudgeCopy) return;
    apiGet<{ value?: string; copy?: string }>('/api/config/nudge').then((d) => {
      setNudgeCopy(
        d?.value ??
          d?.copy ??
          /* pending Camille review — fallback only if config endpoint is unreachable */
          "Share only what you'd be comfortable with every member of this space seeing. Please don't upload anything containing personal information about other people, confidential company material, or privileged legal or financial documents."
      );
    });
  }, [needsUpload, nudgeCopy]);

  const fetchMeta = useCallback(
    async (url: string) => {
      const u = url.trim();
      if (!u) return;
      setDupOverride(false);
      /* pending Camille review */
      patch({ step: 'compose', type: s.type && s.type !== 'request' ? s.type : 'link', url: u, fetching: true, fetchingLabel: 'Reading the page…', dup: null });
      const [meta, dup] = await Promise.all([
        apiSend<{ title?: string; description?: string }>('/api/resources/fetch-metadata', 'POST', { url: u }),
        apiSend<{ existing?: DuplicateHit | null }>('/api/resources/check-duplicate', 'POST', { url: u }),
      ]);
      setS((prev) => ({
        ...prev,
        fetching: false,
        metaReady: true,
        title: prev.title || meta.data?.title || '',
        suggestedWhy:
          meta.ok && meta.data?.description ? meta.data.description.slice(0, 200) : prev.suggestedWhy,
        dup: dup.ok && dup.data?.existing ? dup.data.existing : null,
      }));
    },
    [patch, s.type]
  );

  const onFilePicked = useCallback(
    (picked: File | null) => {
      if (!picked) return;
      if (picked.size > MAX_FILE_BYTES) {
        /* pending Camille review */
        patch({ error: `This file is ${(picked.size / 1048576).toFixed(1)} MB — the limit is 10 MB. Try a smaller export or share it as a link.` });
        return;
      }
      const accepted = (s.type === 'skill' ? ACCEPTED_SKILL : ACCEPTED_FILE).split(',');
      if (!accepted.some((ext) => picked.name.toLowerCase().endsWith(ext))) {
        /* pending Camille review */
        patch({
          error:
            s.type === 'skill'
              ? 'Skills are accepted as a SKILL.md file or a .zip bundle.'
              : 'Accepted file types: pdf, md, txt, docx, csv, zip.',
        });
        return;
      }
      const isSkill = s.type === 'skill';
      patch({
        error: '',
        file: picked,
        fetching: true,
        /* pending Camille review */
        fetchingLabel: isSkill ? 'Reading SKILL.md frontmatter…' : 'Extracting text for search…',
      });
      const finish = (extra: Partial<SubmitState>) =>
        setS((prev) => ({
          ...prev,
          fetching: false,
          metaReady: true,
          title: prev.title || extra.title || picked.name.replace(/\.[^.]+$/, ''),
          ...extra,
          ...(prev.title ? { title: prev.title } : {}),
        }));
      if (isSkill && picked.name.toLowerCase().endsWith('.md')) {
        picked
          .text()
          .then((text) => {
            const fm = parseFrontmatter(text);
            finish({ title: fm.name, suggestedWhy: fm.description ? fm.description.slice(0, 200) : null });
          })
          .catch(() => finish({}));
      } else {
        finish({});
      }
    },
    [patch, s.type]
  );

  const submitNow = useCallback(async () => {
    const isReq = s.type === 'request';
    setSubmitting(true);
    patch({ error: '' });
    let result;
    if (needsUpload && s.file) {
      const form = new FormData();
      form.set('type', s.type!);
      form.set('title', s.title.trim());
      form.set('why', s.why.trim());
      form.set('visibility', 'pl_infra');
      form.set('tags', JSON.stringify(s.tags));
      if (s.collection) form.set('collection', s.collection);
      form.set('confidentialityAck', 'true');
      form.set('file', s.file);
      result = await apiSend<{ id?: string }>('/api/resources', 'POST', form);
    } else {
      const ask = s.ask.trim();
      result = await apiSend<{ id?: string }>('/api/resources', 'POST', {
        type: s.type,
        title: isReq ? (ask.length > 62 ? `${ask.slice(0, 62)}…` : ask) : s.title.trim(),
        why: isReq ? ask.slice(0, 200) : s.why.trim(),
        url: s.url.trim() || undefined,
        visibility: 'pl_infra',
        tags: s.tags,
        collection: s.collection || undefined,
        duplicate_override: dupOverride || undefined,
        fulfills_request_id: s.fulfills || undefined,
      });
    }
    setSubmitting(false);
    if (!result.ok) {
      /* pending Camille review — form state is preserved locally; retry restores it */
      patch({ error: 'Something went wrong sending this. Your draft is saved — please try again.' });
      return;
    }
    const secs = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
    trackEvent('submit_completed', { ms: Date.now() - t0.current, type: s.type });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    patch({ step: 'receipt', newId: result.data?.id ?? null, elapsed: secs });
  }, [s, needsUpload, dupOverride, patch]);

  const isReq = s.type === 'request';
  const isLinkish = s.type === 'link' || s.type === 'newsletter' || s.type === 'creator';
  const whyLen = (isReq ? s.ask : s.why).length;
  const elapsed = s.step === 'compose' ? Math.round((Date.now() - t0.current) / 1000) : s.elapsed;
  void tick;
  const canSubmit =
    (isReq ? s.ask.trim().length > 0 : s.why.trim().length > 0 && s.title.trim().length > 0) &&
    (!needsUpload || (s.ack && !!s.file)) &&
    (!isLinkish || s.url.trim().length > 0);

  const meta = s.type ? TYPE_META[s.type] : TYPE_META.link;
  const previewReady = !s.fetching && (s.metaReady || whyLen > 0 || s.title.length > 0);

  /* pending Camille review — modal chrome copy (design, verbatim) */
  const modalTitle = s.step === 'receipt' ? 'Sent for review' : isReq ? 'Ask the network' : 'Share something';
  const modalDesc =
    s.step === 'receipt'
      ? undefined
      : isReq
        ? 'Requests are a first-class post here. They tell the working group what to find next.'
        : "Under a minute is the target. The one required field is why it is worth someone's time.";

  const restart = useCallback(() => {
    t0.current = Date.now();
    setDupOverride(false);
    setS({ ...FRESH });
  }, []);

  return (
    <Modal
      open
      onClose={onClose}
      title={modalTitle}
      supporting={modalDesc}
      size="lg"
      className="max-w-[880px]"
      footer={
        s.step === 'compose' ? (
          <div className="flex w-full items-center justify-between gap-4">
            {/* pending Camille review */}
            <span className="text-xs text-tertiary tracking-body">Open {elapsed}s · target is under 60</span>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!canSubmit} loading={submitting} onClick={submitNow}>
                {/* pending Camille review */}
                {isReq ? 'Post request' : 'Share it'}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* ── STEP 1: pick ──────────────────────────────────────────────── */}
      {s.step === 'type' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface-subtle p-4">
            {/* pending Camille review */}
            <div className="pb-2.5 text-sm font-semibold text-primary tracking-body">
              Paste a URL and we will do the rest
            </div>
            <div className="flex gap-2.5">
              <Input
                value={s.url}
                onChange={(e) => patch({ url: e.currentTarget.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchMeta(s.url);
                }}
                placeholder="https://"
                inputMode="url"
                className="flex-1"
              />
              <Button variant="primary" onClick={() => fetchMeta(s.url)}>
                Continue
              </Button>
            </div>
          </div>
          <div>
            {/* pending Camille review */}
            <div className="pb-2.5 text-xs font-semibold text-tertiary tracking-body">Or pick a type</div>
            <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2">
              {TYPE_TILES.map((tile) => {
                const tm = TYPE_META[tile.key];
                return (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={() =>
                      patch({ step: 'compose', type: tile.key, error: '' })
                    }
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left',
                      'transition-shadow hover:border-border-brand hover:shadow-raised'
                    )}
                  >
                    <span className={cn('inline-flex size-8 items-center justify-center rounded-lg', tm.tile)}>
                      <Icon name={tm.icon} size={18} />
                    </span>
                    <span className="text-base font-semibold text-primary tracking-body">{tile.label}</span>
                    <span className="text-xs leading-snug text-tertiary tracking-body">{tile.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: compose ───────────────────────────────────────────── */}
      {s.step === 'compose' && (
        <div className="flex items-start gap-6 max-md:flex-col">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {isLinkish && (
              <div className="flex flex-col gap-2.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-base font-medium text-primary tracking-body">URL</span>
                  <Input
                    value={s.url}
                    onChange={(e) => patch({ url: e.currentTarget.value })}
                    onBlur={() => {
                      if (s.url.trim() && !s.metaReady) fetchMeta(s.url);
                    }}
                    placeholder="https://"
                    inputMode="url"
                  />
                </label>
                {s.dup && !dupOverride && (
                  /* pending Camille review — informational, never blocking (AC-1.5) */
                  <Alert
                    tone="warning"
                    title={`Shared by ${s.dup.submitterDisplayName ?? 'a member'}${s.dup.createdAt ? ` ${fmtWhen(s.dup.createdAt)}` : ''}`}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            onClose();
                            router.push(`/resources/${s.dup!.id}`);
                          }}
                        >
                          View existing
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDupOverride(true)}>
                          Add my note instead
                        </Button>
                      </>
                    }
                  >
                    {`Already here as “${s.dup.title ?? 'an existing resource'}”. You can add your own note instead, or submit anyway.`}
                  </Alert>
                )}
              </div>
            )}

            {needsUpload && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-warning bg-action-warning-light p-4">
                  {/* Confidentiality nudge — AT the upload control, gates it (AC-1.7). */}
                  <p className="m-0 pb-3 text-sm leading-normal text-primary tracking-body">{nudgeCopy ?? '…'}</p>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={s.ack} onChange={(e) => patch({ ack: e.currentTarget.checked })} />
                    {/* pending Camille review */}
                    <span className="text-sm text-primary tracking-body">I understand what I am sharing and with whom.</span>
                  </label>
                </div>
                {!s.ack ? (
                  /* pending Camille review */
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-tertiary opacity-60 tracking-body">
                    Acknowledge the note above to enable the upload
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="w-full cursor-pointer rounded-xl border border-dashed border-border-brand bg-brand-faint p-5 text-center text-sm font-medium text-brand tracking-body"
                    >
                      {/* pending Camille review */}
                      {s.file
                        ? `${s.file.name} — replace`
                        : s.type === 'skill'
                          ? 'Choose a SKILL.md or Skill bundle'
                          : 'Choose a file'}
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept={s.type === 'skill' ? ACCEPTED_SKILL : ACCEPTED_FILE}
                      onChange={(e) => onFilePicked(e.currentTarget.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            )}

            {isReq && (
              <label className="flex flex-col gap-1.5">
                {/* pending Camille review */}
                <span className="text-base font-medium text-primary tracking-body">What are you looking for?</span>
                <TextArea
                  value={s.ask}
                  onChange={(e) => patch({ ask: e.currentTarget.value.slice(0, 200) })}
                  placeholder="Does anyone have…"
                  rows={3}
                />
              </label>
            )}

            {!isReq && (
              <label className="flex flex-col gap-1.5">
                <span className="text-base font-medium text-primary tracking-body">Title</span>
                <Input value={s.title} onChange={(e) => patch({ title: e.currentTarget.value })} maxLength={300} />
                {/* pending Camille review */}
                <span className="text-xs text-tertiary tracking-body">
                  {s.type === 'skill' && s.file
                    ? 'Filled from SKILL.md frontmatter. Editable.'
                    : s.metaReady && s.title
                      ? 'Filled automatically. Editable.'
                      : 'Or type it yourself.'}
                </span>
              </label>
            )}

            {!isReq && (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1.5">
                  {/* pending Camille review — the required quality mechanism (AC-1.6) */}
                  <span className="text-base font-medium text-primary tracking-body">
                    Why is this worth someone&apos;s time?
                  </span>
                  <TextArea
                    value={s.why}
                    onChange={(e) => patch({ why: e.currentTarget.value.slice(0, 200) })}
                    placeholder="One sentence, in your own words."
                    rows={3}
                    required
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  {/* pending Camille review */}
                  <span className="text-xs text-tertiary tracking-body">
                    Required. This is the line everyone reads first.
                  </span>
                  <span className={cn('text-xs tracking-body', whyLen > 180 ? 'text-warning' : 'text-tertiary')}>
                    {whyLen}/200
                  </span>
                </div>
                {s.suggestedWhy && !s.why && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="min-w-0 flex-1">
                      {/* pending Camille review */}
                      <div className="pb-1 text-xs font-semibold text-tertiary tracking-body">
                        Drafted from the page — edit freely
                      </div>
                      <div className="text-sm leading-normal text-secondary tracking-body">{s.suggestedWhy}</div>
                    </div>
                    <Button size="tiny" variant="ghost" className="shrink-0 text-brand" onClick={() => patch({ why: s.suggestedWhy! })}>
                      Use this
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-between pb-2">
                <span className="text-base font-medium text-primary tracking-body">Tags</span>
                {/* pending Camille review */}
                <span className="text-xs text-tertiary tracking-body">
                  Controlled vocabulary — new tags go through the working group
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => {
                  const sel = s.tags.includes(t.slug);
                  return (
                    <Tag
                      key={t.slug}
                      selected={sel}
                      onClick={() =>
                        patch({ tags: sel ? s.tags.filter((x) => x !== t.slug) : [...s.tags, t.slug] })
                      }
                    >
                      #{t.slug}
                    </Tag>
                  );
                })}
              </div>
            </div>

            {!isReq && collections.length > 0 && (
              <label className="flex flex-col gap-1.5">
                {/* pending Camille review */}
                <span className="text-base font-medium text-primary tracking-body">
                  Add to a collection
                </span>
                <Select
                  value={s.collection}
                  onChange={(v) => patch({ collection: v })}
                  placeholder="None"
                  options={[
                    /* pending Camille review */
                    { value: '', label: 'None' },
                    ...collections.map((c) => ({ value: c.slug, label: c.title })),
                  ]}
                />
                {/* pending Camille review */}
                <span className="text-xs text-tertiary tracking-body">
                  Optional. It shows up there straight away.
                </span>
              </label>
            )}

            {/* Phase 1: one fixed audience — the wider scope is not offered. */}
            <label className="flex flex-col gap-1.5">
              {/* pending Camille review */}
              <span className="text-base font-medium text-primary tracking-body">Who can see this?</span>
              <div className="flex h-10 items-center rounded-md border border-border bg-surface-sunken px-3 text-base text-secondary tracking-body">
                PL Infra members
              </div>
            </label>

            {s.error && <Alert tone="danger">{s.error}</Alert>}
          </div>

          {/* Right rail: live preview */}
          <div className="flex w-80 flex-none flex-col gap-2.5 max-md:w-full">
            {/* pending Camille review */}
            <div className="text-xs font-semibold text-tertiary tracking-body">How it will look</div>

            {s.fetching ? (
              <div className="animate-pulse rounded-xl border border-border bg-surface p-4">
                <div className="flex gap-3">
                  <div className="size-9 flex-none rounded-lg bg-surface-sunken" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-2 w-1/2 rounded-pill bg-surface-sunken" />
                    <div className="h-3 w-4/5 rounded-pill bg-surface-sunken" />
                    <div className="h-3 w-3/5 rounded-pill bg-surface-sunken" />
                  </div>
                </div>
                <div className="pt-3.5 text-xs text-tertiary tracking-body">{s.fetchingLabel}</div>
              </div>
            ) : previewReady ? (
              <div className="rounded-xl bg-surface p-4 shadow-card">
                <div className="flex gap-3">
                  <div className={cn('flex size-9 flex-none items-center justify-center rounded-lg', meta.tile)}>
                    <Icon name={meta.icon} size={18} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="text-xs font-medium text-secondary tracking-body">
                      {isReq ? 'Request' : s.title || 'Untitled'}
                    </div>
                    {/* pending Camille review */}
                    <p className="m-0 text-[15px] leading-[23px] tracking-[-0.3px] text-primary">
                      {(isReq ? s.ask : s.why) || 'Your one line goes here — it is the first thing anyone reads.'}
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Avatar name="You" size="xs" shape="circle" />
                      <span className="text-xs text-secondary tracking-body">You</span>
                      <span aria-hidden className="size-[3px] rounded-full bg-tertiary" />
                      <span className="text-xs text-tertiary tracking-body">
                        just now · {s.tags.length ? s.tags.map((x) => `#${x}`).join(' ') : 'no tags yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3.5">
              {/* pending Camille review — what makes the confidentiality nudge meaningful (F-4) */}
              <div className="text-xs leading-[17px] text-secondary tracking-body">
                Visible to members of PL Infra only. Nobody outside the group can see it, search it, or download it.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: receipt ───────────────────────────────────────────── */}
      {s.step === 'receipt' && (
        <div className="pt-1">
          <div className="flex items-center gap-3 pb-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-action-success-light text-success">
              <Icon name="check" size={22} />
            </div>
            <div>
              {/* pending Camille review */}
              <div className="text-xl font-medium tracking-title text-primary">
                {isReq ? 'Your request is up' : 'Shared with PL Infra'}
              </div>
              <div className="text-sm text-secondary tracking-body">
                {isReq ? 'It is in “Asked for, not yet found” now.' : `Submitted in ${s.elapsed} seconds.`}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4">
            {[
              { label: 'Resource', value: isReq ? s.ask.slice(0, 62) : s.title || '—' },
              { label: 'Visible to', value: 'PL Infra' },
              { label: 'Tags', value: s.tags.length ? s.tags.map((x) => `#${x}`).join(' ') : '—' },
              {
                label: 'Collection',
                value: collections.find((c) => c.slug === s.collection)?.title ?? '—',
              },
              /* pending Camille review — never stronger than this (PRD §4.2) */
              { label: 'Status', value: 'Sent for review' },
            ].map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-tertiary tracking-body">{f.label}</span>
                <span className="text-right text-sm font-medium text-primary tracking-body">{f.value}</span>
              </div>
            ))}
          </div>
          {/* pending Camille review — pending Javier review (points-linkage framing) */}
          <p className="m-0 pt-4 text-xs leading-relaxed text-tertiary tracking-body">
            Sent for review. The Activities working group takes it from here — nothing else for you to file.
          </p>
          <div className="flex items-center gap-2.5 pt-5">
            {s.newId && (
              <Button
                variant="primary"
                iconEnd={<Icon name="arrow-right" size={16} />}
                onClick={() => {
                  const id = s.newId!;
                  onClose();
                  router.push(`/resources/${id}`);
                }}
              >
                Open it
              </Button>
            )}
            <Button variant="secondary" onClick={restart}>
              Share another
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function SubmitProvider({ children }: { children: ReactNode }) {
  const [openOpts, setOpenOpts] = useState<SubmitOpenOptions | null>(null);
  const ctx = useMemo(() => ({ open: (opts?: SubmitOpenOptions) => setOpenOpts(opts ?? {}) }), []);
  return (
    <SubmitCtx.Provider value={ctx}>
      {children}
      {openOpts && <SubmitModalInner initial={openOpts} onClose={() => setOpenOpts(null)} />}
    </SubmitCtx.Provider>
  );
}
