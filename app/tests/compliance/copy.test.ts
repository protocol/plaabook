// AC-1.C / AC-2.C / AC-3.C — "earn" must never appear in user-facing copy,
// and the submission status copy is exactly "Sent for review".
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const appRoot = join(__dirname, '..', '..');

function sourceFiles(dir: string, ext: string): string[] {
  try {
    return execSync(`find ${JSON.stringify(join(appRoot, dir))} -name '*${ext}' -type f`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

describe('compliance — copy', () => {
  it('no form of "earn" in any UI source file', () => {
    const files = [...sourceFiles('src/app', '.tsx'), ...sourceFiles('src/components', '.tsx')];
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      if (/\bearn(s|ed|ing)?\b/i.test(text)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('no form of "earn" in API route response copy', () => {
    const files = sourceFiles('src/app/api', '.ts');
    const offenders = files.filter((f) => /\bearn(s|ed|ing)?\b/i.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('submit flow uses exactly "Sent for review" as the status copy', () => {
    const route = readFileSync(join(appRoot, 'src/app/api/resources/route.ts'), 'utf8');
    expect(route).toContain("'Sent for review'");
    // The submit UI is the modal component (opened by /submit and every Share button).
    const page = readFileSync(join(appRoot, 'src/components/SubmitModal.tsx'), 'utf8');
    expect(page).toContain('Sent for review');
    // never anything stronger
    expect(/collected \d+|points? (awarded|credited)/i.test(route + page)).toBe(false);
  });
});
