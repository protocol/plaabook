'use client';
// Admin tabs: dead-lettered contribution events, flagged broken links, and the
// tag + collection ("category") vocabulary. Tags and collections are now
// admin-curated here (add/delete). No points, totals, or Rights appear on this
// surface — delivery state only. /* pending Javier review — points-linkage
// surface (delivery status of pending contribution events; asserts no outcome) */

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import {
  PageHeader,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Alert,
  Badge,
  Input,
  TextArea,
  Button,
} from '../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import {
  apiGet,
  apiSend,
  normalizeList,
  type TagRow,
  type CollectionRow,
  fmtDate,
} from '@/components/shared';

// GET /api/admin/flagged returns raw snake_case rows (admin-only surface).
interface FlaggedRow {
  id: string;
  type: string;
  title: string;
  created_at: string;
  flagged_broken_at?: string | null;
}

interface DeadLetterRow {
  event_id: string;
  event_type: string;
  resource_id: string;
  occurred_at: string;
  attempts: number;
  last_error?: string | null;
}

export function AdminTabs() {
  const [deadLetters, setDeadLetters] = useState<DeadLetterRow[] | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<FlaggedRow[] | null>(null);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Add/delete form state for the curation tabs.
  const [tagLabel, setTagLabel] = useState('');
  const [tagBusy, setTagBusy] = useState(false);
  const [tagErr, setTagErr] = useState<string | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colBusy, setColBusy] = useState(false);
  const [colErr, setColErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function loadEvents() {
    apiGet<{ items: DeadLetterRow[]; pendingCount: number }>('/api/admin/events').then((d) => {
      setDeadLetters(d === null ? null : normalizeList<DeadLetterRow>(d).items);
      setPendingCount(d === null ? null : d.pendingCount);
    });
  }
  function loadTags() {
    apiGet<unknown>('/api/tags').then((d) => setTags(normalizeList<TagRow>(d).items));
  }
  function loadCollections() {
    apiGet<unknown>('/api/collections').then((d) => setCollections(normalizeList<CollectionRow>(d).items));
  }

  useEffect(() => {
    loadEvents();
    apiGet<unknown>('/api/admin/flagged').then((d) =>
      setFlagged(d === null ? null : normalizeList<FlaggedRow>(d).items)
    );
    loadTags();
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function retryEvent(eventId: string) {
    setRetrying(eventId);
    await apiSend('/api/admin/events', 'POST', { event_id: eventId });
    setRetrying(null);
    loadEvents();
  }

  async function addTag() {
    const label = tagLabel.trim();
    if (!label) return;
    setTagBusy(true);
    setTagErr(null);
    const res = await apiSend<{ error?: string }>('/api/tags', 'POST', { label });
    setTagBusy(false);
    if (res.ok) {
      setTagLabel('');
      loadTags();
    } else {
      setTagErr(res.data?.error ?? 'Could not add that tag.');
    }
  }

  async function deleteTag(slug: string) {
    setPendingDelete(`tag:${slug}`);
    await apiSend(`/api/tags/${encodeURIComponent(slug)}`, 'DELETE');
    setPendingDelete(null);
    loadTags();
  }

  async function addCollection() {
    const title = colTitle.trim();
    if (!title) return;
    setColBusy(true);
    setColErr(null);
    const res = await apiSend<{ error?: string }>('/api/collections', 'POST', {
      title,
      description: colDesc.trim() || undefined,
    });
    setColBusy(false);
    if (res.ok) {
      setColTitle('');
      setColDesc('');
      loadCollections();
    } else {
      setColErr(res.data?.error ?? 'Could not add that collection.');
    }
  }

  async function deleteCollection(slug: string) {
    setPendingDelete(`col:${slug}`);
    await apiSend(`/api/collections/${encodeURIComponent(slug)}`, 'DELETE');
    setPendingDelete(null);
    loadCollections();
  }

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        /* pending Camille review */
        description="Working-group operations: event delivery, flagged links, and the tag & collection vocabulary."
      />
      <Tabs defaultValue="dead-letters">
        <TabList label="Admin sections">
          <Tab value="dead-letters" badge={deadLetters?.length ? String(deadLetters.length) : undefined}>
            Dead-lettered events
          </Tab>
          <Tab value="flagged" badge={flagged?.length ? String(flagged.length) : undefined}>
            Flagged broken
          </Tab>
          <Tab value="tags">Tags</Tab>
          <Tab value="collections">Collections</Tab>
        </TabList>

        <TabPanel value="dead-letters">
          {pendingCount !== null && (
            <p className="mt-4 text-sm text-tertiary">
              {/* pending Camille review */}
              {pendingCount} event{pendingCount === 1 ? '' : 's'} pending delivery.
            </p>
          )}
          {deadLetters === null ? (
            <Alert tone="info" className="mt-4">
              Delivery data isn&apos;t available right now.
            </Alert>
          ) : deadLetters.length === 0 ? (
            <EmptyState className="mt-4" title="No dead-lettered events" description="Every contribution event has been delivered or is still retrying." />
          ) : (
            <Table label="Dead-lettered contribution events" className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeadCell>Event</TableHeadCell>
                  <TableHeadCell>Type</TableHeadCell>
                  <TableHeadCell>Occurred</TableHeadCell>
                  <TableHeadCell>Attempts</TableHeadCell>
                  <TableHeadCell>Last error</TableHeadCell>
                  <TableHeadCell>Retry</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deadLetters.map((e) => (
                  <TableRow key={e.event_id}>
                    <TableCell>
                      <span className="font-mono text-sm">{e.event_id.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell>
                      <Badge tone="warning">{e.event_type}</Badge>
                    </TableCell>
                    <TableCell>{fmtDate(e.occurred_at)}</TableCell>
                    <TableCell>{e.attempts}</TableCell>
                    <TableCell>
                      <span className="text-sm text-tertiary">{e.last_error ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-link underline text-sm disabled:opacity-50"
                        disabled={retrying === e.event_id}
                        onClick={() => retryEvent(e.event_id)}
                      >
                        {retrying === e.event_id ? 'Retrying…' : 'Retry'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>

        <TabPanel value="flagged">
          {flagged === null ? (
            <Alert tone="info" className="mt-4">
              Flagged-link data isn&apos;t wired up yet.
            </Alert>
          ) : flagged.length === 0 ? (
            <EmptyState className="mt-4" title="Nothing flagged" description="No resources have been reported broken." />
          ) : (
            <Table label="Resources flagged broken" className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeadCell>Resource</TableHeadCell>
                  <TableHeadCell>Type</TableHeadCell>
                  <TableHeadCell>Shared</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flagged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <NextLink href={`/resources/${r.id}`} className="text-link underline">
                        {r.title}
                      </NextLink>
                    </TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>

        <TabPanel value="tags">
          {/* Add a tag */}
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 240 }}>
              <span className="text-base font-medium text-primary tracking-body">New tag</span>
              <Input
                value={tagLabel}
                placeholder="e.g. Legal Tech"
                invalid={Boolean(tagErr)}
                disabled={tagBusy}
                onChange={(e) => {
                  setTagLabel(e.target.value);
                  if (tagErr) setTagErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTag();
                }}
              />
            </label>
            <Button tone="primary" loading={tagBusy} disabled={!tagLabel.trim()} onClick={addTag}>
              Add tag
            </Button>
          </div>
          {tagErr && (
            <p className="mt-2 text-sm text-danger tracking-body" role="alert">
              {tagErr}
            </p>
          )}

          <Table label="Tag vocabulary" className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeadCell>Label</TableHeadCell>
                <TableHeadCell>Slug</TableHeadCell>
                <TableHeadCell>Remove</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((t) => (
                <TableRow key={t.slug}>
                  <TableCell>{t.label}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-tertiary">{t.slug}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-sm underline text-danger disabled:opacity-50"
                      disabled={pendingDelete === `tag:${t.slug}`}
                      onClick={() => deleteTag(t.slug)}
                    >
                      {pendingDelete === `tag:${t.slug}` ? 'Removing…' : 'Delete'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {tags.length === 0 && (
            <p className="mt-2 text-sm text-tertiary tracking-body">No tags yet — add the first one above.</p>
          )}
        </TabPanel>

        <TabPanel value="collections">
          {/* Add a collection ("category") */}
          <div className="mt-4 flex flex-col gap-2" style={{ maxWidth: 520 }}>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-medium text-primary tracking-body">New collection</span>
              <Input
                value={colTitle}
                placeholder="e.g. Newsletters & Creators"
                invalid={Boolean(colErr)}
                disabled={colBusy}
                onChange={(e) => {
                  setColTitle(e.target.value);
                  if (colErr) setColErr(null);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-tertiary tracking-body">Description (optional)</span>
              <TextArea
                value={colDesc}
                rows={2}
                placeholder="One line on what belongs here."
                disabled={colBusy}
                onChange={(e) => setColDesc(e.target.value)}
              />
            </label>
            <div>
              <Button tone="primary" loading={colBusy} disabled={!colTitle.trim()} onClick={addCollection}>
                Add collection
              </Button>
            </div>
          </div>
          {colErr && (
            <p className="mt-2 text-sm text-danger tracking-body" role="alert">
              {colErr}
            </p>
          )}

          <Table label="Collections" className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Slug</TableHeadCell>
                <TableHeadCell>Items</TableHeadCell>
                <TableHeadCell>Remove</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c.slug}>
                  <TableCell>
                    {c.title}
                    {c.autoPopulated && (
                      <Badge tone="info" className="ml-2">
                        Auto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-tertiary">{c.slug}</span>
                  </TableCell>
                  <TableCell>{c.resourceCount ?? 0}</TableCell>
                  <TableCell>
                    {c.autoPopulated ? (
                      <span className="text-sm text-tertiary" title="Fills itself from open requests">
                        —
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-sm underline text-danger disabled:opacity-50"
                        disabled={pendingDelete === `col:${c.slug}`}
                        onClick={() => deleteCollection(c.slug)}
                      >
                        {pendingDelete === `col:${c.slug}` ? 'Removing…' : 'Delete'}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-sm text-tertiary tracking-body">
            Deleting a collection removes the grouping only — the resources inside it stay in the knowledge
            base. Auto collections fill themselves and can&apos;t be deleted.
          </p>
        </TabPanel>
      </Tabs>
    </AppShell>
  );
}
