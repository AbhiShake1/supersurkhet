import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginStudioRoutePath = resolve(
  process.cwd(),
  'src/routes/plugin-studio/$projectId/$pluginId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginStudioRoutePath, 'utf8');
}

describe('plugin-studio client boundary', () => {
  it('does not import server-only plugin-service module into client route', () => {
    const content = getRouteContent();

    expect(content).not.toContain(`from '@/lib/plugins/plugin-service'`);
  });

  it('uses a client hash utility for release hash previews', () => {
    const content = getRouteContent();

    expect(content).toContain('previewReleaseHashes');
    expect(content).toContain(`from '@/lib/plugins/release-hash-preview'`);
    expect(content).not.toContain(`from '@/server-functions/plugins'`);
    expect(content).not.toContain('publishPluginRelease');
    expect(content).not.toContain('installPluginRelease');
    expect(content).not.toContain('installPluginDraftRevision');
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

  it('keeps full-screen editors scrollable with internal overflow containers', () => {
    const content = getRouteContent();

    const fullScreenDialogWithOverflowClass =
      /!w-screen !h-screen !max-w-none !max-h-none gap-0 flex flex-col overflow-hidden !translate-x-0 !translate-y-0 !top-0 !left-0 !rounded-none !m-0/g;
    const overflowContainers = /min-h-0 flex-1 overflow-y-auto/g;

    const fullScreenDialogMatches =
      content.match(fullScreenDialogWithOverflowClass) ?? [];
    const overflowContainerMatches = content.match(overflowContainers) ?? [];

    expect(fullScreenDialogMatches.length).toBeGreaterThanOrEqual(3);
    expect(overflowContainerMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('applies template presets through a dedicated template handler', () => {
    const content = getRouteContent();

    expect(content).toContain('applyTemplatePreset');
    expect(content).toContain('mergeMarketplaceReleasesWithSeed');
    expect(content).toContain('Template was not found.');
    expect(content).toContain('setIsTemplatesDialogOpen(false);');
    expect(content).not.toContain('navigateToPluginWorkspace(template.pluginId);');
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
    expect(content).toContain('Input props');
    expect(content).toContain('Read only');
    expect(content).toContain('Additional Input Props');
    expect(content).toContain('Custom data');
    expect(content).toContain('Field Config Extras');
    expect(content).toContain('ClassNameFieldControl');
    expect(content).not.toContain('addColumnDraft.derived');
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
    expect(content).toContain('rightPath:');
    expect(content).toContain('value || undefined');
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

  it('opens workflow editor from sidebar table settings and locks connected schema field', () => {
    const content = getRouteContent();

    expect(content).toContain(
      'onOpenWorkflowEditorForTab={handleOpenWorkflowEditorForTab}',
    );
    expect(content).toContain('onDeleteTableForTab={handleDeleteTableFromTab}');
    expect(content).toContain(
      'function handleDeleteTableFromTab(tabTitle: string)',
    );
    expect(content).toContain(
      'const [workflowEditorLockedTable, setWorkflowEditorLockedTable] = useState<',
    );
    expect(content).toContain('string | null');
    expect(content).toContain('const workflowEditorTable =');
    expect(content).toContain(
      'workflowEditorLockedTable ?? workspaceWorkflow.table;',
    );
    expect(content).toContain('disabled={Boolean(workflowEditorLockedTable)}');
  });

  it('wires interactive workflow graph editor with schema and action context', () => {
    const content = getRouteContent();

    expect(content).toContain('Workflow Library');
    expect(content).toContain('Edit Connected Schema');
    expect(content).toContain('id="workflow-editor-selector"');
    expect(content).toContain('New Workflow');
    expect(content).toContain('Duplicate Selected');
    expect(content).toContain('Remove Selected');
    expect(content).toContain('New starts blank for this schema.');
    expect(content).toContain('onClick={handleAddWorkflow}');
    expect(content).toContain(
      'onWorkflowChange={(nextWorkflow) => updateActiveWorkflow(() => nextWorkflow)}',
    );
    expect(content).toContain('schemaDocs={availableSchemaDocs}');
    expect(content).toContain('actionManifest={parsed?.actionManifest ?? []}');
    expect(content).toContain(
      'lockedTable={Boolean(workflowEditorLockedTable)}',
    );
  });

  it('closes workflow editor before opening schema editor from workflow context', () => {
    const content = getRouteContent();

    expect(content).toContain('closeWorkflowEditor?: boolean');
    expect(content).toContain('options?.closeWorkflowEditor');
    expect(content).toContain('setIsWorkflowEditorOpen(false)');
    expect(content).toContain('setWorkflowEditorLockedTable(null)');
  });

  it('defers schema editor open until after workflow dialog begins closing', () => {
    const content = getRouteContent();

    expect(content).toContain('window.setTimeout(() => {');
    expect(content).toContain('}, 260);');
    expect(content).toContain('setIsSchemaEditorOpen(true);');
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

  it('wires project-scoped draft and release CRUD through client-side app api tables', () => {
    const content = getRouteContent();

    expect(content).toContain('toProjectScopedDraftId');
    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('api.pluginDraft.useGet');
    expect(content).toContain('api.pluginDraft.useCreate');
    expect(content).toContain('api.pluginDraft.useUpdate');
    expect(content).toContain('api.pluginDraftRevision.useGet');
    expect(content).toContain('api.pluginDraftRevision.useCreate');
    expect(content).not.toContain('createPluginDraft(');
    expect(content).not.toContain('createPluginDraftRevision(');
    expect(content).toContain('save-draft-revision');
  });

  it('wires project install mutations and omits stale invite/member handlers', () => {
    const content = getRouteContent();

    expect(content).toContain(
      'createProjectInstallMutation = api.businessPluginInstall.useCreate',
    );
    expect(content).toContain(
      'createProjectDraftInstallMutation = api.businessPluginDraftInstall.useCreate',
    );
    expect(content).toContain('updateProjectInstallMutation = api.businessPluginInstall.useUpdate');
    expect(content).toContain(
      'updateProjectDraftInstallMutation = api.businessPluginDraftInstall.useUpdate',
    );
    expect(content).not.toContain('api.pluginProjectMember.useGet');
    expect(content).not.toContain('api.pluginProjectInvite.useGet');
    expect(content).not.toContain('handleAcceptInvite');
    expect(content).not.toContain('handleUpdateMemberRole');
    expect(content).not.toContain('handleRemoveMember');
  });

  it('persists sidebar group/system metadata in draft revisions', () => {
    const content = getRouteContent();

    expect(content).toContain('serializeDraftAdminTabs');
    expect(content).toContain('deserializeDraftAdminTabs');
    expect(content).toContain('__plugin_studio_group__/');
    expect(content).toContain('__plugin_studio_system__/');
    expect(content).toContain('adminTabs: parsed.draftAdminTabs');
    expect(content).toContain('persistSidebarUiStateForActor');
    expect(content).toContain('sidebarSnapshotJson');
    expect(content).toContain('snapshot:');
  });

  it('guards against malformed admin tab rows before sentinel parsing', () => {
    const content = getRouteContent();

    expect(content).toContain('const tabs = adminTabs ?? [];');
    expect(content).toContain('isGroupSentinelSchemaId(tab.schema)');
    expect(content).toContain('const systemKey = parseSystemSentinelSchemaId(tab.schema);');
    expect(content).toContain('if (systemKey)');
    expect(content).toContain('schemaTabs.push(tab);');
  });

  it('waits for drafts to finish loading before auto-creating a new draft', () => {
    const content = getRouteContent();

    expect(content).toContain('if (!pluginId.trim())');
    expect(content).toContain('if (!isActorIdentityReady)');
    expect(content).toContain(
      'if (!parsed || !isDraftSaveable || !activeDraft)',
    );
    expect(content).toContain('if (!isDraftHydrated)');
    expect(content).toContain('if (isDraftRevisionLoading)');
    expect(content).toContain('Draft auto-save failed:');
    expect(content).toContain('isMissingPluginDraftError');
    expect(content).toContain('expectedHydratedDraftKey');
    expect(content).toContain('hydratedDraftKey');
    expect(content).toContain('initialSnapshotByDraftRef');
    expect(content).toContain('activeDraftRevisions.length === 0');
    expect(content).toContain('if (isDraftLoading)');
    expect(content).toContain('currentDraftSnapshot !== latestPersistedDraftSnapshot');
    expect(content).toContain('toDraftSnapshotString');
    expect(content).toContain('lastRequestedDraftSnapshotRef');
    expect(content).toContain('void saveDraftRevision(activeDraft.draftId);');
  });

  it('uses path-param page flow for project and plugin state instead of search params', () => {
    const content = getRouteContent();

    expect(content).toContain('const params = Route.useParams();');
    expect(content).toContain('const projectId = params.projectId;');
    expect(content).toContain('const requestedPluginId = params.pluginId;');
    expect(content).toContain('initialProjectId');
    expect(content).toContain('initialPluginId');
    expect(content).toContain('initialStudioView');
    expect(content).toContain("createFileRoute('/plugin-studio/$projectId/$pluginId')");
    expect(content).toContain('toProjectScopedDraftId');
    expect(content).not.toContain("readSearchParamString(search, 'projectId')");
    expect(content).not.toContain("readSearchParamString(search, 'pluginId')");
  });

  it('validates plugin-studio search params with zod at the route boundary', () => {
    const content = getRouteContent();

    expect(content).toContain(`from 'zod'`);
    expect(content).toContain('const pluginStudioSearchSchema = z.object({');
    expect(content).toContain('pluginId: optionalSearchStringSchema');
    expect(content).toContain('draftId: optionalSearchStringSchema');
    expect(content).toContain('sortBy: optionalSearchStringSchema');
    expect(content).toContain("z.enum(['asc', 'desc']).optional()");
    expect(content).toContain('validateSearch: pluginStudioSearchSchema');
    expect(content).not.toContain('function readSearchParamString(');
  });

  it('keeps draft identity stable using project + plugin deterministic draft ids', () => {
    const content = getRouteContent();

    expect(content).toContain('toProjectScopedDraftId');
    expect(content).toContain('projectId');
    expect(content).toContain('requestedPluginId');
    expect(content).toContain('candidate.draftId === draftId');
    expect(content).toContain('(candidate.projectId ?? projectId) === projectId');
    expect(content).toContain('resolvePluginStudioPluginId');
  });

  it('chooses latest template release using semantic version ordering', () => {
    const content = getRouteContent();

    expect(content).toContain('parseVersionParts(');
    expect(content).toContain('isVersionGreater(');
    expect(content).not.toContain('release.version > existing.version');
  });

  it('integrates all plugin-builder workspace modules into the studio route', () => {
    const content = getRouteContent();

    expect(content).toContain('AutoAdmin');
    expect(content).toContain('WorkflowGraphEditor');
    expect(content).toContain('createPublishGateTabState');
    expect(content).not.toContain('Workspace Tab Integrations');
  });

  it('derives tab titles from schema docs with sidebar title fallback', () => {
    const content = getRouteContent();

    expect(content).toContain('schemaDoc.title ??');
    expect(content).toContain('tabBySchema.get(schemaDoc.schemaId)?.title ??');
    expect(content).toContain(
      'title: schemaDoc.title || tab.title || schemaDoc.schemaId',
    );
    expect(content).not.toContain(
      'title: tab.title || schemaDoc.title || schemaDoc.schemaId',
    );
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
