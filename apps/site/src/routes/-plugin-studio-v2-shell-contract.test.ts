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

  it('renders dialog-first schema tooling and template trigger flow', () => {
    const content = getRouteContent();

    expect(content).toContain('Schema Editor');
    expect(content).toContain('Schema Fields');
    expect(content).toContain('Cross-Field Refinements');
    expect(content).toContain('Build Powerful Plugin Data Models.');
    expect(content).toContain('isTemplatesDialogOpen');
    expect(content).not.toContain('No-Code Builder');
    expect(content).not.toContain('Studio Engine Modules');
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
    expect(content).toContain('mergeMarketplaceReleasesWithSeed');
    expect(content).not.toContain('ensureMarketplaceSeedReleases');
  });

  it('uses app api tables for releases and draft data', () => {
    const content = getRouteContent();

    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('api.pluginDraft.useGet');
    expect(content).toContain('api.pluginDraftRevision.useGet');
  });

  it('renders explicit workflow management actions with schema editor CTA', () => {
    const content = getRouteContent();

    expect(content).toContain('Workflow Library');
    expect(content).toContain('Edit Connected Schema');
    expect(content).toContain('New Workflow');
    expect(content).toContain('Duplicate Selected');
    expect(content).toContain('Remove Selected');
  });

  it('keeps auto-admin preview while removing inline live-preview controls', () => {
    const content = getRouteContent();

    expect(content).toContain('Sidebar Builder');
    expect(content).toContain('Add Column');
    expect(content).toContain('<AutoAdmin');
    expect(content).not.toContain('Auto-Admin Live Preview');
    expect(content).not.toContain('Drop table here');
    expect(content).not.toContain('Table Columns');
    expect(content).not.toContain('Add Group');
    expect(content).not.toContain('Add Table');
    expect(content).not.toContain('Extend Core');
  });

  it('wires column edit/delete actions for the live preview table columns', () => {
    const content = getRouteContent();

    expect(content).toContain('onEditColumn: openEditColumnSheet');
    expect(content).toContain('onDeleteColumn: requestDeleteColumn');
    expect(content).toContain('onReorderColumns: handleReorderColumns');
    expect(content).toContain('isDeleteColumnDialogOpen');
    expect(content).toContain('confirmDeleteColumn');
  });

  it('keeps advanced technical internals hidden from the default view', () => {
    const content = getRouteContent();

    expect(content).not.toContain('Workspace Tab Integrations');
    expect(content).not.toContain('Guarded IR Editor');
    expect(content).not.toContain('Actions Manifest');
    expect(content).not.toContain('metadata={{');
  });
});
