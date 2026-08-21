'use client';
// Collection view — back link, title, description, curator, scoped rows.
// "Asked for, not yet found" auto-lists open requests (server-side rule).

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Icon } from '../../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { BrowseView } from '@/components/BrowseView';
import { apiGet, normalizeList, type CollectionRow } from '@/components/shared';

function CollectionInner() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<CollectionRow | null>(null);

  useEffect(() => {
    apiGet<unknown>('/api/collections').then((d) => {
      const c = normalizeList<CollectionRow>(d).items.find((x) => x.slug === slug);
      setCollection(c ?? null);
    });
  }, [slug]);

  return (
    <BrowseView
      baseParams={{ collection: slug }}
      header={() => (
        <div className="pb-6">
          <NextLink
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-secondary no-underline hover:text-primary"
          >
            <Icon name="caret-left" size={14} />
            {/* pending Camille review */}
            Knowledge Base
          </NextLink>
          <h1 className="m-0 mb-2 text-[34px] font-medium leading-[42px] tracking-[-1.1px] text-primary">
            {collection?.title ?? ''}
          </h1>
          {collection?.description && (
            <p className="m-0 max-w-[640px] text-[15px] leading-6 text-secondary tracking-body [text-wrap:pretty]">
              {collection.description}
            </p>
          )}
          {collection?.curatorName && (
            <div className="flex items-center gap-2 pt-3.5">
              <Avatar name={collection.curatorName} size="xs" shape="circle" />
              {/* pending Camille review */}
              <span className="text-sm text-secondary tracking-body">Curated by {collection.curatorName}</span>
            </div>
          )}
        </div>
      )}
    />
  );
}

export default function CollectionPage() {
  return (
    <AppShell>
      <CollectionInner />
    </AppShell>
  );
}
