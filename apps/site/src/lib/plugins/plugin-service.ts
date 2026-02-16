import type {
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  JsonValue,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  SchemaDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import { createServerFn } from '@tanstack/react-start';
import z from 'zod';

export function toReleaseId(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

export function toPublishedInstallId(businessId: string, pluginId: string) {
  return `${businessId}::${pluginId}`;
}

export function toDraftInstallId(businessId: string, draftId: string) {
  return `${businessId}::${draftId}`;
}

export function toPluginRecordNamespacePath({
  businessId,
  pluginId,
  schemaId,
  rowId,
}: {
  businessId: string;
  pluginId: string;
  schemaId: string;
  rowId: string;
}) {
  return `${businessId}/${pluginId}/${schemaId}/${rowId}`;
}

export class DuplicateReleaseConflictError extends Error {
  readonly statusCode = 409;

  constructor(releaseId: string) {
    super(`Plugin release "${releaseId}" already exists and is immutable`);
    this.name = 'DuplicateReleaseConflictError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class MissingReleaseError extends Error {
  constructor(releaseId: string) {
    super(`Plugin release "${releaseId}" does not exist`);
    this.name = 'MissingReleaseError';
  }
}

export class MissingDraftError extends Error {
  constructor(draftId: string) {
    super(`Plugin draft "${draftId}" does not exist`);
    this.name = 'MissingDraftError';
  }
}

export class MissingDraftRevisionError extends Error {
  constructor(draftId: string, revisionId: string) {
    super(`Plugin draft revision "${draftId}@${revisionId}" does not exist`);
    this.name = 'MissingDraftRevisionError';
  }
}

export class InstallUpdateRequiresOwnerActionError extends Error {
  constructor(businessId: string, pluginId: string) {
    super(
      `Business "${businessId}" already has "${pluginId}" installed; updating pin requires explicit owner action`,
    );
    this.name = 'InstallUpdateRequiresOwnerActionError';
  }
}

type ActorRole = 'owner' | 'admin' | 'staff';

type ReleaseSeed = Omit<
  PluginReleaseDoc,
  'id' | 'manifestHash' | 'artifactHash' | 'author' | 'visibility'
> &
  Partial<
    Pick<
      PluginReleaseDoc,
      'id' | 'manifestHash' | 'artifactHash' | 'author' | 'visibility'
    >
  >;

type DraftRevisionSeed = Pick<
  PluginDraftRevisionDoc,
  'schemaDocs' | 'workflows' | 'adminTabs'
> &
  Partial<Pick<PluginDraftRevisionDoc, 'revisionId'>>;

export type PluginPlatformStore = {
  getRelease: (releaseId: string) => PluginReleaseDoc | undefined;
  listReleases: () => PluginReleaseDoc[];
  putRelease: (release: PluginReleaseDoc) => void;
  getPublishedInstall: (
    businessId: string,
    pluginId: string,
  ) => BusinessPluginInstallDoc | undefined;
  listPublishedInstalls: (businessId: string) => BusinessPluginInstallDoc[];
  putPublishedInstall: (install: BusinessPluginInstallDoc) => void;
  removePublishedInstall: (businessId: string, pluginId: string) => void;
  getDraft: (draftId: string) => PluginDraftDoc | undefined;
  listDrafts: () => PluginDraftDoc[];
  putDraft: (draft: PluginDraftDoc) => void;
  getDraftRevision: (
    draftId: string,
    revisionId: string,
  ) => PluginDraftRevisionDoc | undefined;
  listDraftRevisions: (draftId: string) => PluginDraftRevisionDoc[];
  putDraftRevision: (revision: PluginDraftRevisionDoc) => void;
  getDraftInstall: (
    businessId: string,
    draftId: string,
  ) => BusinessPluginDraftInstallDoc | undefined;
  listDraftInstalls: (businessId: string) => BusinessPluginDraftInstallDoc[];
  putDraftInstall: (install: BusinessPluginDraftInstallDoc) => void;
};

export function createInMemoryPluginPlatformStore(
  seed?: {
    releases?: PluginReleaseDoc[];
    publishedInstalls?: BusinessPluginInstallDoc[];
    drafts?: PluginDraftDoc[];
    draftRevisions?: PluginDraftRevisionDoc[];
    draftInstalls?: BusinessPluginDraftInstallDoc[];
  },
): PluginPlatformStore {
  const releasesById = new Map<string, PluginReleaseDoc>();
  const publishedInstallsByKey = new Map<string, BusinessPluginInstallDoc>();
  const draftsById = new Map<string, PluginDraftDoc>();
  const draftRevisionsByKey = new Map<string, PluginDraftRevisionDoc>();
  const draftInstallsByKey = new Map<string, BusinessPluginDraftInstallDoc>();

  for (const release of seed?.releases ?? []) {
    releasesById.set(release.id, release);
  }
  for (const install of seed?.publishedInstalls ?? []) {
    publishedInstallsByKey.set(
      toPublishedInstallId(install.businessId, install.pluginId),
      install,
    );
  }
  for (const draft of seed?.drafts ?? []) {
    draftsById.set(draft.draftId, draft);
  }
  for (const revision of seed?.draftRevisions ?? []) {
    draftRevisionsByKey.set(`${revision.draftId}::${revision.revisionId}`, revision);
  }
  for (const install of seed?.draftInstalls ?? []) {
    draftInstallsByKey.set(
      toDraftInstallId(install.businessId, install.draftId),
      install,
    );
  }

  return {
    getRelease(releaseId) {
      return releasesById.get(releaseId);
    },
    listReleases() {
      return [...releasesById.values()];
    },
    putRelease(release) {
      releasesById.set(release.id, release);
    },
    getPublishedInstall(businessId, pluginId) {
      return publishedInstallsByKey.get(
        toPublishedInstallId(businessId, pluginId),
      );
    },
    listPublishedInstalls(businessId) {
      return [...publishedInstallsByKey.values()].filter(
        (install) => install.businessId === businessId,
      );
    },
    putPublishedInstall(install) {
      publishedInstallsByKey.set(
        toPublishedInstallId(install.businessId, install.pluginId),
        install,
      );
    },
    removePublishedInstall(businessId, pluginId) {
      const installId = toPublishedInstallId(businessId, pluginId);
      publishedInstallsByKey.delete(installId);
    },
    getDraft(draftId) {
      return draftsById.get(draftId);
    },
    listDrafts() {
      return [...draftsById.values()];
    },
    putDraft(draft) {
      draftsById.set(draft.draftId, draft);
    },
    getDraftRevision(draftId, revisionId) {
      return draftRevisionsByKey.get(`${draftId}::${revisionId}`);
    },
    listDraftRevisions(draftId) {
      return [...draftRevisionsByKey.values()].filter(
        (revision) => revision.draftId === draftId,
      );
    },
    putDraftRevision(revision) {
      draftRevisionsByKey.set(
        `${revision.draftId}::${revision.revisionId}`,
        revision,
      );
    },
    getDraftInstall(businessId, draftId) {
      return draftInstallsByKey.get(toDraftInstallId(businessId, draftId));
    },
    listDraftInstalls(businessId) {
      return [...draftInstallsByKey.values()].filter(
        (install) => install.businessId === businessId,
      );
    },
    putDraftInstall(install) {
      draftInstallsByKey.set(
        toDraftInstallId(install.businessId, install.draftId),
        install,
      );
    },
  };
}

function normalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, normalizeJson(entry)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
  }
  throw new Error('Non-serializable value detected while canonicalizing JSON');
}

export function canonicalizeJson(value: unknown) {
  return JSON.stringify(normalizeJson(value));
}

export const hashCanonicalJson = createServerFn({ method: 'POST' })
  .inputValidator(z.unknown())
  .handler(async ({ data: value }) => {
    const { createHash } = await import('crypto')
    return createHash('sha256').update(canonicalizeJson(value)).digest('hex');
  });

function assertCanInstallPublishedRelease(actorRole: ActorRole) {
  if (actorRole === 'owner' || actorRole === 'admin') {
    return;
  }
  throw new AuthorizationError(
    'Business owner/admin role is required for release install/update/rollback',
  );
}

function assertCanInstallDraft({
  actorRole,
  actorUserId,
  draft,
}: {
  actorRole: ActorRole;
  actorUserId: string;
  draft: PluginDraftDoc;
}) {
  if (actorRole === 'owner' || actorRole === 'admin') {
    return;
  }
  if (draft.collaboratorUserIds?.includes(actorUserId)) {
    return;
  }
  throw new AuthorizationError(
    'Draft install requires owner/admin role or membership in the draft team',
  );
}

function toManifestPayload({
  pluginId,
  version,
  docs,
  actionManifest,
  schemaDocs,
  workflows,
  adminTabs,
}: Pick<
  PluginReleaseDoc,
  | 'pluginId'
  | 'version'
  | 'docs'
  | 'actionManifest'
  | 'schemaDocs'
  | 'workflows'
  | 'adminTabs'
>) {
  return {
    pluginId,
    version,
    docs,
    actionManifest,
    schemaDocs,
    workflows,
    adminTabs,
  };
}

function toArtifactPayload({
  schemaDocs,
  workflows,
  adminTabs,
}: {
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
}) {
  return {
    schemaDocs: schemaDocs ?? [],
    workflows: workflows ?? [],
    adminTabs: adminTabs ?? [],
  };
}

export function createPluginPlatformService({
  store,
}: {
  store: PluginPlatformStore;
}) {
  return {
    async publishRelease({
      actorUserId,
      release,
    }: {
      actorUserId: string;
      release: ReleaseSeed;
    }) {
      const releaseId = toReleaseId(release.pluginId, release.version);
      if (store.getRelease(releaseId)) {
        throw new DuplicateReleaseConflictError(releaseId);
      }

      const manifestHash = await hashCanonicalJson({
        data:
          toManifestPayload({
            pluginId: release.pluginId,
            version: release.version,
            docs: release.docs,
            actionManifest: release.actionManifest ?? [],
            schemaDocs: release.schemaDocs,
            workflows: release.workflows,
            adminTabs: release.adminTabs,
          }),
      });
      const artifactHash = await hashCanonicalJson({
        data: toArtifactPayload({
          schemaDocs: release.schemaDocs,
          workflows: release.workflows,
          adminTabs: release.adminTabs,
        }),
      });
      const now = new Date().toISOString();

      const created: PluginReleaseDoc = {
        id: releaseId,
        pluginId: release.pluginId,
        version: release.version,
        manifestHash,
        artifactHash,
        docs: release.docs,
        actionManifest: release.actionManifest ?? [],
        schemaDocs: release.schemaDocs,
        workflows: release.workflows,
        adminTabs: release.adminTabs,
        publishedAt: release.publishedAt ?? now,
        visibility: 'public',
        author: {
          userId: actorUserId,
          name: release.author?.name,
        },
      };

      store.putRelease(created);
      return created;
    },

    installPublishedRelease({
      actorUserId,
      actorRole,
      install,
      explicitOwnerAction = false,
    }: {
      actorUserId: string;
      actorRole: ActorRole;
      explicitOwnerAction?: boolean;
      install: Pick<
        BusinessPluginInstallDoc,
        'businessId' | 'pluginId' | 'version' | 'requestedCapabilities'
      >;
    }) {
      assertCanInstallPublishedRelease(actorRole);
      const releaseId = toReleaseId(install.pluginId, install.version);
      const release = store.getRelease(releaseId);
      if (!release) {
        throw new MissingReleaseError(releaseId);
      }

      const existing = store.getPublishedInstall(
        install.businessId,
        install.pluginId,
      );
      if (
        existing &&
        (existing.version !== release.version ||
          existing.manifestHash !== release.manifestHash ||
          existing.artifactHash !== release.artifactHash) &&
        !explicitOwnerAction
      ) {
        throw new InstallUpdateRequiresOwnerActionError(
          install.businessId,
          install.pluginId,
        );
      }

      const now = new Date().toISOString();
      const created: BusinessPluginInstallDoc = {
        id: toPublishedInstallId(install.businessId, install.pluginId),
        businessId: install.businessId,
        pluginId: install.pluginId,
        version: install.version,
        manifestHash: release.manifestHash,
        artifactHash: release.artifactHash,
        installedAt: now,
        installedByUserId: actorUserId,
        status: 'active',
        requestedCapabilities: install.requestedCapabilities,
      };
      store.putPublishedInstall(created);
      return created;
    },

    async createDraft({
      actorUserId,
      draft,
    }: {
      actorUserId: string;
      draft: Pick<PluginDraftDoc, 'pluginId' | 'title' | 'collaboratorUserIds'> &
      Partial<Pick<PluginDraftDoc, 'draftId' | 'status'>>;
    }) {
      const now = new Date().toISOString();
      const created: PluginDraftDoc = {
        draftId: draft.draftId ?? await (async () => {
          const { randomUUID } = await import('crypto')
          return randomUUID();
        })(),
        pluginId: draft.pluginId,
        ownerUserId: actorUserId,
        collaboratorUserIds: draft.collaboratorUserIds ?? [],
        status: draft.status ?? 'active',
        title: draft.title,
        createdAt: now,
        updatedAt: now,
      };
      store.putDraft(created);
      return created;
    },

    async createDraftRevision({
      actorUserId,
      draftId,
      revision,
    }: {
      actorUserId: string;
      draftId: string;
      revision: DraftRevisionSeed;
    }) {
      const draft = store.getDraft(draftId);
      if (!draft) {
        throw new MissingDraftError(draftId);
      }

      const canEditDraft =
        draft.ownerUserId === actorUserId ||
        draft.collaboratorUserIds?.includes(actorUserId);
      if (!canEditDraft) {
        throw new AuthorizationError(
          'Draft revisions can only be created by draft owner/collaborators',
        );
      }

      const now = new Date().toISOString();
      const revisionManifest = toManifestPayload({
        pluginId: draft.pluginId,
        version: draft.draftId,
        docs: {
          title: draft.title,
        },
        actionManifest: [],
        schemaDocs: revision.schemaDocs,
        workflows: revision.workflows,
        adminTabs: revision.adminTabs,
      });
      const created: PluginDraftRevisionDoc = {
        revisionId:
          revision.revisionId ??
          `${Date.now().toString(36)}-${(await hashCanonicalJson({ data: revisionManifest })).slice(0, 8)}`,
        draftId,
        pluginId: draft.pluginId,
        manifestHash: await hashCanonicalJson({ data: revisionManifest }),
        artifactHash: await hashCanonicalJson({
          data: toArtifactPayload({
            schemaDocs: revision.schemaDocs,
            workflows: revision.workflows,
            adminTabs: revision.adminTabs,
          }),
        }),
        schemaDocs: revision.schemaDocs,
        workflows: revision.workflows,
        adminTabs: revision.adminTabs,
        createdAt: now,
        createdByUserId: actorUserId,
      };

      store.putDraftRevision(created);
      return created;
    },

    installDraftRevision({
      actorUserId,
      actorRole,
      install,
    }: {
      actorUserId: string;
      actorRole: ActorRole;
      install: Pick<
        BusinessPluginDraftInstallDoc,
        'businessId' | 'pluginId' | 'draftId' | 'revisionId' | 'teamId'
      >;
    }) {
      const draft = store.getDraft(install.draftId);
      if (!draft) {
        throw new MissingDraftError(install.draftId);
      }
      assertCanInstallDraft({ actorRole, actorUserId, draft });

      const revision = store.getDraftRevision(
        install.draftId,
        install.revisionId,
      );
      if (!revision) {
        throw new MissingDraftRevisionError(
          install.draftId,
          install.revisionId,
        );
      }

      const created: BusinessPluginDraftInstallDoc = {
        id: toDraftInstallId(install.businessId, install.draftId),
        businessId: install.businessId,
        pluginId: install.pluginId,
        draftId: install.draftId,
        revisionId: install.revisionId,
        teamId: install.teamId,
        manifestHash: revision.manifestHash,
        artifactHash: revision.artifactHash,
        installedAt: new Date().toISOString(),
        installedByUserId: actorUserId,
        status: 'active',
      };
      store.putDraftInstall(created);
      return created;
    },

    listMarketplaceReleases() {
      return store.listReleases().filter((release) => release.visibility === 'public');
    },

    listBusinessPublishedInstalls(businessId: string) {
      return store.listPublishedInstalls(businessId);
    },

    listBusinessDraftInstalls(businessId: string) {
      return store.listDraftInstalls(businessId);
    },

    listDrafts() {
      return store.listDrafts();
    },

    listDraftRevisions(draftId: string) {
      return store.listDraftRevisions(draftId);
    },

    async uninstallPublishedRelease({
      actorUserId,
      actorRole,
      businessId,
      pluginId,
    }: {
      actorUserId: string;
      actorRole: ActorRole;
      businessId: string;
      pluginId: string;
    }) {
      assertCanInstallPublishedRelease(actorRole);
      
      const existing = store.getPublishedInstall(businessId, pluginId);
      
      if (!existing) {
        throw new Error(`Plugin "${pluginId}" is not installed for business "${businessId}"`);
      }

      // Remove the install from the store
      store.removePublishedInstall(businessId, pluginId);
      
      return existing;
    },
  };
}
