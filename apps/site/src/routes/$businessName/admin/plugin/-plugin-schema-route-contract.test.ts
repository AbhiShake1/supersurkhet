import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginSchemaRoutePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugin/$pluginId/$schemaId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginSchemaRoutePath, 'utf8');
}

describe('runtime plugin schema route contract', () => {
  it('defines schema route params and keeps tab search query compatibility with AutoAdmin', () => {
    const content = getRouteContent();

    expect(content).toContain(
      '/$businessName/admin/plugin/$pluginId/$schemaId',
    );
    expect(content).toContain('validateSearch: z.object({');
    expect(content).toContain('tab: z.string().optional()');
    expect(content).toContain('const { tab } = Route.useSearch();');
    expect(content).toContain('tab?.trim() ||');
  });

  it('renders AutoAdmin with runtime compiled schema under plugin namespace and handles not-found states', () => {
    const content = getRouteContent();

    expect(content).toContain('compileSchemaDoc(schemaDoc)');
    expect(content).toContain('<AutoAdmin');
    expect(content).toContain('parsedSchema: compiledSchema');
    expect(content).toContain('treatSlugAsAbsolute: true');
    expect(content).toContain('slug: pluginSchemaNamespace');
    expect(content).toContain('if (!business?.id) return <NotFound />;');
    expect(content).toContain('if (!installedRelease) return <NotFound />;');
    expect(content).toContain('if (!schemaDoc) return <NotFound />;');
  });
});
