import { describe, it, expect, beforeEach } from 'vitest';
import { isAdmin } from '@/lib/auth';

const OWNER = 'cmq8d7vhr00nlny4g33b74d9t';

describe('isAdmin', () => {
  beforeEach(() => {
    delete process.env.ADMIN_MEMBER_IDS; // exercise the baked-in list alone
  });

  it('grants the baked-in owner admin', () => {
    expect(isAdmin(OWNER)).toBe(true);
  });

  it('denies an unknown member', () => {
    expect(isAdmin('someone-else')).toBe(false);
  });

  it('also honours ADMIN_MEMBER_IDS env additions', () => {
    process.env.ADMIN_MEMBER_IDS = 'extra-admin';
    expect(isAdmin('extra-admin')).toBe(true);
    expect(isAdmin(OWNER)).toBe(true);
  });
});
