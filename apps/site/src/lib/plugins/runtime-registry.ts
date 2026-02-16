import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

const releaseKeySeparator = '@';

function toReleaseKey(pluginId: string, version: string) {
  return `${pluginId}${releaseKeySeparator}${version}`;
}

function toBusinessPluginKey(businessId: string, pluginId: string) {
  return `${businessId}::${pluginId}`;
}

function toDraftRevisionKey(draftId: string, revisionId: string) {
  return `${draftId}::${revisionId}`;
}

function toBusinessDraftInstallKey(businessId: string, draftId: string) {
  return `${businessId}::${draftId}`;
}

export class DuplicatePluginReleaseError extends Error {
  constructor(pluginId: string, version: string) {
    super(
      `Plugin release "${pluginId}${releaseKeySeparator}${version}" already exists and is immutable`,
    );
    this.name = 'DuplicatePluginReleaseError';
  }
}

export class MissingPluginReleaseError extends Error {
  constructor(pluginId: string, version: string) {
    super(
      `Plugin release "${pluginId}${releaseKeySeparator}${version}" does not exist`,
    );
    this.name = 'MissingPluginReleaseError';
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

export type InstallReleaseOptions = {
  explicitOwnerUpdate?: boolean;
};

export type ResolvedBusinessInstall = {
  install: BusinessPluginInstallDoc;
  release: PluginReleaseDoc;
};

export type ResolvedBusinessDraftInstall = {
  install: BusinessPluginDraftInstallDoc;
  revision: PluginDraftRevisionDoc;
};

export type PluginRuntimeRegistry = {
  publishRelease: (release: PluginReleaseDoc) => PluginReleaseDoc;
  getRelease: (params: {
    pluginId: string;
    version: string;
  }) => PluginReleaseDoc | undefined;
  listReleases: () => PluginReleaseDoc[];
  installRelease: (
    install: BusinessPluginInstallDoc,
    options?: InstallReleaseOptions,
  ) => BusinessPluginInstallDoc;
  getInstalledReleaseForBusiness: (params: {
    businessId: string;
    pluginId: string;
  }) => BusinessPluginInstallDoc | undefined;
  listInstallsForBusiness: (params: {
    businessId: string;
  }) => BusinessPluginInstallDoc[];
  publishDraftRevision: (
    revision: PluginDraftRevisionDoc,
  ) => PluginDraftRevisionDoc;
  getDraftRevision: (params: {
    draftId: string;
    revisionId: string;
  }) => PluginDraftRevisionDoc | undefined;
  listDraftRevisions: () => PluginDraftRevisionDoc[];
  installDraftRevision: (
    install: BusinessPluginDraftInstallDoc,
  ) => BusinessPluginDraftInstallDoc;
  listDraftInstallsForBusiness: (params: {
    businessId: string;
  }) => BusinessPluginDraftInstallDoc[];
  getResolvedDraftInstallsForBusiness: (params: {
    businessId: string;
    teamId?: string;
  }) => ResolvedBusinessDraftInstall[];
  getResolvedInstalledReleasesForBusiness: (params: {
    businessId: string;
  }) => ResolvedBusinessInstall[];
};

export function createPluginRuntimeRegistry(seed?: {
  releases?: PluginReleaseDoc[];
  installs?: BusinessPluginInstallDoc[];
  draftRevisions?: PluginDraftRevisionDoc[];
  draftInstalls?: BusinessPluginDraftInstallDoc[];
}): PluginRuntimeRegistry {
  const releasesByKey = new Map<string, PluginReleaseDoc>();
  const installsByBusinessPlugin = new Map<string, BusinessPluginInstallDoc>();
  const draftRevisionsByKey = new Map<string, PluginDraftRevisionDoc>();
  const draftInstallsByBusinessDraft = new Map<
    string,
    BusinessPluginDraftInstallDoc
  >();

  for (const release of seed?.releases ?? []) {
    releasesByKey.set(toReleaseKey(release.pluginId, release.version), release);
  }

  for (const install of seed?.installs ?? []) {
    installsByBusinessPlugin.set(
      toBusinessPluginKey(install.businessId, install.pluginId),
      install,
    );
  }

  for (const revision of seed?.draftRevisions ?? []) {
    draftRevisionsByKey.set(
      toDraftRevisionKey(revision.draftId, revision.revisionId),
      revision,
    );
  }

  for (const install of seed?.draftInstalls ?? []) {
    draftInstallsByBusinessDraft.set(
      toBusinessDraftInstallKey(install.businessId, install.draftId),
      install,
    );
  }

  return {
    publishRelease(release) {
      const key = toReleaseKey(release.pluginId, release.version);
      if (releasesByKey.has(key)) {
        throw new DuplicatePluginReleaseError(
          release.pluginId,
          release.version,
        );
      }
      releasesByKey.set(key, release);
      return release;
    },

    getRelease({ pluginId, version }) {
      return releasesByKey.get(toReleaseKey(pluginId, version));
    },

    listReleases() {
      return [...releasesByKey.values()];
    },

    installRelease(install, options) {
      const release = releasesByKey.get(
        toReleaseKey(install.pluginId, install.version),
      );
      if (!release) {
        throw new MissingPluginReleaseError(install.pluginId, install.version);
      }

      const key = toBusinessPluginKey(install.businessId, install.pluginId);
      const currentInstall = installsByBusinessPlugin.get(key);
      if (
        currentInstall &&
        (currentInstall.version !== install.version ||
          currentInstall.manifestHash !== install.manifestHash ||
          currentInstall.artifactHash !== install.artifactHash) &&
        !options?.explicitOwnerUpdate
      ) {
        throw new InstallUpdateRequiresOwnerActionError(
          install.businessId,
          install.pluginId,
        );
      }

      installsByBusinessPlugin.set(key, install);
      return install;
    },

    getInstalledReleaseForBusiness({ businessId, pluginId }) {
      return installsByBusinessPlugin.get(
        toBusinessPluginKey(businessId, pluginId),
      );
    },

    listInstallsForBusiness({ businessId }) {
      return [...installsByBusinessPlugin.values()].filter(
        (install) => install.businessId === businessId,
      );
    },

    publishDraftRevision(revision) {
      draftRevisionsByKey.set(
        toDraftRevisionKey(revision.draftId, revision.revisionId),
        revision,
      );
      return revision;
    },

    getDraftRevision({ draftId, revisionId }) {
      return draftRevisionsByKey.get(toDraftRevisionKey(draftId, revisionId));
    },

    listDraftRevisions() {
      return [...draftRevisionsByKey.values()];
    },

    installDraftRevision(install) {
      draftInstallsByBusinessDraft.set(
        toBusinessDraftInstallKey(install.businessId, install.draftId),
        install,
      );
      return install;
    },

    listDraftInstallsForBusiness({ businessId }) {
      return [...draftInstallsByBusinessDraft.values()].filter(
        (install) => install.businessId === businessId,
      );
    },

    getResolvedDraftInstallsForBusiness({ businessId, teamId }) {
      const installs = [...draftInstallsByBusinessDraft.values()].filter(
        (install) =>
          install.businessId === businessId &&
          install.status === 'active' &&
          (!teamId || install.teamId === teamId),
      );

      const resolved: ResolvedBusinessDraftInstall[] = [];
      for (const install of installs) {
        const revision = draftRevisionsByKey.get(
          toDraftRevisionKey(install.draftId, install.revisionId),
        );
        if (!revision) {
          continue;
        }
        resolved.push({ install, revision });
      }
      return resolved;
    },

    getResolvedInstalledReleasesForBusiness({ businessId }) {
      const installs = [...installsByBusinessPlugin.values()].filter(
        (install) =>
          install.businessId === businessId && install.status === 'active',
      );
      const resolved: ResolvedBusinessInstall[] = [];

      for (const install of installs) {
        const release = releasesByKey.get(
          toReleaseKey(install.pluginId, install.version),
        );
        if (!release) {
          continue;
        }
        resolved.push({ install, release });
      }

      return resolved;
    },
  };
}
