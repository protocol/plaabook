'use client';
// F-2 index: PLAAbook header, Collections strip, toolbar, why-first rows.
// ?useful=1 scopes to the viewer's upvotes ("Found useful" rail item).

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Icon } from '../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { BrowseView } from '@/components/BrowseView';
import { CollectionsStrip } from '@/components/kb';
import { useSubmit } from '@/components/SubmitModal';
import { apiGet, normalizeList, type CollectionRow } from '@/components/shared';

function IndexHeader() {
  const { open } = useSubmit();
  return (
    <div className="flex items-end justify-between gap-6 pb-6 max-md:flex-col max-md:items-start">
      <div className="flex flex-col gap-2">
        {/* pending Camille review */}
        <h1 className="m-0 text-[40px] font-medium leading-[48px] tracking-[-1.4px] text-primary">PLAAbook</h1>
        {/* pending Camille review */}
        <p className="m-0 max-w-[620px] text-[15px] leading-6 text-secondary tracking-body [text-wrap:pretty]">
          What PL Infra members have actually found useful — docs, Skills, newsletters, and people worth
          following. Every entry says why it is worth your time, in the words of the person who shared it.
        </p>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="mb-1 flex-none"
        iconStart={<Icon name="plus" size={18} />}
        onClick={() => open()}
      >
        {/* pending Camille review */}
        Share something
      </Button>
    </div>
  );
}

function IndexInner() {
  const params = useSearchParams();
  const useful = params.get('useful') === '1';
  const [collections, setCollections] = useState<CollectionRow[]>([]);

  useEffect(() => {
    apiGet<unknown>('/api/collections').then((d) => setCollections(normalizeList<CollectionRow>(d).items));
  }, []);

  return (
    <BrowseView
      syncUrl
      baseParams={useful ? { upvotedBy: 'me' } : {}}
      header={(searching) => (
        <>
          <IndexHeader />
          {!searching && !useful && <CollectionsStrip collections={collections} />}
        </>
      )}
    />
  );
}

export default function IndexPage() {
  return (
    <AppShell>
      <Suspense>
        <IndexInner />
      </Suspense>
    </AppShell>
  );
}
