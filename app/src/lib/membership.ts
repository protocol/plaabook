// Group-membership adapter (PRD F-4, open question Q1).
// TODO(Q1/Anuj): swap this stub for the LabOS group-membership API once the
// contract is confirmed — this file is the ONE place that changes. The app
// asks LabOS which groups the member belongs to; membership is never stored
// locally.

import type { Member } from './auth';

export type VisibilityScope = 'pl_infra' | 'plaa_members';

export interface MembershipAdapter {
  /** Scopes the member may READ. Must fail closed (return []) on any error. */
  getScopes(member: Member | null): Promise<VisibilityScope[]>;
}

class StubMembershipAdapter implements MembershipAdapter {
  async getScopes(member: Member | null): Promise<VisibilityScope[]> {
    try {
      if (!member) return []; // fail closed: unauthenticated sees nothing
      // Stub: every authenticated member is treated as PL Infra + PLAA for v1
      // (v1 audience is PL Infra only; access to the app itself is the gate).
      return ['pl_infra', 'plaa_members'];
    } catch {
      return []; // fail closed — narrowest scope on any error (AC-4.5)
    }
  }
}

export const membership: MembershipAdapter = new StubMembershipAdapter();
