import { describe, expect, it } from 'vitest';
import {
  createPluginRuntimeRegistry,
  DuplicatePluginReleaseError,
  InstallUpdateRequiresOwnerActionError,
} from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

function release(overrides: Partial<PluginReleaseDoc> = {}): PluginReleaseDoc {
  const pluginId = overrides.pluginId ?? 'acme.plugin';
  const version = overrides.version ?? '1.0.0';
  return {
    id: `${pluginId}@${version}`,
    pluginId,
    version,
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    author: {
      userId: 'owner-1',
    },
    visibility: 'public',
    docs: {
      title: 'Acme Plugin',
    },
    actionManifest: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function install(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.plugin',
    businessId: 'business-1',
    pluginId: 'acme.plugin',
    version: '1.0.0',
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

describe('plugin runtime registry', () => {
  it('rejects duplicate publish of identical pluginId@version', () => {
    const registry = createPluginRuntimeRegistry();
    registry.publishRelease(release());

    expect(() => {
      registry.publishRelease(release());
    }).toThrowError(DuplicatePluginReleaseError);
  });

  it('keeps business install pinned until explicit owner update', () => {
    const registry = createPluginRuntimeRegistry();
    registry.publishRelease(release());
    registry.publishRelease(
      release({
        version: '1.1.0',
        manifestHash: 'manifest-hash-2',
        artifactHash: 'artifact-hash-2',
      }),
    );

    registry.installRelease(install(), { explicitOwnerUpdate: true });

    expect(() => {
      registry.installRelease(
        install({
          version: '1.1.0',
          manifestHash: 'manifest-hash-2',
          artifactHash: 'artifact-hash-2',
        }),
      );
    }).toThrowError(InstallUpdateRequiresOwnerActionError);

    registry.installRelease(
      install({
        version: '1.1.0',
        manifestHash: 'manifest-hash-2',
        artifactHash: 'artifact-hash-2',
      }),
      { explicitOwnerUpdate: true },
    );

    const currentInstall = registry.getInstalledReleaseForBusiness({
      businessId: 'business-1',
      pluginId: 'acme.plugin',
    });
    expect(currentInstall?.version).toBe('1.1.0');
  });

  it('resolves team-scoped draft installs to exact draft revision pins', () => {
    const registry = createPluginRuntimeRegistry({
      draftRevisions: [
        {
          revisionId: 'rev-1',
          draftId: 'draft-1',
          pluginId: 'acme.plugin',
          manifestHash: 'draft-manifest-hash',
          artifactHash: 'draft-artifact-hash',
          createdAt: '2026-01-01T00:00:00.000Z',
          createdByUserId: 'owner-1',
          workflows: [],
        } satisfies PluginDraftRevisionDoc,
      ],
      draftInstalls: [
        {
          id: 'business-1::draft-1',
          businessId: 'business-1',
          pluginId: 'acme.plugin',
          draftId: 'draft-1',
          revisionId: 'rev-1',
          teamId: 'team-a',
          manifestHash: 'draft-manifest-hash',
          artifactHash: 'draft-artifact-hash',
          installedAt: '2026-01-01T00:00:00.000Z',
          installedByUserId: 'owner-1',
          status: 'active',
        } satisfies BusinessPluginDraftInstallDoc,
      ],
    });

    const teamResolved = registry.getResolvedDraftInstallsForBusiness({
      businessId: 'business-1',
      teamId: 'team-a',
    });
    const otherTeamResolved = registry.getResolvedDraftInstallsForBusiness({
      businessId: 'business-1',
      teamId: 'team-b',
    });

    expect(teamResolved).toHaveLength(1);
    expect(teamResolved[0]?.revision.revisionId).toBe('rev-1');
    expect(otherTeamResolved).toHaveLength(0);
  });
});
