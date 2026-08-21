# PLAAbook — Knowledge Base & Resource Sharing

A members-only knowledge base for the Protocol Labs Network: share, find, and
request docs, Claude/Hermes Skills, newsletters, and creators worth following —
in under a minute, with sharing automatically counted as a PLAA contribution
(no forms).

Built on the [PLN AI Apps Starter Kit](https://github.com/protocol) (v1.9) with
the PL Design System, for deployment to LabOS. See the full product spec in
[`PRD_ PLAAbook — Knowledge Base & Resource Sharing.md`](<PRD_ PLAAbook — Knowledge Base & Resource Sharing.md>).

## Features

- **Submit a resource** (F-1) — five post types (`link`, `file`, `skill`,
  `newsletter`/`creator`, `request`), OG-tag autofill on paste, duplicate
  detection, a required one-line "Why is this worth someone's time?", and a
  blocking confidentiality acknowledgement on every upload path.
- **Browse & search** (F-2) — Postgres full-text search over titles, why-lines,
  tags, and extracted file text; curated Collections; controlled tag vocabulary.
- **Resource detail** (F-3) — authenticated file/Skill downloads, read-only
  SKILL.md viewer with copyable install path, single "Useful" upvote
  (recognition only — structurally severed from the points pipeline).
- **Visibility scoping** (F-4) — `pl_infra` / `plaa_members`, enforced
  server-side in shared query middleware on every read path; out-of-scope
  access returns 404 and is audit-logged; fails closed.
- **Requests** (F-5) — "does anyone have…?" posts; fulfilment links a resource,
  notifies the requester, and credits the fulfiller.
- **Contribution webhook** (F-6) — transactional outbox emitting
  HMAC-SHA256-signed `resource.submitted` / `request.fulfilled` events
  (opaque member IDs only, no PII) with retry/backoff/dead-letter, plus a
  service-token-authenticated pull/backfill endpoint (`GET /api/contributions`).

**Deliberate compliance posture:** this app displays no points, point totals,
Rights, or conversion math anywhere. Submissions show a neutral
**"Sent for review"** status; every crediting decision lives in the existing
PLAA Activities review workflow.

## Stack

| Component | Choice |
|---|---|
| Runtime | Next.js 14 (App Router, TypeScript), Tailwind v4 |
| UI | PL Design System (vendored at `app/pl-design-system/`) |
| Database | PostgreSQL (`pg`; PLN-provisioned in production, plain Postgres locally) |
| Search | Postgres `tsvector` full-text (no extra infrastructure) |
| File storage | Postgres `bytea`, streamed only through an authenticated route |
| Tests | Vitest — unit, integration, and compliance suites |

## Running locally

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+** running locally (`brew install postgresql@16 && brew services start postgresql@16` on macOS)

### 1. Create the database

```bash
createdb plaabook
```

### 2. Install, migrate, seed

```bash
cd app
npm install
npm run migrate   # applies db/schema.sql (idempotent)
npm run seed      # 12 tags, 4 collections, 32 seed resources (idempotent)
```

Both scripts default to `postgres:///plaabook`; set `DATABASE_URL` to override.

### 3. Configure environment

```bash
cp .env.example .env
```

Local defaults work out of the box. The variables:

| Variable | Purpose | Local default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgres:///plaabook` |
| `DEV_MEMBER_ID` / `DEV_MEMBER_NAME` | Dev identity when no LabOS session cookie is present (**ignored in production builds**) | `dev-member-1` / `Dev Member` |
| `ADMIN_MEMBER_IDS` | Comma-separated member IDs treated as WG admins | `dev-member-1` |
| `CONTRIBUTIONS_SERVICE_TOKEN` | Bearer token for the pull/backfill endpoint | `dev-service-token` |
| `POINTS_WEBHOOK_URL` | Points-system receiver for outbox delivery (unset = events queue locally) | *(empty)* |
| `POINTS_WEBHOOK_SECRET` | HMAC-SHA256 signing secret — **required at boot if the URL is set** (the app refuses to start rather than deliver unsigned events) | *(empty)* |

### 4. Run

```bash
npm run dev       # http://localhost:3000
```

Sanity checks:

```bash
curl -s localhost:3000/health                       # {"status":"ok"}
curl -s localhost:3000/api/resources | head -c 300  # seeded resources
```

In dev mode you are signed in as `DEV_MEMBER_ID`. In production the app reads
the LabOS `authToken` cookie and resolves the member against the PL Directory —
without a session it shows a friendly signed-out state.

### 5. Tests

```bash
npm test
```

Runs the full suite against your local database: unit (URL normalization,
SKILL.md parsing, HMAC/backoff), integration (transactional outbox, visibility
scoping, idempotent upvotes), and compliance (no "earn" in copy, PII-free
webhook payloads, out-of-scope leak assertions, upvote/pipeline severance).

### Production build

```bash
npm run build
npm start         # binds 0.0.0.0:$PORT, serves GET /health
```

The `Dockerfile` produces the deployable image (migrates on boot, then serves).

## Deploying to LabOS

Deployment follows the starter-kit flow (`.claude/skills/deploy-to-labs/`):
register as a **draft** with `requiredEnvVars` (`POINTS_WEBHOOK_URL`,
`POINTS_WEBHOOK_SECRET`, `CONTRIBUTIONS_SERVICE_TOKEN`, `ADMIN_MEMBER_IDS`) and
`database: {"enabled": true, "type": "postgres"}` for a PLN-provisioned
Postgres (`DATABASE_URL` is injected). Secret values are entered in LabOS —
never committed here.

## Repository layout

```
app/                  The deployable application (self-contained)
  src/app/            Next.js routes — pages + /api endpoints + /health
  src/lib/            Auth, membership adapter (stub), visibility, audit,
                      outbox, contributions, URL/Skill parsing, config
  db/schema.sql       Full relational schema (types, tables, indexes, trigger)
  scripts/            migrate.mjs · seed.mjs
  tests/              unit/ · integration/ · compliance/
  pl-design-system/   Vendored PL Design System (Tailwind v4)
TeamWork.md           Build coordination log, contracts, and guardrails
PRD_ PLAAbook….md     Full product requirements document
```

## Status / open items

- Member-facing copy is flagged **pending Camille review**; points-linkage
  framing **pending Javier review** (see PRD §0).
- Group membership uses a stub adapter (PRD §11 Q1) behind a one-file
  interface until the LabOS contract is confirmed; it fails closed.

## License

[CC0 1.0 Universal](LICENSE) — public domain dedication.
