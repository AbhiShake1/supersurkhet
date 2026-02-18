import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { get as ssrGet } from '@/lib/gun/ssr/get';
import { update as ssrUpdate } from '@/lib/gun/ssr/update';
import {
  createInMemoryPluginPlatformStore,
  createPluginPlatformService,
  hashCanonicalJson,
  toReleaseId,
} from '@/lib/plugins/plugin-service';
import {
  getRecommendedSeedReleaseIds,
  MARKETPLACE_SEED_RELEASES,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  SchemaDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';

const pluginDocsInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

const actionManifestInputSchema = z.object({
  actionId: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  runtime: z.enum(['sandbox-worker', 'core']).optional(),
});

const adminTabInputSchema = z.object({
  schema: z.string(),
  title: z.string().optional(),
  group: z.string().optional(),
  icon: z.string().optional(),
});

const releasePublishInputSchema = z.object({
  actorUserId: z.string(),
  pluginId: z.string(),
  version: z.string(),
  docs: pluginDocsInputSchema.optional(),
  actionManifest: z.array(actionManifestInputSchema).default([]),
  schemaDocs: z.array(z.custom<SchemaDoc>()).optional(),
  workflows: z.array(z.custom<WorkflowDoc>()).optional(),
  adminTabs: z.array(adminTabInputSchema).optional(),
});

const releaseHashPreviewInputSchema = z.object({
  pluginId: z.string(),
  version: z.string(),
  docs: pluginDocsInputSchema.optional(),
  actionManifest: z.array(actionManifestInputSchema).default([]),
  schemaDocs: z.array(z.custom<SchemaDoc>()).default([]),
  workflows: z.array(z.custom<WorkflowDoc>()).default([]),
  adminTabs: z.array(adminTabInputSchema).default([]),
});

const releaseInstallInputSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.enum(['owner', 'admin', 'staff']),
  businessId: z.string(),
  pluginId: z.string(),
  version: z.string(),
  requestedCapabilities: z.array(z.string()).optional(),
  explicitOwnerAction: z.boolean().optional(),
});

const draftCreateInputSchema = z.object({
  actorUserId: z.string(),
  pluginId: z.string(),
  title: z.string().optional(),
  collaboratorUserIds: z.array(z.string()).optional(),
});

const draftRevisionCreateInputSchema = z.object({
  actorUserId: z.string(),
  draftId: z.string(),
  schemaDocs: z.array(z.custom<SchemaDoc>()).optional(),
  workflows: z.array(z.custom<WorkflowDoc>()).optional(),
  adminTabs: z.array(z.custom<AdminTabDoc>()).optional(),
});

const draftInstallInputSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.enum(['owner', 'admin', 'staff']),
  businessId: z.string(),
  pluginId: z.string(),
  draftId: z.string(),
  revisionId: z.string(),
  teamId: z.string(),
});

const bootstrapDefaultsInputSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.enum(['owner', 'admin', 'staff']).default('owner'),
  businessId: z.string(),
  businessType: z.string(),
});

const ensureMarketplaceInputSchema = z.object({
  actorUserId: z.string().optional(),
});

async function loadPublishedStore(businessId?: string) {
  const [releases, installs] = await Promise.all([
    ssrGet('pluginRelease'),
    businessId
      ? ssrGet('businessPluginInstall', businessId)
      : Promise.resolve([]),
  ]);

  return createInMemoryPluginPlatformStore({
    releases: releases as PluginReleaseDoc[],
    publishedInstalls: installs as BusinessPluginInstallDoc[],
  });
}

async function loadDraftStore(businessId?: string) {
  const [drafts, revisions, installs] = await Promise.all([
    ssrGet({ key: 'pluginDraft' }),
    ssrGet({ key: 'pluginDraftRevision' }),
    businessId
      ? ssrGet({ key: 'businessPluginDraftInstall' }, businessId)
      : Promise.resolve([]),
  ]);
  return createInMemoryPluginPlatformStore({
    drafts: drafts as PluginDraftDoc[],
    draftRevisions: revisions as PluginDraftRevisionDoc[],
    draftInstalls: installs as BusinessPluginDraftInstallDoc[],
  });
}

