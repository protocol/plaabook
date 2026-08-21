'use client';
// F-1: Submit a Resource — five post types, paste-to-autofill, duplicate check,
// required why-line, confidentiality nudge gating every upload path.
// Displays NO points and no review outcome — receipt says "Sent for review" only.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PageHeader,
  Button,
  Card,
  Field,
  Input,
  TextArea,
  Checkbox,
  CheckboxLabel,
  Tag,
  TagList,
  Alert,
  Badge,
} from '../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { trackEvent } from '@/lib/analytics';
import {
  apiGet,
  apiSend,
  normalizeList,
  type ResourceSummary,
  type TagRow,
  TYPE_LABELS,
  VISIBILITY_LABELS,
  fmtMonth,
} from '@/components/shared';

type PostType = ResourceSummary['type'];
const URL_TYPES: PostType[] = ['link', 'newsletter', 'creator'];
const UPLOAD_TYPES: PostType[] = ['file', 'skill'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE = '.pdf,.md,.txt,.docx,.csv,.zip';
const ACCEPTED_SKILL = '.md,.zip';

const DRAFT_KEY = 'plaabook_submit_draft';

interface Draft {
  type: PostType;
  url: string;
  title: string;
  description: string;
  why: string;
  visibility: '' | 'pl_infra' | 'plaa_members';
  tags: string[];
}

const EMPTY_DRAFT: Draft = { type: 'link', url: '', title: '', description: '', why: '', visibility: 'pl_infra', tags: [] };

interface DuplicateHit {
  id: string;
  title?: string;
  submitterDisplayName?: string;
  createdAt?: string;
}

function SubmitInner() {
  const params = useSearchParams();
  const openedAt = useRef(Date.now());

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [nudgeCopy, setNudgeCopy] = useState<string | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [metaNote, setMetaNote] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateHit | null>(null);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [whyError, setWhyError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; title: string; visibility: Draft['visibility']; type: PostType } | null>(null);

  const fulfillsRequestId = params.get('fulfills');
  const isUrlType = URL_TYPES.includes(draft.type);
  const isUploadType = UPLOAD_TYPES.includes(draft.type);
  const isRequest = draft.type === 'request';

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  // Restore draft (network-failure resilience, AC error state) or arrive prefilled
  // from a zero-result search (AC-5.2).
  useEffect(() => {
    const prefillType = params.get('type');
    const prefillQ = params.get('q');
    let base = EMPTY_DRAFT;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) base = { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
    } catch {
      /* ignore corrupt drafts */
    }
    if (prefillType === 'request') {
      base = { ...base, type: 'request', title: prefillQ ?? base.title };
    }
    // Phase 1 is PL Infra-only. Ignore any wider audience saved by an older draft.
    setDraft({ ...base, visibility: 'pl_infra' });
    setRestored(true);
  }, [params]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full — draft persistence is best-effort */
    }
  }, [draft, restored]);

  useEffect(() => {
    apiGet<unknown>('/api/tags').then((d) => setTags(normalizeList<TagRow>(d).items));
  }, []);

  // Nudge copy is versioned config, fetched — never hardcoded (Camille can revise).
  useEffect(() => {
    if (!isUploadType || nudgeCopy) return;
    apiGet<{ value?: string; copy?: string }>('/api/config/nudge').then((d) => {
      setNudgeCopy(
        d?.value ??
          d?.copy ??
          /* pending Camille review — fallback only if config endpoint is unreachable */
          "Share only what you'd be comfortable with every member of this space seeing. Please don't upload anything containing personal information about other people, confidential company material, or privileged legal or financial documents."
      );
    });
  }, [isUploadType, nudgeCopy]);

  const onUrlBlur = useCallback(async () => {
    const url = draft.url.trim();
    if (!url) return;
    setMetaNote('');
    setDuplicate(null);
    setDuplicateOverride(false);
    setFetchingMeta(true);
    const [meta, dup] = await Promise.all([
      apiSend<{ title?: string; description?: string }>('/api/resources/fetch-metadata', 'POST', { url }),
      apiSend<{ existing?: DuplicateHit | null }>('/api/resources/check-duplicate', 'POST', { url }),
    ]);
    setFetchingMeta(false);
    if (meta.ok && meta.data && (meta.data.title || meta.data.description)) {
      setDraft((d) => ({
        ...d,
        title: d.title || meta.data?.title || '',
        description: d.description || meta.data?.description || '',
      }));
    } else {
      /* pending Camille review */
      setMetaNote("We couldn't fetch details for this link — fill in the title yourself. Nothing is blocked.");
    }
    if (dup.ok && dup.data?.existing) setDuplicate(dup.data.existing);
  }, [draft.url]);

  const onFilePick = useCallback(
    (picked: File | null) => {
      setFileError('');
      if (!picked) {
        setFile(null);
        return;
      }
      if (picked.size > MAX_FILE_BYTES) {
        /* pending Camille review */
        setFileError(
          `This file is ${(picked.size / 1048576).toFixed(1)} MB — the limit is 10 MB. Try a smaller export or share it as a link.`
        );
        return;
      }
      const accepted = (draft.type === 'skill' ? ACCEPTED_SKILL : ACCEPTED_FILE).split(',');
      const ok = accepted.some((ext) => picked.name.toLowerCase().endsWith(ext));
      if (!ok) {
        /* pending Camille review */
        setFileError(
          draft.type === 'skill'
            ? 'Skills are accepted as a SKILL.md file or a .zip bundle.'
            : 'Accepted file types: pdf, md, txt, docx, csv, zip.'
        );
        return;
      }
      setFile(picked);
      if (!draft.title) set('title', picked.name.replace(/\.[^.]+$/, ''));
    },
    [draft.type, draft.title, set]
  );

  const submit = useCallback(async () => {
    setSubmitError('');
    const why = draft.why.trim();
    if (!why) {
      /* pending Camille review */
      setWhyError('Tell colleagues why this is worth their time — it’s required for every post.');
      return;
    }
    setWhyError('');
    if (!draft.title.trim()) {
      /* pending Camille review */
      setSubmitError('A title is required.');
      return;
    }
    if (isUploadType && (!file || !ackChecked)) {
      /* pending Camille review */
      setSubmitError(!file ? 'Choose a file to share.' : 'Please acknowledge the sharing note above the upload first.');
      return;
    }
    if (isUrlType && !draft.url.trim()) {
      /* pending Camille review */
      setSubmitError('A URL is required for this post type.');
      return;
    }

    setSubmitting(true);
    let result;
    if (isUploadType && file) {
      const form = new FormData();
      form.set('type', draft.type);
      form.set('title', draft.title.trim());
      form.set('why', why);
      form.set('visibility', 'pl_infra');
      form.set('tags', JSON.stringify(draft.tags));
      form.set('confidentialityAck', 'true');
      form.set('file', file);
      result = await apiSend<{ id?: string; resource?: { id: string } }>('/api/resources', 'POST', form);
    } else {
      result = await apiSend<{ id?: string; resource?: { id: string } }>('/api/resources', 'POST', {
        type: draft.type,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        url: isUrlType ? draft.url.trim() : undefined,
        why,
        visibility: 'pl_infra',
        tags: draft.tags,
        duplicate_override: duplicateOverride || undefined,
        fulfills_request_id: fulfillsRequestId || undefined,
      });
    }
    setSubmitting(false);

    if (!result.ok) {
      /* pending Camille review — form state is preserved locally; retry restores it */
      setSubmitError('Something went wrong sending this. Your draft is saved — please try again.');
      return;
    }
    const id = result.data?.id ?? result.data?.resource?.id ?? '';
    trackEvent('submit_completed', { ms: Date.now() - openedAt.current, type: draft.type });
    setReceipt({ id, title: draft.title.trim(), visibility: 'pl_infra', type: draft.type });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, [draft, file, ackChecked, isUploadType, isUrlType, duplicateOverride, fulfillsRequestId]);

  const resetForAnother = useCallback(() => {
    setReceipt(null);
    setDraft(EMPTY_DRAFT);
    setFile(null);
    setAckChecked(false);
    setDuplicate(null);
    setDuplicateOverride(false);
    setMetaNote('');
    openedAt.current = Date.now();
  }, []);

  if (receipt) {
    return (
      <AppShell>
        {/* pending Camille review — receipt copy. Status is "Sent for review",
            never a point value or an outcome (PRD §4.2). */}
        <PageHeader title="Thanks for sharing" />
        <Card className="max-w-xl">
          <div className="flex flex-col gap-3">
            <p className="text-base text-primary tracking-body">
              <span className="font-medium">{receipt.title}</span>
              {receipt.type === 'request'
                ? ' has been posted for the network to see.'
                : ` is now visible to ${VISIBILITY_LABELS[receipt.visibility || 'pl_infra']}.`}
            </p>
            {receipt.type !== 'request' && <Badge tone="info">Sent for review</Badge>}
            <div className="mt-2 flex gap-2">
              {receipt.id && (
                <NextLink href={`/resources/${receipt.id}`}>
                  <Button variant="secondary">View it</Button>
                </NextLink>
              )}
              <Button variant="primary" onClick={resetForAnother}>
                Share another
              </Button>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        /* pending Camille review */
        title="Share something"
        description="A link, a file, a Skill, a newsletter, a creator — or ask the network for something."
      />
      {fulfillsRequestId && (
        /* pending Camille review */
        <Alert tone="info" className="mb-4">
          What you share here will answer a colleague&apos;s open request.
        </Alert>
      )}
      <Card className="max-w-2xl">
        <div className="flex flex-col gap-5">
          <Field label="What are you sharing?" required>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as PostType[]).map((t) => (
                <Tag
                  key={t}
                  tone={draft.type === t ? 'brand' : undefined}
                  onClick={() => {
                    set('type', t);
                    setFile(null);
                    setFileError('');
                    setSubmitError('');
                  }}
                >
                  {t === 'request' ? 'Request — does anyone have…?' /* pending Camille review */ : TYPE_LABELS[t]}
                </Tag>
              ))}
            </div>
          </Field>

          {isUrlType && (
            <Field label="URL" required helper={fetchingMeta ? 'Fetching details…' : undefined}>
              <Input
                value={draft.url}
                onChange={(e) => set('url', e.currentTarget.value)}
                onBlur={onUrlBlur}
                placeholder="https://…"
                inputMode="url"
              />
            </Field>
          )}

          {metaNote && (
            <Alert tone="info">{metaNote}</Alert>
          )}

          {duplicate && !duplicateOverride && (
            /* pending Camille review — informational, never blocking (AC-1.5) */
            <Alert
              tone="info"
              title={`Shared by ${duplicate.submitterDisplayName ?? 'a member'}${duplicate.createdAt ? ` in ${fmtMonth(duplicate.createdAt)}` : ''}`}
              actions={
                <>
                  <NextLink href={`/resources/${duplicate.id}`}>
                    <Button size="sm" variant="secondary">
                      View existing
                    </Button>
                  </NextLink>
                  <Button size="sm" variant="ghost" onClick={() => setDuplicateOverride(true)}>
                    Add my note instead
                  </Button>
                </>
              }
            >
              This looks like it&apos;s already in the Knowledge Base.
            </Alert>
          )}

          {isUploadType && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-subtle p-4">
              {/* Confidentiality nudge — AT the upload control, gates it (AC-1.7). */}
              <CheckboxLabel
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.currentTarget.checked)}
                label="I understand"
                subLabel={nudgeCopy ?? '…'}
              />
              <Field
                label={draft.type === 'skill' ? 'Skill (SKILL.md or .zip bundle)' : 'File (pdf, md, txt, docx, csv, zip — max 10 MB)'}
                required
                error={fileError || undefined}
                helper={file ? `Selected: ${file.name}` : undefined}
              >
                <input
                  type="file"
                  accept={draft.type === 'skill' ? ACCEPTED_SKILL : ACCEPTED_FILE}
                  disabled={!ackChecked}
                  onChange={(e) => onFilePick(e.currentTarget.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-md border border-border bg-surface p-2 text-base text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  aria-disabled={!ackChecked}
                />
              </Field>
              {!ackChecked && (
                /* pending Camille review */
                <p className="text-sm text-tertiary tracking-body">The upload unlocks once you acknowledge the note above.</p>
              )}
            </div>
          )}

          <Field label={isRequest ? 'What are you looking for?' : 'Title'} required>
            <Input value={draft.title} onChange={(e) => set('title', e.currentTarget.value)} maxLength={200} />
          </Field>

          {!isRequest && (
            <Field label="Description" optional>
              <TextArea
                value={draft.description}
                onChange={(e) => set('description', e.currentTarget.value)}
                rows={3}
              />
            </Field>
          )}

          <Field
            /* pending Camille review — the required quality mechanism (AC-1.6) */
            label="Why is this worth someone's time?"
            required
            error={whyError || undefined}
            helper={`${draft.why.length}/200`}
          >
            <TextArea
              value={draft.why}
              onChange={(e) => {
                set('why', e.currentTarget.value.slice(0, 200));
                if (whyError) setWhyError('');
              }}
              rows={2}
              maxLength={200}
              invalid={Boolean(whyError)}
            />
          </Field>

          <Field label="Who can see this?" required>
            {/* pending Camille review — phase 1 has one fixed audience. */}
            <Alert tone="success" title="PL Infra members">
              This app is currently available only to PL Infra, so everything shared here uses that audience.
            </Alert>
          </Field>

          <Field label="Tags" optional helper="Pick from the shared vocabulary.">
            <TagList
              tags={tags.map((t) => t.label)}
              max={tags.length || 12}
              selected={draft.tags
                .map((slug) => tags.find((t) => t.slug === slug)?.label)
                .filter((l): l is string => Boolean(l))}
              onToggle={(label) => {
                const t = tags.find((x) => x.label === label);
                if (!t) return;
                set(
                  'tags',
                  draft.tags.includes(t.slug) ? draft.tags.filter((s) => s !== t.slug) : [...draft.tags, t.slug]
                );
              }}
            />
          </Field>

          {submitError && <Alert tone="danger">{submitError}</Alert>}

          <div>
            <Button variant="primary" onClick={submit} loading={submitting}>
              {/* pending Camille review */}
              {isRequest ? 'Post request' : 'Share it'}
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitInner />
    </Suspense>
  );
}
