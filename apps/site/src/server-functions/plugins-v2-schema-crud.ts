import { z } from 'zod';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { remove as ssrRemove } from '@/lib/gun/ssr/delete';
import { get as ssrGet } from '@/lib/gun/ssr/get';
import { update as ssrUpdate } from '@/lib/gun/ssr/update';
import { toPluginRecordNamespacePath } from '@/lib/plugins/plugin-service';
import {
  createPluginRuntimeRegistry,
  type PluginRuntimeRegistry,
} from '@/lib/plugins/runtime-registry';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  JsonValue,
  PluginDraftRevisionDoc,
  PluginRecordDoc,
  PluginReleaseDoc,
  SchemaDoc,
} from '@/lib/plugins/types';

type RuntimeSourcePreference = 'auto' | 'release' | 'draft';
type RuntimeSource = Exclude<RuntimeSourcePreference, 'auto'>;

export type PluginSchemaHashPin = {
  manifestHash?: string;
  artifactHash?: string;
};

export type PluginSchemaContext = {
  mode: RuntimeSource;
  businessId: string;
  pluginId: string;
  schemaId: string;
  manifestHash: string;
  artifactHash: string;
  version?: string;
  draftId?: string;
  revisionId?: string;
  teamId?: string;
};

export type PluginSchemaValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export class PluginSchemaInstallNotFoundError extends Error {
  constructor(params: {
    businessId: string;
    pluginId: string;
    source: RuntimeSourcePreference;
    teamId?: string;
  }) {
    super(
      `No active ${params.source === 'auto' ? 'release/draft' : params.source} install found for "${params.pluginId}" in business "${params.businessId}"${params.teamId ? ` (team "${params.teamId}")` : ''}`,
    );
    this.name = 'PluginSchemaInstallNotFoundError';
  }
}

export class PluginSchemaNotFoundError extends Error {
  constructor(params: { pluginId: string; schemaId: string }) {
    super(
      `Schema "${params.schemaId}" is not installed for plugin "${params.pluginId}"`,
    );
    this.name = 'PluginSchemaNotFoundError';
  }
}

export class PluginSchemaHashMismatchError extends Error {
  expected: PluginSchemaHashPin;
  actual: { manifestHash: string; artifactHash: string };

  constructor(params: {
    expected: PluginSchemaHashPin;
    actual: { manifestHash: string; artifactHash: string };
  }) {
    super('Plugin schema hash pin mismatch');
    this.name = 'PluginSchemaHashMismatchError';
    this.expected = params.expected;
    this.actual = params.actual;
  }
}

export class PluginSchemaPayloadValidationError extends Error {
  issues: PluginSchemaValidationIssue[];

  constructor(issues: PluginSchemaValidationIssue[]) {
    super('Plugin payload failed schema validation');
    this.name = 'PluginSchemaPayloadValidationError';
    this.issues = issues;
  }
}

export class PluginSchemaRecordNotFoundError extends Error {
  constructor(params: {
    businessId: string;
    pluginId: string;
    schemaId: string;
    rowId: string;
  }) {
    super(
      `Plugin record not found: ${params.businessId}/${params.pluginId}/${params.schemaId}/${params.rowId}`,
    );
    this.name = 'PluginSchemaRecordNotFoundError';
  }
}

export class PluginSchemaRecordAlreadyExistsError extends Error {
  constructor(params: {
    businessId: string;
    pluginId: string;
    schemaId: string;
    rowId: string;
  }) {
    super(
      `Plugin record already exists: ${params.businessId}/${params.pluginId}/${params.schemaId}/${params.rowId}`,
    );
    this.name = 'PluginSchemaRecordAlreadyExistsError';
  }
}

type PluginSchemaScope = {
  businessId: string;
  pluginId: string;
  schemaId: string;
  rowId?: string;
};

export type PluginSchemaRecordStore = {
  listByScope: (scope: PluginSchemaScope) => Promise<PluginRecordDoc[]>;
  getByScope: (
    scope: PluginSchemaScope & { rowId: string },
  ) => Promise<PluginRecordDoc | undefined>;
  create: (record: PluginRecordDoc) => Promise<PluginRecordDoc>;
  update: (record: PluginRecordDoc) => Promise<PluginRecordDoc>;
  removeByScope: (
    scope: PluginSchemaScope & { rowId: string },
  ) => Promise<{ deleted: true; id: string }>;
};

function isInScope(record: PluginRecordDoc, scope: PluginSchemaScope) {
  return (
    record.businessId === scope.businessId &&
    record.pluginId === scope.pluginId &&
    record.schemaId === scope.schemaId &&
    (!scope.rowId || record.rowId === scope.rowId)
  );
}

