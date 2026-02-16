import { describe, expect, it } from 'vitest';
import {
  AuthorizationError,
  DuplicateReleaseConflictError,
  createInMemoryPluginPlatformStore,
  createPluginPlatformService,
  toPluginRecordNamespacePath,
} from '@/lib/plugins/plugin-service';

function createService() {
  const store = createInMemoryPluginPlatformStore();
  return createPluginPlatformService({ store });
}

describe('plugin platform service', () => {
  it('publishes immutable release with deterministic pluginId@version id', () => {
    const service = createService();
    const release = service.publishRelease({
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

  it('rejects duplicate pluginId@version release publish with conflict semantics', () => {
    const service = createService();
    service.publishRelease({
      actorUserId: 'user-1',
      release: {
        pluginId: 'acme.inventory',
        version: '1.0.0',
        actionManifest: [],
      },
    });

    expect(() =>
      service.publishRelease({
        actorUserId: 'user-2',
        release: {
          pluginId: 'acme.inventory',
          version: '1.0.0',
          actionManifest: [],
        },
      }),
    ).toThrowError(DuplicateReleaseConflictError);
  });

  it('requires owner/admin role for published release install', () => {
    const service = createService();
    const release = service.publishRelease({
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

  it('allows draft install for draft team members and owners/admins', () => {
    const service = createService();
    const draft = service.createDraft({
      actorUserId: 'owner-1',
      draft: {
        pluginId: 'acme.inventory',
        title: 'Inventory Draft',
        collaboratorUserIds: ['staff-team-1'],
      },
    });
    const revision = service.createDraftRevision({
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
});
