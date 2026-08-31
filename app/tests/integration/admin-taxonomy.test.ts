import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { POST as createTag } from '@/app/api/tags/route';
import { DELETE as deleteTag } from '@/app/api/tags/[slug]/route';
import { POST as createCollection } from '@/app/api/collections/route';
import { DELETE as deleteCollection } from '@/app/api/collections/[slug]/route';
import { pool } from '@/lib/db';
import { jsonRequest, TEST_MEMBER } from '../helpers';

const TAGS_URL = 'http://test.local/api/tags';
const COLS_URL = 'http://test.local/api/collections';

// isAdmin() reads ADMIN_MEMBER_IDS at call time, so we toggle it per test.
function asAdmin() {
  process.env.ADMIN_MEMBER_IDS = TEST_MEMBER;
}
function asNonAdmin() {
  process.env.ADMIN_MEMBER_IDS = '';
}

// Only touch rows this suite creates.
const CREATED_TAG_SLUGS = ['test-taxonomy-tag', 'newsletters-and-creators'];
const CREATED_COL_SLUGS = ['test-taxonomy-collection'];

afterEach(() => {
  asNonAdmin();
});

afterAll(async () => {
  for (const slug of CREATED_TAG_SLUGS) await pool.query('DELETE FROM tags WHERE slug = $1', [slug]);
  for (const slug of CREATED_COL_SLUGS) await pool.query('DELETE FROM collections WHERE slug = $1', [slug]);
  await pool.query('DELETE FROM audit_log WHERE actor_member_id = $1', [TEST_MEMBER]);
});

describe('admin taxonomy — tags', () => {
  it('admin creates a tag from a label, deriving the slug', async () => {
    asAdmin();
    const res = await createTag(jsonRequest(TAGS_URL, 'POST', { label: 'Newsletters & Creators' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tag.slug).toBe('newsletters-and-creators');

    const { rows } = await pool.query('SELECT curated FROM tags WHERE slug = $1', [body.tag.slug]);
    expect(rows).toHaveLength(1);
    expect(rows[0].curated).toBe(true);
  });

  it('rejects an empty label with 400', async () => {
    asAdmin();
    const res = await createTag(jsonRequest(TAGS_URL, 'POST', { label: '   ' }));
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    asAdmin();
    await createTag(jsonRequest(TAGS_URL, 'POST', { label: 'Test Taxonomy Tag' }));
    const dup = await createTag(jsonRequest(TAGS_URL, 'POST', { label: 'test taxonomy tag' }));
    expect(dup.status).toBe(409);
  });

  it('non-admins get 404 (route existence never confirmed)', async () => {
    asNonAdmin();
    const res = await createTag(jsonRequest(TAGS_URL, 'POST', { label: 'Should Not Exist' }));
    expect(res.status).toBe(404);
  });

  it('admin deletes a tag', async () => {
    asAdmin();
    await createTag(jsonRequest(TAGS_URL, 'POST', { label: 'Test Taxonomy Tag' }));
    const res = await deleteTag(jsonRequest(`${TAGS_URL}/test-taxonomy-tag`, 'DELETE'), {
      params: { slug: 'test-taxonomy-tag' },
    });
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT 1 FROM tags WHERE slug = $1', ['test-taxonomy-tag']);
    expect(rows).toHaveLength(0);
  });
});

describe('admin taxonomy — collections', () => {
  it('admin creates a collection and it is not auto-populated', async () => {
    asAdmin();
    const res = await createCollection(
      jsonRequest(COLS_URL, 'POST', { title: 'Test Taxonomy Collection', description: 'A bucket' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.collection.slug).toBe('test-taxonomy-collection');
    expect(body.collection.autoPopulated).toBe(false);

    const { rows } = await pool.query('SELECT curator_member_id FROM collections WHERE slug = $1', [
      'test-taxonomy-collection',
    ]);
    expect(rows[0].curator_member_id).toBe(TEST_MEMBER);
  });

  it('non-admins get 404', async () => {
    asNonAdmin();
    const res = await createCollection(jsonRequest(COLS_URL, 'POST', { title: 'Nope' }));
    expect(res.status).toBe(404);
  });

  it('admin deletes a hand-curated collection', async () => {
    asAdmin();
    await createCollection(jsonRequest(COLS_URL, 'POST', { title: 'Test Taxonomy Collection' }));
    const res = await deleteCollection(jsonRequest(`${COLS_URL}/test-taxonomy-collection`, 'DELETE'), {
      params: { slug: 'test-taxonomy-collection' },
    });
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT 1 FROM collections WHERE slug = $1', ['test-taxonomy-collection']);
    expect(rows).toHaveLength(0);
  });

  it('refuses to delete an auto-populated collection with 400', async () => {
    asAdmin();
    // Seed an open-requests collection to attempt deletion against.
    await pool.query(
      `INSERT INTO collections (slug, title, auto_populate_rule, sort_order)
       VALUES ($1, $2, $3, 99) ON CONFLICT (slug) DO NOTHING`,
      ['test-taxonomy-collection', 'Auto Bucket', JSON.stringify({ type: 'open_requests' })]
    );
    const res = await deleteCollection(jsonRequest(`${COLS_URL}/test-taxonomy-collection`, 'DELETE'), {
      params: { slug: 'test-taxonomy-collection' },
    });
    expect(res.status).toBe(400);
    const { rows } = await pool.query('SELECT 1 FROM collections WHERE slug = $1', ['test-taxonomy-collection']);
    expect(rows).toHaveLength(1); // still there
  });
});
