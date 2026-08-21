'use client';
// F-3: Resource detail — view, download, upvote ("Useful" — recognition signal
// only; upvotes never touch the contribution pipeline). Out-of-scope = 404.

import { useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Avatar,
  MetaRow,
  TagList,
  Badge,
  Button,
  Alert,
  EmptyState,
  PageHeader,
  ListGrid,
  SkeletonCard,
  DetailSection,
} from '../../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { ResourceCard } from '@/components/ResourceCard';
import {
  apiGet,
  apiSend,
  normalizeList,
  type ResourceDetail,
  type ResourceSummary,
  TYPE_LABELS,
  VISIBILITY_LABELS,
  fmtDate,
} from '@/components/shared';

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [reported, setReported] = useState(false);
  const [related, setRelated] = useState<ResourceSummary[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/resources/${id}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setStatus('notfound');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const body = await res.json();
        const r = (body.resource ?? body) as ResourceDetail;
        setResource(r);
        setUpvoted(Boolean(r.viewerHasUpvoted));
        setUpvotes(r.upvoteCount ?? 0);
        setStatus('ready');
        const firstTag = r.tags?.[0];
        if (firstTag) {
          apiGet<unknown>(`/api/resources?tag=${encodeURIComponent(firstTag)}`).then((d) => {
            if (cancelled) return;
            setRelated(
              normalizeList<ResourceSummary>(d)
                .items.filter((x) => x.id !== r.id)
                .slice(0, 3)
            );
          });
        }
      })
      .catch(() => setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Optimistic idempotent toggle (AC-3.5). Emits NO contribution event by design.
  const toggleUpvote = useCallback(async () => {
    const next = !upvoted;
    setUpvoted(next);
    setUpvotes((n) => n + (next ? 1 : -1));
    const res = await apiSend<{ upvoteCount?: number }>(`/api/resources/${id}/upvote`, next ? 'POST' : 'DELETE');
    if (!res.ok) {
      setUpvoted(!next);
      setUpvotes((n) => n + (next ? -1 : 1));
    } else if (typeof res.data?.upvoteCount === 'number') {
      setUpvotes(res.data.upvoteCount);
    }
  }, [id, upvoted]);

  const reportBroken = useCallback(async () => {
    setReported(true);
    await apiSend(`/api/resources/${id}/report-broken`, 'POST');
  }, [id]);

  const copyInstallPath = useCallback(() => {
    const path = `~/.claude/skills/${(resource?.skillName ?? resource?.title ?? 'skill')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}/SKILL.md`;
    navigator.clipboard?.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [resource]);

  if (status === 'loading') {
    return (
      <AppShell>
        <ListGrid>
          <SkeletonCard />
        </ListGrid>
      </AppShell>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <AppShell>
        <EmptyState
          /* pending Camille review */
          title={status === 'notfound' ? "This resource isn't available" : 'Something went wrong'}
          description={
            status === 'notfound'
              ? 'It may not exist, or it may not be shared with you.'
              : 'Please try again in a moment.'
          }
          action={
            <NextLink href="/">
              <Button variant="secondary">Back to the Knowledge Base</Button>
            </NextLink>
          }
        />
      </AppShell>
    );
  }

  const r = resource!;
  const isSkill = r.type === 'skill';
  const isFile = r.type === 'file';
  const isRequest = r.type === 'request';
  const skillMd = r.skillMd ?? null;

  return (
    <AppShell>
      <Card className="mb-6">
        <div className="flex items-start gap-4 max-md:flex-col">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={isRequest ? 'info' : 'neutral'}>{TYPE_LABELS[r.type]}</Badge>
              <Badge tone="neutral">{VISIBILITY_LABELS[r.visibility]}</Badge>
              {isRequest && r.requestStatus === 'fulfilled' && (
                /* pending Camille review */
                <Badge tone="success">Fulfilled</Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-title text-primary">{r.title}</h1>
            <p className="mt-2 text-base text-secondary tracking-body">{r.why}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-tertiary">
              <Avatar name={r.submitterDisplayName} src={r.submitterAvatarUrl ?? undefined} size="xs" shape="circle" />
              <MetaRow items={[r.submitterDisplayName, fmtDate(r.createdAt)]} />
            </div>
            {r.tags && r.tags.length > 0 && (
              <div className="mt-3">
                <TagList
                  tags={r.tags}
                  max={6}
                  onToggle={(slug) => router.push(`/?tag=${encodeURIComponent(slug)}`)}
                />
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* pending Camille review — recognition only, never a reward or a race */}
            <Button variant={upvoted ? 'primary' : 'secondary'} onClick={toggleUpvote} aria-pressed={upvoted}>
              Useful{upvotes > 0 ? ` · ${upvotes}` : ''}
            </Button>
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">Open link</Button>
              </a>
            )}
            {(isFile || isSkill) && (
              <a href={`/api/resources/${r.id}/download`}>
                <Button variant="secondary">Download {isSkill ? 'Skill' : 'file'}</Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      {isSkill && (
        <DetailSection label={r.skillName ?? 'Skill'} className="mb-6">
          <div className="flex flex-col gap-3">
            {r.skillDescription && <p className="text-base text-secondary tracking-body">{r.skillDescription}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copyInstallPath}>
                {/* pending Camille review */}
                {copied ? 'Copied' : 'Copy install path'}
              </Button>
            </div>
            {skillMd && (
              <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-sunken p-4 text-sm text-secondary">
                {skillMd}
              </pre>
            )}
          </div>
        </DetailSection>
      )}

      {isRequest && r.requestStatus === 'fulfilled' && r.fulfilledByResourceId && (
        /* pending Camille review */
        <Alert tone="success" title="This request has been answered" className="mb-6">
          <NextLink href={`/resources/${r.fulfilledByResourceId}`} className="text-link underline">
            See the resource a colleague shared for it
          </NextLink>
        </Alert>
      )}

      {r.url && !isRequest && (
        <div className="mb-6">
          {reported ? (
            /* pending Camille review */
            <Alert tone="info">Thanks — the working group will take a look.</Alert>
          ) : (
            <Button size="sm" variant="ghost" onClick={reportBroken}>
              {/* pending Camille review */}
              Report broken link
            </Button>
          )}
        </div>
      )}

      {related.length > 0 && (
        <section>
          {/* pending Camille review */}
          <PageHeader title="Related by tag" />
          <ListGrid>
            {related.map((x) => (
              <ResourceCard key={x.id} resource={x} />
            ))}
          </ListGrid>
        </section>
      )}
    </AppShell>
  );
}
