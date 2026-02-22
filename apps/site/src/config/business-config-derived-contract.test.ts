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

describe('business-config derived contracts', () => {
  it('keeps useBusinessConfig free of compiler memo directive to avoid stale HMR tab config', () => {
    const content = getContent();

    expect(content).not.toMatch(
      /export function useBusinessConfig[\s\S]*?'use memo';/,
    );
  });

  it('keeps config layer free of embedded mutation callbacks and dialog side-effects', () => {
    const content = getContent();
    expect(content).not.toContain('onCreate(');
    expect(content).not.toContain('onUpdate(');
    expect(content).not.toContain('onDelete(');
    expect(content).not.toContain('openDialog');
    expect(content).not.toContain('closeDialog');
    expect(content).not.toContain('db.');
  });

  it('delegates tab computation to install-driven resolver', () => {
    const content = getContent();
    expect(content).toContain('resolveInstallDrivenTabs({');
  });
});
