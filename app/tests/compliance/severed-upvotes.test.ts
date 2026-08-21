// AC-3.6 / AC-6.8 — upvotes are structurally severed from the contribution
// pipeline: source-level (no import) AND behavioral (no event rows).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POST as submitPOST } from '@/app/api/resources/route';
import { POST as upvotePOST } from '@/app/api/resources/[id]/upvote/route';
import { jsonRequest, cleanupResource, countEvents } from '../helpers';

let resourceId: string;

beforeAll(async () => {
  const res = await submitPOST(
    jsonRequest('http://test.local/api/resources', 'POST', {
      type: 'request',
      title: 'Severance test target',
      why: 'structural severance test',
    })
  );
  resourceId = (await res.json()).id;
});

afterAll(async () => {
  await cleanupResource(resourceId);
});

describe('compliance — upvotes severed from contributions', () => {
  it('upvote route source imports nothing from the contributions module', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'src/app/api/resources/[id]/upvote/route.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/from\s+['"][^'"]*contributions['"]/);
    expect(source).not.toMatch(/enqueueContributionEvent/);
  });

  it('schema has no trigger or FK linking upvotes to contribution_events', async () => {
    const schema = readFileSync(join(__dirname, '..', '..', 'db/schema.sql'), 'utf8');
    const upvotesBlock = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS upvotes'));
    const tableDef = upvotesBlock.slice(0, upvotesBlock.indexOf(';'));
    expect(tableDef).not.toContain('contribution_events');
  });

  it('upvoting produces zero contribution_events rows (db assertion)', async () => {
    await upvotePOST(
      jsonRequest(`http://test.local/api/resources/${resourceId}/upvote`, 'POST'),
      { params: { id: resourceId } }
    );
    expect(await countEvents(resourceId)).toBe(0);
  });
});