async function upsertGlobalRow({
  key,
  id,
  row,
}: {
  key: 'pluginRelease' | 'pluginDraft' | 'pluginDraftRevision';
  id: string;
  row: Record<string, unknown>;
}) {
  const rows = (await ssrGet({ key })) as Array<{ id?: string; _?: { soul?: string } }>;
  const existing = rows.find(
    (entry) => entry.id === id || entry._?.soul?.split('/').pop() === id,
  );
  if (existing) {
    await ssrUpdate(key)({
      id,
      ...row,
    } as never);
    return;
  }
  await ssrCreate(key)({
    id,
    ...row,
  } as never);
}

async function upsertScopedRow({
  key,
  scopeKey,
  id,
  row,
}: {
  key: 'businessPluginInstall' | 'businessPluginDraftInstall';
  scopeKey: string;
  id: string;
  row: Record<string, unknown>;
}) {
  const rows = (await ssrGet({ key }, scopeKey)) as Array<{
    id?: string;
    _?: { soul?: string };
  }>;
  const existing = rows.find(
    (entry) => entry.id === id || entry._?.soul?.split('/').pop() === id,
  );
  if (existing) {
    await ssrUpdate(key, scopeKey)({
      id,
      ...row,
    } as never);
    return;
  }
  await ssrCreate(key, scopeKey)({
    id,
    ...row,
  } as never);
}

export async function publishPluginRelease({ data }: { data: z.infer<typeof releasePublishInputSchema> }) {
  const store = await loadPublishedStore();
  const service = createPluginPlatformService({ store });

  const release = await service.publishRelease({
    actorUserId: data.actorUserId,
    release: {
      pluginId: data.pluginId,
      version: data.version,
      docs: data.docs,
      actionManifest: data.actionManifest,
      schemaDocs: data.schemaDocs,
      workflows: data.workflows,
      adminTabs: data.adminTabs,
    },
  });

  await upsertGlobalRow({
    key: 'pluginRelease',
    id: release.id,
    row: release,
  });

  return release;
}
// export const publishPluginRelease = createServerFn({ method: 'POST' })
//   .inputValidator(releasePublishInputSchema)
//   .handler(async ({ data }) => {
//   });

export const previewPluginReleaseHashes = createServerFn({ method: 'POST' })
  .inputValidator(releaseHashPreviewInputSchema)
  .handler(async ({ data }) => {
    const manifestHash = await hashCanonicalJson({
      data: {
        pluginId: data.pluginId,
        version: data.version,
        docs: data.docs,
        actionManifest: data.actionManifest,
        schemaDocs: data.schemaDocs,
        workflows: data.workflows,
        adminTabs: data.adminTabs,
      }
    });
    const artifactHash = await hashCanonicalJson({
      data: {
        schemaDocs: data.schemaDocs,
        workflows: data.workflows,
        adminTabs: data.adminTabs,
      }
    });

    return {
      manifestHash,
      artifactHash,
    } as const;
  });

export async function installPluginRelease({ data }: { data: z.infer<typeof releaseInstallInputSchema> }) {
  // Ensure marketplace seed releases are available before attempting installation
  await ensureMarketplaceSeedReleases({ data: { actorUserId: data.actorUserId } });

  // Now load the store with the ensured seed releases
  const store = await loadPublishedStore(data.businessId);
  const service = createPluginPlatformService({ store });

  // Verify the release exists before attempting installation
  const releaseId = toReleaseId(data.pluginId, data.version);
  const release = store.getRelease(releaseId);

  if (!release) {
    // Log available releases for debugging
    console.error(`Release ${releaseId} not found after ensuring marketplace seeds.`);
    console.error(`Available releases:`, store.listReleases().map(r => r.id));
    throw new Error(`Release ${releaseId} not found after ensuring marketplace seeds. Available releases: ${store.listReleases().length}`);
  }

  const install = service.installPublishedRelease({
    actorUserId: data.actorUserId,
    actorRole: data.actorRole,
    explicitOwnerAction: data.explicitOwnerAction,
    install: {
      businessId: data.businessId,
      pluginId: data.pluginId,
      version: data.version,
      requestedCapabilities: data.requestedCapabilities,
    },
  });

  await upsertScopedRow({
    key: 'businessPluginInstall',
    scopeKey: data.businessId,
    id: install.id,
    row: install,
  });

  return install;
}

