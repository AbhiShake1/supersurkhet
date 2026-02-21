import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginsRoutePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugins.tsx',
);

function getRouteContent() {
  return readFileSync(pluginsRoutePath, 'utf8');
}

describe('plugins listing icon preview contract', () => {
  it('uses compact inline admin preview when plugin icon is missing', () => {
    const content = getRouteContent();

    expect(content).not.toContain('PluginPreviewDialog');
    expect(content).toContain(
      'const previewSchema = plugin.latestRelease.adminTabs?.[0]?.schema;',
    );
    expect(content).toContain('<AutoTable<SchemaKeys>');
    expect(content).not.toContain('onPreview: () => void;');
  });
});