export function createInMemoryPluginSchemaRecordStore(seed?: {
  records?: PluginRecordDoc[];
}): PluginSchemaRecordStore {
  const recordsById = new Map<string, PluginRecordDoc>();
  for (const record of seed?.records ?? []) {
    recordsById.set(record.id, record);
  }

  return {
    async listByScope(scope) {
      return [...recordsById.values()].filter((record) =>
        isInScope(record, scope),
      );
    },
    async getByScope(scope) {
      const id = toPluginRecordNamespacePath(scope);
      return recordsById.get(id);
    },
    async create(record) {
      recordsById.set(record.id, record);
      return record;
    },
    async update(record) {
      recordsById.set(record.id, record);
      return record;
    },
    async removeByScope(scope) {
      const id = toPluginRecordNamespacePath(scope);
      recordsById.delete(id);
      return { deleted: true, id };
    },
  };
}

function verifyHashPin(
  context: PluginSchemaContext,
  hashPin: PluginSchemaHashPin | undefined,
) {
  if (!hashPin) {
    return;
  }
  const manifestMatches =
    !hashPin.manifestHash || hashPin.manifestHash === context.manifestHash;
  const artifactMatches =
    !hashPin.artifactHash || hashPin.artifactHash === context.artifactHash;
  if (manifestMatches && artifactMatches) {
    return;
  }
  throw new PluginSchemaHashMismatchError({
    expected: hashPin,
    actual: {
      manifestHash: context.manifestHash,
      artifactHash: context.artifactHash,
    },
  });
}

function validatePayload(schemaDoc: SchemaDoc, payload: unknown) {
  const compiled = compileSchemaDoc(schemaDoc);
  const parsed = compiled.safeParse(payload);
  if (parsed.success) {
    return parsed.data as JsonValue;
  }
  throw new PluginSchemaPayloadValidationError(
    parsed.error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map((segment) => String(segment)).join('.'),
      message: issue.message,
    })),
  );
}

function resolveInstalledSchemaContext({
  registry,
  businessId,
  pluginId,
  schemaId,
  source = 'auto',
  teamId,
}: {
  registry: PluginRuntimeRegistry;
  businessId: string;
  pluginId: string;
  schemaId: string;
  source?: RuntimeSourcePreference;
  teamId?: string;
}) {
  const resolvedDrafts = registry
    .getResolvedDraftInstallsForBusiness({ businessId, teamId })
    .filter((entry) => entry.install.pluginId === pluginId);
  const resolvedReleases = registry
    .getResolvedInstalledReleasesForBusiness({ businessId })
    .filter((entry) => entry.install.pluginId === pluginId);

  const pickDraft = () => resolvedDrafts[0];
  const pickRelease = () => resolvedReleases[0];

  if (source === 'draft') {
    const resolved = pickDraft();
    if (!resolved) {
      throw new PluginSchemaInstallNotFoundError({
        businessId,
        pluginId,
        source,
        teamId,
      });
    }
    const schemaDoc = resolved.revision.schemaDocs?.find(
      (doc) => doc.schemaId === schemaId,
    );
    if (!schemaDoc) {
      throw new PluginSchemaNotFoundError({ pluginId, schemaId });
    }
    return {
      schemaDoc,
      context: {
        mode: 'draft' as const,
        businessId,
        pluginId,
        schemaId,
        manifestHash: resolved.install.manifestHash,
        artifactHash: resolved.install.artifactHash,
        draftId: resolved.install.draftId,
        revisionId: resolved.install.revisionId,
        teamId: resolved.install.teamId,
      },
    };
  }

  if (source === 'release') {
    const resolved = pickRelease();
    if (!resolved) {
      throw new PluginSchemaInstallNotFoundError({
        businessId,
        pluginId,
        source,
      });
    }
    const schemaDoc = resolved.release.schemaDocs?.find(
      (doc) => doc.schemaId === schemaId,
    );
    if (!schemaDoc) {
      throw new PluginSchemaNotFoundError({ pluginId, schemaId });
    }
    return {
      schemaDoc,
      context: {
        mode: 'release' as const,
        businessId,
        pluginId,
        schemaId,
        manifestHash: resolved.install.manifestHash,
        artifactHash: resolved.install.artifactHash,
        version: resolved.install.version,
      },
    };
  }

  const autoDraft = pickDraft();
  if (autoDraft) {
    const schemaDoc = autoDraft.revision.schemaDocs?.find(
      (doc) => doc.schemaId === schemaId,
    );
    if (!schemaDoc) {
      throw new PluginSchemaNotFoundError({ pluginId, schemaId });
    }
    return {
      schemaDoc,
      context: {
        mode: 'draft' as const,
        businessId,
        pluginId,
        schemaId,
        manifestHash: autoDraft.install.manifestHash,
        artifactHash: autoDraft.install.artifactHash,
        draftId: autoDraft.install.draftId,
        revisionId: autoDraft.install.revisionId,
        teamId: autoDraft.install.teamId,
      },
    };
  }

  const autoRelease = pickRelease();
  if (autoRelease) {
    const schemaDoc = autoRelease.release.schemaDocs?.find(
      (doc) => doc.schemaId === schemaId,
    );
    if (!schemaDoc) {
      throw new PluginSchemaNotFoundError({ pluginId, schemaId });
    }
    return {
      schemaDoc,
      context: {
        mode: 'release' as const,
        businessId,
        pluginId,
        schemaId,
        manifestHash: autoRelease.install.manifestHash,
        artifactHash: autoRelease.install.artifactHash,
        version: autoRelease.install.version,
      },
    };
  }

  throw new PluginSchemaInstallNotFoundError({
    businessId,
    pluginId,
    source,
    teamId,
  });
}

