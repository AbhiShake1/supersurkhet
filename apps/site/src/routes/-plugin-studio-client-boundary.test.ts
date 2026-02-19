import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio.tsx',
);

function getRouteContent() {
  return readFileSync(pluginStudioRoutePath, 'utf8');
}

describe('plugin-studio client boundary', () => {
  it('does not import server-only plugin-service module into client route', () => {
    const content = getRouteContent();

    expect(content).not.toContain(`from '@/lib/plugins/plugin-service'`);
  });

  it('uses a server function for release hash previews', () => {
    const content = getRouteContent();

    expect(content).toContain('previewPluginReleaseHashes');
    expect(content).toContain(`from '@/server-functions/plugins'`);
  });

  it('uses TanStack Query hooks for async server state', () => {
    const content = getRouteContent();

    expect(content).toContain(`from '@tanstack/react-query'`);
    expect(content).toContain('useMutation({');
    expect(content).toContain('useQuery({');
  });

  it('uses skeleton UI instead of blocking spinner gate', () => {
    const content = getRouteContent();

    expect(content).toContain('PluginStudioSkeleton');
    expect(content).toContain('<Skeleton');
    expect(content).not.toContain('if (seeding)');
    expect(content).not.toContain('setSeeding(');
    expect(content).not.toContain('Loader2');
  });

  it('centers the page content with an explicit max-width container', () => {
    const content = getRouteContent();

    expect(content).toContain('mx-auto w-full max-w-7xl');
  });

  it('supports a dialog-first schema builder flow and hides raw schema docs', () => {
    const content = getRouteContent();

    expect(content).toContain('Schema Editor');
    expect(content).toContain('Schema Fields');
    expect(content).toContain('Cross-Field Refinements');
    expect(content).toContain('overflow-hidden');
    expect(content).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(content).not.toContain('No-Code Builder');
    expect(content).not.toContain('Full SchemaDoc JSON');
    expect(content).not.toContain('schema-editor-doc-json');
  });

  it('applies template presets through a dedicated template handler', () => {
    const content = getRouteContent();

    expect(content).toContain('applyTemplatePreset');
    expect(content).toContain('mergeMarketplaceReleasesWithSeed');
    expect(content).toContain('Loaded template');
  });

  it('uses type-aware rule field selectors instead of free text', () => {
    const content = getRouteContent();

    expect(content).toContain('availableRuleFieldsByType');
    expect(content).toContain('Cross-Field Refinements');
  });

  it('restricts cross-field comparisons to a different compatible field', () => {
    const content = getRouteContent();

    expect(content).toContain('leftRuleFields');
    expect(content).toContain('fieldKey !== nextLeftField');
  });

  it('exposes a Blockly composer entrypoint for advanced logic', () => {
    const content = getRouteContent();

    expect(content).toContain('Blockly Composer');
    expect(content).toContain('Compose Logic');
  });

  it('adds explicit labels for schema metadata inputs inside schema editor dialog', () => {
    const content = getRouteContent();

    expect(content).toContain(`from '@/components/ui/label'`);
    expect(content).toContain('htmlFor="schema-editor-schema-id"');
    expect(content).toContain('htmlFor="schema-editor-schema-title"');
    expect(content).toContain('id="schema-editor-schema-id"');
    expect(content).toContain('id="schema-editor-schema-title"');
  });

  it('keeps schema field editing controls in the schema editor dialog', () => {
    const content = getRouteContent();

    expect(content).toContain(`htmlFor={\`schema-field-key-\${field.id}\`}`);
    expect(content).toContain(`htmlFor={\`schema-field-label-\${field.id}\`}`);
    expect(content).toContain(
      `htmlFor={\`schema-field-description-\${field.id}\`}`,
    );
    expect(content).toContain(`htmlFor={\`schema-field-type-\${field.id}\`}`);
    expect(content).toContain(`id={\`schema-field-key-\${field.id}\`}`);
    expect(content).toContain(`id={\`schema-field-label-\${field.id}\`}`);
    expect(content).toContain(`id={\`schema-field-description-\${field.id}\`}`);
    expect(content).toContain(`id={\`schema-field-type-\${field.id}\`}`);
    expect(content).toContain('value={field.key}');
    expect(content).toContain('value={field.label}');
    expect(content).toContain('value={field.description}');
    expect(content).toContain('placeholder="Input placeholder"');
    expect(content).toContain('Derived Fields');
    expect(content).toContain('Add Derived Field');
    expect(content).toContain('Source references');
    expect(content).toContain('Field Refinements');
    expect(content).toContain('Add Field Refinement');
  });

  it('uses safe field-refinement controls with centered delete action', () => {
    const content = getRouteContent();

    expect(content).toContain('Payload field (same type)');
    expect(content).toContain('Select payload field');
    expect(content).toContain('rightPath: value || undefined');
    expect(content).toContain('className="flex items-end justify-center"');
    expect(content).toContain('Remove Derived Field');
  });

  it('adds explicit labels for workflow trigger fields inside workflow editor dialog', () => {
    const content = getRouteContent();

    expect(content).toContain('htmlFor="workflow-editor-workflow-id"');
    expect(content).toContain('htmlFor="workflow-editor-table"');
    expect(content).toContain('htmlFor="workflow-editor-hook"');
    expect(content).toContain('id="workflow-editor-workflow-id"');
    expect(content).toContain('id="workflow-editor-table"');
    expect(content).toContain('id="workflow-editor-hook"');
  });

  it('preserves advanced field behavior payloads like derivations while using no-code builder', () => {
    const content = getRouteContent();

    expect(content).toContain('behaviorJson');
    expect(content).toContain('...(parseJsonObject(field.behaviorJson) ?? {})');
  });

  it('adds preset logic actions inside the Blockly composer', () => {
    const content = getRouteContent();

    expect(content).toContain('Preset Logic');
    expect(content).toContain('getBlocklyPresets');
  });

  it('uses real Google Blockly workspace for logic composition', () => {
    const content = getRouteContent();

    expect(content).toContain("import('blockly')");
    expect(content).toContain('blocklyWorkspaceId');
    expect(content).toContain('plugin_logic_and');
    expect(content).toContain('plugin_logic_or');
    expect(content).toContain('plugin_logic_not');
    expect(content).toContain('Cross-Field Refinements');
  });

  it('wires draft CRUD through app api schema tables and draft server functions', () => {
    const content = getRouteContent();

    expect(content).toContain('api.pluginDraft.useGet');
    expect(content).toContain('api.pluginDraftRevision.useGet');
    expect(content).toContain('createPluginDraft');
    expect(content).toContain('createPluginDraftRevision');
    expect(content).toContain('save-draft-revision');
  });

  it('integrates all plugin-builder workspace modules into the studio route', () => {
    const content = getRouteContent();

    expect(content).toContain('OverviewTab');
    expect(content).toContain('SchemasTab');
    expect(content).toContain('WorkflowGraphEditor');
    expect(content).toContain('PublishGateTab');
    expect(content).not.toContain('Workspace Tab Integrations');
  });

  it('does not expose developer-centric metadata and internals in the no-code view', () => {
    const content = getRouteContent();

    expect(content).not.toContain('metadata={{');
    expect(content).not.toContain('Guarded IR Editor');
    expect(content).not.toContain('Actions Manifest');
    expect(content).not.toContain('Review Diagnostics');
    expect(content).not.toContain('Field Config JSON');
    expect(content).not.toContain('Input Props JSON');
    expect(content).not.toContain('Custom Data JSON');
  });
});
