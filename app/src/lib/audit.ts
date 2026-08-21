// Audit log writer. metadata MUST NOT contain PII (no names, emails, titles,
// free text) — opaque IDs, enum values, and counts only.

import type { Pool, PoolClient } from 'pg';

export interface AuditEntry {
  actorMemberId: string | null;
  action: string; // submit | visibility_change | remove | denied_access | admin_*
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function writeAudit(db: Pool | PoolClient, entry: AuditEntry): Promise<void> {
  await db.query(
    `INSERT INTO audit_log (actor_member_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.actorMemberId,
      entry.action,
      entry.entity,
      entry.entityId ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );
}