export function createPluginsV2SchemaCrudService({
  registry,
  store,
}: {
  registry: PluginRuntimeRegistry;
  store: PluginSchemaRecordStore;
}) {
  return {
    async create(input: {
      businessId: string;
      pluginId: string;
      schemaId: string;
      rowId: string;
      payload: unknown;
      source?: RuntimeSourcePreference;
      teamId?: string;
      hashPin?: PluginSchemaHashPin;
    }) {
      const { schemaDoc, context } = resolveInstalledSchemaContext({
        registry,
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        source: input.source,
        teamId: input.teamId,
      });
      verifyHashPin(context, input.hashPin);

      const existing = await store.getByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
      });
      if (existing) {
        throw new PluginSchemaRecordAlreadyExistsError({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        });
      }

      const now = new Date().toISOString();
      const record: PluginRecordDoc = {
        id: toPluginRecordNamespacePath({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        }),
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
        namespacePath: toPluginRecordNamespacePath({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        }),
        payload: validatePayload(schemaDoc, input.payload),
        createdAt: now,
        updatedAt: now,
      };

      return {
        context,
        record: await store.create(record),
      };
    },

    async read(input: {
      businessId: string;
      pluginId: string;
      schemaId: string;
      rowId: string;
      source?: RuntimeSourcePreference;
      teamId?: string;
      hashPin?: PluginSchemaHashPin;
    }) {
      const { context } = resolveInstalledSchemaContext({
        registry,
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        source: input.source,
        teamId: input.teamId,
      });
      verifyHashPin(context, input.hashPin);

      const record = await store.getByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
      });
      if (!record) {
        throw new PluginSchemaRecordNotFoundError({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        });
      }

      return { context, record };
    },

    async list(input: {
      businessId: string;
      pluginId: string;
      schemaId: string;
      source?: RuntimeSourcePreference;
      teamId?: string;
      hashPin?: PluginSchemaHashPin;
    }) {
      const { context } = resolveInstalledSchemaContext({
        registry,
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        source: input.source,
        teamId: input.teamId,
      });
      verifyHashPin(context, input.hashPin);
      const records = await store.listByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
      });

      return { context, records };
    },

    async update(input: {
      businessId: string;
      pluginId: string;
      schemaId: string;
      rowId: string;
      payload: unknown;
      source?: RuntimeSourcePreference;
      teamId?: string;
      hashPin?: PluginSchemaHashPin;
    }) {
      const { schemaDoc, context } = resolveInstalledSchemaContext({
        registry,
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        source: input.source,
        teamId: input.teamId,
      });
      verifyHashPin(context, input.hashPin);

      const existing = await store.getByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
      });
      if (!existing) {
        throw new PluginSchemaRecordNotFoundError({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        });
      }

      const updated: PluginRecordDoc = {
        ...existing,
        payload: validatePayload(schemaDoc, input.payload),
        updatedAt: new Date().toISOString(),
      };
      return { context, record: await store.update(updated) };
    },

    async remove(input: {
      businessId: string;
      pluginId: string;
      schemaId: string;
      rowId: string;
      source?: RuntimeSourcePreference;
      teamId?: string;
      hashPin?: PluginSchemaHashPin;
    }) {
      const { context } = resolveInstalledSchemaContext({
        registry,
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        source: input.source,
        teamId: input.teamId,
      });
      verifyHashPin(context, input.hashPin);

      const existing = await store.getByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
      });
      if (!existing) {
        throw new PluginSchemaRecordNotFoundError({
          businessId: input.businessId,
          pluginId: input.pluginId,
          schemaId: input.schemaId,
          rowId: input.rowId,
        });
      }

      const result = await store.removeByScope({
        businessId: input.businessId,
        pluginId: input.pluginId,
        schemaId: input.schemaId,
        rowId: input.rowId,
      });
      return {
        context,
        ...result,
      };
    },
  };
}

