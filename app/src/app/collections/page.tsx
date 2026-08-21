'use client';
// Collections index — "a few shelves, kept deliberately short" (design page).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, cn } from '../../../pl-design-system/components';
import { AppShell } from '@/components/AppShell';
import { collectionVisual, collectionMeta } from '@/components/kb';
import { useSubmit } from '@/components/SubmitModal';
import { apiGet, normalizeList, type CollectionRow } from '@/components/shared';

function CollectionsInner() {
  const router = useRouter();
  const { open } = useSubmit();
  const [collections, setCollections] = useState<CollectionRow[]>([]);

  useEffect(() => {
    apiGet<unknown>('/api/collections').then((d) => setCollections(normalizeList<CollectionRow>(d).items));
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-6 pb-7 max-md:flex-col max-md:items-start">
        <div className="flex flex-col gap-2">
          {/* pending Camille review */}
          <h1 className="m-0 text-[40px] font-medium leading-[48px] tracking-[-1.4px] text-primary">Collections</h1>
          {/* pending Camille review */}
          <p className="m-0 max-w-[560px] text-[15px] leading-6 text-secondary tracking-body [text-wrap:pretty]">
            A few shelves, kept deliberately short. Tags and search do the rest — there is no folder tree to
            argue about.
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
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {collections.map((c) => {
          const v = collectionVisual(c);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => router.push(`/collections/${encodeURIComponent(c.slug)}`)}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-3.5 rounded-xl border-none bg-surface p-6 text-left shadow-card',
                'transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-raised'
              )}
            >
              <span className={cn('inline-flex size-10 items-center justify-center rounded-10', v.tile)}>
                <Icon name={v.icon} size={20} />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-lg font-semibold leading-[25px] tracking-title text-primary">{c.title}</span>
                {c.description && (
                  <span className="text-sm leading-5 text-secondary tracking-body [text-wrap:pretty]">
                    {c.description}
                  </span>
                )}
              </span>
              <span className="text-xs text-tertiary tracking-body">{collectionMeta(c)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <AppShell>
      <CollectionsInner />
    </AppShell>
  );
}
