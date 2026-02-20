import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation plugin selection label contract', () => {
  it('keeps step 2 assistant-first and removes required manual queue labels', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('AI-selected setup plan (optional)');
    expect(source).not.toContain('Plugin stack (required)');
    expect(source).not.toContain('Use recommended stack');
    expect(source).not.toContain('Add to queue');
    expect(source).not.toContain('Remove from queue');
    expect(source).not.toContain('Installing plugin');
    expect(source).not.toContain('Install plugin');
  });
});
