# **PRD: PLAAbook**

| Field | Value |
| ----- | ----- |
| Author | Bill Warren · Product Lead, PLAA |
| Date | 2026-07-24 |
| Status | Draft for review |
| Version | 1.0 |
| Compliance gate | Required: **Camille** (product counsel) reviews all member-facing copy, the PII/confidentiality nudge, and the submission-status microcopy. **Javier** reviews only the points-linkage framing (the one seam where a KB action touches the points→Rights path). No Trust, value, or buyback surfaces in this PRD. |
| Design source | [https://claude.ai/design/p/d2f6f901-77bd-416b-b361-0c4ab47199ea?file=PLAA+Knowledge+Base.dc.html\&via=share](https://claude.ai/design/p/d2f6f901-77bd-416b-b361-0c4ab47199ea?file=PLAA+Knowledge+Base.dc.html&via=share)  |
| Deployment | PLN AI Apps Starter Kit now; LabOS-mirrored cutover later (see §9) |
| Related | PLAA-42/43/44 (member FAQ knowledge base \+ RAG endpoint) — see §4.3 for the deliberate seam |

---

## **0\. Compliance & Vocabulary Pre-Check (gates the build)**

* \[x\] **Vocabulary:** "collect" is used wherever points are referenced; "earn" appears nowhere in user-facing copy. Preferred terms throughout: *share*, *contribution*, *submit*, *recognition*. Note: this app's UI surfaces **no point totals at all** (see Economics below), so the vocabulary surface is small by design.  
* \[x\] **Non-promotional:** no price predictions, projected returns, urgency-to-acquire, or guaranteed-liquidity framing. The app leads with network knowledge-sharing value; the points linkage is a downstream, secondary mention.  
* \[x\] **PII/KYC:** no KYC in this app. Three PII surfaces exist and are handled: (a) uploaded files may inadvertently contain PII or confidential material → mandatory pre-upload nudge (F-1); (b) submitter attribution → display name \+ optional avatar only, never email or private profile fields; (c) the outbound contribution webhook → **member ID only, no names, no emails, no file contents** (F-6). No PII in URLs or query params. RBAC \+ audit logging on all admin and service-token access.  
* \[x\] **Economics:** **N/A by design — the Knowledge Base never displays points, point totals, Rights, or conversion math.** A submission emits a *pending contribution event*; the existing Activities review workflow decides whether and what to credit. This keeps the KB entirely outside the regulated-value surface. Submission-status copy reads "**Sent for review**," never "you collected N points."  
* \[x\] **Buyback:** N/A — not surfaced.  
* \[x\] **Eligibility:** N/A — this app is not country-gated. Access is **membership-gated** (PL Infra → all PLAA members) via the visibility model in F-4.  
* \[x\] **Legal review gate named:** Camille on all member-facing copy (§5 F-1, F-3, F-5) and the confidentiality nudge; Javier on the points-linkage sentence only. Named per feature in Compliance flags.

---

## **1\. Overview**

PL Infra members are already generating and finding genuinely useful material — internal docs, Claude and Hermes Skills, sharp newsletters, creators worth following — and it is scattered across DMs, Slack threads, and personal bookmarks. When someone leaves a team or a thread scrolls, that knowledge is gone. Meanwhile PLAA already *has* an activity for exactly this behavior ("Share a Reusable AI Resource or Tool," a 250-point proof-of-work submission), but claiming it means posting in the Forum, which is really only for topics that merit back-and-forth discussion and then filling out a Google Form — which is the single most-cited source of friction in the program's detractor data.

This PRD specifies a lightweight, members-only Knowledge Base where a member can share a resource in under a minute, find what someone else shared without knowing it existed, and ask the network for something that doesn't exist yet. It ships first to PL Infra, then widens to all PLAA members through a visibility model built in from day one rather than retrofitted.

Crucially, it also **1\. Provides a place for more static knowledge sharing and 2 . closes the loop with the contribution program**. This leaves the PL Forum for posts most likely to spur conversation and the Knowledge base as a place to share helpful resources. Plus, every submission emits a structured contribution event to the PLAA points tracking system, converting a manual, form-driven proof-of-work activity into an automatic one. The submission *is* the proof. The Knowledge Base itself displays no points and no Rights — it hands a pending contribution to the existing review workflow and gets out of the way.

### **One-Sentence Description**

**A members-only knowledge base that lets PL Network members share, find, and request docs, Skills, and reading recommendations in under a minute, so** useful **material stops evaporating into DMs — and so sharing it counts as a contribution without anyone filling out a form.**

---

## **2\. Problem Statement**

### **The Problem**

Three distinct failures stack on top of each other:

1. **Knowledge evaporates.** There is no durable, searchable place for the informal material PL Infra members pass around. It lives in DMs, Slack scroll-back, and individual bookmark folders. Discovery is entirely dependent on knowing who to ask.  
2. **Sharing is unrewarded in practice.** The behavior is limited to posts about AI tools on the forum. This expands the activity to be more widely available to non-technical audiences and creates a place where PLAA members can find helpful resources.  
3. **The knowledge that does surface goes stale invisibly.** Links rot and Skills drift, with nothing signalling which is which.

### **Evidence**

**Quantitative (program-level, established):**

* Impactful activities per active user per month sits at **\~2.6 against a ≥3 target**. Converting a high-friction proof-of-work activity to a low-friction, more broadly applicable auto-tracked one moves this metric directly.  
* Product NPS is **−23.48 lifetime (recent reads as low as −45)**, with **71.4% of detractors scoring 5–6** — belief in the program, blocked by friction. Friction removal is the highest-leverage intervention available.  
* The current sharing path is one of the scattered `forms.gle/...` submissions the v2 Web App PRD commits to retiring.

**Qualitative (established):**

* The most-cited detractor theme is submission friction — the cognitive load of reporting a contribution often exceeds the perceived value of reporting it.  
* Visible peer activity is the program's strongest asset (IRL events drew zero detractors). A knowledge base is a peer-activity surface: you see what colleagues found valuable.

**Evidence gap — flagged, not papered over:** the program-level signals above are well-established, but demand for *this specific app* within PL Infra is currently inferred rather than measured. §11 Q6 carries this as an open question with a named owner. If a lightweight validation pass with PL Infra contradicts the assumption, the seeding plan (F-2) is the first thing to reconsider.

### 

### **Current Alternatives**

| Today | Why it falls short |
| ----- | ----- |
| Slack/DM sharing | Ephemeral, unsearchable after scroll-back, invisible to anyone not in the channel |
| Personal bookmarks / Notion pages | Private by default; no network-level discovery; no attribution |
| "Share a Reusable AI Resource or Tool" | The forum-related activity isn’t meant for more static posts that don’t merit conversation. It also feels more limited to those with technical skills.  |
| A generic Notion database | No contribution-loop integration, no visibility scoping tied to PL membership, sits outside the PLAA product surface |

---

## **3\. Target User**

### **Primary Persona**

| Attribute | Description |
| ----- | ----- |
| Name | The Network Contributor (PL Infra flavored) |
| Role | Legal, finance, research, ops inside PL Infra, working hands-on automating various processes with AI, documenting helpful playbooks, creating Skills, sharing guides and favorite learning resources.  |
| Goal | Find the tool/doc/Skill someone already vetted, and share their own without administrative overhead |
| Pain Point | Knows valuable material exists somewhere in the network but has no way to find it; sharing what they have costs more effort than it returns |
| Technical Level | Low — comfortable with Google docs, sharing links, short posts, as well as Skills, repos, CLI; low tolerance for clunky internal tools |

### **Secondary Personas**

* **The Super-Contributor / Ambassador** — needs curation leverage: the ability to assemble Collections that shape what the network reads, and visible attribution for it.  
* **The Admin / WG Operator** — needs to seed the corpus, curate Collections, monitor zero-result searches, and confirm contribution events are reaching the points system without spreadsheet reconciliation.  
* **The broader PLAA Member (phase 2 audience)** — same needs, wider trust boundary. Drives the visibility model in F-4.

### **User Context**

Mid-workday, mid-task. Two dominant modes: **"I just found something good"** (30 seconds of goodwill available — if submission takes longer, it does not happen) and **"I need X and don't want to reinvent it"** (impatient, will bounce to a web search if the KB returns nothing useful in one query). The app must be fast in both directions. Desktop-primary, inside the Directory shell.

---

## **4\. Solution Overview**

### **Value Proposition**

A place where the network's informal knowledge accumulates instead of evaporating — fast enough to submit to in the moment, organized enough to find things in later, and **wired into the contribution loop so sharing what you know counts without anyone filling out a form.**

### **Key Differentiators**

1. **Sub-minute submission.** Paste a URL or upload a doc, get title/description/favicon auto-filled, add one required sentence of context, save. The required sentence is the entire quality mechanism.  
2. **Skills as a first-class type.** SKILL.md frontmatter is parsed to auto-populate name and description, and Skills are downloadable as installable artifacts — not as anonymous zip files in a generic uploader.  
3. **The submission is the proof.** A shared resource emits a contribution event automatically. No Google Form, no separate reporting step, no double entry.  
4. **Requests as a first-class post type.** The demand signal is captured, not lost — and it tells the WG what to seed next.  
5. **Visibility scoping from day one.** PL Infra now, all PLAA members later, without a painful retrofit.

### **4.1 Design principle — the two failure modes**

Internal knowledge bases do not fail on features. They fail on **ingestion friction** (nobody submits) and **decay** (content goes stale and trust collapses). Every feature in §5 is justified against one of those two. Anything serving neither was cut to §6.

### 

### **4.2 Deliberate compliance posture — the KB is not a value surface**

The single most important architectural decision in this PRD: **the Knowledge Base displays no points, no point totals, no Rights, and no conversion math.** It emits a pending contribution event and shows a neutral status ("**Sent for review**"). Every downstream points decision, and every piece of copy that references value, lives in the Activities surface where it is already governed.

This is not caution for its own sake — it means a lightweight internal tool can ship quickly without dragging a regulated-value surface through review with it.

### **4.3 Relationship to PLAA-42/43/44 (the FAQ knowledge base)**

These are two different corpora with one shared retrieval pattern, and they should not become two RAG stacks:

* **PLAA-42/43/44** serves *authored FAQ content* through `POST /api/faq/ask` (decoupled RAG endpoint, Option B architecture).  
* **This app** holds *member-submitted resources*.

Semantic ask-over-the-corpus is **deferred out of this MVP** (§6). When it lands, it must reuse PLAA-43's endpoint contract and ingestion pattern against a second index — not stand up a parallel system. F-2 therefore requires that extracted resource text be stored in a retrievable column from day one, so the later index build is a backfill job rather than a re-architecture.

---

## **5\. Features (In Scope)**

**Agent Teams note:** each feature is a self-contained unit a teammate (or a Claude Design / Claude Code handoff) can own end-to-end. Appendix A holds one Claude Design \+ Claude Code prompt pair per feature.

**Shared design system line (applies to every feature below):** pull tokens from the Foundations Figma at build; brand primary blue `#1B4CFE` (white surfaces, near-black text `#0B0B13`/`#202028`; yellow is a secondary highlight only); Inter across the Foundations Display/Heading/Body/Label scale (Regular/Medium/Semi Bold, tight negative letter-spacing); reuse Directory shell chrome (top nav, footer, left-rail section nav). Reuse Foundations components — Button, Input, TextArea, Search, Badges & Tags, Card, Table, Tabs, Upload, Toast, Alerts & Notification, Empty, Pagination, Dropdown, Avatar — do not build bespoke components without flagging for design-system review.

**Snapshot status bar note:** the persistent snapshot status bar is **omitted** from Knowledge Base pages. It surfaces current points, and §4.2 keeps points off this surface entirely. The left-rail nav and Directory chrome are retained so the app still reads as one site.

---

### **Feature 1: Submit a Resource**

**Feature ID:** F-1 · **Priority:** P0 · **Complexity:** Med **Compliance flags:** **PII** — uploaded files may contain PII or confidential material (mandatory nudge); submitter attribution limited to safe fields. **Legal gate: Camille** on the confidentiality nudge copy and all submission-form microcopy. **Javier** on the single points-linkage sentence.

**Description:** A single submission surface handling five post types — link, file, Skill, and request — with paste-to-autofill, a required one-line justification, a duplicate check, and a mandatory confidentiality acknowledgement before any file upload. Optimized ruthlessly for time-to-submit; a link post should be completable in under 60 seconds.

**The five post types:**

| Type | Input | Autofill behavior | Stored artifact |
| ----- | ----- | ----- | ----- |
| `link` | URL | Fetch OG tags → title, description, favicon | URL \+ metadata |
| `file` | Upload (pdf, md, txt, docx, csv, zip) | Filename → title; extract text for search | File \+ extracted text |
| `skill` | Upload (SKILL.md or folder/zip) | Parse frontmatter → `name`, `description` | Skill bundle \+ parsed metadata |
| `newsletter` / `creator` | URL | Same as `link`, distinct tag \+ card treatment | URL \+ metadata |
| `request` | Free text | None | Request body (see F-5) |

**User Flow:**

1. User clicks "**Share something**" from any KB page  
2. User picks a type (or pastes a URL and the system infers `link`)  
3. System fetches metadata and pre-fills title/description; system runs a duplicate check on the normalized URL  
4. If a duplicate exists, system shows "**Shared by \[Name\] in March**" with a link to the existing resource and offers "**Add my note instead**"  
5. User completes the **required** "**Why is this worth someone's time?**" field (max 200 characters)  
6. User selects visibility (default: PL Infra) and adds tags from the controlled vocabulary  
7. **If a file or Skill upload:** user must acknowledge the confidentiality nudge before the upload control activates  
8. User submits; system persists, emits the contribution event (F-6), and shows a receipt with status "**Sent for review**"

**Behavior Specification:**

* **Trigger:** user opens the submission form and provides a URL, file, or request text  
* **Action:** system infers type, fetches/parses metadata, checks for duplicates, validates required fields, persists the resource, writes an audit entry, and enqueues a contribution event  
* **Result:** user sees a confirmation receipt naming the resource, its visibility scope, and a neutral review status — plus a direct link to the resource's detail page

**The confidentiality nudge (exact placement and behavior):**

* Appears **at the upload control**, before a file can be selected — not buried in a footer or a terms link  
* Requires an explicit acknowledgement (checkbox) to activate the upload control, and the acknowledgement is recorded against the resource with a timestamp  
* Draft copy (**pending Camille review**): *"**Share only what you'd be comfortable with every member of this space seeing. Please don't upload anything containing personal information about other people, confidential company material, or privileged legal or financial documents.**"*  
* The nudge text is stored as versioned config, not hardcoded, so Camille can revise it without a deploy

**Acceptance Criteria:**

* \[ \] AC-1.1: Given a pasted URL with reachable OG tags, when the field loses focus, then title, description, and favicon populate within 3 seconds and remain user-editable.  
* \[ \] AC-1.2: Given a URL whose metadata cannot be fetched (timeout, 403, no OG tags), when autofill fails, then the form remains fully usable with manual entry and shows an inline note — never a blocked or spinning state.  
* \[ \] AC-1.3: Given an uploaded SKILL.md or Skill bundle, when parsed, then `name` and `description` from the YAML frontmatter populate the title and description fields.  
* \[ \] AC-1.4: Given a Skill upload with malformed or absent frontmatter, when parsing fails, then the system falls back to manual entry with a clear inline explanation and still accepts the submission.  
* \[ \] AC-1.5: Given a submitted URL that normalizes to an existing resource's canonical hash, when the duplicate check runs, then the existing resource is surfaced with its submitter display name and date, and no duplicate record is created unless the user explicitly overrides.  
* \[ \] AC-1.6: Given an empty "**Why is this worth someone's time?**" field, when the user attempts to submit, then submission is blocked with an inline validation message. This field is non-optional for every post type.  
* \[ \] AC-1.7: Given a file or Skill submission, when the confidentiality acknowledgement is unchecked, then the upload control is disabled; when checked, the acknowledgement is persisted with a timestamp against the resource.  
* \[ \] AC-1.8: Given a successful submission, when the receipt renders, then it names the resource, states the visibility scope in plain language, and shows status "**Sent for review**."  
* \[ \] AC-1.9: Given a link submission with autofill, when measured end to end, then median time-to-submit is under 60 seconds (instrumented, not asserted).  
* \[ \] AC-1.C: **Compliance** — the receipt and all submission copy contain no point totals, no Rights references, and no instance of the word "earn." Submitter attribution renders display name and optional avatar only; no email or private profile field appears in any response payload, DOM, or URL. The confidentiality nudge is present and blocking on every upload path. All copy in this feature is flagged "pending Camille review."

**Error States:**

* Metadata fetch failure → inline note, manual entry available, submission unblocked  
* File exceeds size limit → specific message naming the actual limit and the file's size, before upload begins  
* Unsupported file type → names the accepted types explicitly  
* Duplicate detected → informational, not blocking; offers "**view existing**" or "**submit anyway**"  
* Contribution event enqueue failure → **submission still succeeds**; the event retries from the outbox (F-6). The user is never shown a failure for an internal integration problem.  
* Network failure mid-submit → form state preserved locally; retry restores rather than clears

**Test Requirements:** Unit — URL normalization, OG parsing, SKILL.md frontmatter parsing, duplicate hashing, required-field validation. Integration — full submit → persist → outbox enqueue → audit write. E2E — all five post types end to end, including the nudge gate. Compliance — assert “`earn”` absent from user-facing strings; assert no email/private field in any API response; assert upload control is inert until acknowledgement.

**Database Needs:** `resources`, `resource_tags`, `tags`, `audit_log`, `contribution_events` (see §9). **API Endpoints:** `POST /api/resources`, `POST /api/resources/check-duplicate`, `POST /api/resources/fetch-metadata`, `GET /api/tags`. Secure APIs only; no PII in query strings.

▶ **Claude Design prompt:** Appendix A.1 (F-1). ▶ **Claude Code prompt:** Appendix A.2 (F-1).

---

### **Feature 2: Browse & Search the Knowledge Base**

**Feature ID:** F-2 · **Priority:** P0 · **Complexity:** Med **Compliance flags:** Visibility filtering must be enforced server-side (see F-4). No value copy. **Legal gate: Camille** on empty-state and Collection copy.

**Description:** The main index. Lexical full-text search over titles, justifications, tags, and extracted file text, plus filters by type, tag, submitter, and recency — alongside hand-curated Collections for navigability without a folder hierarchy.

**Organization model — tags, not folders:** folder hierarchies die within a quarter because nobody agrees where things go. Tags plus a small number of curated Collections give navigability without a taxonomy debate. Ship with a **controlled vocabulary of \~12 seeded tags** so it does not fragment into `ai` / `AI` / `artificial-intelligence`. Members select from the vocabulary; new tags require WG curation (admin surface).

**Collections (seeded at launch):** "**Agent Skills we actually use**," "**Newsletters worth the inbox space**," "**Infra reading — start here**," "**Asked for, not yet found**" (auto-populated from open requests).

**User Flow:**

1. User lands on the Knowledge Base index  
2. User sees Collections, then a recency-sorted resource list scoped to their visibility  
3. User types a query, or applies filters, or opens a Collection  
4. System returns matching resources, visibility-filtered server-side  
5. User opens a resource (F-3)

**Behavior Specification:**

* **Trigger:** page load, query input, or filter change  
* **Action:** server executes a full-text query against the search vector, applies visibility scoping and filters, returns a paginated, ranked result set  
* **Result:** results render with type badge, title, submitter, date, tags, upvote count, and — critically — the "why" line, which is the field that makes a result judgeable at a glance

**Search implementation:** Postgres full-text search (`tsvector`) over title \+ why \+ tags \+ extracted text. No additional infrastructure. The `extracted_text` column is populated at ingest for every file and Skill so the later semantic index (§4.3) is a backfill, not a re-architecture.

**Acceptance Criteria:**

* \[ \] AC-2.1: Given a query matching a resource's title, why-line, tag, or extracted file text, when search runs, then the resource appears in results ranked by relevance.  
* \[ \] AC-2.2: Given any filter or filter combination (type, tag, submitter, recency), when applied, then the result set narrows correctly and filters are reflected in shareable URL state — **containing no PII**, member references by opaque ID only.  
* \[ \] AC-2.3: Given a query with no matches, when results render, then the empty state names the query, offers to open a Request post pre-filled with it (F-5), and emits a `search.zero_results` event.  
* \[ \] AC-2.4: Given a resource outside the user's visibility scope, when any search or browse query runs, then it is excluded server-side and is absent from the response payload entirely — not hidden in the client.  
* \[ \] AC-2.5: Given an empty corpus or an empty Collection, when rendered, then the empty state shows seeded Collections and a submission CTA — never a blank screen.  
* \[ \] AC-2.6: Given a result list, when rendered, then every result displays its "why" line.  
* \[ \] AC-2.7: Given more results than one page, when the user paginates, then filter and query state persist.  
* \[ \] AC-2.C: **Compliance** — no point totals, Rights references, or "earn" in any browse/search surface. Submitter shown as display name \+ optional avatar only. Visibility filtering is enforced in the query, verified by a test that asserts out-of-scope records never appear in the raw API response.

**Error States:** Search backend unavailable → fall back to recency-sorted browse with an inline notice, never a blank page. Malformed query → sanitize and search, never a 500\.

**Test Requirements:** Unit — query builder, filter composition, ranking. Integration — search \+ visibility scoping together, zero-result event emission. E2E — search → filter → open. Compliance — out-of-scope leak test on raw payloads.

**Database Needs:** `resources` (with `search_vector`, `extracted_text`), `tags`, `resource_tags`, `collections`, `collection_resources`. **API Endpoints:** `GET /api/resources` (query, filters, cursor pagination), `GET /api/collections`, `GET /api/tags`.

▶ **Claude Design prompt:** Appendix A.1 (F-2). ▶ **Claude Code prompt:** Appendix A.2 (F-2).

---

### **Feature 3: Resource Detail — View, Download, Upvote**

**Feature ID:** F-3 · **Priority:** P0 · **Complexity:** Low **Compliance flags:** Upvotes are **recognition signal only and must not feed points** (see below). Download access enforced against visibility. **Legal gate: Camille** on detail-page and upvote microcopy.

**Description:** The resource page: full context, the submitter, the artifact itself (open the link, view or download the file, download the Skill), and a single upvote as the quality signal.

**Why upvotes do not feed points — stated explicitly for the build team:** points terminate in PLAA Rights, a regulated security. Any mechanism where members can direct point flow to each other by voting creates a reciprocal-voting surface on a path to a regulated instrument, and it is an anti-gaming problem (§0.7) rather than a feature. Upvotes therefore affect **sort order and nothing else**. This constraint must survive into the code: the upvote table has no link to the contribution event pipeline.

**User Flow:**

1. User opens a resource from search, a Collection, or a direct link  
2. User sees title, the why-line, submitter and date, tags, type, visibility, and upvote count  
3. User opens the link, views the file inline (where the type allows), or downloads  
4. User optionally upvotes; the count updates immediately and the control reflects their state  
5. User navigates to related resources by tag

**Behavior Specification:**

* **Trigger:** resource page load, download click, or upvote toggle  
* **Action:** server validates visibility, serves metadata or streams the artifact, records the view/download counter, and toggles the upvote idempotently  
* **Result:** user sees full context and gets the artifact; the upvote reflects their state and the new count

**Skill download treatment:** Skills render their parsed `name` and `description`, show the raw SKILL.md in a read-only viewer, and offer a download plus a copyable install path. This is the treatment that makes the app feel purpose-built rather than a generic file dump.

**Acceptance Criteria:**

* \[ \] AC-3.1: Given a resource in the user's visibility scope, when the detail page loads, then title, why-line, submitter display name, date, tags, type, visibility label, and upvote count all render.  
* \[ \] AC-3.2: Given a resource outside the user's scope, when accessed by direct URL, then the server returns 404 (not 403\) and writes an audit entry. 404 avoids confirming the resource exists.  
* \[ \] AC-3.3: Given a file resource, when the user clicks download, then the file streams through an authenticated server route — never a public or signed-forever object-store URL — and the download counter increments.  
* \[ \] AC-3.4: Given a Skill resource, when the detail page loads, then parsed name/description render, SKILL.md is viewable read-only, and a download is available.  
* \[ \] AC-3.5: Given a user who has not upvoted, when they upvote, then the count increments by exactly one and the control shows their state; upvoting again removes it. Repeated calls are idempotent.  
* \[ \] AC-3.6: Given any upvote action, when processed, then **no contribution event is emitted and no points-system call is made** — asserted by test.  
* \[ \] AC-3.7: Given a link resource whose URL now 404s, when a member reports it broken, then the resource is flagged for WG attention without being deleted.  
* \[ \] AC-3.C: **Compliance** — no point totals, Rights references, or "earn" on the detail page. Upvote copy reads as recognition ("**Useful**"), never as a reward or a race. Submitter attribution safe-fields only. Download routes are authenticated and visibility-checked.

**Error States:** File missing from storage → clear message plus a WG report path, not a broken download. Upvote race → idempotent, last-write-wins, count re-fetched. Inline preview unsupported → fall back to download.

**Test Requirements:** Unit — upvote toggle idempotency, counter increments. Integration — download auth \+ visibility, 404-on-out-of-scope. E2E — open → download → upvote. Compliance — assert no points-pipeline call on upvote; assert safe-field-only attribution.

**Database Needs:** `resources`, `upvotes` (unique on `resource_id, member_id`), `audit_log`. **API Endpoints:** `GET /api/resources/:id`, `GET /api/resources/:id/download`, `POST /api/resources/:id/upvote`, `DELETE /api/resources/:id/upvote`, `POST /api/resources/:id/report-broken`.

▶ **Claude Design prompt:** Appendix A.1 (F-3). ▶ **Claude Code prompt:** Appendix A.2 (F-3).

---

### **Feature 4: Visibility Scoping & Access Enforcement**

**Feature ID:** F-4 · **Priority:** P0 · **Complexity:** Med **Compliance flags:** **This is the security boundary of the app.** Access control, audit logging, no PII leakage across scopes. **Legal gate: Camille** on the visibility-selector copy (members must understand who will see their upload — this is what makes the F-1 confidentiality nudge meaningful).

**Description:** Two-value visibility scoping, author-set at submission, enforced server-side on every read path. Built now specifically because retrofitting access scoping onto a knowledge base that assumed a single audience is genuinely painful, and it is near-free today.

**The model:**

| Scope | Value | Who sees it | MVP default |
| ----- | ----- | ----- | ----- |
| PL Infra | `pl_infra` | Members of the PL Infra group | **Yes** |
| All PLAA members | `plaa_members` | Any onboarded PLAA member | No |

Membership is resolved against **LabOS group membership**, not stored locally — the app holds a group identifier and asks LabOS. Owner for the group-membership source of truth: **Anuj** (§11 Q1). Until that contract is confirmed, the build uses a single adapter interface with a stub implementation so the swap is one file.

**User Flow:**

1. At submission (F-1), user selects visibility with plain-language labels — not enum values  
2. System persists the scope on the resource  
3. On every read, the server resolves the requester's group memberships and filters  
4. Resource detail shows its scope so the submitter always knows who can see it

**Behavior Specification:**

* **Trigger:** any read of a resource, list, search, download, or Collection  
* **Action:** server resolves requester group membership, applies scope filtering **in the query**, and denies out-of-scope reads with 404  
* **Result:** the user only ever receives resources they are entitled to see

**Acceptance Criteria:**

* \[ \] AC-4.1: Given a `pl_infra` resource and a requester not in PL Infra, when any list, search, download, or detail request runs, then the resource is absent from the response payload entirely.  
* \[ \] AC-4.2: Given a `plaa_members` resource and any onboarded PLAA member, when they browse, then the resource is visible.  
* \[ \] AC-4.3: Given the submission form, when the visibility selector renders, then it uses plain-language labels naming the actual audience, defaults to PL Infra, and is a required, explicit choice.  
* \[ \] AC-4.4: Given a change to a resource's visibility, when it is made, then an audit entry records actor, resource, previous scope, new scope, and timestamp.  
* \[ \] AC-4.5: Given the LabOS group-membership adapter is unreachable, when a read occurs, then the system **fails closed** — returning only the narrowest scope the requester is definitively entitled to — and surfaces a non-blocking degraded-state notice.  
* \[ \] AC-4.6: Given any endpoint added later, when it returns resources, then it inherits scope filtering through shared query middleware rather than per-endpoint logic.  
* \[ \] AC-4.C: **Compliance** — visibility filtering is enforced server-side in the query, never client-side. A dedicated test asserts that out-of-scope resources never appear in any raw API response. No member identifiers beyond opaque IDs cross the boundary. Every access denial is audit-logged.

**Error States:** Membership adapter timeout → fail closed, degraded notice, retry. Ambiguous membership → narrowest scope. Direct-URL probing → 404 \+ audit entry.

**Test Requirements:** Unit — scope resolution, fail-closed behavior. Integration — every read path under each membership permutation. E2E — two users in different scopes see different corpora. Compliance — raw-payload leak assertions across all endpoints; audit completeness.

**Database Needs:** `resources.visibility`, `audit_log`. Group membership is **not** stored locally. **API Endpoints:** Applies as middleware to all read endpoints. `PATCH /api/resources/:id/visibility` (author or admin only).

▶ **Claude Design prompt:** Appendix A.1 (F-4). ▶ **Claude Code prompt:** Appendix A.2 (F-4).

---

### **Feature 5: Requests ("does anyone have…?")**

**Feature ID:** F-5 · **Priority:** P1 · **Complexity:** Low **Compliance flags:** Member-facing copy. **Legal gate: Camille.** No value surfaces.

**Description:** A request post type capturing demand the corpus cannot yet satisfy. Requests are the highest-value product signal the app will produce: they tell the WG exactly what to seed, and they let a member answer a colleague's need directly.

**User Flow:**

1. User posts a request (free text \+ tags \+ visibility), or arrives from a zero-result search with the query pre-filled (AC-2.3)  
2. Request appears in the index with a distinct type badge and in the "**Asked for, not yet found**" Collection  
3. Another member fulfils it by linking an existing resource or submitting a new one against it  
4. Requester is notified; the request is marked fulfilled and links to the fulfilling resource  
5. Fulfilment emits its own contribution event (F-6) — answering a colleague's request is a contribution

**Behavior Specification:**

* **Trigger:** request submission, or fulfilment of an open request  
* **Action:** system persists the request, or links a resource to it, flips status to fulfilled, notifies the requester, and enqueues a contribution event for the fulfiller  
* **Result:** requester sees the answer; the corpus gains a resource that demonstrably someone needed

**Acceptance Criteria:**

* \[ \] AC-5.1: Given a submitted request, when persisted, then it appears in the index with a distinct type badge and in the "**Asked for, not yet found**" Collection.  
* \[ \] AC-5.2: Given a zero-result search, when the user takes the offered action, then the request form opens pre-filled with the query text.  
* \[ \] AC-5.3: Given an open request, when a member fulfils it with a new or existing resource, then the request status flips to fulfilled and links to the fulfilling resource.  
* \[ \] AC-5.4: Given a fulfilment, when processed, then the requester is notified and a contribution event is emitted for the **fulfiller** (not the requester).  
* \[ \] AC-5.5: Given a request open beyond 30 days, when the index renders, then it is visually de-emphasised rather than deleted.  
* \[ \] AC-5.6: Given a request, when it is displayed, then it is scoped by the same visibility model as every other resource type (F-4).  
* \[ \] AC-5.C: **Compliance** — no point totals, Rights references, or "earn." Fulfilment copy reads as helping a colleague, never as claiming a reward. All copy flagged "pending Camille review."

**Error States:** Fulfilment with an out-of-scope resource → blocked with explanation. Duplicate request → surfaces the existing one, non-blocking. Requester deactivated → request persists, notification silently skipped.

**Test Requirements:** Unit — status transitions, staleness logic. Integration — fulfilment → notification → contribution event for the correct member. E2E — zero-result → request → fulfilment. Compliance — copy assertions; correct-member event attribution.

**Database Needs:** `resources` with `type='request'`, `fulfilled_by_resource_id`, `fulfilled_at`. **API Endpoints:** `POST /api/resources` (type request), `POST /api/requests/:id/fulfill`, `GET /api/resources?type=request&status=open`.

▶ **Claude Design prompt:** Appendix A.1 (F-5). ▶ **Claude Code prompt:** Appendix A.2 (F-5).

---

### **Feature 6: Contribution Webhook \+ Backfill Endpoint**

**Feature ID:** F-6 · **Priority:** P0 · **Complexity:** Med **Compliance flags:** **PII** — payload must carry opaque member IDs only. **Points-linkage seam** — this is the one place the app touches the path that terminates in a regulated security. **Legal gate: Javier** on the points-linkage framing and the "**sent for review**" copy contract; **Camille** on any member-visible description of how sharing counts as a contribution.

**Description:** Dual-mode integration with the PLAA points tracking system: a **push** webhook fired on each qualifying action, plus a **pull** backfill endpoint the points system can poll to reconcile or recover missed events. Both emit the same payload shape from the same transactional outbox, so push and pull can never disagree.

**Critical design constraint — events are pending contributions, not point awards.** A submission does **not** credit points. It emits an event that enters the existing Activities reviewer-verification workflow, which decides what (if anything) is credited. The Knowledge Base has no authority to award anything, displays no point value, and asserts no outcome. This preserves the anti-gaming posture (§0.7) required because points convert to a regulated security: self-submission alone must never mint value.

**Qualifying events (v1):**

| Event type | Fires when | Credited member |
| ----- | ----- | ----- |
| `resource.submitted` | A link, file, Skill, newsletter, or creator post is created | Submitter |
| `request.fulfilled` | An open request is fulfilled | Fulfiller |

Upvotes, views, and downloads emit **no** contribution events (see F-3).

**Payload (identical for push and pull) — contains no PII:**

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "resource.submitted",
  "occurred_at": "2026-07-24T14:22:03Z",
  "member_id": "labos-user-uuid",
  "resource_id": "uuid",
  "resource_type": "skill",
  "activity_slug": "share-reusable-ai-resource",
  "visibility": "pl_infra",
  "review_status": "pending",
  "source": "plaa-knowledge-base"
}
```

No names, no email addresses, no file contents, no resource titles, no free text. The points system resolves the member from `member_id` against LabOS.

**Delivery guarantees:**

* **Transactional outbox** — the event row is written in the same transaction as the resource. If the HTTP delivery fails, the submission still succeeds and the event is retried.  
* **Retries** — exponential backoff (1s, 4s, 16s, 1m, 5m, 30m), capped at 8 attempts, then a dead-letter state visible in the admin surface.  
* **Signing** — HMAC-SHA256 over the raw body with a shared secret, in `X-PLAA-Signature`, plus `X-PLAA-Timestamp` for replay protection (reject skew beyond 5 minutes).  
* **Idempotency** — `event_id` is stable across every retry and across push/pull, so the receiver can dedupe safely.

**Pull / backfill endpoint:** `GET /api/contributions?since=<iso8601>&cursor=<event_id>&limit=<n>` — service-token authenticated (not member session), cursor-paginated, returns the identical payload shape, and is the recovery path when the receiver is down or a reconciliation is needed.

**Receiver note:** the destination is `$POINTS_WEBHOOK_URL`, configured as a secret, not hardcoded. Whether that terminates at an n8n workflow (Ken, PLAA-41) or a purpose-built endpoint is §11 Q2 — the app is indifferent, which is the point.

**Acceptance Criteria:**

* \[ \] AC-6.1: Given a qualifying submission, when it commits, then exactly one event row is written in the same transaction as the resource.  
* \[ \] AC-6.2: Given an event in the outbox, when delivery is attempted, then it POSTs to `$POINTS_WEBHOOK_URL` with a valid HMAC-SHA256 signature and timestamp header.  
* \[ \] AC-6.3: Given a delivery failure, when retried, then backoff follows the defined schedule, `event_id` is unchanged, and after 8 attempts the event enters dead-letter state and is visible to admins.  
* \[ \] AC-6.4: Given repeated delivery of the same event, when the receiver dedupes on `event_id`, then no duplicate contribution is created.  
* \[ \] AC-6.5: Given a `GET /api/contributions` request with a valid service token, when it executes, then it returns events since the cursor in the identical payload shape, cursor-paginated.  
* \[ \] AC-6.6: Given `GET /api/contributions` without a valid service token, when called, then it returns 401 and writes an audit entry. A member session must never authenticate this endpoint.  
* \[ \] AC-6.7: Given any emitted payload, when inspected, then it contains no name, email, file content, resource title, or free text — asserted by an explicit schema test.  
* \[ \] AC-6.8: Given an upvote, view, or download, when it occurs, then no contribution event is emitted.  
* \[ \] AC-6.9: Given a webhook delivery failure, when the user submits, then the user-facing flow is unaffected and shows a normal receipt.  
* \[ \] AC-6.C: **Compliance** — the payload asserts `review_status: "pending"` and never a point value or an award. No user-facing surface claims points were collected. The points-linkage description is flagged "pending Javier review"; member-visible contribution copy is flagged "pending Camille review." No PII in the payload, in query params, or in delivery logs.

**Error States:** Receiver unreachable → outbox retries, user unaffected. Receiver 4xx → dead-letter immediately (a 4xx is a contract problem, not a transient one) and alert admins. Signature secret missing at boot → **fail startup loudly** rather than delivering unsigned events. Clock skew → reject with a clear error rather than silently accepting.

**Test Requirements:** Unit — payload schema, HMAC signing, backoff scheduling. Integration — transactional outbox atomicity, retry and dead-letter behavior, service-token auth on the pull endpoint. E2E — submit → event delivered → dedupe on replay. Compliance — PII-absence schema assertion on every event type; no-event assertion on upvote/view/download.

**Database Needs:** `contribution_events` (outbox with delivery state, attempt count, dead-letter flag), `audit_log`. **API Endpoints:** outbound `POST $POINTS_WEBHOOK_URL`; inbound `GET /api/contributions` (service-token auth).

▶ **Claude Design prompt:** Appendix A.1 (F-6) — admin delivery-status view only. ▶ **Claude Code prompt:** Appendix A.2 (F-6).

---

## **6\. Out of Scope**

**PLAA defaults excluded:**

* **NOT building** a public or permissionless resource marketplace — closed, members-only.  
* **NOT building** heavy gamification (lootboxes, XP spending, streak multipliers, ranked leaderboards).  
* **NOT building** on-chain wallet connection, token transfers, or P2P/secondary markets.  
* **NOT replacing** the buyback auction or Trust operations; this app does not surface them at all.  
* **NOT** a full backend migration — this ships on the starter kit with a documented LabOS cutover (§9).  
* **NOT** introducing Airtable — the DB is built directly.

**Slice-specific exclusions:**

* **NOT building image or video hosting.** Text, documents, links, and Skills only.  
* **NOT building a folder hierarchy.** Tags \+ curated Collections instead (§5 F-2).  
* **NOT building a moderation queue.** Internal, identity-attributed audience; the confidentiality nudge (F-1) plus audit logs plus WG admin removal is the proportionate control.  
* **NOT building ratings beyond a single upvote.** No stars, no multi-dimensional scoring, no comments.  
* **NOT building per-resource ACLs.** Two-value visibility scoping only (F-4).  
* **NOT displaying points, point totals, Rights, or conversion math** anywhere in this app (§4.2).  
* **NOT building semantic ask-over-corpus in v1.** Deferred; must reuse PLAA-43's RAG contract when it lands (§4.3).

**Deferred to v2 (explicitly not v1, but the schema accommodates them):** semantic ask-box · Skill versioning and supersede chains · freshness/staleness nudges and last-verified prompts · Slack/Discord submission path · comments and threaded discussion · full-text OCR of scanned PDFs.

---

## **7\. User Flows**

### **Primary Flow: Share a resource in under a minute**

1. User opens the Knowledge Base and clicks "**Share something**"  
2. User pastes a URL  
3. System infers `link`, fetches OG metadata, pre-fills title and description, and runs a duplicate check  
4. System validates the required "**Why is this worth someone's time?**" field (blocking if empty)  
5. User picks visibility (defaults to PL Infra) and one or more tags from the controlled vocabulary  
6. System persists the resource, writes an audit entry, and enqueues a contribution event in the same transaction  
7. User sees a receipt: resource name, visibility in plain language, status "**Sent for review**", and a link to the detail page  
8. User can now share another, or open the resource they just added

### **Primary Flow: Find something someone already vetted**

1. User opens the Knowledge Base and sees Collections plus a recency-sorted list scoped to their visibility  
2. User types a query  
3. System runs full-text search over title, why-line, tags, and extracted file text, filtered server-side by visibility  
4. System displays ranked results, each showing its why-line so relevance is judgeable at a glance  
5. User opens a resource, reads the context, and opens the link or downloads the file or Skill  
6. User can now upvote it, or explore related resources by tag

### **Secondary Flow: Ask for something that isn't there yet**

1. User searches and gets zero results  
2. System shows an empty state naming the query and offering to post it as a request; system emits `search.zero_results`  
3. User accepts; the request form opens pre-filled with the query text  
4. User adds tags and visibility and posts  
5. Request appears in the index and in the "**Asked for, not yet found**" Collection  
6. Another member fulfils it; the requester is notified and the request links to the fulfilling resource  
7. System emits a `request.fulfilled` contribution event for the **fulfiller**

### **Secondary Flow: Upload a file with the confidentiality gate**

1. User selects the file post type  
2. System renders the upload control **disabled**, with the confidentiality nudge and an acknowledgement checkbox above it  
3. User reads and acknowledges; system enables the upload and records the acknowledgement with a timestamp  
4. User uploads; system extracts text for search, validates type and size, and pre-fills the title from the filename  
5. User completes the required why-line, visibility, and tags, then submits  
6. System persists, extracts, audits, enqueues the contribution event, and shows the receipt

---

## **8\. Success Metrics**

| Metric | Target | Measurement |
| ----- | ----- | ----- |
| Impactful activities / active user / month (north star) | ≥3 (from \~2.6) | PLAA program analytics; attribute the delta from converted resource-sharing contributions |
| Median time-to-submit, link post | \< 60 seconds | PostHog timer, form-open → receipt |
| PL Infra members submitting ≥1 resource in first 30 days | ≥ 40% | PostHog, unique submitters ÷ PL Infra headcount |
| Corpus at launch (seeded) | ≥ 30 resources before any member sees it | Manual pre-launch count |
| Zero-result search rate | Trending down after month 1 | `search.zero_results` ÷ total searches |
| Resources opened or downloaded ≥ once | ≥ 60% of corpus within 60 days | Server-side counters |
| Contribution event delivery success | ≥ 99% delivered within 5 minutes; 0 duplicates credited | Outbox delivery state \+ points-system reconciliation |
| Requests fulfilled | ≥ 50% of requests fulfilled within 14 days | `fulfilled_at − created_at` |
| Compliance | 0 point totals or Rights references rendered; 0 PII fields in any webhook payload | Automated test suite, every build |

**Phase-1 gate:** ships on schedule; passes one QA pass with minimal bugs; **≥30 seeded resources live at launch**; ≥10 member-submitted resources in week one; **zero contribution events delivered containing PII**.

**On the seeding target — this is the highest-risk item in the plan.** A knowledge base with nine items reads as abandoned and never recovers. Thirty-plus seeded resources is roughly a person-day of WG work and is the difference between the app living and dying. It is a launch gate, not a nice-to-have.

**The most actionable metric this app will produce is zero-result searches** — it is a direct, ranked seeding backlog. Instrument it before anything else.

---

## **9\. Implementation Notes**

### **Recommended Tech Stack**

**Deployment decision: PLN AI Apps Starter Kit now, LabOS-mirrored cutover later.** This is a deliberate, time-boxed divergence from the PLAA default of mirroring LabOS from day one. It is justified because this app is contained, holds no KYC PII, surfaces no regulated value, and needs to reach PL Infra quickly to be validated at all. The cutover obligation is real and is carried in §11 Q7 and §12 Phase 3 — it is not a way of never doing it.

| Component | Recommendation | Rationale |
| ----- | ----- | ----- |
| Runtime | Next.js 14 (or Node/Express per starter kit), `npm install && npm start`, binding `$PORT` on `0.0.0.0`, `GET /health` | PLN AI Apps deployment contract |
| Database | **Supabase PostgreSQL** — explicit product decision, regardless of starter-kit default | Consistent with the Roadmapper decision; real relational schema, migrations, row-level policies available |
| File storage | Supabase Storage, private buckets, served **only** through authenticated app routes | No public or long-lived signed object URLs (F-3 AC-3.3) |
| Search | Postgres full-text (`tsvector`), no additional infrastructure | Lightweight; keeps the MVP to one datastore |
| Auth | LabOS/Directory auth parity — single identity across PL surfaces | No separate account for this app |
| Group membership | LabOS adapter behind a single interface, stubbed until the contract is confirmed | §11 Q1 (Anuj); makes the swap a one-file change |
| Frontend | Foundations design system \+ Directory shell (Inter, brand blue `#1B4CFE`) | Reads as one site |
| Embedding | iframe-embeddable from `*.plnetwork.io` | PLN AI Apps deployment contract |
| Secrets | LabOS draft flow; `deploy-to-labs` | `$POINTS_WEBHOOK_URL`, HMAC secret, service token — never hardcoded |
| Admin | Minimal WG surface: seed/curate Collections, manage tag vocabulary, remove resources, view dead-lettered events — RBAC \+ audit logs | Replaces spreadsheet ops; no low-code dependency |
| Analytics | PostHog (already connected via remote MCP) | Time-to-submit, zero-result searches, open/download rates |
| Testing | Vitest \+ Playwright, plus compliance assertions | Guardrail enforcement in CI |

