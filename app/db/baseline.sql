-- Baseline taxonomy: the launch tags and collections ("categories").
-- Guarded with `WHERE NOT EXISTS (... )` so it only ever populates an EMPTY
-- table. Runs on every boot (via migrate.mjs) but never resurrects an entry an
-- admin later deletes, and never fights hand-curated additions.

-- 12 controlled-vocabulary tags.
INSERT INTO tags (slug, label, curated)
SELECT v.slug, v.label, TRUE
FROM (VALUES
  ('agent-skills', 'Agent Skills'),
  ('automation',   'Automation'),
  ('creators',     'Creators'),
  ('guides',       'Guides'),
  ('legal-tech',   'Legal Tech'),
  ('newsletters',  'Newsletters'),
  ('ops',          'Ops'),
  ('prompts',      'Prompts'),
  ('skills',       'Skills'),
  ('research',     'Research'),
  ('security',     'Security'),
  ('coding',       'Coding')
) AS v(slug, label)
WHERE NOT EXISTS (SELECT 1 FROM tags);

-- 3 launch collections. "Asks" is the auto-populated open-requests surface.
INSERT INTO collections (slug, title, description, auto_populate_rule, sort_order)
SELECT v.slug, v.title, v.description, v.rule, v.sort_order
FROM (VALUES
  ('newsletters-creators',  'Newsletters & Creators',  'Newsletters, channels, and creators worth following.',      NULL::jsonb,                        0),
  ('blog-posts-and-reading','Blog Posts and Reading',  'Posts, links, and longer reads worth your time.',           NULL::jsonb,                        1),
  ('asks',                  'Asks',                    'Open requests from members — fulfil one and close the loop.', '{"type":"open_requests"}'::jsonb, 2)
) AS v(slug, title, description, rule, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM collections);
