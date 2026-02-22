import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

function getContent() {
  return readFileSync(businessConfigPath, 'utf8');
}

describe('business-config order status transition contracts', () => {
  it('contains no inline order transition side-effects', () => {
    const content = getContent();

    expect(content).not.toContain('orderStatus');
    expect(content).not.toContain("=== 'done'");
  });
});