**Interim fallback (only if the DB build slips):** Airtable, with the identical schema shape, the same RBAC and audit expectations, and a documented time-boxed cutover. This is a fallback, not a destination, and should not be reached for given Supabase is a settled decision.

### **Database Schema**

```sql
-- Structured schema. Never spreadsheets.

CREATE TYPE resource_type AS ENUM ('link','file','skill','newsletter','creator','request');
CREATE TYPE visibility_scope AS ENUM ('pl_infra','plaa_members');
CREATE TYPE request_status AS ENUM ('open','fulfilled','withdrawn');

CREATE TABLE resources (
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
  submitter_member_id     UUID NOT NULL,      -- opaque LabOS member id; no PII stored here
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

CREATE INDEX idx_resources_search     ON resources USING GIN (search_vector);
CREATE INDEX idx_resources_visibility ON resources (visibility, created_at DESC);
CREATE INDEX idx_resources_dedupe     ON resources (canonical_url_hash) WHERE canonical_url_hash IS NOT NULL;

CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,   -- controlled vocabulary; ~12 seeded
  label      TEXT NOT NULL,
  curated    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resource_tags (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE TABLE collections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  description        TEXT,
  curator_member_id  UUID,
  auto_populate_rule JSONB,           -- e.g. open requests
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collection_resources (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  resource_id   UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, resource_id)
);

-- Upvotes are recognition signal ONLY. Deliberately no FK, trigger, or path
-- to contribution_events. Affects sort order and nothing else.
CREATE TABLE upvotes (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, member_id)
);

-- Transactional outbox. Written in the same transaction as the resource.
CREATE TABLE contribution_events (
  event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,      -- resource.submitted | request.fulfilled
  member_id      UUID NOT NULL,      -- opaque id only; NO PII in this table
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

CREATE INDEX idx_events_undelivered ON contribution_events (next_attempt_at)
  WHERE delivered_at IS NULL AND dead_lettered = FALSE;
CREATE INDEX idx_events_pull        ON contribution_events (occurred_at, event_id);

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id UUID,
  action          TEXT NOT NULL,     -- submit | visibility_change | remove | denied_access | admin_*
  entity          TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB,             -- MUST NOT contain PII
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE config (
  key        TEXT PRIMARY KEY,       -- e.g. confidentiality_nudge_copy
  value      TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### **API Endpoints**

| Method | Endpoint | Description | Auth |
| ----- | ----- | ----- | ----- |
| POST | `/api/resources` | Create any post type; enqueues contribution event | Member session |
| POST | `/api/resources/fetch-metadata` | OG-tag fetch for autofill | Member session |
| POST | `/api/resources/check-duplicate` | Normalized-URL dedupe check | Member session |
| GET | `/api/resources` | List/search with filters, cursor pagination; visibility-filtered | Member session |
| GET | `/api/resources/:id` | Detail; 404 if out of scope | Member session |
| GET | `/api/resources/:id/download` | Authenticated file/Skill stream; increments counter | Member session |
| POST/DELETE | `/api/resources/:id/upvote` | Idempotent toggle; emits no contribution event | Member session |
| POST | `/api/resources/:id/report-broken` | Flags for WG attention; does not delete | Member session |
| PATCH | `/api/resources/:id/visibility` | Author or admin only; audit-logged | Member session |
| POST | `/api/requests/:id/fulfill` | Links a resource; emits event for the fulfiller | Member session |
| GET | `/api/collections`, `/api/tags` | Curation surfaces | Member session |
| **GET** | **`/api/contributions`** | **Pull/backfill: `since`, `cursor`, `limit`; identical payload shape** | **Service token only — 401 on member session** |
| GET | `/health` | Deployment contract liveness | None |
| *(outbound)* | `POST $POINTS_WEBHOOK_URL` | Push: HMAC-signed, retried from outbox | HMAC-SHA256 |

No PII in any query string, path parameter, response body, or delivery log.

### **Key Implementation Considerations**

* **Visibility filtering belongs in shared query middleware**, not in per-endpoint logic. Every read path inherits it, so an endpoint added in six months cannot forget it.  
* **Outbox atomicity is the correctness backbone** of F-6. The event row and the resource row commit together, or neither does. A failed HTTP delivery must never fail a user's submission.  
* **Never let a signature secret be absent at boot** — fail startup loudly rather than delivering unsigned events to the points system.  
* **`extracted_text` is populated at ingest for every file and Skill**, even though v1 search is lexical. This is what makes the deferred semantic index (§4.3) a backfill rather than a re-architecture.  
* **Soft-delete only** (`removed_at`). A resource whose submission already produced a contribution event must not vanish and orphan that provenance (§11 Q8).  
* **The confidentiality nudge lives in `config`**, versioned, so Camille can revise the wording without a deploy.  
* **Upvotes must remain structurally severed from the contribution pipeline.** No trigger, no FK, no shared service. A test asserts this.  
* Pull design tokens from the Foundations Figma at build; reuse the Directory shell; omit the snapshot status bar on these pages.

---

## **10\. Claude Code Execution**

Six features → **Agent Teams is the recommended mode.** Task tool is the fallback.

### **⚠ Hard prerequisite (blocks all code)**

**The build agent MUST read `ai-app-starter-kit-v1.4` before writing any code.** The deployment contract, secrets flow (`deploy-to-labs`), health-check shape, and iframe-embedding requirements are defined there and are not reproduced in this PRD. This is the same dependency that gates the Roadmapper build; do not start Phase 1 without it.

### **Option A: Agent Teams (recommended)**

Enable: `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

