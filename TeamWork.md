# TeamWork — PLAA Knowledge Base (PLaybook)
> Single source of truth. Every agent updates this on start / complete / blocker.

## Project Status
| Field | Value |
|-------|-------|
| PRD | `PRD_ PLaybook — Knowledge Base & Resource Sharing.md` (project root) |
| Starter kit read? | ✅ ai-app-starter-kit-v1.9 — contract recorded below |
| Current Phase | 4 — Validation ✅ COMPLETE |
| Compliance gate | Camille (member copy) · Javier (points linkage) |

## Starter-kit deployment contract (recorded — DO NOT violate)
- All app code in `app/`; independently runnable: `npm install && npm start`
- Bind `0.0.0.0`, listen on `$PORT` (default 3000)
- `GET /health` → 200; `GET /` must render (iframe root)
- Iframe-embeddable from `*.plnetwork.io`: NO `X-Frame-Options` header; if CSP, `frame-ancestors 'self' https://plnetwork.io https://*.plnetwork.io`
- Secrets via env vars (LabOS draft flow): `POINTS_WEBHOOK_URL`, `POINTS_WEBHOOK_SECRET`, `CONTRIBUTIONS_SERVICE_TOKEN`, `ADMIN_MEMBER_IDS`. Database is **PLN-provisioned Postgres** (deploy call sends `database: {enabled:true,type:"postgres"}`) → `DATABASE_URL` injected; use `ssl: { rejectUnauthorized: false }` in prod (already in `src/lib/db.ts`).
- **Resource limits (hard):** runtime 384Mi / 300m CPU; build 2Gi. NO separate worker processes — the F-6 outbox drain runs in-process (interval inside the Next server). Small pg pool (max 5). Stream file downloads, never buffer.
- **Baseline analytics are mandatory:** `initAppAnalytics()` from `src/lib/analytics.ts` (already written) must be called once in the root layout via a client component. Custom events only on request. Fire-and-forget, no PII in properties.
- Member identity: browser reads `authToken` cookie → `https://api-directory.plnetwork.io/v1/ai-apps/me` with `Authorization: Bearer <token>`. Returns uid, name, image, teams+roles — no email. Server API routes read the same `authToken` cookie from the request and resolve the member server-side against the same endpoint (short cache). Handle signed-out gracefully; dev fallback via `DEV_MEMBER_ID`/`DEV_MEMBER_NAME` env.
- UI: PL Design System **v1.9 (Tailwind v4)** at `app/pl-design-system/`. Import from the barrel `pl-design-system/components` (Button, EntityCard, PageShell, PageHeader, ListGrid?, TagList, SearchInput, Table, Tabs, Tag, Badge, EmptyState, Alert, Modal, Field, Input, TextArea, Checkbox, Avatar, Pagination…). **Semantic Tailwind utilities only** (`bg-surface`, `text-secondary`, `border-border`, `shadow-card`) — never raw hex, never `slate-*`, never `--pl-*` primitives. Inter via `next/font/google` in root layout. globals.css already wires `@source` + token imports. Read `app/pl-design-system/README.md` + `guidelines.md` before UI work.

## Stack decisions (settled — do not relitigate)
- Next.js 14 App Router + Tailwind v4, TypeScript, in `app/` with `src/` dir (`src/app`, `src/lib`)
- Postgres via `pg` + `DATABASE_URL` (local dev: `postgres:///plaabook`; prod: PLN-provisioned). Schema in `app/db/schema.sql` (PRD §9 + search trigger). Member id columns are TEXT (LabOS uids are cuid-style, not UUIDs); safe attribution fields (`submitter_display_name`, `submitter_avatar_url`) stored denormalized on resources.
- File storage: adapter interface in `app/src/lib/storage.ts` with local-disk impl (`app/data/uploads/`, gitignored). Supabase Storage swap = one file. **Deviation from PRD noted: no Supabase credentials available locally; adapter keeps cutover one-file.**
- Group membership: stub adapter `app/src/lib/membership.ts` (Q1 open per PRD — stub specified by PRD itself). Fails closed.
- Search: Postgres `tsvector` (trigger-maintained), no extra infra
- Tests: Vitest (`npm test`), compliance suite in `app/tests/compliance/`

