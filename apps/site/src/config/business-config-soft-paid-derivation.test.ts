import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

describe('business-config plugin sources', () => {
  it('loads install and release docs from plugin storage tables', () => {
    const content = readFileSync(businessConfigPath, 'utf8');

    expect(content).toContain('api.businessPluginInstall.useGet');
    expect(content).toContain('api.pluginRelease.useGet');
  });
});
