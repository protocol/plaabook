import { Pool } from 'pg';

// PLN-provisioned Postgres injects DATABASE_URL; local dev uses postgres:///plaabook.
// Provisioned DB requires ssl with rejectUnauthorized:false (self-signed chain).
const connectionString = process.env.DATABASE_URL || 'postgres:///plaabook';
const isLocal = /localhost|127\.0\.0\.1|^postgres:\/{3}/.test(connectionString) || !process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __plaabookPool: Pool | undefined;
}

export const pool: Pool =
  globalThis.__plaabookPool ??
  new Pool({
    connectionString,
    max: 5, // 384Mi budget — keep the pool small
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
globalThis.__plaabookPool = pool;

export async function query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
  return pool.query(text, params as any[]) as unknown as Promise<{ rows: T[] }>;
}

export async function withTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