**Setup prompt:**

```
Read the PRD at PRD-PLAA-KnowledgeBase-v1.md. Build it with an Agent Teams workflow.

BEFORE STARTING:
1. Read ai-app-starter-kit-v1.4 in full. Record the deployment contract, secrets
   flow, health-check shape, and iframe requirements in TeamWork.md. DO NOT write
   code before this is done.
2. Create TeamWork.md in the project root (template below).
3. Set up teammates: db-builder, test-writer, backend-builder, frontend-builder,
   integrator. Team Lead coordinates (delegate mode) and does not write feature code.

ENFORCE PLAA GUARDRAILS IN EVERY PHASE:
- This app displays NO points, NO point totals, NO Rights, and NO conversion math.
  Submission status copy reads "Sent for review" and nothing stronger.
- Users COLLECT points (never "earn") wherever points are referenced at all.
- Frontend matches Foundations + Directory/LabOS shell so it reads as one site;
  Inter typeface; brand primary blue #1B4CFE (white surfaces, near-black text;
  yellow secondary only). OMIT the snapshot status bar on these pages.
- Database is Supabase PostgreSQL with a structured relational schema. No
  spreadsheets. Airtable is NOT to be used.
- Visibility filtering is server-side, in shared query middleware, on every read path.
- The contribution webhook payload carries opaque member IDs ONLY — no names,
  emails, titles, free text, or file contents.
- Upvotes must have NO structural path to the contribution pipeline.
- test-writer MUST add: (a) "earn" never appears in user-facing copy; (b) no PII in
  URLs, query params, responses, or webhook payloads; (c) out-of-scope resources
  never appear in any raw API response; (d) no contribution event on upvote, view,
  or download; (e) the confidentiality nudge blocks every upload path.
- Flag all member-facing copy "pending Camille review"; flag the points-linkage
  framing "pending Javier review."

PHASES (hard gates — do not cross a failing gate):
Phase 0 — Starter-kit read + schema/API contracts published in TeamWork.md.
  GATE G0: starter-kit contract recorded; schema and webhook payload agreed;
  test harness scaffolded.
Phase 1 — Foundation: db-builder (schema, migrations, visibility middleware, audit
  log, config table) + test-writer (failing tests from all ACs incl. compliance).
  GATE G1: npm run test:db
Phase 2 — Core: backend-builder (F-1, F-2, F-3, F-5 endpoints) + frontend-builder
  (submit form, index/search, detail, requests) + test-writer.
  GATE G2: npm run test:api && npm run test:components
Phase 3 — Integration: integrator (F-6 outbox, HMAC signing, retry/dead-letter, pull
  endpoint; wire UI to real APIs, remove mocks) + test-writer (E2E per §7 flow).
  GATE G3: npm run test:e2e
Phase 4 — Validation & seeding: test:all, coverage >=80%, every AC including all
  AC-*.C passing, >=30 seeded resources loaded, PostHog events verified firing.
  GATE G4: full suite green + seeding gate met.
```

