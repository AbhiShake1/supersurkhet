import { describe, expect, it } from 'vitest';
import {
  businessPluginDraftInstallSchema,
  businessPluginInstallSchema,
  coreSchema,
  pluginDraftRevisionSchema,
  pluginDraftSchema,
  pluginRecordSchema,
  pluginReleaseSchema,
} from '@/lib/schema';

describe('plugin storage schema contracts', () => {
  it('exposes all plugin platform tables in core schema', () => {
    expect(coreSchema.rawShape).toHaveProperty('pluginRelease');
    expect(coreSchema.rawShape).toHaveProperty('businessPluginInstall');
    expect(coreSchema.rawShape).toHaveProperty('pluginDraft');
    expect(coreSchema.rawShape).toHaveProperty('pluginDraftRevision');
    expect(coreSchema.rawShape).toHaveProperty('businessPluginDraftInstall');
    expect(coreSchema.rawShape).toHaveProperty('pluginRecord');
  });

  it('uses deterministic release id and immutable author/visibility metadata', () => {
    const parsed = pluginReleaseSchema.parse({
      id: 'acme.inventory@1.0.0',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      actionManifest: [],
      author: {
        userId: 'user-1',
      },
      visibility: 'public',
    });

    expect(parsed.id).toBe('acme.inventory@1.0.0');
    expect(parsed.visibility).toBe('public');
  });

  it('stores requestedCapabilities on published installs', () => {
    const parsed = businessPluginInstallSchema.parse({
      id: 'business-1::acme.inventory',
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      installedAt: '2026-01-01T00:00:00.000Z',
      installedByUserId: 'owner-1',
      status: 'active',
      requestedCapabilities: ['inventory:write'],
    });

    expect(parsed.requestedCapabilities).toEqual(['inventory:write']);
  });

  it('supports mutable draft headers and immutable draft revisions', () => {
    const draft = pluginDraftSchema.parse({
      id: 'draft-1',
      draftId: 'draft-1',
      pluginId: 'acme.inventory',
      ownerUserId: 'owner-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const revision = pluginDraftRevisionSchema.parse({
      id: 'draft-1@rev-1',
      revisionId: 'rev-1',
      draftId: draft.draftId,
      pluginId: draft.pluginId,
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'owner-1',
    });

    expect(revision.draftId).toBe(draft.draftId);
  });

  it('stores team-scoped draft installs pinned to draft revision', () => {
    const parsed = businessPluginDraftInstallSchema.parse({
      id: 'business-1::draft-1',
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      draftId: 'draft-1',
      revisionId: 'rev-1',
      teamId: 'team-1',
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      installedAt: '2026-01-01T00:00:00.000Z',
      installedByUserId: 'owner-1',
      status: 'active',
    });

    expect(parsed.teamId).toBe('team-1');
  });

  it('stores plugin runtime rows in per-plugin namespace', () => {
    const parsed = pluginRecordSchema.parse({
      id: 'business-1/acme.inventory/inventoryItem/row-1',
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      namespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
      payload: {
        sku: 'SKU-1',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.namespacePath).toContain('acme.inventory');
  });
});
