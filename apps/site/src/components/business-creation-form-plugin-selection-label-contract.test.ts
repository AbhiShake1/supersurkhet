import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation plugin selection label contract', () => {
  it('uses queue selection labels instead of in-progress install labels', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('Add to queue');
    expect(source).toContain('Remove from queue');
    expect(source).not.toContain('Installing plugin');
    expect(source).not.toContain('Install plugin');
  });
});