#### **TeamWork.md template**

```
# TeamWork — PLAA Knowledge Base
> Single source of truth. Every agent updates this on start / complete / blocker.

## Project Status
| Field | Value |
|-------|-------|
| PRD | PRD-PLAA-KnowledgeBase-v1.md |
| Starter kit read? | ⏳ ai-app-starter-kit-v1.4 — BLOCKS ALL CODE |
| Current Phase | 0 — Contracts |
| Compliance gate | Camille (member copy) · Javier (points linkage) |

## Feature Progress
| Feature ID | Name | DB | API | UI | Tests | Integration | Compliance | Status |
|-----------|------|----|-----|----|-------|-------------|------------|--------|
| F-1 | Submit a Resource | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
| F-2 | Browse & Search | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
| F-3 | Detail / Download / Upvote | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
| F-4 | Visibility Scoping | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
| F-5 | Requests | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
| F-6 | Contribution Webhook | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Not Started |
Legend: ⏳ Pending · 🔄 In Progress · ✅ Done · ❌ Failed · 🚫 Blocked

## Phase Gates
| Phase | Gate | Result | Timestamp |
|-------|------|--------|-----------|
| 0 Contracts | starter kit read + schema/payload agreed | ⏳ | - |
| 1 Foundation | npm run test:db | ⏳ | - |
| 2 Core | npm run test:api && npm run test:components | ⏳ | - |
| 3 Integration | npm run test:e2e | ⏳ | - |
| 4 Validation | test:all + coverage ≥80% + all AC incl. AC-*.C + ≥30 seeded | ⏳ | - |

## Activity Log
- [ts] team-lead: Initialized. Reading ai-app-starter-kit-v1.4 before any code.

## Blockers & Issues
| Issue | Reported By | Status | Resolution |
|-------|-----------|--------|------------|
| LabOS group-membership contract unconfirmed (Q1) | PRD | Open | Stub adapter behind interface |
| Points webhook receiver undetermined (Q2) | PRD | Open | Configurable $POINTS_WEBHOOK_URL |

## Acceptance Criteria → Test Mapping
| AC ID | Criterion | Test Type | File | Status |
|-------|-----------|-----------|------|--------|
| AC-1.C | no "earn"; safe-field attribution; nudge blocks upload | Unit + E2E | /tests/compliance/submit.test.ts | ⏳ |
| AC-4.C | out-of-scope never in raw payload | Integration | /tests/compliance/visibility.test.ts | ⏳ |
| AC-6.7 | no PII in webhook payload | Unit | /tests/compliance/webhook-payload.test.ts | ⏳ |
| AC-6.8 | no event on upvote/view/download | Integration | /tests/compliance/no-event.test.ts | ⏳ |
```

