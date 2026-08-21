// SKILL.md parsing for Skill uploads (F-1 AC-1.3 / AC-1.4).
// Accepts a raw SKILL.md or a zip bundle containing one. Malformed or absent
// frontmatter returns null — the caller falls back to manual entry gracefully.

import matter from 'gray-matter';
import { Open } from 'unzipper';

export interface ParsedSkill {
  name: string;
  description: string;
  skillMd: string;
}

const MAX_SKILL_MD_BYTES = 1024 * 1024; // 1MB is generous for a markdown file

function parseSkillMd(text: string): ParsedSkill | null {
  try {
    const parsed = matter(text);
    const name = typeof parsed.data?.name === 'string' ? parsed.data.name.trim() : '';
    const description =
      typeof parsed.data?.description === 'string' ? parsed.data.description.trim() : '';
    if (!name || !description) return null;
    return { name, description, skillMd: text };
  } catch {
    return null;
  }
}

async function extractSkillMdFromZip(buffer: Buffer): Promise<string | null> {
  try {
    const dir = await Open.buffer(buffer);
    // Prefer shallowest SKILL.md (bundle root), case-insensitive.
    const candidates = dir.files
      .filter((f) => f.type === 'File' && /(^|\/)skill\.md$/i.test(f.path))
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length);
    const entry = candidates[0];
    if (!entry || entry.uncompressedSize > MAX_SKILL_MD_BYTES) return null;
    const content = await entry.buffer();
    return content.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Parse a Skill upload. Returns null when no valid frontmatter can be found —
 * the submission is still accepted with manual entry (AC-1.4).
 */
export async function parseSkillUpload(buffer: Buffer, filename: string): Promise<ParsedSkill | null> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md')) {
    if (buffer.length > MAX_SKILL_MD_BYTES) return null;
    return parseSkillMd(buffer.toString('utf8'));
  }
  if (lower.endsWith('.zip')) {
    const text = await extractSkillMdFromZip(buffer);
    return text ? parseSkillMd(text) : null;
  }
  return null;
}
