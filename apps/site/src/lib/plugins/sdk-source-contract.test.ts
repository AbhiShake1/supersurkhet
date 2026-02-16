import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sdkSourcePath = resolve(
  process.cwd(),
  '../../packages/supersurkhet-sdk/src/index.ts',
);

describe('supersurkhet-sdk source contracts', () => {
  it('does not import app source types directly', () => {
    const source = readFileSync(sdkSourcePath, 'utf8');
    expect(source).not.toContain('apps/site');
    expect(source).not.toContain('autoform/field-types');
  });
});