### **Option B: Task Tool (fallback)**

For a reduced slice (F-1, F-2, F-3 only). Read `ai-app-starter-kit-v1.4` first, then spawn parallel Tasks per phase using the same five roles and the same gates, layering in the compliance tests above. Defer F-5 and F-6 to a follow-on pass — but note that dropping F-6 removes the contribution-loop payoff that justifies building this inside PLAA at all, so this is a schedule fallback, not a scope preference.

### **Feature-to-Agent Mapping**

| Feature | DB | API | UI | Test | Integration |
| ----- | ----- | ----- | ----- | ----- | ----- |
| F-1 Submit | resources, tags, audit, config | POST resources, metadata, dedupe | Foundations Upload, Input, TextArea, Toast | unit/integration/E2E \+ compliance | UI→API |
| F-2 Browse & Search | search\_vector, collections | GET resources, collections, tags | Search, Badges & Tags, Card, Pagination, Empty | filter/rank/zero-result \+ leak test | UI→API |
| F-3 Detail | upvotes, counters | GET detail, download, upvote | Card, Button, Avatar, Tabs | idempotency \+ no-event assertion | UI→API |
| F-4 Visibility | visibility enum, audit | shared read middleware | Dropdown, Alerts | permutation matrix \+ leak test | all read paths |
| F-5 Requests | request fields | fulfill endpoint | Card, Badge, Empty | status transitions \+ attribution | UI→API |
| F-6 Webhook | contribution\_events | outbound POST \+ GET contributions | Admin delivery-status table | outbox atomicity, retry, PII schema | outbox→receiver |

