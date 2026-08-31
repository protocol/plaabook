import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Blog Posts and Reading')).toBe('blog-posts-and-reading');
  });

  it('expands ampersands to "and"', () => {
    expect(slugify('Newsletters & Creators')).toBe('newsletters-and-creators');
  });

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('  Legal / Tech!!  ')).toBe('legal-tech');
  });

  it('strips diacritics to ASCII', () => {
    expect(slugify('Résumé Tips')).toBe('resume-tips');
  });

  it('leaves an already-clean slug unchanged', () => {
    expect(slugify('agent-skills')).toBe('agent-skills');
  });

  it('returns empty string when nothing slug-able remains', () => {
    expect(slugify('   —  ')).toBe('');
  });
});