## PLAA guardrails (enforce everywhere)
- NO points, point totals, Rights, or conversion math anywhere in UI. Status copy: "Sent for review" — nothing stronger.
- The word "earn" NEVER appears in user-facing copy ("collect" if points referenced at all — they shouldn't be).
- Attribution: display name + optional avatar ONLY. No email/private fields in any payload, DOM, or URL.
- Visibility filtering server-side in shared query helper (`app/src/lib/visibility.ts`) on EVERY read path. Out-of-scope detail = 404 + audit entry.
- Webhook payload: opaque member IDs only — no names, emails, titles, free text, file contents. `review_status: "pending"` always.
- Upvotes structurally severed from contribution pipeline: no trigger, no FK, no shared service, and NO event on upvote/view/download.
- Confidentiality nudge (copy from `config` table, versioned) blocks every upload path until acknowledged; ack timestamp persisted.
- All member-facing copy flagged in code comments: `/* pending Camille review */`; points-linkage framing: `/* pending Javier review */`.
- Snapshot status bar OMITTED. Directory-style shell retained.

## Agreed contracts
### Webhook payload (push AND pull — identical; schema-tested for PII absence)
```json
{
  "event_id": "uuid", "event_type": "resource.submitted | request.fulfilled",
  "occurred_at": "iso8601", "member_id": "labos-user-uuid", "resource_id": "uuid",
  "resource_type": "skill", "activity_slug": "share-reusable-ai-resource",
  "visibility": "pl_infra", "review_status": "pending", "source": "plaa-knowledge-base"
}
```
- HMAC-SHA256 over raw body → `X-PLAA-Signature`; `X-PLAA-Timestamp` (reject >5min skew)
- Retries: 1s, 4s, 16s, 1m, 5m, 30m… cap 8 attempts → dead-letter (admin-visible). 4xx → dead-letter immediately.
- Outbox row written in SAME transaction as resource. Missing secret at boot with a configured webhook URL → fail startup loudly.
- Pull: `GET /api/contributions?since=&cursor=&limit=` — service token (`Authorization: Bearer $CONTRIBUTIONS_SERVICE_TOKEN`) ONLY; member session → 401 + audit.

### API endpoints (member session unless noted)
POST /api/resources · POST /api/resources/fetch-metadata · POST /api/resources/check-duplicate ·
GET /api/resources (q, type, tag, submitter, cursor) · GET /api/resources/:id · GET /api/resources/:id/download ·
POST|DELETE /api/resources/:id/upvote · POST /api/resources/:id/report-broken ·
PATCH /api/resources/:id/visibility · POST /api/requests/:id/fulfill ·
GET /api/collections · GET /api/tags · GET /api/contributions (service token) · GET /health (none)

## Feature Progress
| Feature ID | Name | DB | API | UI | Tests | Status |
|-----------|------|----|-----|----|-------|--------|
| F-1 | Submit a Resource | ✅ | ✅ | ✅ | ✅ | Done |
| F-2 | Browse & Search | ✅ | ✅ | ✅ | ✅ | Done |
| F-3 | Detail / Download / Upvote | ✅ | ✅ | ✅ | ✅ | Done |
| F-4 | Visibility Scoping | ✅ | ✅ (middleware applied on every read route incl. PATCH visibility) | ✅ (plain-language selector, 404 state) | ✅ | Done |
| F-5 | Requests | ✅ | ✅ | ✅ | ✅ (submit-path + no-event-on-create covered; fulfil-flow E2E pending integrator) | Done |
| F-6 | Contribution Webhook | ✅ | ✅ | ✅ (admin dead-letter tab wired + retry) | ✅ | Done — delivery loop, pull endpoint, admin wiring, E2E verified |

## Acceptance Criteria → Test Mapping
| AC | Test | Status |
|----|------|--------|
| AC-1.3/1.4 skill frontmatter parse + graceful fallback | tests/unit/skills.test.ts | ✅ |
| AC-1.5 URL normalization/dedupe hash | tests/unit/urls.test.ts | ✅ |
| AC-1.6 empty why → 400 | tests/integration/submit.test.ts | ✅ |
| AC-1.7 upload without ack → 400 (file + skill) | tests/integration/submit.test.ts | ✅ |
| AC-1.8/"Sent for review" exact status copy | tests/integration/submit.test.ts + tests/compliance/copy.test.ts | ✅ |
| AC-1.C/2.C/3.C no "earn" in UI or API copy | tests/compliance/copy.test.ts | ✅ |
| AC-2.4/4.1/4.C out-of-scope absent from raw list payload | tests/integration/visibility.test.ts | ✅ |
| AC-3.2 out-of-scope detail → 404 + audit row | tests/integration/visibility.test.ts | ✅ |
| AC-3.5 upvote idempotency (double POST → 1; DELETE → 0) | tests/integration/upvote.test.ts | ✅ |
| AC-3.6/6.8 no event on upvote/view | tests/integration/upvote.test.ts + tests/compliance/severed-upvotes.test.ts | ✅ |
| AC-4.5 fail-closed scopes for unauthenticated | tests/integration/visibility.test.ts | ✅ |
| AC-5.∗ request creation emits NO event | tests/integration/submit.test.ts | ✅ |
| AC-6.1 resource + event same transaction | tests/integration/submit.test.ts | ✅ |
| AC-6.2 HMAC-SHA256 signing correctness | tests/unit/outbox.test.ts | ✅ |
| AC-6.3 backoff schedule + 8-attempt cap | tests/unit/outbox.test.ts | ✅ |
| AC-6.7/6.C payload keys exact, review_status pending, no titles/free text/PII | tests/unit/outbox.test.ts + tests/compliance/webhook-payload.test.ts + tests/compliance/no-pii.test.ts | ✅ |
| AC-6.3 retry/dead-letter delivery loop, AC-6.5/6.6 pull endpoint auth | ⏳ integrator (test-writer will extend once landed) |  |

## Phase Gates
| Phase | Gate | Result | Timestamp |
|-------|------|--------|-----------|
| 0 Contracts | starter kit v1.9 read + schema/payload agreed | ✅ | (earlier, see log) |
| 1 Foundation | libs + migrate + seed (32/12/4) | ✅ | (earlier, see log) |
| 2 Core | API + UI smoke | ✅ | (earlier, see log) |
| 3 Integration | outbox E2E + pull auth + build | ✅ | (earlier, see log) |
| 4 Validation | migrate+seed idempotent · 40/40 tests · build clean · live smoke · no-earn grep | ✅ | 2026-08-21 11:38 |

## Activity Log
- 2026-08-21 Design-prototype UI rebuild (Crowd-sourced knowledge-base design zip, `design-reference/PLAAbook.dc.html`): frontend rebuilt to match the prototype with verbatim chrome copy (sample data NOT imported — "earned its place" etc. stayed out). New shell rail (Everything/Collections/Requests · Yours: Shared by you/Found useful, live counts via new GET /api/stats). Index = why-first row list (17px why, type-tinted 44px tiles, upvote pill + visibility label), Collections strip w/ preview bullets, toolbar (SearchInput + Everything/Skills/Links/Docs/Reading/Requests tabs + Most recent/Most useful sort), verbatim zero-result & empty-corpus states. New pages: /collections, /collections/[slug], /members/[id] (safe-fields profile + stats via new GET /api/members/[id]). Detail page: badges + why card + per-type artifact blocks (link box, file box w/ extracted-text preview, skill card w/ install bar + SKILL.md viewer, request fulfil flow w/ candidate picker + toast). Submit is now an 880px modal (type picker → two-column compose w/ live preview + timer → receipt; /submit deep-links open it; drafts + analytics kept; visibility stays FIXED to PL Infra — design's plaa_members select deliberately not rendered). API: /api/resources adds type=reading + upvotedBy=me + submitterMemberId/visibility in rows; detail adds extractedPreview; /api/collections adds preview+curatorName; /api/me adds opaque id. Icon glyphs 'diamond' + 'arrow-fat-up' added (sanctioned one-line edits). /requests → redirect to /?type=request; old ResourceCard deleted. copy.test.ts "Sent for review" assertion re-pointed at SubmitModal.tsx (assertions unchanged in strength). tsc clean · 43/43 tests · build clean · all routes 200 · dev server left running on :3000.
- 2026-08-21 UI clarity pass: Homepage Collections changed from link-like cards into a clearly labelled filter panel with PL Green success tokens, wrapping titles, All resources reset, selected state, and a results heading confirming the active collection. Share visibility is now fixed to PL Infra in UI and rejected server-side for wider scopes. Added integration coverage; tsc clean, 43/43 tests green, production build clean, browser interaction verified collection switch + fixed audience.
- validator: FINAL GATE PASSED (2026-08-21). migrate+seed idempotent (32 resources, +0 on rerun) · npm test 40/40 green (10 files) · next build clean · live on :3123: /health 200, / 200 (client-rendered index; /api/resources serves 20 seeded items with why-lines), POST /api/resources → 201 + status exactly "Sent for review", ?q=retrieval → 1 ranked hit, upvote double-POST idempotent (count 1) with ZERO contribution events, GET /api/contributions Bearer 200 (exact 10-key payload, review_status=pending) / no token 401, NO X-Frame-Options header · grep earn(s|ed|ing) in src/app → 0 hits. Validation test row deleted; corpus back to 32 seeded / 0 stray events. Residual risks logged below. Zero code changes needed.
- integrator: F-6 complete + whole-app integration pass. src/lib/outbox.ts (deliverPendingEvents: FOR UPDATE SKIP LOCKED batch 20, consumes test-writer's signWebhookBody/backoffDelayMs/MAX_DELIVERY_ATTEMPTS, 2xx→delivered, 4xx→immediate dead-letter, 5xx/network→backoff cap 8→dead-letter, URL unset→logged no-op), src/instrumentation.ts + instrumentation-node.ts (fail-loud missing-secret check — verified: boot throws + /health 500; 15s in-process unref'd interval, no worker; file split keeps pg out of the edge bundle), /api/contributions GET (timingSafeEqual service token, member session never authenticates, 401+audit, since/cursor/limit≤200 keyset (occurred_at,event_id), items = exact webhook payload), /api/admin/events GET+POST retry (non-admin 404, audit admin_retry_event), /api/admin/flagged GET. Wired AdminTabs dead-letter tab to /api/admin/events (pending count + per-row Retry). Integration fixes: next.config instrumentationHook, db.ts generic cast, vendored cn.ts theme type cast. Verified live on :3111 — /health 200, / renders, submit→resource+event same tx, pull 200 exact-shape / 401+audit, upvote ×2 idempotent + zero events, dead-letter→retry→reset+audit, cursor no-overlap, NO X-Frame-Options, AND real E2E delivery to a local HMAC-verifying receiver (signature valid, exact 10-key payload, delivered_at set). tsc clean, next build clean, 40/40 vitest green. Test rows cleaned; 32 seeded resources intact.
- test-writer: 40 tests green (`cd app && npm test`, 10 files) against real local db, rows cleaned up (32 seeded resources intact, 0 stray events/audit rows). Added vitest.config.ts (alias @→src, serial files, tests/setup.ts sets DEV_MEMBER_ID). Suites: unit (urls, skills, outbox), integration (submit, visibility w/ vi.mock'd membership narrowing, upvote), compliance (copy "earn" scan + "Sent for review", webhook payload exact-keys from a REAL outbox row, no-PII key scan on list/detail/contribution payloads, severed-upvotes source+schema+db). MINIMAL IMPL ADDITION (noted for integrator): added pure F-6 helpers to src/lib/contributions.ts — `backoffDelayMs()` (1s,4s,16s,1m,5m,30m… repeat), `MAX_DELIVERY_ATTEMPTS=8`, `signWebhookBody()` (HMAC-SHA256 hex) — delivery loop should consume these rather than re-implementing. No other implementation deviations found.
- frontend-builder: All pages done — layout.tsx (Inter, globals.css, AnalyticsInit once), AppShell (Navbar + left rail Browse/Collections/Requests/Share something/Admin + footer, snapshot status bar OMITTED), page.tsx (F-2: collections, search, type/tag/sort/collection filters in shareable URL state — opaque values only, why-line on every card, zero-result→request CTA + search_zero_results{queryLength} — never query text, cursor load-more, degraded-search Alert), submit/page.tsx (F-1: 6-type picker, fetch-metadata + check-duplicate on URL blur with non-blocking fallbacks, "Shared by [Name] in [Month]" + Add-my-note override, required why 200-max, plain-language visibility selector, controlled-vocab tags, nudge fetched from /api/config/nudge gating a disabled upload control, 10MB + type client validation with specific messages, localStorage draft persist/restore, receipt with "Sent for review" (requests: posted copy), submit_completed{ms,type}, ?type=request&q= and ?fulfills= prefills), resources/[id]/page.tsx (F-3: hero, Useful upvote optimistic idempotent toggle, open-link/download via authenticated route, skill treatment: parsed name/description + read-only SKILL.md viewer + copy install path, report-broken, related-by-tag, 404-not-available state), requests/page.tsx (F-5: open/fulfilled, >30d de-emphasis, fulfill modal — search existing in-scope or submit new), admin/page.tsx (server-side isAdmin gate → notFound(); AdminTabs: dead-letters/flagged/tags tables, degrade gracefully; expects /api/admin/dead-letters + /api/admin/flagged when integrator lands them). tsc clean for owned files (pre-existing cn.ts + db.ts errors remain — team-lead). Smoke: / /requests /submit 200; /admin 404 anon, 200 as admin; all member-facing copy commented /* pending Camille review */; "earn" absent (grep-verified).
- backend-builder: all member-session API routes done under src/app/api (resources CRUD+search, fetch-metadata, check-duplicate, detail, download, upvote POST/DELETE, report-broken, visibility PATCH, requests/:id/fulfill, collections, tags, config/nudge). Smoke-tested on :3199 (submit→"Sent for review", search+zeroResults, detail, idempotent upvote, dedupe across URL normalization, request create→"Posted" no event, fulfill→self-fulfilment emits NO event, nudge copy served). Notes: (1) added `experimental.serverComponentsExternalPackages: ['unzipper','pg']` to next.config.mjs — unzipper's optional @aws-sdk require breaks webpack bundling otherwise; (2) ranked (q=) search caps at one page — keyset cursor applies to recency ordering only (ponytail: rank-cursor pagination if search corpora grow); (3) upvote route imports nothing from contributions.ts (structural severance); (4) GET /api/contributions deliberately NOT built — integrator owns it. /api/contributions pull + outbox delivery still pending.
- lib-builder: src/lib complete — auth.ts (server member resolution + cache + requireMember + isAdmin), membership.ts (fail-closed stub adapter, Q1 TODO), visibility.ts (scopeFilterSql + notFoundWithAudit), audit.ts, urls.ts (normalize + sha256 hash), skills.ts (SKILL.md/zip frontmatter parse, graceful null), contributions.ts (transactional outbox enqueue + exact payload builder), config.ts (60s cache). scripts/seed.mjs seeded 12 tags / 4 collections / 32 resources, idempotent (verified 2 runs). NOTE for team-lead: pre-existing tsc errors in pl-design-system/lib/cn.ts (vendored — consider excluding pl-design-system in tsconfig per USAGE.md) and src/lib/db.ts generic return type — both outside my ownership.
- team-lead: Phase 0 done against ai-app-starter-kit-v1.9. Contracts recorded, v1.9 pl-design-system copied into app/, scaffold written (package.json, tsconfig, postcss, next.config, globals.css, /health, analytics lib, db lib, schema.sql, migrate script, Dockerfile), Postgres db `plaabook` created.

- fix-pass: Review findings M1/M2/L3/L4 fixed. M1: fulfill route now requires the fulfilling resource's visibility to cover the request's audience (plaa_members request ⇒ plaa_members resource) + new tests/integration/fulfill-audience.test.ts. M2: client types in src/components/shared.ts rewritten to the APIs' actual camelCase shapes (tags are slug string[]); all usages fixed (page.tsx resourceCount, ResourceCard, resources/[id]/page.tsx, requests/page.tsx incl. fulfill body `resourceId`, submit page duplicate hint now reads `existing` and FormData sends `confidentialityAck`); GET /api/resources now implements the `?collection=` filter (curated join + auto open-requests rule, visibility-scoped) and returns `fulfilledByResourceId`; AdminTabs got a local FlaggedRow type (admin API stays snake_case). L3: new GET /api/me returns {displayName, avatarUrl, isAdmin} (safe fields only); AppShell hides the Admin rail item for non-admins. L4: DEV_MEMBER_ID fallback gated on NODE_ENV !== 'production' (verified: prod `npm start` returns 401 without a session even with the env set). Validation: tsc clean, 42/42 tests pass, build clean, dev+prod boot sanity done.

## Blockers & Issues
| Issue | Status | Resolution |
|-------|--------|------------|
| LabOS group-membership contract unconfirmed (Q1) | Open | Stub adapter behind interface, fails closed |
| Points webhook receiver undetermined (Q2) | Open | Configurable $POINTS_WEBHOOK_URL |
| `next start` warns "does not work with output: standalone" locally (still serves); Docker CMD uses standalone `server.js` correctly | Noted | No action — local-dev-only warning |
| Index page bails to client-side rendering (URL-state filters via useSearchParams); seeded content arrives from /api/resources, not in the SSR HTML | Noted | Acceptable for iframe app; SSR the list later if SEO/first-paint matters |
| Ranked (q=) search caps at one page (backend-builder ponytail note) | Open | Add rank-cursor pagination if corpora grow |
| No Supabase credentials in this environment | Resolved | v1.9 provides PLN-provisioned Postgres; files stored as bytea in Postgres behind storage adapter (small corpus, one datastore, survives container restarts) |