---

## **11\. Open Questions**

| Question | Owner | Status | Blocking? |
| ----- | ----- | ----- | ----- |
| Q1. What is the source of truth for PL Infra group membership, and can the app resolve it via a LabOS API? Privacy gating of member data applies. | **Anuj** | Open | In the future, we’ll be able to get the PLAA membership from the user schema on LabOS. That’s not ready for v1 |
| Q2. Where does the contribution webhook terminate — an n8n workflow (PLAA-41) or a purpose-built endpoint? Who owns the receiver's idempotency on `event_id`? | **Ken** (n8n migration) | Open | It will get pushed to Airtable.  |
| Q3. Does "Share a Reusable AI Resource or Tool" need re-weighting from 150 points now that submission friction drops to near zero? Lower friction plus unchanged weight is an anti-gaming exposure. | **PLAA WG** | Open | No, that activity is for forum posts, this is an net new activity that will have lower points.  |
| Q4. File storage retention and deletion policy — how long are uploads kept, and what happens to a file when its resource is soft-deleted? | **Bill / Camille** | Open | Not blocking |
| Q5. Skill submission format — single SKILL.md, folder, or zip bundle? Does the app validate frontmatter strictly or accept and flag? | **Bill / PL Infra** | Open | Not blocking — F-1 AC-1.4 specifies graceful fallback either way |
| Q6. Has PL Infra demand for this been validated directly, or is it inferred from program-level friction signals? (§2 evidence gap) | **Bill** | Open | **Demand has been validated.**  |
| Q7. LabOS cutover trigger — what condition moves this off the starter kit onto the LabOS-mirrored stack, and who owns it? | **Bill / Anuj** | Open | Not blocking v1; must not become permanent by default |
| Q8. Can a submitter delete a resource after its contribution event was credited? Deletion after credit is a gaming surface; soft-delete is specified, but the policy needs a decision. | **Camille / PLAA WG** | Open | No deletion by users for v1. In v2, will allow edits.  |
| Q9. Confirm the PLAA-43 RAG endpoint contract so the deferred semantic ask-box is a backfill, not a rebuild (§4.3). | **Bill** | Open | Not blocking v1 |

---

## **12\. Timeline & Phases**

Dates are placeholders pending scheduling — sequence and gates are the substance.

### **Phase 0: Pre-build (Target: \[Date\])**

* \[ \] Resolve Q6 (PL Infra demand validation) — cheapest available de-risking  
* \[ \] Read `ai-app-starter-kit-v1.4`  
* \[ \] Camille reviews the confidentiality nudge, submission microcopy, and visibility-selector labels  
* \[ \] Javier reviews the points-linkage framing (F-6)  
* \[ \] Agree the webhook payload contract with the receiver owner (Q2)

### **Phase 1: Foundation (Target: \[Date\])**

* \[ \] Schema, migrations, seed tag vocabulary and Collections  
* \[ \] Visibility middleware \+ audit logging (F-4)  
* \[ \] Failing test suite from all ACs including compliance tests

### **Phase 2: Core (Target: \[Date\])**

* \[ \] F-1 Submit a Resource (all five types, autofill, dedupe, nudge)  
* \[ \] F-2 Browse & Search  
* \[ \] F-3 Detail, download, upvote  
* \[ \] F-5 Requests

### **Phase 3: Integration (Target: \[Date\])**

* \[ \] F-6 outbox, HMAC signing, retry/dead-letter, pull backfill endpoint  
* \[ \] PostHog instrumentation (time-to-submit, zero-result searches, open/download)  
* \[ \] Mock removal, E2E across all §7 flows

### **Phase 4: Seed & Launch (Target: \[Date\])**

* \[ \] **≥30 resources seeded before any member sees the app** (launch gate)  
* \[ \] QA pass; full suite green; coverage ≥80%  
* \[ \] PL Infra launch  
* \[ \] Reconciliation check against the points system (zero duplicates, zero PII)

### **Post-launch (v2 candidates, in rough priority order)**

* \[ \] Semantic ask-box on PLAA-43's contract  
* \[ \] Freshness/staleness signals and last-verified prompts  
* \[ \] Slack/Discord submission path  
* \[ \] Skill versioning and supersede chains  
* \[ \] Widen visibility to all PLAA members

---

## **Appendix A — Handoff Prompt Scaffolds**

One Claude Design \+ Claude Code pair per feature. The PLAA guardrail lines are non-negotiable and must be kept verbatim.

**Shared guardrail block (referenced as `[PLAA-RULES]` in the prompts below — expand it inline when pasting):**

```
PLAA rules (enforce in all copy and UI):
- This app displays NO points, NO point totals, NO Rights, and NO conversion math.
  Submission status copy reads "Sent for review" — never "you collected N points."
- Where points are referenced at all, users COLLECT points; points CONVERT to Rights.
  NEVER use the word "earn."
- Lead with network knowledge-sharing value. No price predictions, no projected
  returns, no urgency-to-acquire, no implied guaranteed value or liquidity.
- Show only safe member data: display name + optional avatar. NEVER email or any
  private profile field. No PII in URLs or query params.
- Mark all member-facing copy "pending Camille review."
```

---

### **A.1 — Claude Design prompt — F-1: Submit a Resource**

```
Design an interactive prototype of the PLAA "Submit a Resource" flow for the Protocol Labs
Knowledge Base. It MUST read as part of the same site as the PL Directory / LabOS
(directory.plnetwork.io/home): use the PL Directory top nav, the standard PL footer, and the
left-rail section nav. OMIT the snapshot status bar — this app surfaces no points.

Visual system: match "Design System Foundations | Protocol Labs." Use the Foundations color,
type, spacing, radius, and component tokens; brand primary is blue #1B4CFE (NOT red, NOT
yellow; white surfaces, near-black text; yellow is a secondary highlight only); do not invent
styles. Typography is Inter across the Foundations Display/Heading/Body/Label scale (weights
Regular/Medium/Semi Bold, tight negative letter-spacing); do not substitute a different font.
Use Foundations components: Input, TextArea, Upload, Checkbox, Badges & Tags, Dropdown,
Button, Toast, Alerts & Notification.

Persona: an engineer inside PL Infra who just found something useful and has about 30 seconds
of goodwill. Goal: share it before the moment passes.

Screens/states to show:
1. Type picker — five options: link, file, Skill, newsletter/creator, request.
2. Link flow, autofilled — URL pasted, title/description/favicon populated, editable.
3. Duplicate detected — "Shared by Priya Raghunathan in March," with "View existing" and
   "Submit anyway."
4. File flow with the confidentiality gate — upload control VISIBLY DISABLED beneath the
   nudge and its acknowledgement checkbox; then the enabled state after acknowledgement.
5. Skill flow — SKILL.md parsed, name and description auto-populated from frontmatter.
6. Validation error — the required "Why is this worth someone's time?" field empty and blocking.
7. Autofill failure — inline note, manual entry available, nothing blocked or spinning.
8. Success receipt — resource name, visibility in plain language, status "Sent for review."

Behavior: user picks a type or pastes a URL; system infers type, fetches metadata, checks for
duplicates; user writes one required sentence of context (max 200 chars), picks visibility
(default: PL Infra) and tags from a fixed vocabulary; file and Skill types require the
confidentiality acknowledgement before upload activates; submission returns a receipt.

The confidentiality nudge appears AT the upload control, not in a footer. Draft copy (mark
"pending Camille review"): "Share only what you'd be comfortable with every member of this
space seeing. Please don't upload anything containing personal information about other people,
confidential company material, or privileged legal or financial documents."

[PLAA-RULES]

Deliver a clickable prototype with realistic, non-promotional sample content. Use placeholder
member names — never real member data.
```

### **A.2 — Claude Code prompt — F-1: Submit a Resource**

