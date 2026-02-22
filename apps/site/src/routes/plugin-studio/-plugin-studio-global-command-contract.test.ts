import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioProjectsRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/index.tsx',
);
const pluginStudioProjectRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/$projectId/index.tsx',
);
const pluginStudioGlobalCommandPath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/-plugin-studio-global-command.tsx',
);

describe('plugin-studio global command contract', () => {
  it('extracts global command palette into a shared route-level component', () => {
    const sharedContent = readFileSync(pluginStudioGlobalCommandPath, 'utf8');

    expect(sharedContent).toContain(
      'export function PluginStudioGlobalCommand',
    );
    expect(sharedContent).toContain("event.key.toLowerCase() !== 'k'");
    expect(sharedContent).toContain('CommandGroup heading="Projects"');
    expect(sharedContent).toContain('CommandGroup heading="Plugins"');
    expect(sharedContent).toContain('Ctrl/⌘ K');
    expect(sharedContent).toContain('projectNameById.get(plugin.projectId)');
    expect(sharedContent).toContain('Unknown project');
  });

  it('wires projects page to the shared global command with project and plugin search', () => {
    const projectsRoute = readFileSync(pluginStudioProjectsRoutePath, 'utf8');

    expect(projectsRoute).toContain("from './-plugin-studio-global-command'");
    expect(projectsRoute).toContain('<PluginStudioGlobalCommand');
    expect(projectsRoute).toContain('projects={accessibleProjects}');
    expect(projectsRoute).toContain('plugins={organizationPluginOptions}');
  });

  it('keeps project page wired through the shared global command component', () => {
    const projectRoute = readFileSync(pluginStudioProjectRoutePath, 'utf8');

    expect(projectRoute).toContain("from '../-plugin-studio-global-command'");
    expect(projectRoute).toContain('<PluginStudioGlobalCommand');
  });
});
