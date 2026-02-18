import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioV2RoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio-v2.tsx',
);

function getRouteContent() {
  return readFileSync(pluginStudioV2RoutePath, 'utf8');
}

describe('plugin-studio-v2 workspace shell contract', () => {
  it('registers the plugin-studio-v2 route', () => {
    const content = getRouteContent();

    expect(content).toContain("createFileRoute('/plugin-studio-v2')");
  });

  it('defines locked workspace tabs and stable tab urls', () => {
    const content = getRouteContent();

    expect(content).toContain('LOCKED_WORKSPACE_TABS');
    expect(content).toContain('toWorkspaceShellTabHref');
    expect(content).toContain('tab: nextTab');
  });

  it('bootstraps draft context from query/path state', () => {
    const content = getRouteContent();

    expect(content).toContain('readPluginIdFromPathState');
    expect(content).toContain('Route.useSearch()');
    expect(content).toContain('draftId');
  });

  it('renders a shell load boundary failure mode when context is missing', () => {
    const content = getRouteContent();

    expect(content).toContain('WorkspaceShellLoadBoundary');
    expect(content).toContain('Select a plugin and draft to load workspace.');
  });

  it('guards missing context before rendering tab content that dereferences plugin metadata', () => {
    const content = getRouteContent();

    expect(content).toContain('if (!context) {');
    expect(content).toContain('WorkspaceShellLoadBoundary context={context} />');
  });

  it('lazy-mounts tab panels', () => {
    const content = getRouteContent();

    expect(content).toContain('mountedTabs');
    expect(content).toContain('setMountedTabs');
    expect(content).toContain('mountedTabs.has(tab.id)');
  });
});
