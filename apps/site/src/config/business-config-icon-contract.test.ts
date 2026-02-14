import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

describe('business-config metadata contracts', () => {
  it('uses schema-defined metadata instead of local schema-tab overrides', () => {
    const content = readFileSync(businessConfigPath, 'utf8');
    const schemaTabOverrides =
      content.match(/schema:\s*'[^']+'[\s\S]{0,180}\b(?:title|group|icon):/g) ??
      [];

    expect(schemaTabOverrides).toHaveLength(0);
  });
});
