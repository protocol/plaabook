'use client';
// F-1 deep-link entry: /submit renders the index underneath and immediately
// opens the submit modal (so ?type=request&q=&fulfills= links keep working).
// Status copy inside the modal is exactly "Sent for review" (PRD §4.2).

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BrowseView } from '@/components/BrowseView';
import { useSubmit, type SubmitOpenOptions } from '@/components/SubmitModal';
import type { TypeKey } from '@/components/shared';

const TYPES: TypeKey[] = ['link', 'file', 'skill', 'newsletter', 'creator', 'request'];

function SubmitOpener() {
  const params = useSearchParams();
  const { open } = useSubmit();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const opts: SubmitOpenOptions = {};
    const type = params.get('type');
    if (type && TYPES.includes(type as TypeKey)) opts.type = type as TypeKey;
    const q = params.get('q');
    if (q) opts.q = q;
    const fulfills = params.get('fulfills');
    if (fulfills) opts.fulfills = fulfills;
    open(opts);
  }, [params, open]);

  return <BrowseView />;
}

export default function SubmitPage() {
  return (
    <AppShell>
      <Suspense>
        <SubmitOpener />
      </Suspense>
    </AppShell>
  );
}
