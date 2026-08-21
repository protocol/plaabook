'use client';
// F-3 Resource detail — the design's detail view: badges, 34px title, why card,
// per-type artifact block, vote row, related-by-tag, and a Details sidebar.
// Upvotes are recognition only and never touch the contribution pipeline.

import { useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Badge, Button, Icon, Tag, cn } from '../../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { ToastHost } from '@/components/kb';
import { useSubmit } from '@/components/SubmitModal';
import {
  apiGet,
  apiSend,
  normalizeList,
  fmtWhen,
  TYPE_META,
  VIS_SHORT,
  type ResourceDetail,
  type ResourceSummary,
} from '@/components/shared';

const FILE_KIND: Record<string, string> = {
  md: 'Markdown',
  pdf: 'PDF',
  docx: 'Word',
  csv: 'CSV',
  txt: 'Text',
  zip: 'ZIP',
};

function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMetaLine(r: ResourceDetail): string {
  const ext = (r.fileName?.split('.').pop() || '').toLowerCase();
  const parts = [FILE_KIND[ext] ?? 'File'];
  const size = fmtSize(r.fileSizeBytes);
  if (size) parts.push(size);
  /* pending Camille review */
  if (r.extractedPreview) parts.push('text extracted');
  return parts.join(' · ');
}

function InsetBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-border bg-surface', className)}>{children}</div>;
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { open: openSubmit } = useSubmit();

  const [r, setR] = useState<ResourceDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [voted, setVoted] = useState(false);
  const [votes, setVotes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [related, setRelated] = useState<ResourceSummary[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<ResourceSummary[]>([]);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  const load = useCallback(() => {
    fetch(`/api/resources/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus('notfound');
          return;
        }
        const body = (await res.json()) as ResourceDetail;
        setR(body);
        setVoted(Boolean(body.viewerHasUpvoted));
        setVotes(body.upvoteCount ?? 0);
        setStatus('ready');
        const firstTag = body.tags?.[0];
        if (firstTag) {
          apiGet<unknown>(`/api/resources?tag=${encodeURIComponent(firstTag)}`).then((d) => {
            setRelated(
              normalizeList<ResourceSummary>(d)
                .items.filter((x) => x.id !== body.id && x.type !== 'request')
                .slice(0, 3)
            );
          });
        }
      })
      .catch(() => setStatus('notfound'));
  }, [id]);

  useEffect(load, [load]);

  // Optimistic idempotent toggle (AC-3.5). Emits NO contribution event by design.
  const toggleVote = useCallback(async () => {
    const next = !voted;
    setVoted(next);
    setVotes((n) => n + (next ? 1 : -1));
    const res = await apiSend<{ upvoteCount?: number }>(`/api/resources/${id}/upvote`, next ? 'POST' : 'DELETE');
    if (!res.ok) {
      setVoted(!next);
      setVotes((n) => n + (next ? -1 : 1));
    } else if (typeof res.data?.upvoteCount === 'number') {
      setVotes(res.data.upvoteCount);
    }
  }, [id, voted]);

  const report = useCallback(async () => {
    await apiSend(`/api/resources/${id}/report-broken`, 'POST');
    /* pending Camille review */
    setToast({ title: 'Flagged for the working group', body: 'Thanks — it stays visible until someone checks it.' });
  }, [id]);

  const copyInstall = useCallback(() => {
    if (!r?.skillName) return;
    navigator.clipboard?.writeText(`claude skills add plaa/${r.skillName}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [r]);

  const startFulfil = useCallback(async () => {
    setPickerOpen(true);
    const d = await apiGet<unknown>('/api/resources');
    setCandidates(
      normalizeList<ResourceSummary>(d)
        .items.filter((x) => x.type !== 'request')
        .slice(0, 4)
    );
  }, []);

  const fulfil = useCallback(
    async (resourceId: string, title: string) => {
      const res = await apiSend(`/api/requests/${id}/fulfill`, 'POST', { resourceId });
      if (res.ok) {
        setPickerOpen(false);
        /* pending Camille review — status copy contract */
        setToast({
          title: 'Sent for review',
          body: `${r?.submitterDisplayName.split(' ')[0] ?? 'They'} has been notified that “${title}” answers this.`,
        });
        load();
      } else {
        /* pending Camille review */
        setToast({ title: 'That didn’t work', body: 'The resource may not be visible to this request’s audience.' });
      }
    },
    [id, r, load]
  );

  if (status === 'loading') {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-xl bg-surface shadow-card" />
      </AppShell>
    );
  }

  if (status === 'notfound' || !r) {
    return (
      <AppShell>
        <div className="rounded-xl bg-surface px-10 py-14 text-center shadow-card">
          {/* pending Camille review */}
          <h3 className="m-0 mb-2 text-[22px] font-medium tracking-title text-primary">This resource isn’t available</h3>
          <p className="mx-auto mb-6 mt-0 max-w-[460px] text-base text-secondary tracking-body">
            It may not exist, or it may not be shared with you.
          </p>
          <NextLink href="/">
            <Button variant="secondary">Knowledge Base</Button>
          </NextLink>
        </div>
      </AppShell>
    );
  }

  const meta = TYPE_META[r.type];
  const isLinkish = r.type === 'link' || r.type === 'newsletter' || r.type === 'creator';
  const isFile = r.type === 'file';
  const isSkill = r.type === 'skill';
  const isRequest = r.type === 'request';
  const fulfilled = isRequest && r.requestStatus === 'fulfilled';
  const domain = r.url ? r.url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') : '';

  const facts: { label: string; value: string }[] = [
    { label: 'Type', value: meta.label },
    { label: 'Shared', value: fmtWhen(r.createdAt) },
    { label: 'Visible to', value: VIS_SHORT[r.visibility] },
    /* pending Camille review — recognition, never a reward */
    { label: 'Useful marks', value: String(votes) },
  ];
  if ((isFile || isSkill) && typeof r.downloadCount === 'number') {
    facts.push({ label: 'Downloads', value: String(r.downloadCount) });
  }

  return (
    <AppShell>
      <NextLink
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-secondary no-underline hover:text-primary"
      >
        <Icon name="caret-left" size={14} />
        {/* pending Camille review */}
        Knowledge Base
      </NextLink>

      <div className="flex items-start gap-8 max-lg:flex-col">
        <div className="flex min-w-0 max-w-[720px] flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <Badge tone={meta.badge}>{meta.label}</Badge>
              <Badge tone="neutral">{VIS_SHORT[r.visibility]}</Badge>
              {isRequest && (
                /* pending Camille review */
                <Badge tone={fulfilled ? 'success' : 'warning'}>{fulfilled ? 'Fulfilled' : 'Open request'}</Badge>
              )}
            </div>
            <h1 className="m-0 text-[34px] font-medium leading-[42px] tracking-[-1.1px] text-primary [text-wrap:pretty]">
              {r.title}
            </h1>
          </div>

          {/* Why card — the line everyone reads first */}
          <div className="rounded-xl bg-surface p-6 shadow-card">
            <p className="m-0 mb-4 text-[21px] font-normal leading-8 tracking-[-0.5px] text-primary [text-wrap:pretty]">
              {r.why}
            </p>
            <NextLink
              href={r.submitterMemberId ? `/members/${r.submitterMemberId}` : '/'}
              className="flex items-center gap-2.5 no-underline"
            >
              <Avatar name={r.submitterDisplayName} src={r.submitterAvatarUrl ?? undefined} size="sm" shape="circle" />
              <span className="flex flex-col items-start">
                <span className="text-base font-medium text-primary tracking-body">{r.submitterDisplayName}</span>
                {/* pending Camille review */}
                <span className="text-xs text-tertiary tracking-body">shared {fmtWhen(r.createdAt)}</span>
              </span>
            </NextLink>
          </div>

          {/* Artifact block */}
          {isLinkish && r.url && (
            <InsetBox className="flex items-center gap-3 px-4 py-4">
              <div className="flex size-9 flex-none items-center justify-center rounded-lg bg-action-neutral-light text-secondary">
                <Icon name="globe" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-primary tracking-body">{domain}</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-tertiary tracking-body">
                  {r.url}
                </div>
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="primary" iconEnd={<Icon name="arrow-up-right" size={14} />}>
                  Open link
                </Button>
              </a>
            </InsetBox>
          )}

          {isFile && (
            <InsetBox className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex size-9 flex-none items-center justify-center rounded-lg bg-action-neutral-light text-secondary">
                  <Icon name="cube" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary tracking-body">{r.fileName}</div>
                  <div className="text-xs text-tertiary tracking-body">{fileMetaLine(r)}</div>
                </div>
                <a href={`/api/resources/${r.id}/download`}>
                  <Button size="sm" variant="primary">
                    Download
                  </Button>
                </a>
              </div>
              {r.extractedPreview && (
                <div className="border-t border-border-subtle bg-surface-subtle px-4 py-4">
                  {/* pending Camille review */}
                  <div className="pb-2 text-[11px] font-semibold text-tertiary tracking-body">
                    Extracted Text — Searchable
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-xs leading-5 text-secondary">
                    {r.extractedPreview}
                  </div>
                </div>
              )}
            </InsetBox>
          )}

          {isSkill && (
            <div className="flex flex-col gap-4">
              <InsetBox className="p-5">
                <div className="flex items-center justify-between gap-4 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-selected text-brand">
                      <Icon name="diamond" size={16} />
                    </div>
                    <div>
                      <div className="font-mono text-base font-semibold text-primary">{r.skillName ?? r.title}</div>
                      {/* pending Camille review */}
                      <div className="text-xs text-tertiary tracking-body">Parsed from SKILL.md frontmatter</div>
                    </div>
                  </div>
                  <a href={`/api/resources/${r.id}/download`}>
                    <Button size="sm" variant="primary">
                      Download Skill
                    </Button>
                  </a>
                </div>
                {r.skillDescription && (
                  <p className="m-0 mb-4 text-base leading-[22px] text-secondary tracking-body">{r.skillDescription}</p>
                )}
                {r.skillName && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5">
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-inverse">
                      claude skills add plaa/{r.skillName}
                    </span>
                    <button
                      type="button"
                      onClick={copyInstall}
                      className="h-[26px] flex-none cursor-pointer rounded-md border-none bg-surface/20 px-2.5 text-xs font-medium text-inverse"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </InsetBox>
              {r.skillMd && (
                <InsetBox className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                    <span className="text-xs font-semibold text-secondary tracking-body">SKILL.md</span>
                    {/* pending Camille review */}
                    <span className="text-[11px] text-tertiary tracking-body">Read-only</span>
                  </div>
                  <div className="max-h-96 overflow-auto whitespace-pre-wrap px-4 py-4 font-mono text-xs leading-5 text-secondary">
                    {r.skillMd}
                  </div>
                </InsetBox>
              )}
            </div>
          )}

          {isRequest && (
            <div className="flex flex-col gap-4">
              {fulfilled && r.fulfilledByResourceId && (
                <FulfilledRow id={r.fulfilledByResourceId} />
              )}
              {!fulfilled && (
                <InsetBox className="p-5">
                  {/* pending Camille review */}
                  <div className="pb-1 text-[15px] font-semibold text-primary tracking-body">Have something for this?</div>
                  {/* pending Camille review */}
                  <p className="m-0 mb-4 text-sm leading-5 text-secondary tracking-body">
                    Link a resource that already exists, or share a new one against this request. Answering a
                    colleague&apos;s request counts as a contribution.
                  </p>
                  {!pickerOpen ? (
                    <div className="flex gap-2.5">
                      <Button size="sm" variant="primary" onClick={startFulfil}>
                        {/* pending Camille review */}
                        Link an existing resource
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openSubmit({ fulfills: r.id })}>
                        {/* pending Camille review */}
                        Share something new
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {candidates.map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => fulfil(cand.id, cand.title)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-10 border border-border bg-surface-subtle px-3.5 py-3 text-left transition-colors hover:bg-brand-faint"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-primary tracking-body">{cand.title}</div>
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-tertiary tracking-body">
                              {cand.why}
                            </div>
                          </div>
                          {/* pending Camille review */}
                          <span className="flex-none text-xs font-medium text-brand tracking-body">Link this</span>
                        </button>
                      ))}
                    </div>
                  )}
                </InsetBox>
              )}
            </div>
          )}

          {/* Vote row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={toggleVote}
              aria-pressed={voted}
              className={cn(
                'inline-flex h-10 cursor-pointer items-center gap-2 rounded-pill border px-3.5 text-base font-medium tracking-body transition-colors',
                voted
                  ? 'border-border-brand bg-selected text-brand'
                  : 'border-border bg-action-neutral-light text-secondary hover:bg-hover'
              )}
            >
              <Icon name="arrow-fat-up" size={18} />
              {/* pending Camille review */}
              {isRequest ? `Also looking for this · ${votes}` : `Useful · ${votes}`}
            </button>
            {/* pending Camille review */}
            <span className="text-xs text-tertiary tracking-body">
              {isRequest ? 'Demand signal for the working group.' : 'Recognition only. It affects sort order, nothing else.'}
            </span>
            {r.tags && r.tags.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {r.tags.map((t) => (
                  <Tag key={t} onClick={() => router.push(`/?tag=${encodeURIComponent(t)}`)}>
                    #{t}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {/* Related */}
          {related.length > 0 && r.tags?.[0] && (
            <div className="pt-2">
              {/* pending Camille review */}
              <div className="pb-2.5 text-xs font-semibold text-tertiary tracking-body">Also tagged #{r.tags[0]}</div>
              <div className="flex flex-col gap-2">
                {related.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => router.push(`/resources/${rel.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-10 border-none bg-surface px-4 py-3.5 text-left shadow-card transition-transform hover:translate-x-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-medium text-primary tracking-body">{rel.title}</div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-tertiary tracking-body">
                        {rel.why}
                      </div>
                    </div>
                    <span className="flex-none text-xs text-tertiary tracking-body">
                      {rel.submitterDisplayName.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex w-[264px] flex-none flex-col gap-3 max-lg:w-full">
          <InsetBox className="p-4">
            {/* pending Camille review */}
            <div className="pb-3 text-xs font-semibold text-tertiary tracking-body">Details</div>
            <div className="flex flex-col gap-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] text-tertiary tracking-body">{f.label}</div>
                  <div className="text-sm font-medium text-primary tracking-body">{f.value}</div>
                </div>
              ))}
            </div>
          </InsetBox>
          <button
            type="button"
            onClick={report}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent px-1 text-xs text-tertiary tracking-body hover:text-secondary"
          >
            <Icon name="info" size={14} />
            {/* pending Camille review */}
            Report this as broken
          </button>
        </div>
      </div>

      <ToastHost toast={toast} onDismiss={() => setToast(null)} />
    </AppShell>
  );
}

function FulfilledRow({ id }: { id: string }) {
  const [title, setTitle] = useState('');
  useEffect(() => {
    apiGet<ResourceDetail>(`/api/resources/${id}`).then((d) => setTitle(d?.title ?? ''));
  }, [id]);
  return (
    <NextLink
      href={`/resources/${id}`}
      className="flex w-full items-center gap-3 rounded-xl border border-success bg-surface px-4 py-4 no-underline"
    >
      <div className="flex size-8 flex-none items-center justify-center rounded-lg bg-action-success-light text-success">
        <Icon name="check" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        {/* pending Camille review */}
        <div className="text-xs text-tertiary tracking-body">Answered with</div>
        <div className="text-base font-medium text-primary tracking-body">{title || '…'}</div>
      </div>
      <Icon name="arrow-right" size={16} className="text-secondary" />
    </NextLink>
  );
}
