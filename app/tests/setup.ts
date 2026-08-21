// Test env: real local db, dev-member identity (auth.ts DEV fallback path).
process.env.DATABASE_URL ||= 'postgres:///plaabook';
process.env.DEV_MEMBER_ID = 'test-member-plaabook';
process.env.DEV_MEMBER_NAME = 'Test Member';