// export const installPluginRelease = createServerFn({ method: 'POST' })
//   .inputValidator(releaseInstallInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function rollbackPluginRelease({ data }: { data: z.infer<typeof releaseInstallInputSchema> }) {
  // Ensure marketplace seed releases are available before attempting rollback
  await ensureMarketplaceSeedReleases({ data: { actorUserId: data.actorUserId } });

  const store = await loadPublishedStore(data.businessId);
  const service = createPluginPlatformService({ store });

  // Verify the release exists before attempting rollback
  const releaseId = toReleaseId(data.pluginId, data.version);
  const release = store.getRelease(releaseId);

  if (!release) {
    // Log available releases for debugging
    console.error(`Release ${releaseId} not found after ensuring marketplace seeds.`);
    console.error(`Available releases:`, store.listReleases().map(r => r.id));
    throw new Error(`Release ${releaseId} not found after ensuring marketplace seeds. Available releases: ${store.listReleases().length}`);
  }

  const install = service.installPublishedRelease({
    actorUserId: data.actorUserId,
    actorRole: data.actorRole,
    explicitOwnerAction: true, // Always true for rollbacks
    install: {
      businessId: data.businessId,
      pluginId: data.pluginId,
      version: data.version,
      requestedCapabilities: data.requestedCapabilities,
    },
  });

  await upsertScopedRow({
    key: 'businessPluginInstall',
    scopeKey: data.businessId,
    id: install.id,
    row: install,
  });

  return install;
}
// export const rollbackPluginRelease = createServerFn({ method: 'POST' })
//   .inputValidator(releaseInstallInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function createPluginDraft({ data }: { data: z.infer<typeof draftCreateInputSchema> }) {
  const store = await loadDraftStore();
  const service = createPluginPlatformService({ store });
  const draft = await service.createDraft({
    actorUserId: data.actorUserId,
    draft: {
      pluginId: data.pluginId,
      title: data.title,
      collaboratorUserIds: data.collaboratorUserIds,
    },
  });

  await upsertGlobalRow({
    key: 'pluginDraft',
    id: draft.draftId,
    row: {
      ...draft,
      id: draft.draftId,
    },
  });

  return draft;
}
// export const createPluginDraft = createServerFn({ method: 'POST' })
//   .inputValidator(draftCreateInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function createPluginDraftRevision({ data }: { data: z.infer<typeof draftRevisionCreateInputSchema> }) {
  const store = await loadDraftStore();
  const service = createPluginPlatformService({ store });
  const revision = await service.createDraftRevision({
    actorUserId: data.actorUserId,
    draftId: data.draftId,
    revision: {
      schemaDocs: data.schemaDocs,
      workflows: data.workflows,
      adminTabs: data.adminTabs,
    },
  });

  await upsertGlobalRow({
    key: 'pluginDraftRevision',
    id: `${revision.draftId}@${revision.revisionId}`,
    row: {
      ...revision,
      id: `${revision.draftId}@${revision.revisionId}`,
    },
  });

  return revision;
}
// export const createPluginDraftRevision = createServerFn({ method: 'POST' })
//   .inputValidator(draftRevisionCreateInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function installPluginDraftRevision({ data }: { data: z.infer<typeof draftInstallInputSchema> }) {
  const store = await loadDraftStore(data.businessId);
  const service = createPluginPlatformService({ store });

  const install = service.installDraftRevision({
    actorUserId: data.actorUserId,
    actorRole: data.actorRole,
    install: {
      businessId: data.businessId,
      pluginId: data.pluginId,
      draftId: data.draftId,
      revisionId: data.revisionId,
      teamId: data.teamId,
    },
  });

  await upsertScopedRow({
    key: 'businessPluginDraftInstall',
    scopeKey: data.businessId,
    id: install.id,
    row: install,
  });

  return install;
}
// export const installPluginDraftRevision = createServerFn({ method: 'POST' })
//   .inputValidator(draftInstallInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function ensureMarketplaceSeedReleases({ data }: { data: z.infer<typeof ensureMarketplaceInputSchema> }) {
  const actorUserId = data.actorUserId ?? 'system-seed';
  const store = await loadPublishedStore();
  const service = createPluginPlatformService({ store });
  const createdReleaseIds: string[] = [];

  for (const seedRelease of MARKETPLACE_SEED_RELEASES) {
    const releaseId = toReleaseId(seedRelease.pluginId, seedRelease.version);
    const existing = store.getRelease(releaseId);
    if (existing) {
      continue;
    }

    const release = await service.publishRelease({
      actorUserId,
      release: {
        pluginId: seedRelease.pluginId,
        version: seedRelease.version,
        docs: seedRelease.docs,
        actionManifest: seedRelease.actionManifest as ActionManifestDoc[],
        adminTabs: seedRelease.adminTabs as AdminTabDoc[],
      },
    });

    await upsertGlobalRow({
      key: 'pluginRelease',
      id: release.id,
      row: release,
    });
    createdReleaseIds.push(release.id);
  }

  return {
    createdReleaseIds,
    seededReleaseCount: MARKETPLACE_SEED_RELEASES.length,
    createdCount: createdReleaseIds.length,
  };
}
//
// export const ensureMarketplaceSeedReleases = createServerFn({ method: 'POST' })
//   .inputValidator(ensureMarketplaceInputSchema)
//   .handler(async ({ data }) => {
//   });

