import { describe, expect, it } from 'vitest';
import {
  businessPluginDraftInstallSchema,
  businessPluginInstallSchema,
  businessUiTemplateInstallSchema,
  coreSchema,
  pluginActionCapabilityEnvelopeSchema,
  pluginDraftRevisionSchema,
  pluginDraftSchema,
  pluginPublishReviewSchema,
  pluginRecordSchema,
  pluginReleaseSchema,
  pluginRoutesTabsConfigSchema,
  pluginUserReviewSchema,
  pluginV2DiagnosticsSchema,
  uiTemplateReleaseSchema,
} from '@/lib/schema';

describe('plugin storage schema contracts', () => {
  it('exposes all plugin platform tables in core schema', () => {
    expect(coreSchema.rawShape).toHaveProperty('pluginRelease');
    expect(coreSchema.rawShape).toHaveProperty('businessPluginInstall');
    expect(coreSchema.rawShape).toHaveProperty('uiTemplateRelease');
    expect(coreSchema.rawShape).toHaveProperty('businessUiTemplateInstall');
    expect(coreSchema.rawShape).toHaveProperty('pluginDraft');
    expect(coreSchema.rawShape).toHaveProperty('pluginDraftRevision');
    expect(coreSchema.rawShape).toHaveProperty('businessPluginDraftInstall');
    expect(coreSchema.rawShape).toHaveProperty('pluginRecord');
    expect(coreSchema.rawShape).toHaveProperty('pluginV2Diagnostics');
    expect(coreSchema.rawShape).toHaveProperty('pluginPublishReview');
    expect(coreSchema.rawShape).toHaveProperty('pluginUserReview');
    expect(coreSchema.rawShape).toHaveProperty(
      'pluginActionCapabilityEnvelope',
    );
    expect(coreSchema.rawShape).toHaveProperty('pluginRoutesTabsConfig');
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

  it('stores immutable ui template releases with bundled plugin docs', () => {
    const parsed = uiTemplateReleaseSchema.parse({
      id: 'acme/restaurant::starter@1.0.0',
      templateId: 'acme/restaurant::starter',
      version: '1.0.0',
      visibility: 'public',
      publisher: {
        businessId: 'business-1',
        userId: 'owner-1',
      },
      docs: {
        title: 'Starter Restaurant',
        description: 'Landing + menu + booking pages',
        category: 'restaurant',
        tags: ['starter', 'public'],
      },
      uiSnapshot: {
        layers: JSON.stringify([
          {
            id: 'page-1',
            name: 'Home',
            type: 'div',
            props: {},
            children: [],
          },
        ]),
      },
      pluginBundles: [
        {
          pluginId: 'acme.inventory',
          version: '1.0.0',
          requestedCapabilities: ['inventory:write'],
          release: {
            id: 'acme.inventory@1.0.0',
            pluginId: 'acme.inventory',
            version: '1.0.0',
            manifestHash: 'manifest-hash',
            artifactHash: 'artifact-hash',
            actionManifest: [],
            author: {
              userId: 'owner-1',
            },
            visibility: 'public',
          },
        },
      ],
      publishedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.pluginBundles[0]?.release.id).toBe('acme.inventory@1.0.0');
  });

  it('stores business template install summaries', () => {
    const parsed = businessUiTemplateInstallSchema.parse({
      id: 'business-1::acme/restaurant::starter',
      businessId: 'business-1',
      templateId: 'acme/restaurant::starter',
      version: '1.0.1',
      installedByUserId: 'owner-1',
      installedAt: '2026-01-01T00:00:00.000Z',
      mergeStrategy: 'best-effort',
      status: 'active',
      summary: {
        pagesAdded: 2,
        pagesMerged: 1,
        conflictsCount: 0,
        pluginsInstalled: 1,
        pluginsUpdated: 1,
      },
    });

    expect(parsed.summary.pagesAdded).toBe(2);
    expect(parsed.status).toBe('active');
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

  it('stores compile/verify diagnostics snapshots for review gates', () => {
    const parsed = pluginV2DiagnosticsSchema.parse({
      id: 'draft-1@rev-2',
      draftId: 'draft-1',
      revisionId: 'rev-2',
      pluginId: 'acme.inventory',
      environment: 'production',
      status: 'blocking',
      diagnostics: [
        {
          category: 'schema-compile',
          code: 'invalid-field',
          severity: 'error',
          message: 'Invalid field config',
          path: ['schemaDocs', 'inventory', 'fields', '0'],
        },
      ],
      artifactDiff: {
        added: ['inventory'],
        changed: [],
        removed: [],
      },
      hashPreview: {
        manifestHash: 'manifest-hash-2',
        artifactHash: 'artifact-hash-2',
      },
      createdByUserId: 'reviewer-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.status).toBe('blocking');
  });

  it('stores publish review approvals against immutable revisions', () => {
    const parsed = pluginPublishReviewSchema.parse({
      id: 'draft-1@rev-2@production',
      draftId: 'draft-1',
      revisionId: 'rev-2',
      pluginId: 'acme.inventory',
      environment: 'production',
      status: 'approved',
      approvedByUserId: 'owner-1',
      decidedAt: '2026-01-01T00:00:00.000Z',
      note: 'Looks good',
    });

    expect(parsed.status).toBe('approved');
  });

  it('stores user ratings and review text for marketplace plugins', () => {
    const parsed = pluginUserReviewSchema.parse({
      id: 'acme.inventory::owner-1',
      pluginId: 'acme.inventory',
      businessId: 'business-1',
      userId: 'owner-1',
      userLabel: 'Alice',
      rating: 5,
      comment: 'Improved order speed.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.rating).toBe(5);
    expect(parsed.pluginId).toBe('acme.inventory');
  });

  it('stores capability envelopes for action manifest validation', () => {
    const parsed = pluginActionCapabilityEnvelopeSchema.parse({
      id: 'business-1::production',
      businessId: 'business-1',
      environment: 'production',
      runtimeTarget: 'sandbox-worker',
      capabilities: ['db.read', 'db.write'],
      deniedActionIds: ['acme.inventory.delete'],
      updatedByUserId: 'owner-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.runtimeTarget).toBe('sandbox-worker');
  });

  it('stores routes-tabs mappings for runtime navigation parity', () => {
    const parsed = pluginRoutesTabsConfigSchema.parse({
      id: 'draft-1@rev-2',
      draftId: 'draft-1',
      revisionId: 'rev-2',
      pluginId: 'acme.inventory',
      businessSlug: 'acme',
      routes: [
        {
          id: 'tab_inventory',
          schema: 'inventory',
          title: 'Inventory',
          routePath: '/acme/inventory',
          routeSegment: 'inventory',
          order: 0,
        },
      ],
      savedByUserId: 'owner-1',
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(parsed.routes[0]?.routePath).toBe('/acme/inventory');
  });
});