```
Build a working full-stack implementation of the PLAA Knowledge Base "Submit a Resource"
feature (F-1) from PRD-PLAA-KnowledgeBase-v1.md.

FIRST: read ai-app-starter-kit-v1.4 in full and follow its deployment contract. Do not write
code before this.

Stack: PLN AI Apps Starter Kit (Next.js 14 or Node/Express), `npm install && npm start`,
binding $PORT on 0.0.0.0, GET /health, iframe-embeddable from *.plnetwork.io, secrets via the
LabOS draft flow. Database is Supabase PostgreSQL — an explicit product decision; do NOT use
Airtable. Frontend must match the PL Directory / LabOS frontend and the "Design System
Foundations | Protocol Labs" design system (pull tokens from the Foundations Figma; brand
primary blue #1B4CFE — NOT red/yellow; white surfaces, near-black text; reuse the Directory
shell: top nav, footer, left-rail nav; OMIT the snapshot status bar). Typography: Inter across
the Foundations Display/Heading/Body/Label scale.

Data: structured relational schema only — resources, tags, resource_tags, audit_log,
contribution_events, config. Use the schema in PRD §9 exactly.

Implement:
- Five post types (link, file, skill, newsletter/creator, request) with type inference on
  URL paste.
- OG-tag metadata fetch with a hard timeout; on failure, fall back to manual entry and never
  block or spin.
- SKILL.md YAML frontmatter parsing to populate name/description; on malformed frontmatter,
  fall back to manual entry and still accept the submission.
- URL normalization + hash for duplicate detection; duplicates are informational, not blocking.
- The "why" field is REQUIRED for every post type, max 200 characters, enforced server-side.
- The confidentiality acknowledgement gates the upload control for file and skill types and is
  persisted with a timestamp. Nudge copy is read from the `config` table, NOT hardcoded.
- Text extraction into `extracted_text` at ingest for every file and Skill.
- Resource row and contribution_events row written in the SAME transaction (see F-6).
- Full audit log entry on every submission.
- All acceptance criteria AC-1.1 through AC-1.C.
- Error states: no blank confirmations; every failure has a status and a resolution path. A
  webhook enqueue failure must NOT fail the user's submission.

Copy rules (enforce in code + tests): this app displays NO points, NO point totals, NO Rights,
and NO conversion math; status copy reads "Sent for review"; the word "earn" must not appear in
any user-facing string; submitter attribution is display name + optional avatar only, never
email or private profile fields. Flag all member-facing copy "pending Camille review."

Tests: unit + integration + E2E mapped to each AC, including a test asserting "earn" is absent
from user-facing copy, a test asserting no PII appears in any response or URL, and a test
asserting the upload control is inert until acknowledgement. Target >=80% coverage.
```

---

### **A.1 — Claude Design prompt — F-2: Browse & Search**

```
Design an interactive prototype of the PLAA Knowledge Base index and search for the Protocol
Labs Alignment Asset. It MUST read as part of the same site as the PL Directory / LabOS
(directory.plnetwork.io/home): PL Directory top nav, standard PL footer, left-rail section nav.
OMIT the snapshot status bar.

Visual system: match "Design System Foundations | Protocol Labs" — Foundations color, type,
spacing, radius, and component tokens; brand primary blue #1B4CFE (NOT red, NOT yellow; white
surfaces, near-black text; yellow secondary highlight only). Typography is Inter across the
Foundations Display/Heading/Body/Label scale (Regular/Medium/Semi Bold, tight negative
letter-spacing). Use Foundations components: Search, Badges & Tags, Card, Table, Pagination,
Dropdown, Empty.

Persona: a PL Infra engineer who needs something specific and will bounce to a web search if
the first query returns nothing useful. Goal: find a vetted resource fast.

Screens/states to show:
1. Index, populated — curated Collections across the top ("Agent Skills we actually use,"
   "Newsletters worth the inbox space," "Infra reading — start here," "Asked for, not yet
   found"), then a recency-sorted list of ~15 resources.
2. Search results — ranked, with filters applied (type, tag, submitter, recency).
3. Zero results — names the query, offers "Ask the network for this" leading to a pre-filled
   request.
4. Empty corpus — shows seeded Collections and a submission CTA; NEVER a blank screen.
5. Loading — skeleton rows.
6. Collection detail view.

Every result card MUST show the submitter's one-line "why this is worth your time" alongside
title, type badge, tags, date, and upvote count. That line is what makes a result judgeable at
a glance — it is the most important element on the card, not a secondary detail.

Organization is tags + curated Collections. There is NO folder hierarchy. Show ~12 controlled
vocabulary tags.

[PLAA-RULES]

Deliver a clickable prototype where filters actually filter. Use realistic PL-flavored content:
Skills, infra docs, AI newsletters, agent-tooling links. Placeholder member names only.
```

### **A.2 — Claude Code prompt — F-2: Browse & Search**

```
Build a working full-stack implementation of the PLAA Knowledge Base "Browse & Search" feature
(F-2) from PRD-PLAA-KnowledgeBase-v1.md.

FIRST: read ai-app-starter-kit-v1.4 and follow its deployment contract.

Stack and design-system requirements: identical to F-1 (starter kit, Supabase PostgreSQL,
Foundations + Directory shell, Inter, #1B4CFE, no snapshot status bar).

Implement:
- Postgres full-text search (tsvector) over title + why + tags + extracted_text. No additional
  search infrastructure.
- Filters: type, tag, submitter, recency — composable, with cursor pagination, and reflected in
  shareable URL state containing NO PII (opaque member IDs only).
- Visibility filtering applied SERVER-SIDE in the query via shared middleware (F-4). Never
  client-side. Out-of-scope resources must be absent from the response payload entirely.
- Curated Collections, including one auto-populated from open requests.
- Controlled tag vocabulary (~12 seeded); new tags require WG curation.
- Zero-result state that emits a `search.zero_results` PostHog event and offers to open a
  pre-filled request (F-5).
- Empty states that always show seeded Collections and a CTA — never a blank page.
- Search-backend failure falls back to recency-sorted browse with an inline notice.
- All acceptance criteria AC-2.1 through AC-2.C.

Copy rules (enforce in code + tests): no points, point totals, Rights, or conversion math
anywhere; "earn" must not appear; submitter attribution is display name + optional avatar only.
Flag member-facing copy "pending Camille review."

Tests: unit (query builder, filter composition, ranking), integration (search + visibility
scoping together; zero-result event emission), E2E (search → filter → open), and a compliance
test asserting out-of-scope resources never appear in any raw API response. Target >=80%
coverage.
```

---

### **A.1 — Claude Design prompt — F-3: Resource Detail, Download, Upvote**

```
Design an interactive prototype of the PLAA Knowledge Base resource detail page. Same site as
the PL Directory / LabOS: top nav, footer, left-rail nav. OMIT the snapshot status bar.

Visual system: "Design System Foundations | Protocol Labs" — brand primary blue #1B4CFE (NOT
red, NOT yellow; white surfaces, near-black text; yellow secondary only); Inter across the
Foundations Display/Heading/Body/Label scale (Regular/Medium/Semi Bold, tight negative
letter-spacing). Foundations components: Card, Button, Avatar, Badges & Tags, Tabs, Alerts.

Persona: a PL Infra engineer deciding in about five seconds whether this resource is worth
their time. Goal: get the artifact.

Screens/states to show:
1. Link resource — title, the submitter's "why" line given real prominence, submitter display
   name + avatar, date, tags, type badge, visibility label, upvote count, primary "Open link."
2. Skill resource — parsed name and description, a read-only SKILL.md viewer, a download
   button, and a copyable install path. This state should feel purpose-built for Skills, not
   like a generic file attachment.
3. File resource — inline preview where possible, download otherwise.
4. Upvoted state — the control clearly reflects that this user has upvoted.
5. Broken-link reported state.
6. Loading skeleton.

The upvote is labelled "Useful" and reads as recognition. It affects sort order ONLY. It must
NOT be presented as a reward, a score, a race, or anything that implies value accrues to
anyone from it.

[PLAA-RULES]

Deliver a clickable prototype. Realistic content; placeholder member names only.
```

### **A.2 — Claude Code prompt — F-3: Resource Detail, Download, Upvote**

```
Build a working full-stack implementation of the PLAA Knowledge Base "Resource Detail,
Download, Upvote" feature (F-3) from PRD-PLAA-KnowledgeBase-v1.md.

FIRST: read ai-app-starter-kit-v1.4 and follow its deployment contract.

Stack and design-system requirements: identical to F-1.

Implement:
- Detail page rendering title, why-line, submitter display name + optional avatar, date, tags,
  type, visibility label, and upvote count.
- Out-of-scope access by direct URL returns 404 (NOT 403 — 403 confirms the resource exists)
  and writes an audit entry.
- File and Skill downloads stream through an AUTHENTICATED server route. Never a public or
  long-lived signed object-store URL. Increment the download counter server-side.
- Skill treatment: render parsed name/description, a read-only SKILL.md viewer, a download, and
  a copyable install path.
- Idempotent upvote toggle, unique on (resource_id, member_id).
- Report-broken flags a resource for WG attention WITHOUT deleting it.
- All acceptance criteria AC-3.1 through AC-3.C.

CRITICAL STRUCTURAL CONSTRAINT: upvotes must have NO path to the contribution pipeline. No
foreign key, no database trigger, no shared service, no call to the webhook outbox. Points
terminate in a regulated security, so a member-directed voting mechanism must never influence
point flow. Write an explicit test asserting that an upvote, a view, and a download each emit
zero contribution events.

Copy rules (enforce in code + tests): no points, point totals, Rights, or conversion math; the
upvote label reads as recognition ("Useful"), never as a reward or a race; "earn" must not
appear; attribution is safe fields only. Flag member-facing copy "pending Camille review."

Tests: unit (upvote idempotency, counter increments), integration (download auth + visibility;
404-on-out-of-scope), E2E (open → download → upvote), compliance (no contribution event on
upvote/view/download; safe-field-only attribution). Target >=80% coverage.
```

---

### **A.1 — Claude Design prompt — F-4: Visibility Scoping**

```
Design the visibility-scoping surfaces for the PLAA Knowledge Base. Same site as the PL
Directory / LabOS: top nav, footer, left-rail nav. OMIT the snapshot status bar.

Visual system: "Design System Foundations | Protocol Labs" — brand primary blue #1B4CFE (NOT
red, NOT yellow; white surfaces, near-black text; yellow secondary only); Inter across the
Foundations scale. Foundations components: Dropdown, Badges & Tags, Alerts & Notification,
Tooltip.

Persona: a member about to upload something they haven't fully thought through the audience for.
Goal: understand exactly who will see this, before they submit.

Screens/states to show:
1. The visibility selector inside the submission form — two options in PLAIN LANGUAGE naming
   the actual audience, not enum values. "Just PL Infra" and "Everyone in PLAA." Defaults to PL
   Infra. Required, explicit choice.
2. A short inline explanation of what each scope means, adjacent to the selector — this is what
   makes the confidentiality nudge meaningful rather than boilerplate.
3. The visibility badge as it appears on a resource card and on the detail page.
4. The author's "change visibility" control on their own resource, with a confirmation that
   names what widening the scope actually does.
5. A degraded state — membership lookup unavailable, showing a non-blocking notice while the
   system shows only the narrowest scope.

The visibility label must be legible everywhere a resource appears. A submitter should never
have to guess who can see what they shared.

[PLAA-RULES]

Deliver a clickable prototype. Placeholder member names only.
```

### **A.2 — Claude Code prompt — F-4: Visibility Scoping & Access Enforcement**

```
Build the visibility-scoping and access-enforcement layer for the PLAA Knowledge Base (F-4)
from PRD-PLAA-KnowledgeBase-v1.md. This is the security boundary of the application — treat it
accordingly.

FIRST: read ai-app-starter-kit-v1.4 and follow its deployment contract.

Stack and design-system requirements: identical to F-1.

Implement:
- Two-value visibility scope on every resource: `pl_infra` (default) and `plaa_members`.
- Group membership resolved against LabOS through a SINGLE adapter interface. The real contract
  is unconfirmed (PRD Q1, owner Anuj), so ship a stub implementation behind that interface so
  the swap is a one-file change. Do NOT store group membership locally.
- Visibility filtering implemented as SHARED QUERY MIDDLEWARE applied to every read path — list,
  search, detail, download, collections. Not per-endpoint logic. Any endpoint added later must
  inherit it automatically.
- FAIL CLOSED: if the membership adapter is unreachable or membership is ambiguous, return only
  the narrowest scope the requester is definitively entitled to, and surface a non-blocking
  degraded-state notice. Never fail open.
- Out-of-scope reads return 404, not 403, and write an audit entry.
- Visibility changes are restricted to the author or an admin and are audit-logged with actor,
  resource, previous scope, new scope, and timestamp.
- Plain-language visibility labels in the UI — never raw enum values.
- All acceptance criteria AC-4.1 through AC-4.C.

Copy rules: no points, Rights, or "earn"; member references by opaque ID only.

Tests: unit (scope resolution, fail-closed behavior), integration (every read path under every
membership permutation), E2E (two users in different scopes see different corpora), and a
compliance test asserting out-of-scope resources never appear in ANY raw API response across
ALL endpoints. Audit completeness test on every denial. Target >=80% coverage.
```

