// Shared visibility enforcement for EVERY read path (PRD F-4, AC-4.6).
// New endpoints must build their queries through scopeFilterSql — never
// hand-roll visibility conditions.

import type { Member } from './auth';
import { membership, type VisibilityScope } from './membership';
import { writeAudit } from './audit';
import { pool } from './db';

export async function visibleScopesFor(member: Member | null): Promise<VisibilityScope[]> {
  return membership.getScopes(member);
}

/**
 * Returns a SQL fragment + params filtering `resources.visibility` to the
 * given scopes (and excluding soft-deleted rows). `paramOffset` is the number
 * of $n params already used by the caller.
 * Empty scopes yields a fragment matching nothing (fail closed).
 */
export function scopeFilterSql(
  scopes: VisibilityScope[],
  paramOffset = 0,
  alias = 'resources'
): { sql: string; params: unknown[] } {
  if (scopes.length === 0) return { sql: 'FALSE', params: [] };
  return {
    sql: `${alias}.visibility = ANY($${paramOffset + 1}::visibility_scope[]) AND ${alias}.removed_at IS NULL`,
    params: [scopes],
  };
}

/** 404 (not 403 — do not confirm existence) + audit entry (AC-3.2, AC-4.C). */
export async function notFoundWithAudit(
  memberId: string | null,
  resourceId: string | null
): Promise<Response> {
  try {
    await writeAudit(pool, {
      actorMemberId: memberId,
      action: 'denied_access',
      entity: 'resource',
      entityId: resourceId,
      metadata: null,
    });
  } catch {
    // auditing failure must not turn a 404 into a 500
  }
  /* pending Camille review */
  return Response.json({ error: 'Not found.' }, { status: 404 });
}
