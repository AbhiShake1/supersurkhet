import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioV2RoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio.tsx',
);

function getRouteContent() {
  return readFileSync(pluginStudioV2RoutePath, 'utf8');
}

describe('plugin-studio route contract', () => {
  it('registers the plugin-studio route', () => {
    const content = getRouteContent();

    expect(content).toContain("createFileRoute('/plugin-studio')");
  });

  it('renders no-code builder sections and guided schema tooling', () => {
    const content = getRouteContent();

    expect(content).toContain('No-Code Builder');
    expect(content).toContain('Schema Builder');
    expect(content).toContain('Cross-Field Validation Rules');
    expect(content).toContain('Blockly Logic Rules');
    expect(content).toContain('Build in 4 guided steps');
  });

  it('supports draft persistence and revision loading actions', () => {
    const content = getRouteContent();

    expect(content).toContain('Draft Workspace');
    expect(content).toContain('createPluginDraft');
    expect(content).toContain('createPluginDraftRevision');
    expect(content).toContain('Save Draft Revision');
    expect(content).toContain('Load Revision');
  });

  it('keeps release publish + hash preview flow connected to server functions', () => {
    const content = getRouteContent();

    expect(content).toContain('previewPluginReleaseHashes');
    expect(content).toContain('publishPluginRelease');
    expect(content).toContain('ensureMarketplaceSeedReleases');
  });

  it('uses app api tables for releases and draft data', () => {
    const content = getRouteContent();

    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('api.pluginDraft.useGet');
    expect(content).toContain('api.pluginDraftRevision.useGet');
  });

  it('renders schema and workflow edit actions as icon buttons beside delete', () => {
    const content = getRouteContent();

    expect(content).toContain('<div className="flex items-center gap-1">');
    expect(content).toContain('size="icon"');
    expect(content).toContain('<span className="sr-only">Edit schema</span>');
    expect(content).toContain('<span className="sr-only">Edit workflow</span>');
  });

  it('keeps advanced technical internals hidden from the default view', () => {
    const content = getRouteContent();

    expect(content).not.toContain('Workspace Tab Integrations');
    expect(content).not.toContain('Guarded IR Editor');
    expect(content).not.toContain('Actions Manifest');
    expect(content).not.toContain('metadata={{');
  });
});
