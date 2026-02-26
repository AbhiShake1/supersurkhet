import { describe, expect, it } from 'vitest';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  SchemaDoc,
} from '@/lib/plugins/types';
import { executeLifecycleHook } from '@/lib/plugins/workflow-executor';
import { runPluginsV2CompileVerifyPipeline } from '@/server-functions/plugins-v2-compile-verify';
import {
  createInMemoryPluginSchemaRecordStore,
  createPluginsV2SchemaCrudService,
  PluginSchemaHashMismatchError,
} from '@/server-functions/plugins-v2-schema-crud';

function createRelease(
  overrides: Partial<PluginReleaseDoc> = {},
): PluginReleaseDoc {
  const pluginId = overrides.pluginId ?? 'acme.inventory';
  const version = overrides.version ?? '1.0.0';
  return {
    id: `${pluginId}@${version}`,
    pluginId,
    version,
    manifestHash: overrides.manifestHash ?? 'manifest-release-1',
    artifactHash: overrides.artifactHash ?? 'artifact-release-1',
    author: {
      userId: 'owner-1',
    },
    visibility: 'public',
    docs: {
      title: 'Inventory',
      ...(overrides.docs ?? {}),
    },
    actionManifest: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createReleaseInstall(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.inventory',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    version: '1.0.0',
    manifestHash: 'manifest-release-1',
    artifactHash: 'artifact-release-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    requestedCapabilities: ['inventory:write'],
    ...overrides,
  };
}

function createDraftRevision(
  overrides: Partial<PluginDraftRevisionDoc> = {},
): PluginDraftRevisionDoc {
  return {
    revisionId: 'rev-merge-1',
    draftId: 'draft-1',
    pluginId: 'acme.inventory',
    manifestHash: 'manifest-draft-1',
    artifactHash: 'artifact-draft-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'editor-1',
    ...overrides,
  };
}

function createDraftInstall(
  overrides: Partial<BusinessPluginDraftInstallDoc> = {},
): BusinessPluginDraftInstallDoc {
  return {
    id: 'business-1::draft-1',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    draftId: 'draft-1',
    revisionId: 'rev-merge-1',
    teamId: 'team-a',
    manifestHash: 'manifest-draft-1',
    artifactHash: 'artifact-draft-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'editor-1',
    status: 'active',
    ...overrides,
  };
}

describe('plugin builder v2 lifecycle verification suite', () => {
  it('verifies draft create/edit/collaborate/review/promote/publish/install/runtime CRUD lifecycle', async () => {
    const draft = {
      draftId: 'draft-1',
      pluginId: 'acme.inventory',
      ownerUserId: 'owner-1',
      collaboratorUserIds: ['editor-1'],
      title: 'Inventory Draft',
    };

    const baseDraftSnapshot = {
      docs: {
        title: 'Inventory Draft',
        description: 'Draft baseline',
      },
      schemaDocs: [
        {
          schemaId: 'inventoryItem',
          fields: [
            { key: 'sku', type: 'string' as const },
            { key: 'quantity', type: 'number' as const },
          ],
        },
        {
          schemaId: 'inventory',
          fields: [],
          workflows: [
            {
              workflowId: 'inventory.beforeCreate',
              hook: 'beforeCreate' as const,
              nodes: [
                {
                  nodeId: 'draft-node-1',
                  type: 'action' as const,
                  actionId: 'draft.audit',
                },
              ],
              edges: [],
            },
          ],
        },
      ],
      adminTabs: [{ schema: 'inventoryItem', title: 'Inventory' }],
    };

    const draftRevision = createDraftRevision({
      draftId: draft.draftId,
      pluginId: draft.pluginId,
      schemaDocs: baseDraftSnapshot.schemaDocs,
      adminTabs: baseDraftSnapshot.adminTabs,
    });
    const draftInstall = createDraftInstall({
      pluginId: draft.pluginId,
      draftId: draft.draftId,
      revisionId: draftRevision.revisionId,
    });

    const registry = createPluginRuntimeRegistry();
    registry.publishDraftRevision(draftRevision);
    const teamInstall = registry.installDraftRevision(draftInstall);
    expect(teamInstall.status).toBe('active');

    const draftRuntimeResult = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'inventory',
      hook: 'beforeCreate',
      payload: { sku: 'SKU-1', quantity: 1 },
      teamId: 'team-a',
      actionHandlers: {
        'draft.audit': async () => ({ draft: true }),
      },
    });
    expect(draftRuntimeResult.executedNodeIds).toEqual(['draft-node-1']);

    const compileReview = runPluginsV2CompileVerifyPipeline({
      pluginId: draft.pluginId,
      version: '1.0.0',
      docs: baseDraftSnapshot.docs,
      actionManifest: [
        {
          actionId: 'inventory.audit',
          capabilities: ['inventory:write'],
          runtime: 'sandbox-worker',
        },
      ],
      schemaDocs: [
        baseDraftSnapshot.schemaDocs[0] as SchemaDoc,
        {
          ...(baseDraftSnapshot.schemaDocs[1] as SchemaDoc),
          workflows: [
            {
              workflowId: 'inventory.release.beforeCreate',
              hook: 'beforeCreate',
              nodes: [
                {
                  nodeId: 'release-node-1',
                  type: 'action',
                  actionId: 'inventory.audit',
                },
              ],
              edges: [],
            },
          ],
        },
      ],
      adminTabs: baseDraftSnapshot.adminTabs,
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
    });
    expect(compileReview.parity.diagnostics.blocking).toBe(false);
    expect(compileReview.diagnostics.bySeverity.error).toBe(0);

    const release = createRelease({
      pluginId: draft.pluginId,
      docs: baseDraftSnapshot.docs,
      actionManifest: [
        {
          actionId: 'inventory.audit',
          capabilities: ['inventory:write'],
          runtime: 'sandbox-worker',
        },
      ],
      schemaDocs: [
        baseDraftSnapshot.schemaDocs[0] as SchemaDoc,
        {
          ...(baseDraftSnapshot.schemaDocs[1] as SchemaDoc),
          workflows: [
            {
              workflowId: 'inventory.release.beforeCreate',
              hook: 'beforeCreate',
              nodes: [
                {
                  nodeId: 'release-node-1',
                  type: 'action',
                  actionId: 'inventory.audit',
                },
              ],
              edges: [],
            },
          ],
        },
      ],
      adminTabs: baseDraftSnapshot.adminTabs,
    });
    registry.publishRelease(release);

    const releaseInstall = createReleaseInstall({
      pluginId: draft.pluginId,
      version: release.version,
      manifestHash: release.manifestHash,
      artifactHash: release.artifactHash,
    });
    registry.installRelease(releaseInstall, { explicitOwnerUpdate: true });
    expect(releaseInstall.manifestHash).toBe(release.manifestHash);
    expect(releaseInstall.requestedCapabilities).toEqual(['inventory:write']);

    const releaseRuntimeResult = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'inventory',
      hook: 'beforeCreate',
      payload: { sku: 'SKU-2', quantity: 2 },
      teamId: 'team-b',
      actionHandlers: {
        'inventory.audit': async (_, context) => context.capabilities ?? [],
      },
    });
    expect(releaseRuntimeResult.executedNodeIds).toEqual(['release-node-1']);
    expect(
      releaseRuntimeResult.actionOutputsByNodeId['release-node-1'],
    ).toEqual(['inventory:write']);

    const crud = createPluginsV2SchemaCrudService({
      registry,
      store: createInMemoryPluginSchemaRecordStore(),
    });

    const created = await crud.create({
      businessId: 'business-1',
      pluginId: draft.pluginId,
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      source: 'release',
      payload: { sku: 'SKU-2', quantity: 2 },
      hashPin: {
        manifestHash: release.manifestHash,
      },
    });
    expect(created.context.mode).toBe('release');
    expect(created.record.namespacePath).toBe(
      'business-1/acme.inventory/inventoryItem/row-1',
    );

    const read = await crud.read({
      businessId: 'business-1',
      pluginId: draft.pluginId,
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      source: 'release',
      hashPin: {
        artifactHash: release.artifactHash,
      },
    });
    expect(read.record.payload).toEqual({
      sku: 'SKU-2',
      quantity: 2,
    });

    const updated = await crud.update({
      businessId: 'business-1',
      pluginId: draft.pluginId,
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      source: 'release',
      payload: { sku: 'SKU-2', quantity: 3 },
    });
    expect(updated.record.payload).toEqual({
      sku: 'SKU-2',
      quantity: 3,
    });

    const listed = await crud.list({
      businessId: 'business-1',
      pluginId: draft.pluginId,
      schemaId: 'inventoryItem',
      source: 'release',
    });
    expect(listed.records).toHaveLength(1);

    const removed = await crud.remove({
      businessId: 'business-1',
      pluginId: draft.pluginId,
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      source: 'release',
    });
    expect(removed.deleted).toBe(true);
  });

  it('rejects missing capability during review and stale hash pin during installed CRUD writes', async () => {
    const capabilityReview = runPluginsV2CompileVerifyPipeline({
      pluginId: 'acme.inventory',
      version: '1.0.0',
      actionManifest: [
        {
          actionId: 'inventory.audit',
          capabilities: ['inventory:write'],
          runtime: 'sandbox-worker',
        },
      ],
      schemaDocs: [
        {
          schemaId: 'inventory',
          fields: [],
          workflows: [
            {
              workflowId: 'inventory.release.beforeCreate',
              hook: 'beforeCreate',
              nodes: [
                {
                  nodeId: 'release-node-1',
                  type: 'action',
                  actionId: 'inventory.audit',
                },
              ],
              edges: [],
            },
          ],
        },
      ],
      capabilityEnvelope: [],
      runtimeTarget: 'sandbox-worker',
    });

    expect(
      capabilityReview.diagnostics.all.some(
        (diagnostic) => diagnostic.code === 'missing-capability',
      ),
    ).toBe(true);
    expect(capabilityReview.diagnostics.bySeverity.warning).toBeGreaterThan(0);

    const release = createRelease({
      version: '2.0.0',
      manifestHash: 'manifest-release-2',
      artifactHash: 'artifact-release-2',
      schemaDocs: [
        {
          schemaId: 'inventoryItem',
          fields: [
            { key: 'sku', type: 'string' },
            { key: 'quantity', type: 'number' },
          ],
        },
      ],
    });
    const registry = createPluginRuntimeRegistry({
      releases: [release],
      installs: [
        createReleaseInstall({
          version: '2.0.0',
          manifestHash: release.manifestHash,
          artifactHash: release.artifactHash,
        }),
      ],
    });
    const crud = createPluginsV2SchemaCrudService({
      registry,
      store: createInMemoryPluginSchemaRecordStore(),
    });

    await expect(
      crud.create({
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        schemaId: 'inventoryItem',
        rowId: 'row-2',
        source: 'release',
        payload: { sku: 'SKU-2', quantity: 2 },
        hashPin: {
          manifestHash: 'stale-manifest-hash',
        },
      }),
    ).rejects.toBeInstanceOf(PluginSchemaHashMismatchError);
  });
});
