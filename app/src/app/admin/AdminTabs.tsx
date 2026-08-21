'use client';
// Admin tabs: dead-lettered contribution events, flagged broken links, tag
// vocabulary (read-only). No points, totals, or Rights appear here — delivery
// state only. /* pending Javier review — points-linkage surface (delivery
// status of pending contribution events; asserts no outcome) */

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
} from '../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { apiGet, apiSend, normalizeList, type TagRow, fmtDate } from '@/components/shared';

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
  const [retrying, setRetrying] = useState<string | null>(null);

  function loadEvents() {
    apiGet<{ items: DeadLetterRow[]; pendingCount: number }>('/api/admin/events').then((d) => {
      setDeadLetters(d === null ? null : normalizeList<DeadLetterRow>(d).items);
      setPendingCount(d === null ? null : d.pendingCount);
    });
  }

  useEffect(() => {
    loadEvents();
    apiGet<unknown>('/api/admin/flagged').then((d) =>
      setFlagged(d === null ? null : normalizeList<FlaggedRow>(d).items)
    );
    apiGet<unknown>('/api/tags').then((d) => setTags(normalizeList<TagRow>(d).items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function retryEvent(eventId: string) {
    setRetrying(eventId);
    await apiSend('/api/admin/events', 'POST', { event_id: eventId });
    setRetrying(null);
    loadEvents();
  }

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        /* pending Camille review */
        description="Working-group operations: event delivery, flagged links, and the tag vocabulary."
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
          <Table label="Tag vocabulary" className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeadCell>Label</TableHeadCell>
                <TableHeadCell>Slug</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((t) => (
                <TableRow key={t.slug}>
                  <TableCell>{t.label}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-tertiary">{t.slug}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-sm text-tertiary tracking-body">
            {/* pending Camille review */}
            The tag vocabulary is curated — new tags are added by the working group.
          </p>
        </TabPanel>
      </Tabs>
    </AppShell>
  );
}
