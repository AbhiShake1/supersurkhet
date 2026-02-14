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
  it('only runs order completion side effects when transitioning into done', () => {
    const content = getContent();

    expect(content).toContain("if (variables.orderStatus !== 'done') return;");
    expect(content).toContain("if (currentOrder?.orderStatus === 'done') return;");
  });
});