function createGunPluginSchemaRecordStore(): PluginSchemaRecordStore {
  return {
    async listByScope(scope) {
      const rows = (await ssrGet(
        { key: 'pluginRecord' },
        scope.businessId,
      )) as PluginRecordDoc[];
      return rows.filter((record) => isInScope(record, scope));
    },
    async getByScope(scope) {
      const rows = (await ssrGet(
        { key: 'pluginRecord' },
        scope.businessId,
      )) as PluginRecordDoc[];
      const expectedId = toPluginRecordNamespacePath(scope);
      return rows.find(
        (row) => row.id === expectedId || row.rowId === scope.rowId,
      );
    },
    async create(record) {
      await ssrCreate('pluginRecord', record.businessId)(record as never);
      return record;
    },
    async update(record) {
      await ssrUpdate(
        'pluginRecord',
        record.businessId,
      )({
        id: record.id,
        ...record,
      } as never);
      return record;
    },
    async removeByScope(scope) {
      const id = toPluginRecordNamespacePath(scope);
      await ssrRemove('pluginRecord', scope.businessId)(id);
      return { deleted: true as const, id };
    },
  };
}

async function loadRuntimeRegistry(
  businessId: string,
): Promise<PluginRuntimeRegistry> {
  const [releases, installs, draftRevisions, draftInstalls] = await Promise.all(
    [
      ssrGet('pluginRelease'),
      ssrGet('businessPluginInstall', businessId),
      ssrGet('pluginDraftRevision'),
      ssrGet('businessPluginDraftInstall', businessId),
    ],
  );

  return createPluginRuntimeRegistry({
    releases: releases as PluginReleaseDoc[],
    installs: installs as BusinessPluginInstallDoc[],
    draftRevisions: draftRevisions as PluginDraftRevisionDoc[],
    draftInstalls: draftInstalls as BusinessPluginDraftInstallDoc[],
  });
}

const hashPinSchema = z
  .object({
    manifestHash: z.string().optional(),
    artifactHash: z.string().optional(),
  })
  .strict()
  .optional();

const baseInputSchema = z
  .object({
    businessId: z.string(),
    pluginId: z.string(),
    schemaId: z.string(),
    source: z.enum(['auto', 'release', 'draft']).optional(),
    teamId: z.string().optional(),
    hashPin: hashPinSchema,
  })
  .strict();

const createInputSchema = baseInputSchema
  .extend({
    operation: z.literal('create'),
    rowId: z.string(),
    payload: z.unknown(),
  })
  .strict();

const readInputSchema = baseInputSchema
  .extend({
    operation: z.literal('read'),
    rowId: z.string(),
  })
  .strict();

const listInputSchema = baseInputSchema
  .extend({
    operation: z.literal('list'),
  })
  .strict();

const updateInputSchema = baseInputSchema
  .extend({
    operation: z.literal('update'),
    rowId: z.string(),
    payload: z.unknown(),
  })
  .strict();

const removeInputSchema = baseInputSchema
  .extend({
    operation: z.literal('delete'),
    rowId: z.string(),
  })
  .strict();

const pluginSchemaCrudInputSchema = z.discriminatedUnion('operation', [
  createInputSchema,
  readInputSchema,
  listInputSchema,
  updateInputSchema,
  removeInputSchema,
]);

export type PluginsV2SchemaCrudInput = z.infer<
  typeof pluginSchemaCrudInputSchema
>;

export async function runPluginsV2SchemaCrud(input: PluginsV2SchemaCrudInput) {
  const registry = await loadRuntimeRegistry(input.businessId);
  const service = createPluginsV2SchemaCrudService({
    registry,
    store: createGunPluginSchemaRecordStore(),
  });

  switch (input.operation) {
    case 'create':
      return service.create(input);
    case 'read':
      return service.read(input);
    case 'list':
      return service.list(input);
    case 'update':
      return service.update(input);
    case 'delete':
      return service.remove(input);
    default:
      throw new Error('Unsupported schema CRUD operation');
  }
}