---

### **A.1 — Claude Design prompt — F-5: Requests**

```
Design an interactive prototype of the PLAA Knowledge Base "Requests" post type. Same site as
the PL Directory / LabOS: top nav, footer, left-rail nav. OMIT the snapshot status bar.

Visual system: "Design System Foundations | Protocol Labs" — brand primary blue #1B4CFE (NOT
red, NOT yellow; white surfaces, near-black text; yellow secondary only); Inter across the
Foundations scale. Foundations components: Card, Badges & Tags, TextArea, Button, Empty, Toast.

Persona: a PL Infra engineer who searched, found nothing, and would rather ask than give up.
Goal: get an answer from a colleague.

Screens/states to show:
1. Zero-result search offering "Ask the network for this."
2. The request form, pre-filled with the failed query text.
3. An open request in the index — visually distinct type badge, clearly not a resource.
4. The "Asked for, not yet found" Collection, populated with several open requests.
5. Fulfilment — a member answering with an existing resource or a new submission.
6. A fulfilled request — status flipped, linked to the fulfilling resource, requester notified.
7. A stale request (open 30+ days) — visually de-emphasised, NOT deleted.

Fulfilment copy reads as helping a colleague. It must never read as claiming a reward.

[PLAA-RULES]

Deliver a clickable prototype. Realistic PL Infra requests; placeholder member names only.
```

### **A.2 — Claude Code prompt — F-5: Requests**

```
Build a working full-stack implementation of the PLAA Knowledge Base "Requests" feature (F-5)
from PRD-PLAA-KnowledgeBase-v1.md.

FIRST: read ai-app-starter-kit-v1.4 and follow its deployment contract.

Stack and design-system requirements: identical to F-1.

Implement:
- Requests as a resource type (`type='request'`) with `request_status`,
  `fulfilled_by_resource_id`, and `fulfilled_at`. Do not create a parallel table.
- Pre-fill from a zero-result search query (F-2 AC-2.3).
- Auto-populated "Asked for, not yet found" Collection driven by open requests.
- Fulfilment: link an existing resource or submit a new one against the request; flip status;
  notify the requester.
- On fulfilment, emit a `request.fulfilled` contribution event (F-6) for the FULFILLER, not the
  requester. Get this attribution right — it is the whole point of the event.
- Fulfilment with an out-of-scope resource is blocked with a clear explanation.
- Requests obey the same visibility model as every other type (F-4).
- Requests open beyond 30 days are visually de-emphasised, never auto-deleted.
- All acceptance criteria AC-5.1 through AC-5.C.

Copy rules (enforce in code + tests): no points, point totals, Rights, or conversion math;
fulfilment copy reads as helping a colleague, never as claiming a reward; "earn" must not
appear. Flag member-facing copy "pending Camille review."

Tests: unit (status transitions, staleness logic), integration (fulfilment → notification →
contribution event attributed to the correct member), E2E (zero-result → request → fulfilment),
compliance (copy assertions; correct-member event attribution). Target >=80% coverage.
```

---

### **A.1 — Claude Design prompt — F-6: Contribution Delivery Status (admin only)**

```
Design an admin-only delivery-status view for the PLAA Knowledge Base contribution webhook.
This is an internal WG surface — no member-facing screens in this feature.

Same site as the PL Directory / LabOS: top nav, footer, left-rail nav. OMIT the snapshot status
bar. Visual system: "Design System Foundations | Protocol Labs" — brand primary blue #1B4CFE
(NOT red, NOT yellow; white surfaces, near-black text; yellow secondary only); Inter across the
Foundations scale. Foundations components: Table, Badges & Tags, Alerts & Notification, Button,
Pagination, Empty.

Persona: a PLAA WG operator who needs to know at a glance whether contributions are reaching
the points system. Goal: spot and resolve failed deliveries without opening a database client.

Screens/states to show:
1. Delivery queue — table of recent events with event type, resource, timestamp, attempt count,
   and delivery status (pending / delivered / retrying / dead-lettered).
2. Dead-letter state — clearly flagged, with the last error and a manual retry control.
3. Healthy state — everything delivered, with a summary line.
4. Empty state.

The table shows OPAQUE MEMBER IDs ONLY — no names, no emails. This mirrors the payload itself
and is a deliberate constraint, not an oversight. Do not add a "helpful" name column.

Deliver a clickable prototype with realistic sample rows.
```

### **A.2 — Claude Code prompt — F-6: Contribution Webhook \+ Backfill Endpoint**

```
Build the contribution-event integration for the PLAA Knowledge Base (F-6) from
PRD-PLAA-KnowledgeBase-v1.md. Dual mode: push webhook plus pull backfill endpoint.

FIRST: read ai-app-starter-kit-v1.4 and follow its deployment contract, especially the secrets
flow — $POINTS_WEBHOOK_URL, the HMAC signing secret, and the service token are secrets, never
hardcoded.

Stack: identical to F-1 (starter kit, Supabase PostgreSQL).

CRITICAL FRAMING — read before writing code: an event is a PENDING CONTRIBUTION, not a point
award. This application has no authority to credit anything. The event enters the existing
Activities reviewer-verification workflow, which decides what (if anything) is credited. Points
convert to a regulated security, so self-submission alone must never mint value. The payload
carries `review_status: "pending"` and NEVER a point value.

Implement:
- TRANSACTIONAL OUTBOX: the contribution_events row is written in the SAME database transaction
  as the resource. If HTTP delivery later fails, the user's submission still succeeded and the
  event retries. A delivery failure must never surface to the user.
- Qualifying events, v1 only: `resource.submitted` (credited to the submitter) and
  `request.fulfilled` (credited to the fulfiller). Upvotes, views, and downloads emit NOTHING.
- Push: POST to $POINTS_WEBHOOK_URL with HMAC-SHA256 over the raw body in `X-PLAA-Signature`
  plus `X-PLAA-Timestamp`; reject clock skew beyond 5 minutes on the receiving side.
- Retries: exponential backoff (1s, 4s, 16s, 1m, 5m, 30m), capped at 8 attempts, then
  dead-letter with the last error, visible in the admin surface.
- A 4xx from the receiver dead-letters IMMEDIATELY (a contract problem, not a transient one)
  and alerts admins. A 5xx retries.
- Idempotency: `event_id` is stable across every retry and across push and pull, so the
  receiver can dedupe safely.
- Pull: GET /api/contributions?since=<iso8601>&cursor=<event_id>&limit=<n>, SERVICE-TOKEN
  authenticated only. A member session must return 401 and write an audit entry. Cursor
  paginated. Returns the IDENTICAL payload shape as push — one serializer, used by both, so
  they cannot drift.
- Fail startup loudly if the signing secret is absent. Never deliver unsigned events.
- All acceptance criteria AC-6.1 through AC-6.C.

PAYLOAD — this exact shape, and nothing more:
{
  "event_id": "uuid", "event_type": "resource.submitted",
  "occurred_at": "ISO8601", "member_id": "labos-user-uuid",
  "resource_id": "uuid", "resource_type": "skill",
  "activity_slug": "share-reusable-ai-resource",
  "visibility": "pl_infra", "review_status": "pending",
  "source": "plaa-knowledge-base"
}
NO names. NO email addresses. NO resource titles. NO free text. NO file contents. The points
system resolves the member from member_id against LabOS. Write a schema test that FAILS if any
additional field appears.

Copy rules: no user-facing surface claims points were collected. Flag the points-linkage
framing "pending Javier review" and any member-visible contribution description "pending
Camille review."

Tests: unit (payload schema, HMAC signing, backoff scheduling), integration (outbox atomicity —
assert the event row and resource row commit together or not at all; retry and dead-letter
behavior; service-token auth on the pull endpoint), E2E (submit → delivered → replay dedupes),
compliance (PII-absence schema assertion on every event type; zero-event assertion on upvote,
view, and download). Target >=80% coverage.
```

---

## **Appendix B — Glossary**

| Term | Definition |
| ----- | ----- |
| Collect | The mechanic of receiving points for a contribution (NEVER "earn"). Not surfaced in this app. |
| Points | Snapshot-period units a member collects; convert to Rights at snapshot close. **Not displayed anywhere in the Knowledge Base.** |
| Rights (PLAA Rights) | A regulated security; the downstream consequence of contributing. Not an ownership interest. Not referenced in this app. |
| Contribution event | A structured, PII-free record that a member did something potentially creditable. **Pending, never an award.** |
| Transactional outbox | The pattern where an event row commits in the same transaction as its source record, then is delivered asynchronously with retries. |
| Resource | Any shared item: link, file, Skill, newsletter, creator, or request. |
| Skill | A Claude or Hermes Skill — SKILL.md plus optional supporting files. A first-class resource type. |
| Request | A post asking the network for something the corpus lacks. Fulfilled by linking a resource. |
| Collection | A hand-curated (or rule-populated) grouping of resources. The navigability layer that replaces folders. |
| Visibility scope | `pl_infra` or `plaa_members`. Enforced server-side on every read. |
| Upvote | Recognition signal affecting sort order only. Structurally severed from the contribution pipeline. |
| Why-line | The required ≤200-character justification on every resource. The app's entire quality mechanism. |
| Zero-result search | A query returning nothing. The app's most actionable metric — a ranked seeding backlog. |
| LabOS | The PL platform stack PLAA mirrors and interoperates with; source of truth for identity and group membership. |
| Inter | The Foundations typeface (Regular/Medium/Semi Bold); the Figma style name is "Semi Bold" (two words). |

---

## **Appendix C — References**

* **Design System Foundations | Protocol Labs** (Figma, file key `ajJidFJgQCsS9nzXbq6upe`) — design token and component source of truth. Brand blue `#1B4CFE`; Inter; pull exact tokens at build.  
* `https://directory.plnetwork.io/home` — live shell reference for the "one site" requirement.  
* `ai-app-starter-kit-v1.4` — **hard prerequisite**; deployment contract, secrets flow, health check, iframe embedding. Must be read before any code.  
* **PRD — Alignment Asset Web App (v2)** — parent PRD; §3 problem diagnosis, §5 contribution loop, §9 compliance requirements.  
* **PLAA-42 / PLAA-43 / PLAA-44** — member FAQ knowledge base and the decoupled RAG endpoint (`POST /api/faq/ask`). The deferred semantic ask-box must reuse this contract (§4.3).  
* **PLAA-41** — n8n migration (Ken); candidate receiver for the contribution webhook (§11 Q2).  
* **PLAA MarComms Playbook** (Notion `2f8bae15-11cc-809d-9326-db667385a64f`) — vocabulary and framing reference.  
* PLAA NPS memo and field notes — source of the friction, detractor, and funnel figures in §2.

