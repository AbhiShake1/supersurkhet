import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioBaseRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/index.tsx',
);
const pluginStudioProjectRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/$projectId/index.tsx',
);
const pluginStudioProjectPluginRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/$projectId/$pluginId.tsx',
);

describe('plugin studio multipage route contract', () => {
  it('keeps a dedicated base route page', () => {
    const content = readFileSync(pluginStudioBaseRoutePath, 'utf8');

    expect(content).toContain("createFileRoute('/plugin-studio/')");
    expect(content).toContain('export function PluginStudioPage');
  });

  it('defines project-scoped page route using projectId path param', () => {
    const content = readFileSync(pluginStudioProjectRoutePath, 'utf8');

    expect(content).toContain("createFileRoute('/plugin-studio/$projectId/')");
    expect(content).toContain('component: PluginStudioProjectRoute');
  });

  it('defines project + plugin workspace route using path params', () => {
    const content = readFileSync(pluginStudioProjectPluginRoutePath, 'utf8');

    expect(content).toContain(
      "createFileRoute('/plugin-studio/$projectId/$pluginId')",
    );
    expect(content).not.toContain('createFileRoute(\'/plugin-studio/\')');
  });
});
