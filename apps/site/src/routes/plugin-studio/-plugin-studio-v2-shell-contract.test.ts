import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioV2RoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/$projectId/$pluginId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginStudioV2RoutePath, 'utf8');
}

describe('plugin-studio route contract', () => {
  it('registers the plugin-studio route', () => {
    const content = getRouteContent();

    expect(content).toContain("createFileRoute('/plugin-studio/$projectId/$pluginId')");
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

  it('supports project-scoped draft persistence and revision loading actions', () => {
    const content = getRouteContent();

    expect(content).toContain('Draft Workspace');
    expect(content).toContain('Project');
    expect(content).toContain('api.pluginDraft.useCreate');
    expect(content).toContain('api.pluginDraftRevision.useCreate');
    expect(content).toContain('Save Draft Revision');
    expect(content).toContain('Load Revision');
  });

  it('uses client hash preview utility and persists publish/install via client api objects', () => {
    const content = getRouteContent();

    expect(content).toContain('previewReleaseHashes');
    expect(content).toContain("from '@/lib/plugins/release-hash-preview'");
    expect(content).not.toContain("from '@/server-functions/plugins'");
    expect(content).toContain('createPluginReleaseMutation');
    expect(content).toContain('api.businessPluginInstall.useCreate');
    expect(content).toContain('api.businessPluginInstall.useUpdate');
    expect(content).toContain('api.businessPluginDraftInstall.useCreate');
    expect(content).toContain('api.businessPluginDraftInstall.useUpdate');
    expect(content).not.toContain('publishPluginRelease');
    expect(content).not.toContain('installPluginRelease');
    expect(content).not.toContain('installPluginDraftRevision');
    expect(content).not.toContain('mergeMarketplaceReleasesWithSeed');
    expect(content).not.toContain('ensureMarketplaceSeedReleases');
  });

  it('uses app api tables for releases, projects, and draft data', () => {
    const content = getRouteContent();

    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('api.pluginProject.useGet');
    expect(content).toContain('api.pluginProjectMember.useGet');
    expect(content).toContain('api.pluginProjectInvite.useGet');
    expect(content).toContain('api.pluginDraft.useGet');
    expect(content).toContain('api.pluginDraftRevision.useGet');
  });

  it('keeps organization collaboration actions while removing project workspace controls', () => {
    const content = getRouteContent();

    expect(content).toContain('Accept invite');
    expect(content).toContain('Invite member');
    expect(content).toContain('Send invitation');
    expect(content).toContain('View notifications');
    expect(content).toContain('No notifications yet.');
    expect(content).not.toContain('Project Workspace');
    expect(content).not.toContain('Install Published Release');
    expect(content).not.toContain('Install Current Draft Revision');
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

  it('does not squeeze auto-admin preview into a fixed xl sidebar column', () => {
    const content = getRouteContent();

    expect(content).not.toContain(
      'grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]',
    );
  });

  it('wires column edit/delete actions for the live preview table columns', () => {
    const content = getRouteContent();

    expect(content).toContain('onEditColumn: openEditColumnSheet');
    expect(content).toContain('onDeleteColumn: requestDeleteColumn');
    expect(content).toContain('onReorderColumns: handleReorderColumns');
    expect(content).toContain('isDeleteColumnDialogOpen');
    expect(content).toContain('confirmDeleteColumn');
  });

  it('guards schema editor persistence against no-op updates', () => {
    const content = getRouteContent();

    expect(content).toMatch(
      /canonicalStringify\(nextBuilder\)\s*===\s*canonicalStringify\(schemaBuilder\)/,
    );
    expect(content).toMatch(
      /canonicalStringify\(nextSchemaRefinements\)\s*===\s*canonicalStringify\(schemaRefinements\)/,
    );
    expect(content).toMatch(
      /canonicalStringify\(nextBlocklyRefinements\)\s*===\s*canonicalStringify\(blocklyRefinements\)/,
    );
  });

  it('keeps advanced technical internals hidden from the default view', () => {
    const content = getRouteContent();

    expect(content).not.toContain('Workspace Tab Integrations');
    expect(content).not.toContain('Guarded IR Editor');
    expect(content).not.toContain('Actions Manifest');
    expect(content).not.toContain('metadata={{');
  });

  it('provides a shadcn command palette for global org, project, and plugin navigation', () => {
    const content = getRouteContent();

    expect(content).toContain(`from '@/components/ui/command'`);
    expect(content).toContain('CommandDialog');
    expect(content).toContain('CommandInput');
    expect(content).toContain('CommandGroup heading="Organizations"');
    expect(content).toContain('CommandGroup heading="Projects"');
    expect(content).toContain('CommandGroup heading="Plugins"');
    expect(content).toContain('Search organizations, projects, plugins...');
    expect(content).toContain("event.key.toLowerCase() !== 'k'");
    expect(content).toContain('⌘ K');
  });

  it('does not render placeholder docs or feedback actions in organization views', () => {
    const content = getRouteContent();

    expect(content).not.toContain(`<Button size="sm" variant="ghost">
                Feedback
              </Button>`);
    expect(content).not.toContain(`<Button type="button" variant="outline">
                        Docs
                      </Button>`);
  });
});
