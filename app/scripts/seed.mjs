// Idempotent seed: 12 controlled-vocabulary tags, 4 launch Collections (PRD F-2),
// 32 seeded resources (launch gate: >=30 before any member sees the app).
// Run: npm run seed — safe to run repeatedly.
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres:///plaabook';
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString) || !process.env.DATABASE_URL;
const client = new pg.Client({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await client.connect();

// --- Tags (controlled vocabulary, ~12; PRD F-2) ---
const TAGS = [
  ['agent-skills', 'Agent Skills'],
  ['automation', 'Automation'],
  ['legal', 'Legal'],
  ['finance', 'Finance'],
  ['research', 'Research'],
  ['ops', 'Ops'],
  ['prompts', 'Prompts'],
  ['newsletters', 'Newsletters'],
  ['creators', 'Creators'],
  ['guides', 'Guides'],
  ['data', 'Data'],
  ['security', 'Security'],
];
for (const [slug, label] of TAGS) {
  await client.query(
    `INSERT INTO tags (slug, label, curated) VALUES ($1, $2, TRUE) ON CONFLICT (slug) DO NOTHING`,
    [slug, label]
  );
}

// --- Collections (PRD F-2, seeded at launch) /* pending Camille review */ ---
const COLLECTIONS = [
  ['newsletters-worth-the-inbox-space', 'Newsletters & Creators worth following', 'Newsletters, video channels, TikToks — the people and feeds members actually follow.', null, 0],
  ['infra-reading-start-here', 'Posts and Reading', 'Short posts, links, and longer reads from members — the internal micro-blog of what is worth your time.', null, 1],
  ['asked-for-not-yet-found', 'Asked for, not yet found', 'Open requests from members — fulfil one and close the loop.', { type: 'open_requests' }, 2],
];
for (const [slug, title, description, rule, sort] of COLLECTIONS) {
  await client.query(
    `INSERT INTO collections (slug, title, description, auto_populate_rule, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET title = $2, description = $3, sort_order = $5`,
    [slug, title, description, rule ? JSON.stringify(rule) : null, sort]
  );
}
// Removed for now (existing DBs included); resources keep living outside it.
await client.query(`DELETE FROM collections WHERE slug = 'agent-skills-we-actually-use'`);

// --- Seeded resources (32) ---
// [type, title, url, why, tags[], collection|null]
const SEED = [
  ['link', 'Anthropic: Building Effective Agents', 'https://www.anthropic.com/research/building-effective-agents', 'The clearest mental model for when to use workflows vs agents — saves weeks of over-engineering.', ['guides', 'agent-skills'], 'infra-reading-start-here'],
  ['link', 'Claude Docs: Agent Skills', 'https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview', 'Canonical reference for how SKILL.md files work — read before writing your first Skill.', ['agent-skills', 'guides'], 'infra-reading-start-here'],
  ['link', 'Anthropic Prompt Engineering Overview', 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview', 'The official prompt-engineering guide; the examples map directly onto our internal use cases.', ['prompts', 'guides'], 'infra-reading-start-here'],
  ['link', 'Anthropic Cookbook (GitHub)', 'https://github.com/anthropics/anthropic-cookbook', 'Working code for RAG, tool use, and evals — copy-paste starting points that actually run.', ['guides', 'automation'], null],
  ['link', 'Model Context Protocol docs', 'https://modelcontextprotocol.io/introduction', 'MCP is how our internal tools connect to Claude — this is the shortest path to understanding it.', ['automation', 'guides'], 'infra-reading-start-here'],
  ['link', 'OpenAI: A Practical Guide to Building Agents (PDF)', 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', 'Vendor-neutral patterns for agent guardrails and handoffs; good cross-check against our Claude defaults.', ['guides', 'research'], null],
  ['link', 'Google: Prompt Engineering whitepaper', 'https://www.kaggle.com/whitepaper-prompt-engineering', 'Dense but complete — the reference I send people who want the "why" behind prompting techniques.', ['prompts', 'research'], null],
  ['link', 'LangChain State of AI Agents report', 'https://www.langchain.com/stateofaiagents', 'Survey data on what agent deployments actually fail on — useful for scoping internal automations.', ['research', 'automation'], null],
  ['link', 'Ethan Mollick: One Useful Thing', 'https://www.oneusefulthing.org/', 'Practical, hype-free takes on using AI at work — the best "convince a skeptical colleague" resource.', ['creators', 'guides'], null],
  ['link', 'Simon Willison: LLM CLI tool', 'https://llm.datasette.io/', 'A CLI for piping anything through an LLM — the fastest way to script one-off automations.', ['automation', 'data'], null],
  ['link', 'Hamel Husain: Your AI Product Needs Evals', 'https://hamel.dev/blog/posts/evals/', 'The single best explanation of why evals matter and how to start without a framework.', ['research', 'guides'], null],
  ['link', 'Anthropic: Claude Code Best Practices', 'https://www.anthropic.com/engineering/claude-code-best-practices', 'Concrete patterns for agentic coding sessions — directly applicable to our automation work.', ['agent-skills', 'automation'], 'infra-reading-start-here'],
  ['link', 'OWASP Top 10 for LLM Applications', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', 'The checklist we should run every internal AI tool against before it touches real data.', ['security', 'guides'], null],
  ['link', 'NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework', 'The reference framework legal keeps citing — skim the core functions before compliance reviews.', ['legal', 'security'], null],
  ['link', 'EU AI Act explorer', 'https://artificialintelligenceact.eu/', 'Searchable text of the AI Act with plain-language summaries — faster than reading the regulation.', ['legal', 'research'], null],
  ['link', 'Anthropic Transparency Hub', 'https://www.anthropic.com/transparency', 'Useful when drafting vendor-review answers about model providers and data handling.', ['legal', 'ops'], null],
  ['link', 'Practical Deep Research prompting patterns (Anthropic)', 'https://www.anthropic.com/news/research', 'How to structure long research tasks so the output is citable — great for diligence work.', ['research', 'prompts'], null],
  ['link', 'Deepgram vs Whisper meeting-notes comparison', 'https://deepgram.com/learn/whisper-vs-deepgram', 'Solid comparison for anyone automating meeting transcription — saved us an eval cycle.', ['ops', 'automation'], null],
  ['newsletter', 'Latent Space', 'https://www.latent.space/', 'The engineering-focused AI newsletter — best signal on what builders are actually shipping.', ['newsletters', 'research'], 'newsletters-worth-the-inbox-space'],
  ['newsletter', "Import AI (Jack Clark)", 'https://importai.substack.com/', 'Weekly policy + research digest from an Anthropic co-founder; the policy section is gold for legal.', ['newsletters', 'legal'], 'newsletters-worth-the-inbox-space'],
  ['newsletter', 'The Batch (DeepLearning.AI)', 'https://www.deeplearning.ai/the-batch/', 'Andrew Ng\u2019s weekly — the most digestible research roundup for non-ML folks.', ['newsletters', 'research'], 'newsletters-worth-the-inbox-space'],
  ['newsletter', 'Ben\u2019s Bites', 'https://bensbites.com/', 'Daily 5-minute AI product news — how I stay current without doomscrolling.', ['newsletters'], 'newsletters-worth-the-inbox-space'],
  ['newsletter', 'AI Snake Oil', 'https://www.aisnakeoil.com/', 'Rigorous debunking of AI claims — the antidote to vendor decks, useful in procurement.', ['newsletters', 'research'], 'newsletters-worth-the-inbox-space'],
  ['creator', 'Simon Willison\u2019s Weblog', 'https://simonwillison.net/', 'Daily hands-on experiments with LLMs and tooling — the most practical blog in the space.', ['creators', 'automation'], null],
  ['creator', 'Andrej Karpathy (YouTube)', 'https://www.youtube.com/@AndrejKarpathy', 'The "intro to LLMs" videos are the best 1-hour onboarding for anyone new to how these models work.', ['creators', 'guides'], 'infra-reading-start-here'],
  ['creator', 'Lenny\u2019s Podcast — AI episodes', 'https://www.lennysnewsletter.com/podcast', 'Product-side view of AI adoption; the operator interviews translate well to our internal tooling.', ['creators', 'ops'], null],
  ['creator', 'Matt Pocock (TypeScript + AI tooling)', 'https://www.mattpocock.com/', 'Short, sharp tutorials on typed AI SDK usage — great for anyone scripting against Claude.', ['creators', 'automation'], null],
  ['link', 'Awesome Claude Skills (community list)', 'https://github.com/anthropics/skills', 'Anthropic\u2019s public Skill examples — steal the frontmatter and structure for internal Skills.', ['agent-skills', 'guides'], 'infra-reading-start-here'],
  ['link', 'Finance: SEC EDGAR full-text search', 'https://efts.sec.gov/LATEST/search-index?q=', 'Free full-text search over filings — pairs well with an LLM summarizer for diligence.', ['finance', 'data'], null],
  ['link', 'CSV, Excel and the LLM: data-cleaning patterns (Simon Willison)', 'https://simonwillison.net/tags/data-journalism/', 'Reusable patterns for cleaning messy spreadsheets with LLM help — ops folks, start here.', ['data', 'ops'], null],
  ['link', 'Prompt injection primer (Simon Willison)', 'https://simonwillison.net/series/prompt-injection/', 'The canonical explainer on prompt injection — required reading before wiring LLMs to internal data.', ['security', 'research'], null],
  ['link', 'Anthropic: Introducing Contextual Retrieval', 'https://www.anthropic.com/news/contextual-retrieval', 'The RAG technique that most improved our retrieval quality — directly relevant to future KB search.', ['research', 'data'], null],
];

const SEED_MEMBER = 'wg-seed';
const SEED_NAME = 'PLAA Working Group';

// Canonical URL hash for dedupe (F-1 AC-1.5) — mirrors src/lib/urls.ts. Keep in sync.
import { createHash } from 'node:crypto';
function canonicalUrlHash(input) {
  if (!input) return null;
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith('utm_'))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [k, v] of kept) url.searchParams.append(k, v);
  const out = url.toString().replace(/\/(\?|#|$)/, '$1');
  return createHash('sha256').update(out).digest('hex');
}

let inserted = 0;
for (const [type, title, url, why, tagSlugs, collectionSlug] of SEED) {
  const existing = await client.query('SELECT id FROM resources WHERE title = $1 AND submitter_member_id = $2', [title, SEED_MEMBER]);
  let id = existing.rows[0]?.id;
  const urlHash = canonicalUrlHash(url);
  if (!id) {
    const res = await client.query(
      `INSERT INTO resources (type, title, why, url, canonical_url_hash, submitter_member_id, submitter_display_name, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pl_infra') RETURNING id`,
      [type, title, why, url, urlHash, SEED_MEMBER, SEED_NAME]
    );
    id = res.rows[0].id;
    inserted++;
  } else if (urlHash) {
    // Backfill for rows seeded before hashes existed.
    await client.query(
      'UPDATE resources SET canonical_url_hash = $1 WHERE id = $2 AND canonical_url_hash IS NULL',
      [urlHash, id]
    );
  }
  for (const slug of tagSlugs) {
    await client.query(
      `INSERT INTO resource_tags (resource_id, tag_id)
       SELECT $1, id FROM tags WHERE slug = $2 ON CONFLICT DO NOTHING`,
      [id, slug]
    );
  }
  if (collectionSlug) {
    await client.query(
      `INSERT INTO collection_resources (collection_id, resource_id)
       SELECT id, $1 FROM collections WHERE slug = $2 ON CONFLICT DO NOTHING`,
      [id, collectionSlug]
    );
  }
}

const counts = await client.query(
  `SELECT (SELECT count(*) FROM resources) AS resources, (SELECT count(*) FROM tags) AS tags, (SELECT count(*) FROM collections) AS collections`
);
console.log(`seeded: +${inserted} resources this run;`, counts.rows[0]);
await client.end();
