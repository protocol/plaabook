import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8');
const connectionString = process.env.DATABASE_URL || 'postgres:///plaabook';
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString) || !process.env.DATABASE_URL;

const client = new pg.Client({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log('migrated');
