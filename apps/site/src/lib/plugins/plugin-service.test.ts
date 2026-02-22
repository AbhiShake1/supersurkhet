import { describe, expect, it } from 'vitest';
import {
  AuthorizationError,
  DuplicateReleaseConflictError,
  createInMemoryPluginPlatformStore,
  createPluginPlatformService,
  hashCanonicalJsonValue,
  toPluginRecordNamespacePath,
} from '@/lib/plugins/plugin-service';

function createService() {
  const store = createInMemoryPluginPlatformStore();
  return createPluginPlatformService({ store });
}

describe('plugin platform service', () => {
  it('publishes immutable release with deterministic pluginId@version id', async () => {
    const service = createService();
    const release = await service.publishRelease({
      actorUserId: 'user-1',
      release: {
        pluginId: 'acme.inventory',
        version: '1.0.0',
        actionManifest: [],
      },
    });

    expect(release.id).toBe('acme.inventory@1.0.0');
    expect(release.visibility).toBe('public');
    expect(release.author.userId).toBe('user-1');
  });

  it('rejects duplicate pluginId@version release publish with conflict semantics', async () => {
    const service = createService();
    await service.publishRelease({
      actorUserId: 'user-1',
      release: {
        pluginId: 'acme.inventory',
        version: '1.0.0',
        actionManifest: [],
      },
    });

    await expect(
      service.publishRelease({
        actorUserId: 'user-2',
        release: {
          pluginId: 'acme.inventory',
          version: '1.0.0',
          actionManifest: [],
        },
      }),
    ).rejects.toThrowError(DuplicateReleaseConflictError);
  });

  it('requires owner/admin role for published release install', async () => {
    const service = createService();
    const release = await service.publishRelease({
      actorUserId: 'user-1',
      release: {
        pluginId: 'acme.inventory',
        version: '1.0.0',
        actionManifest: [],
      },
    });

    expect(() =>
      service.installPublishedRelease({
        actorUserId: 'staff-1',
        actorRole: 'staff',
        install: {
          businessId: 'business-1',
          pluginId: release.pluginId,
          version: release.version,
          requestedCapabilities: ['inventory:write'],
        },
      }),
    ).toThrowError(AuthorizationError);
  });

  it('allows draft install for draft team members and owners/admins', async () => {
    const service = createService();
    const draft = await service.createDraft({
      actorUserId: 'owner-1',
      draft: {
        pluginId: 'acme.inventory',
        title: 'Inventory Draft',
        collaboratorUserIds: ['staff-team-1'],
      },
    });
    const revision = await service.createDraftRevision({
      actorUserId: 'owner-1',
      draftId: draft.draftId,
      revision: {
        schemaDocs: [],
        workflows: [],
      },
    });

    const teamInstall = service.installDraftRevision({
      actorUserId: 'staff-team-1',
      actorRole: 'staff',
      install: {
        businessId: 'business-1',
        pluginId: draft.pluginId,
        draftId: draft.draftId,
        revisionId: revision.revisionId,
        teamId: 'team-1',
      },
    });

    expect(teamInstall.status).toBe('active');

    expect(() =>
      service.installDraftRevision({
        actorUserId: 'staff-outsider',
        actorRole: 'staff',
        install: {
          businessId: 'business-1',
          pluginId: draft.pluginId,
          draftId: draft.draftId,
          revisionId: revision.revisionId,
          teamId: 'team-1',
        },
      }),
    ).toThrowError(AuthorizationError);
  });

  it('builds per-plugin runtime namespace path as business/plugin/schema/row', () => {
    expect(
      toPluginRecordNamespacePath({
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        schemaId: 'inventoryItem',
        rowId: 'row-1',
      }),
    ).toBe('business-1/acme.inventory/inventoryItem/row-1');
  });

  it('hashes canonical JSON deterministically across key order differences', async () => {
    const firstHash = await hashCanonicalJsonValue({
      b: 2,
      a: 1,
      nested: { z: true, y: false },
    });
    const secondHash = await hashCanonicalJsonValue({
      nested: { y: false, z: true },
      a: 1,
      b: 2,
    });

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