export async function bootstrapDefaultPluginsForBusiness({ data }: { data: z.infer<typeof bootstrapDefaultsInputSchema> }) {
  const actorUserId = data.actorUserId ?? 'system-seed';
  const recommendations = getRecommendedSeedReleaseIds(data.businessType);
  const defaultReleaseId = recommendations[0];
  if (!defaultReleaseId) {
    return { installed: false, reason: 'missing-recommendation' } as const;
  }

  const parsed = parseReleaseId(defaultReleaseId);
  if (!parsed) {
    return { installed: false, reason: 'invalid-release-id' } as const;
  }

  // Ensure marketplace seed releases are available before attempting installation
  await ensureMarketplaceSeedReleases({
    data: { actorUserId },
  });

  // Load the store again to ensure the seed releases are available
  const store = await loadPublishedStore(data.businessId);
  const service = createPluginPlatformService({ store });
  const releaseId = toReleaseId(parsed.pluginId, parsed.version);
  const release = store.getRelease(releaseId);
  if (!release) {
    return {
      installed: false,
      reason: 'recommended-release-unavailable',
      releaseId,
    } as const;
  }

  const install = service.installPublishedRelease({
    actorUserId,
    actorRole: data.actorRole,
    explicitOwnerAction: true,
    install: {
      businessId: data.businessId,
      pluginId: parsed.pluginId,
      version: parsed.version,
      requestedCapabilities: release.actionManifest.flatMap(
        (action) => action.capabilities ?? [],
      ),
    },
  });

  await upsertScopedRow({
    key: 'businessPluginInstall',
    scopeKey: data.businessId,
    id: install.id,
    row: install,
  });

  return {
    installed: true,
    releaseId: release.id,
    installId: install.id,
  } as const;
}

// export const bootstrapDefaultPluginsForBusiness = createServerFn({
//   method: 'POST',
// })
//   .inputValidator(bootstrapDefaultsInputSchema)
//   .handler(async ({ data }) => {
//   });

const releaseUninstallInputSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.enum(['owner', 'admin', 'staff']),
  businessId: z.string(),
  pluginId: z.string(),
});

export async function uninstallPluginRelease({ data }: { data: z.infer<typeof releaseUninstallInputSchema> }) {
  const store = await loadPublishedStore(data.businessId);
  const service = createPluginPlatformService({ store });

  const install = await service.uninstallPublishedRelease({
    actorUserId: data.actorUserId,
    actorRole: data.actorRole,
    businessId: data.businessId,
    pluginId: data.pluginId,
  });

  // Remove the install record from the database
  const { remove } = await import('@/lib/gun/ssr/delete');
  await remove('businessPluginInstall', data.businessId)(install.id);

  return install;
}

// export const uninstallPluginRelease = createServerFn({ method: 'POST' })
//   .inputValidator(releaseUninstallInputSchema)
//   .handler(async ({ data }) => {
//   });
