-- PLAAbook schema — verbatim from PRD §9 plus search_vector trigger.
-- Structured schema. Never spreadsheets.

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM ('link','file','skill','newsletter','creator','request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE visibility_scope AS ENUM ('pl_infra','plaa_members');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('open','fulfilled','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS resources (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    resource_type NOT NULL,
  title                   TEXT NOT NULL,
  why                     TEXT NOT NULL CHECK (char_length(why) BETWEEN 1 AND 200),
  url                     TEXT,
  canonical_url_hash      TEXT,               -- normalized URL hash for dedupe
  file_path               TEXT,               -- private storage key, never a public URL
  file_size_bytes         BIGINT,
  file_mime               TEXT,
  extracted_text          TEXT,               -- powers search now; backfills the semantic index later
  skill_name              TEXT,
  skill_description       TEXT,
  submitter_member_id     TEXT NOT NULL,      -- opaque LabOS member id; no PII stored here
  submitter_display_name  TEXT NOT NULL,      -- safe field only (display name)
  submitter_avatar_url    TEXT,               -- safe field only (optional avatar)
  visibility              visibility_scope NOT NULL DEFAULT 'pl_infra',
  confidentiality_ack_at  TIMESTAMPTZ,        -- required for file/skill types
  request_status          request_status,     -- non-null only when type='request'
  fulfilled_by_resource_id UUID REFERENCES resources(id),
  fulfilled_at            TIMESTAMPTZ,
  upvote_count            INTEGER NOT NULL DEFAULT 0,
  view_count              INTEGER NOT NULL DEFAULT 0,
  download_count          INTEGER NOT NULL DEFAULT 0,
  flagged_broken_at       TIMESTAMPTZ,
  removed_at              TIMESTAMPTZ,        -- soft delete; preserves contribution provenance
  search_vector           TSVECTOR,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT file_types_need_ack CHECK (
    type NOT IN ('file','skill') OR confidentiality_ack_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_resources_search     ON resources USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_resources_visibility ON resources (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_dedupe     ON resources (canonical_url_hash) WHERE canonical_url_hash IS NOT NULL;

-- search_vector maintained by trigger: title + why + skill fields + extracted text
CREATE OR REPLACE FUNCTION resources_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.why, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.skill_name, '') || ' ' || coalesce(NEW.skill_description, '')), 'B') ||
    setweight(to_tsvector('english', left(coalesce(NEW.extracted_text, ''), 200000)), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resources_search ON resources;
CREATE TRIGGER trg_resources_search
  BEFORE INSERT OR UPDATE OF title, why, skill_name, skill_description, extracted_text
  ON resources FOR EACH ROW EXECUTE FUNCTION resources_search_vector_update();

CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,   -- controlled vocabulary; ~12 seeded
  label      TEXT NOT NULL,
  curated    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_tags (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE TABLE IF NOT EXISTS collections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  description        TEXT,
  curator_member_id  TEXT,
  auto_populate_rule JSONB,           -- e.g. open requests
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_resources (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  resource_id   UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, resource_id)
);

-- File bytes live here (PLN container disk is ephemeral; provisioned Postgres is
-- the durable store). Separate table so resource queries never load bytes.
-- Served ONLY through the authenticated download route. Max 10MB enforced in app.
-- ponytail: bytea storage; swap to object storage adapter if files outgrow this.
CREATE TABLE IF NOT EXISTS resource_files (
  resource_id UUID PRIMARY KEY REFERENCES resources(id) ON DELETE CASCADE,
  data        BYTEA NOT NULL
);

-- Upvotes are recognition signal ONLY. Deliberately no FK, trigger, or path
-- to contribution_events. Affects sort order and nothing else.
CREATE TABLE IF NOT EXISTS upvotes (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, member_id)
);

-- Transactional outbox. Written in the same transaction as the resource.
CREATE TABLE IF NOT EXISTS contribution_events (
  event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,      -- resource.submitted | request.fulfilled
  member_id      TEXT NOT NULL,      -- opaque id only; NO PII in this table
  resource_id    UUID NOT NULL REFERENCES resources(id),
  activity_slug  TEXT NOT NULL,
  visibility     visibility_scope NOT NULL,
  review_status  TEXT NOT NULL DEFAULT 'pending',   -- never an award
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at   TIMESTAMPTZ,
  attempts       INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  dead_lettered  BOOLEAN NOT NULL DEFAULT FALSE,
  last_error     TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_undelivered ON contribution_events (next_attempt_at)
  WHERE delivered_at IS NULL AND dead_lettered = FALSE;
CREATE INDEX IF NOT EXISTS idx_events_pull        ON contribution_events (occurred_at, event_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id TEXT,
  action          TEXT NOT NULL,     -- submit | visibility_change | remove | denied_access | admin_*
  entity          TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB,             -- MUST NOT contain PII
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config (
  key        TEXT PRIMARY KEY,       -- e.g. confidentiality_nudge_copy
  value      TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versioned member-facing copy. /* pending Camille review */
INSERT INTO config (key, value) VALUES
  ('confidentiality_nudge_copy',
   'Share only what you''d be comfortable with every member of this space seeing. Please don''t upload anything containing personal information about other people, confidential company material, or privileged legal or financial documents.')
ON CONFLICT (key) DO NOTHING;
