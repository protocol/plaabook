'use client';
// The one resource card used by index, requests, and related lists.
// Every card renders the why-line (AC-2.6) — it is what makes a result judgeable.

import { EntityCard, TagList, Avatar, cn } from '../../pl-design-system/components';
import { type ResourceSummary, TYPE_LABELS, fmtDate, daysOld } from './shared';

export function ResourceCard({ resource }: { resource: ResourceSummary }) {
  const isRequest = resource.type === 'request';
  const staleRequest = isRequest && resource.requestStatus === 'open' && daysOld(resource.createdAt) > 30;
  /* pending Camille review */
  const badge = isRequest
    ? resource.requestStatus === 'fulfilled'
      ? 'Request · fulfilled'
      : 'Request'
    : TYPE_LABELS[resource.type];

  return (
    <EntityCard
      title={resource.title}
      href={`/resources/${resource.id}`}
      description={resource.why}
      badge={badge}
      className={cn(isRequest && 'border-border-brand-subtle', staleRequest && 'opacity-60')}
      meta={
        <span className="flex items-center gap-2 text-sm text-tertiary tracking-body">
          <Avatar
            name={resource.submitterDisplayName}
            src={resource.submitterAvatarUrl ?? undefined}
            size="xs"
            shape="circle"
          />
          <span>{resource.submitterDisplayName}</span>
          <span aria-hidden>·</span>
          <span>{fmtDate(resource.createdAt)}</span>
          {resource.upvoteCount > 0 && (
            <>
              <span aria-hidden>·</span>
              {/* pending Camille review — recognition signal, never a reward */}
              <span>{resource.upvoteCount} found this useful</span>
            </>
          )}
        </span>
      }
      tags={
        resource.tags && resource.tags.length > 0 ? (
          <TagList tags={resource.tags} max={3} />
        ) : undefined
      }
    />
  );
}
