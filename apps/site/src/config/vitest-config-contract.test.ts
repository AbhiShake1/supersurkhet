import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vitest config contracts', () => {
  it('excludes Playwright E2E specs from vitest runs', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'vite.config.ts'),
      'utf8',
    );
    expect(content).toContain('test:');
    expect(content).toMatch(/['"]tests\/\*\*['"]/);
  });
});
