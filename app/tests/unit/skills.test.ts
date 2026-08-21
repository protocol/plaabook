import { describe, it, expect } from 'vitest';
import { parseSkillUpload } from '@/lib/skills';

const VALID = `---
name: my-skill
description: Does a useful thing
---
# Body
`;

describe('parseSkillUpload', () => {
  it('parses valid SKILL.md frontmatter (AC-1.3)', async () => {
    const parsed = await parseSkillUpload(Buffer.from(VALID), 'SKILL.md');
    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe('my-skill');
    expect(parsed!.description).toBe('Does a useful thing');
    expect(parsed!.skillMd).toContain('# Body');
  });

  it('returns null on malformed frontmatter — graceful fallback (AC-1.4)', async () => {
    expect(await parseSkillUpload(Buffer.from('---\n:bad yaml: [\n---\nbody'), 'SKILL.md')).toBeNull();
  });

  it('returns null when required fields are missing', async () => {
    expect(await parseSkillUpload(Buffer.from('---\nname: only-name\n---\n'), 'SKILL.md')).toBeNull();
  });

  it('returns null when there is no frontmatter at all', async () => {
    expect(await parseSkillUpload(Buffer.from('# just markdown'), 'SKILL.md')).toBeNull();
  });

  it('returns null for unsupported extensions', async () => {
    expect(await parseSkillUpload(Buffer.from(VALID), 'skill.txt')).toBeNull();
  });
});
