import { z } from 'zod';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { SSRGetTimeoutError, get as ssrGet } from '@/lib/gun/ssr/get';
import { update as ssrUpdate } from '@/lib/gun/ssr/update';
import {
  MARKETPLACE_SEED_RELEASES,
  mergeMarketplaceReleasesWithSeed,
  toMarketplaceSeedReleaseDocs,
} from '@/lib/plugins/marketplace-seed';
import {
  evaluateV3InstallGates,
  evaluateV3PublishGates,
  hasBlockingV3Gates,
} from '@/lib/plugins/v3-gates';
import { toDraftRevisionRowId } from '@/lib/plugins/draft-revision-row-id';
import {
  createInMemoryPluginPlatformStore,
  createPluginPlatformService,
  toReleaseId,
} from '@/lib/plugins/plugin-service';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  ExpressionDoc,
  JsonValue,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
} from '@/lib/plugins/types';
import { runPluginsV2CompileVerifyPipeline } from './plugins-v2-compile-verify';

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const expressionRefDocSchema = z
  .object({
    kind: z.literal('ref'),
    source: z.enum(['payload', 'formValues', 'context', 'sourceRow', 'row']),
    path: z.array(z.string()),
  })
  .strict();

const expressionDocSchema: z.ZodType<ExpressionDoc> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    expressionRefDocSchema,
    z
      .object({
        kind: z.literal('array'),
        items: z.array(expressionDocSchema),
      })
      .strict(),
    z
      .object({
        kind: z.literal('object'),
        value: z.record(z.string(), expressionDocSchema),
      })
      .strict(),
    z
      .object({
        kind: z.literal('op'),
        op: z.enum([
          'eq',
          'neq',
          'gt',
          'gte',
          'lt',
          'lte',
          'and',
          'or',
          'not',
          'add',
          'sub',
          'mul',
          'div',
          'coalesce',
          'concat',
          'sum',
          'if',
          'changed',
          'was',
          'now',
          'exists',
          'match',
        ]),
        args: z.array(expressionDocSchema),
      })
      .strict(),
  ]),
);

const schemaRuleDocSchema: z.ZodType<SchemaRuleDoc> = z
  .object({
    kind: z.enum([
      'min',
      'max',
      'nonnegative',
      'positive',
      'int',
      'customToken',
    ]),
    value: z.union([z.number(), z.string()]).optional(),
    token: z.string().optional(),
    message: z.string().optional(),
  })
  .strict();

const fieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'select',
  'image',
  'map',
  'record',
  'password',
  'richText',
  'editor',
  'color',
  'file',
  'rating',
  'slider',
  'tags',
  'currency',
  'phone',
  'url',
  'permissions',
  'unit',
  'timestamp',
  'enum',
  'array',
  'object',
]);

const jsonOrExpressionSchema = z.union([jsonValueSchema, expressionDocSchema]);

const schemaBehaviorSchema = z
  .object({
    fieldConfig: z
      .object({
        fieldType: fieldTypeSchema.optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        inputProps: z.record(z.string(), jsonOrExpressionSchema).optional(),
        customData: z.record(z.string(), jsonOrExpressionSchema).optional(),
      })
      .strict()
      .optional(),
    derivations: z
      .array(
        z
          .object({
            target: z.enum(['value', 'inputProps', 'customData']),
            key: z.string().optional(),
            expression: expressionDocSchema,
          })
          .strict(),
      )
      .optional(),
    refinements: z
      .array(
        z
          .object({
            code: z.literal('custom').optional(),
            path: z.array(z.string()).optional(),
            message: z.string(),
            when: expressionDocSchema,
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const schemaFieldDocSchema: z.ZodType<SchemaFieldDoc> = z.lazy(() =>
  z
    .object({
      key: z.string(),
      type: fieldTypeSchema,
      label: z.string().optional(),
      description: z.string().optional(),
      optional: z.boolean().optional(),
      defaultValue: jsonValueSchema.optional(),
      enumValues: z.array(z.string()).optional(),
      itemType: z
        .object({
          type: fieldTypeSchema,
          label: z.string().optional(),
          description: z.string().optional(),
          optional: z.boolean().optional(),
          defaultValue: jsonValueSchema.optional(),
          enumValues: z.array(z.string()).optional(),
          itemType: z
            .lazy(() => schemaFieldDocSchema.omit({ key: true }))
            .optional(),
          fields: z.array(schemaFieldDocSchema).optional(),
          tokens: z.record(z.string(), jsonValueSchema).optional(),
          behavior: schemaBehaviorSchema.optional(),
          rules: z.array(schemaRuleDocSchema).optional(),
        })
        .strict()
        .optional(),
      fields: z.array(schemaFieldDocSchema).optional(),
      tokens: z.record(z.string(), jsonValueSchema).optional(),
      behavior: schemaBehaviorSchema.optional(),
      rules: z.array(schemaRuleDocSchema).optional(),
    })
    .strict(),
);

const schemaDocInputSchema: z.ZodType<SchemaDoc> = z
  .object({
    schemaId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(schemaFieldDocSchema),
    refinements: z
      .array(
        z
          .object({
            code: z.literal('custom').optional(),
            path: z.array(z.string()).optional(),
            message: z.string(),
            when: expressionDocSchema,
          })
          .strict(),
      )
      .optional(),
    tokens: z.record(z.string(), jsonValueSchema).optional(),
  })
  .strict();

const workflowNodeInputSchema = z.union([
  jsonValueSchema,
  z
    .object({
      expression: expressionDocSchema,
    })
    .strict(),
]);

const workflowNodeDocInputSchema: z.ZodType<WorkflowNodeDoc> = z
  .object({
    nodeId: z.string(),
    type: z.literal('action').optional(),
    kind: z.enum(['action', 'branch', 'delay', 'humanGate']).optional(),
    actionId: z.string().optional(),
    input: workflowNodeInputSchema.optional(),
    runIf: expressionDocSchema.optional(),
    retryPolicy: z
      .object({
        maxAttempts: z.number().int().min(1),
        backoffMs: z.number().int().min(0).optional(),
      })
      .optional(),
    timeoutMs: z.number().int().positive().optional(),
    idempotencyKeyExpr: expressionDocSchema.optional(),
    delayMs: z.number().int().min(0).optional(),
  })
  .strict();

const workflowEdgeDocInputSchema: z.ZodType<WorkflowEdgeDoc> = z
  .object({
    from: z.string(),
    to: z.string(),
    condition: expressionDocSchema.optional(),
    conditionToken: z.string().optional(),
    on: z.enum(['success', 'failure', 'always']).optional(),
  })
  .strict();

const workflowDocInputSchema: z.ZodType<WorkflowDoc> = z
  .object({
    pluginContractVersion: z.literal('3').optional(),
    workflowId: z.string(),
    title: z.string().optional(),
    table: z.string(),
    hook: z.enum([
      'beforeCreate',
      'afterCreate',
      'beforeUpdate',
      'afterUpdate',
      'beforeDelete',
      'afterDelete',
    ]),
    trigger: z
      .object({
        table: z.string(),
        event: z.enum([
          'beforeCreate',
          'afterCreate',
          'beforeUpdate',
          'afterUpdate',
          'beforeDelete',
          'afterDelete',
        ]),
        filters: expressionDocSchema.optional(),
        fieldChange: z.record(z.string(), expressionDocSchema).optional(),
      })
      .optional(),
    nodes: z.array(workflowNodeDocInputSchema),
    edges: z.array(workflowEdgeDocInputSchema),
  })
  .strict();

const pluginDocsInputSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

const actionManifestInputSchema: z.ZodType<ActionManifestDoc> = z
  .object({
    actionId: z.string(),
    description: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    runtime: z.enum(['sandbox-worker', 'core']).optional(),
  })
  .strict();

const adminTabInputSchema: z.ZodType<AdminTabDoc> = z
  .object({
    schema: z.string(),
    title: z.string().optional(),
    group: z.string().optional(),
    icon: z.string().optional(),
  })
  .strict();

const releasePublishInputSchema = z
  .object({
    actorUserId: z.string(),
    pluginId: z.string(),
    version: z.string(),
    docs: pluginDocsInputSchema.optional(),
    actionManifest: z.array(actionManifestInputSchema).default([]),
    schemaDocs: z.array(schemaDocInputSchema).optional(),
    workflows: z.array(workflowDocInputSchema).optional(),
    adminTabs: z.array(adminTabInputSchema).optional(),
  })
  .strict();

const releaseInstallInputSchema = z
  .object({
    actorUserId: z.string(),
    actorRole: z.enum(['owner', 'admin', 'staff']),
    businessId: z.string(),
    pluginId: z.string(),
    version: z.string(),
    requestedCapabilities: z.array(z.string()).optional(),
    explicitOwnerAction: z.boolean().optional(),
  })
  .strict();

const releaseInstallBatchInputSchema = z
  .object({
    actorUserId: z.string(),
    actorRole: z.enum(['owner', 'admin', 'staff']),
    businessId: z.string(),
    explicitOwnerAction: z.boolean().optional(),
    installs: z
      .array(
        z
          .object({
            pluginId: z.string(),
            version: z.string(),
            requestedCapabilities: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

const draftCreateInputSchema = z.object({
  actorUserId: z.string(),
  pluginId: z.string(),
  title: z.string().optional(),
  collaboratorUserIds: z.array(z.string()).optional(),
});

const ensureMarketplaceInputSchema = z.object({
  actorUserId: z.string().optional(),
});

function appendUserIdAliases(aliases: Set<string>, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return;
  aliases.add(normalized);
  const slashSegments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const slashTail = slashSegments[slashSegments.length - 1];
  if (slashTail) {
    aliases.add(slashTail);
  }
}

function buildUserIdAliases(value: string | undefined): Set<string> {
  const aliases = new Set<string>();
  appendUserIdAliases(aliases, value);
  return aliases;
}

function toStableDraftIdSuffix(value: string | undefined) {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'anon';
}

function matchesUserIdAlias({
  aliases,
  candidate,
}: {
  aliases: Set<string>;
  candidate: string | undefined;
}) {
  const normalized = candidate?.trim();
  if (!normalized) return false;
  return aliases.has(normalized);
}

export type PluginInputValidationEntrypoint =
  | 'publishPluginRelease'
  | 'installPluginRelease';

export type PluginInputValidationIssue = {
  code: z.ZodIssueCode;
  path: string;
  message: string;
};

export type PluginInputValidationDiagnostics<
  TEntrypoint extends
    PluginInputValidationEntrypoint = PluginInputValidationEntrypoint,
> = {
  kind: 'validation';
  entrypoint: TEntrypoint;
  issues: PluginInputValidationIssue[];
};

export type PluginInputValidationResult<
  TData,
  TEntrypoint extends PluginInputValidationEntrypoint,
> =
  | { ok: true; data: TData }
  | {
      ok: false;
      error: PluginInputValidationDiagnostics<TEntrypoint>;
    };

export class PluginInputValidationError extends Error {
  readonly diagnostics: PluginInputValidationDiagnostics;

  constructor(diagnostics: PluginInputValidationDiagnostics) {
    super(`Invalid ${diagnostics.entrypoint} input payload`);
    this.name = 'PluginInputValidationError';
    this.diagnostics = diagnostics;
  }
}

export class PluginV3GateError extends Error {
  readonly diagnostics: ReturnType<typeof evaluateV3PublishGates>;

  constructor(message: string, diagnostics: ReturnType<typeof evaluateV3PublishGates>) {
    super(message);
    this.name = 'PluginV3GateError';
    this.diagnostics = diagnostics;
  }
}

function formatValidationPath(path: (string | number)[]) {
  if (path.length === 0) {
    return '';
  }
  return path.map((segment) => String(segment)).join('.');
}

function fromZodIssues(
  entrypoint: PluginInputValidationEntrypoint,
  issues: z.ZodIssue[],
): PluginInputValidationDiagnostics {
  return {
    kind: 'validation',
    entrypoint,
    issues: issues.map((issue) => ({
      code: issue.code,
      path: formatValidationPath(issue.path),
      message: issue.message,
    })),
  };
}

function parseInputSchema<
  TSchema extends z.ZodTypeAny,
  TEntrypoint extends PluginInputValidationEntrypoint,
>({
  schema,
  data,
  entrypoint,
}: {
  schema: TSchema;
  data: unknown;
  entrypoint: TEntrypoint;
}): PluginInputValidationResult<z.infer<TSchema>, TEntrypoint> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: fromZodIssues(
        entrypoint,
        parsed.error.issues,
      ) as PluginInputValidationDiagnostics<TEntrypoint>,
    };
  }
  return {
    ok: true,
    data: parsed.data,
  };
}

function requireParsedInput<
  TSchema extends z.ZodTypeAny,
  TEntrypoint extends PluginInputValidationEntrypoint,
>({
  schema,
  data,
  entrypoint,
}: {
  schema: TSchema;
  data: unknown;
  entrypoint: TEntrypoint;
}) {
  const parsed = parseInputSchema({ schema, data, entrypoint });
  if (!parsed.ok) {
    throw new PluginInputValidationError(parsed.error);
  }
  return parsed.data;
}

export function parsePublishPluginReleaseInput(
  data: unknown,
): PluginInputValidationResult<
  z.infer<typeof releasePublishInputSchema>,
  'publishPluginRelease'
> {
  return parseInputSchema({
    schema: releasePublishInputSchema,
    data,
    entrypoint: 'publishPluginRelease',
  });
}

export function parsePromotionReleaseInput<
  TEntrypoint extends 'installPluginRelease',
>(
  data: unknown,
  entrypoint: TEntrypoint,
): PluginInputValidationResult<
  z.infer<typeof releaseInstallInputSchema>,
  TEntrypoint
> {
  return parseInputSchema({
    schema: releaseInstallInputSchema,
    data,
    entrypoint,
  });
}

export async function publishPluginRelease({ data }: { data: unknown }) {
  const parsedInput = requireParsedInput({
    schema: releasePublishInputSchema,
    data,
    entrypoint: 'publishPluginRelease',
  });

  const gateDiagnostics = evaluateV3PublishGates({
    actionManifest: parsedInput.actionManifest ?? [],
    schemaDocs: parsedInput.schemaDocs ?? [],
    workflows: parsedInput.workflows ?? [],
  });

  const compileVerify = runPluginsV2CompileVerifyPipeline({
    pluginId: parsedInput.pluginId,
    version: parsedInput.version,
    docs: parsedInput.docs,
    actionManifest: parsedInput.actionManifest ?? [],
    schemaDocs: parsedInput.schemaDocs ?? [],
    workflows: parsedInput.workflows ?? [],
    adminTabs: parsedInput.adminTabs ?? [],
    capabilityEnvelope: [
      ...new Set(
        (parsedInput.actionManifest ?? []).flatMap(
          (entry) => entry.capabilities ?? [],
        ),
      ),
    ],
    runtimeTarget: 'sandbox-worker',
  });

  if (hasBlockingV3Gates(gateDiagnostics) || compileVerify.parity.diagnostics.blocking) {
    const blockingCompileDiagnostics = compileVerify.diagnostics.all
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => ({
        code: diagnostic.code,
        severity: 'error' as const,
        message: diagnostic.message,
        path: diagnostic.path,
      }));
    throw new PluginV3GateError(
      'Publish blocked by V3 gate diagnostics',
      [...gateDiagnostics, ...blockingCompileDiagnostics],
    );
  }

  const store = await loadPublishedStore();
  const service = createPluginPlatformService({ store });
  const release = await service.publishRelease({
    actorUserId: parsedInput.actorUserId,
    release: {
      pluginId: parsedInput.pluginId,
      version: parsedInput.version,
      docs: parsedInput.docs,
      actionManifest: parsedInput.actionManifest ?? [],
      schemaDocs: parsedInput.schemaDocs,
      workflows: parsedInput.workflows,
      adminTabs: parsedInput.adminTabs,
    },
  });

  await upsertGlobalRow({
    key: 'pluginRelease',
    id: release.id,
    row: release,
  });

  return {
    release,
    diagnostics: {
      compile: compileVerify.diagnostics,
      v3: gateDiagnostics,
    },
  };
}

async function loadPublishedStore(businessId?: string) {
  const [releases, installs] = await Promise.all([
    readRowsWithTimeoutFallback(() => ssrGet('pluginRelease')),
    businessId
      ? readRowsWithTimeoutFallback(() =>
          ssrGet('businessPluginInstall', businessId),
        )
      : Promise.resolve([]),
  ]);

  return createInMemoryPluginPlatformStore({
    releases: mergeMarketplaceReleasesWithSeed(releases as PluginReleaseDoc[]),
    publishedInstalls: installs as BusinessPluginInstallDoc[],
  });
}

async function readRowsWithTimeoutFallback<T>(
  reader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await reader();
  } catch (error) {
    if (isSSRGetTimeoutError(error)) {
      return [];
    }
    throw error;
  }
}

function isSSRGetTimeoutError(error: unknown): boolean {
  if (error instanceof SSRGetTimeoutError) return true;
  if (typeof error === 'string') {
    return error.includes('fetch timed out');
  }
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  if (candidate.name === 'SSRGetTimeoutError') return true;
  if (
    typeof candidate.message === 'string' &&
    candidate.message.includes('fetch timed out')
  ) {
    return true;
  }

  return isSSRGetTimeoutError(candidate.cause);
}

async function loadDraftStore(businessId?: string) {
  const [drafts, revisions, installs] = await Promise.all([
    readRowsWithTimeoutFallback(() => ssrGet({ key: 'pluginDraft' })),
    readRowsWithTimeoutFallback(() => ssrGet({ key: 'pluginDraftRevision' })),
    businessId
      ? readRowsWithTimeoutFallback(() =>
          ssrGet({ key: 'businessPluginDraftInstall' }, businessId),
        )
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
  const rows = (await readRowsWithTimeoutFallback(() =>
    ssrGet({ key }),
  )) as Array<{
    id?: string;
    _?: { soul?: string };
  }>;
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
  const rows = (await readRowsWithTimeoutFallback(() =>
    ssrGet({ key }, scopeKey),
  )) as Array<{
    id?: string;
    _?: { soul?: string };
  }>;
  const existing = rows.find(
    (entry) => entry.id === id || entry._?.soul?.split('/').pop() === id,
  );
  if (existing) {
    await ssrUpdate(
      key,
      scopeKey,
    )({
      id,
      ...row,
    } as never);
    return;
  }
  await ssrCreate(
    key,
    scopeKey,
  )({
    id,
    ...row,
  } as never);
}

export async function installPluginRelease({ data }: { data: unknown }) {
  const parsedInput = requireParsedInput({
    schema: releaseInstallInputSchema,
    data,
    entrypoint: 'installPluginRelease',
  });
  const store = await loadPublishedStore(parsedInput.businessId);
  const service = createPluginPlatformService({ store });

  // Verify the release exists before attempting installation
  const releaseId = toReleaseId(parsedInput.pluginId, parsedInput.version);
  let release = store.getRelease(releaseId);

  if (!release) {
    const seedRelease = toMarketplaceSeedReleaseDocs().find(
      (candidate) => candidate.id === releaseId,
    );
    if (seedRelease) {
      store.putRelease(seedRelease);
      await upsertGlobalRow({
        key: 'pluginRelease',
        id: seedRelease.id,
        row: seedRelease,
      });
      release = seedRelease;
    }
  }

  if (!release) {
    // Log available releases for debugging
    console.error(`Release ${releaseId} not found in pluginRelease table.`);
    console.error(
      `Available releases:`,
      store.listReleases().map((r) => r.id),
    );
    throw new Error(
      `Release ${releaseId} not found in pluginRelease table. Available releases: ${store.listReleases().length}`,
    );
  }

  const installGateDiagnostics = evaluateV3InstallGates({
    actionManifest: release.actionManifest ?? [],
    schemaDocs: release.schemaDocs ?? [],
    workflows: release.workflows ?? [],
    requestedCapabilities: parsedInput.requestedCapabilities ?? [],
  });
  if (hasBlockingV3Gates(installGateDiagnostics)) {
    throw new PluginV3GateError(
      `Install blocked for ${releaseId}; release does not satisfy V3 gates`,
      installGateDiagnostics,
    );
  }

  const install = service.installPublishedRelease({
    actorUserId: parsedInput.actorUserId,
    actorRole: parsedInput.actorRole,
    explicitOwnerAction: parsedInput.explicitOwnerAction,
    install: {
      businessId: parsedInput.businessId,
      pluginId: parsedInput.pluginId,
      version: parsedInput.version,
      requestedCapabilities: parsedInput.requestedCapabilities,
    },
  });

  await upsertScopedRow({
    key: 'businessPluginInstall',
    scopeKey: parsedInput.businessId,
    id: install.id,
    row: install,
  });

  return install;
}

export async function syncBusinessPluginInstalls({ data }: { data: unknown }) {
  const parsedInput = requireParsedInput({
    schema: releaseInstallBatchInputSchema,
    data,
    entrypoint: 'installPluginRelease',
  });

  const store = await loadPublishedStore(parsedInput.businessId);
  const service = createPluginPlatformService({ store });
  const desiredInstalls = new Map<
    string,
    {
      pluginId: string;
      version: string;
      requestedCapabilities?: string[];
    }
  >();

  for (const install of parsedInput.installs) {
    desiredInstalls.set(install.pluginId, install);
  }

  const missingReleaseIds = [...desiredInstalls.values()]
    .map((install) => toReleaseId(install.pluginId, install.version))
    .filter((releaseId) => !store.getRelease(releaseId));

  if (missingReleaseIds.length > 0) {
    const seedDocsById = new Map(
      toMarketplaceSeedReleaseDocs().map((release) => [release.id, release]),
    );
    const hydrateableSeedReleases = missingReleaseIds
      .map((releaseId) => seedDocsById.get(releaseId))
      .filter((release): release is PluginReleaseDoc => Boolean(release));

    for (const seedRelease of hydrateableSeedReleases) {
      store.putRelease(seedRelease);
      await upsertGlobalRow({
        key: 'pluginRelease',
        id: seedRelease.id,
        row: seedRelease,
      });
    }
  }

  const installsToPersist: BusinessPluginInstallDoc[] = [];
  for (const install of desiredInstalls.values()) {
    const release = store.getRelease(toReleaseId(install.pluginId, install.version));
    if (!release) {
      throw new MissingReleaseError(toReleaseId(install.pluginId, install.version));
    }
    const installGateDiagnostics = evaluateV3InstallGates({
      actionManifest: release.actionManifest ?? [],
      schemaDocs: release.schemaDocs ?? [],
      workflows: release.workflows ?? [],
      requestedCapabilities: install.requestedCapabilities ?? [],
    });
    if (hasBlockingV3Gates(installGateDiagnostics)) {
      throw new PluginV3GateError(
        `Install blocked for ${release.id}; release does not satisfy V3 gates`,
        installGateDiagnostics,
      );
    }
    const nextInstall = service.installPublishedRelease({
      actorUserId: parsedInput.actorUserId,
      actorRole: parsedInput.actorRole,
      explicitOwnerAction: parsedInput.explicitOwnerAction ?? true,
      install: {
        businessId: parsedInput.businessId,
        pluginId: install.pluginId,
        version: install.version,
        requestedCapabilities: install.requestedCapabilities,
      },
    });
    installsToPersist.push(nextInstall);
  }

  if (installsToPersist.length > 0) {
    await Promise.all(
      installsToPersist.map((install) =>
        upsertScopedRow({
          key: 'businessPluginInstall',
          scopeKey: parsedInput.businessId,
          id: install.id,
          row: install,
        }),
      ),
    );
  }

  const existingInstalls = store.listPublishedInstalls(parsedInput.businessId);
  const installsToRemove = existingInstalls.filter(
    (install) => !desiredInstalls.has(install.pluginId),
  );
  if (installsToRemove.length > 0) {
    const { remove } = await import('@/lib/gun/ssr/delete');
    await Promise.all(
      installsToRemove.map((install) =>
        remove('businessPluginInstall', parsedInput.businessId)(install.id),
      ),
    );
  }

  return {
    businessId: parsedInput.businessId,
    installedCount: installsToPersist.length,
    removedCount: installsToRemove.length,
  };
}

export async function createPluginDraft({
  data,
}: {
  data: z.infer<typeof draftCreateInputSchema>;
}) {
  const store = await loadDraftStore();
  const service = createPluginPlatformService({ store });
  const actorAliases = buildUserIdAliases(data.actorUserId);
  const canonicalActorUserId =
    [...actorAliases][0] ?? data.actorUserId ?? 'anon';
  const stableDraftId = `draft.${toStableDraftIdSuffix(canonicalActorUserId)}`;
  const existingDrafts = service.listDrafts().filter((draft) =>
    matchesUserIdAlias({
      aliases: actorAliases,
      candidate: draft.ownerUserId,
    }),
  );
  const canonicalDraft = existingDrafts.find(
    (draft) => draft.draftId === stableDraftId,
  );
  if (canonicalDraft) {
    const hasSameCollaboratorIds = (
      left: readonly string[] | undefined,
      right: readonly string[] | undefined,
    ) => {
      const leftValues = left ?? [];
      const rightValues = right ?? [];
      if (leftValues.length !== rightValues.length) return false;
      return leftValues.every((value, index) => value === rightValues[index]);
    };
    const nextTitle = data.title ?? canonicalDraft.title;
    const nextCollaboratorUserIds =
      data.collaboratorUserIds ?? canonicalDraft.collaboratorUserIds;
    const shouldUpdateCanonicalDraft =
      canonicalDraft.pluginId !== data.pluginId ||
      canonicalDraft.title !== nextTitle ||
      !hasSameCollaboratorIds(
        canonicalDraft.collaboratorUserIds,
        nextCollaboratorUserIds,
      );

    if (!shouldUpdateCanonicalDraft) {
      return canonicalDraft;
    }

    const updatedDraft = {
      ...canonicalDraft,
      pluginId: data.pluginId,
      title: nextTitle,
      collaboratorUserIds: nextCollaboratorUserIds,
      updatedAt: new Date().toISOString(),
    };

    await upsertGlobalRow({
      key: 'pluginDraft',
      id: updatedDraft.draftId,
      row: {
        ...updatedDraft,
        id: updatedDraft.draftId,
      },
    });

    return updatedDraft;
  }
  const latestExistingDraft = [...existingDrafts].sort((left, right) =>
    (right.updatedAt ?? right.createdAt ?? '').localeCompare(
      left.updatedAt ?? left.createdAt ?? '',
    ),
  )[0];

  if (latestExistingDraft) {
    const migratedDraft = await service.createDraft({
      actorUserId: data.actorUserId,
      draft: {
        draftId: stableDraftId,
        pluginId: data.pluginId,
        title: latestExistingDraft.title || data.title,
        collaboratorUserIds: latestExistingDraft.collaboratorUserIds,
      },
    });

    await upsertGlobalRow({
      key: 'pluginDraft',
      id: migratedDraft.draftId,
      row: {
        ...migratedDraft,
        id: migratedDraft.draftId,
      },
    });

    const latestLegacyRevision = service
      .listDraftRevisions(latestExistingDraft.draftId)
      .sort((left, right) =>
        (right.createdAt ?? right.revisionId).localeCompare(
          left.createdAt ?? left.revisionId,
        ),
      )[0];

    if (latestLegacyRevision) {
      const migratedRevision = await service.createDraftRevision({
        actorUserId: data.actorUserId,
        draftId: migratedDraft.draftId,
        revision: {
          schemaDocs: latestLegacyRevision.schemaDocs,
          workflows: latestLegacyRevision.workflows,
          adminTabs: latestLegacyRevision.adminTabs,
        },
      });

      await upsertGlobalRow({
        key: 'pluginDraftRevision',
        id: toDraftRevisionRowId({
          draftId: migratedRevision.draftId,
          revisionId: migratedRevision.revisionId,
        }),
        row: {
          ...migratedRevision,
          id: toDraftRevisionRowId({
            draftId: migratedRevision.draftId,
            revisionId: migratedRevision.revisionId,
          }),
        },
      });
    }

    return migratedDraft;
  }

  const draft = await service.createDraft({
    actorUserId: data.actorUserId,
    draft: {
      draftId: stableDraftId,
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

export async function ensureMarketplaceSeedReleases({
  data,
}: {
  data: z.infer<typeof ensureMarketplaceInputSchema>;
}) {
  const actorUserId = data.actorUserId ?? 'system-seed';
  const store = await loadPublishedStore();
  const service = createPluginPlatformService({ store });
  const createdReleaseIds: string[] = [];
  const seedDocsById = new Map(
    toMarketplaceSeedReleaseDocs().map((release) => [release.id, release]),
  );

  for (const seedRelease of MARKETPLACE_SEED_RELEASES) {
    const releaseId = toReleaseId(seedRelease.pluginId, seedRelease.version);
    const existing = store.getRelease(releaseId);
    if (existing) {
      continue;
    }
    const seedReleaseDoc = seedDocsById.get(releaseId);

    const release = await service.publishRelease({
      actorUserId,
      release: {
        pluginId: seedRelease.pluginId,
        version: seedRelease.version,
        docs: seedRelease.docs,
        actionManifest: seedRelease.actionManifest as ActionManifestDoc[],
        schemaDocs: seedReleaseDoc?.schemaDocs,
        workflows: seedReleaseDoc?.workflows,
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

const MARKETPLACE_SEED_MIGRATION_ID = '2026-02-20-marketplace-seed-releases-v1';

export async function migrateMarketplaceSeedReleases({
  data,
}: {
  data?: z.infer<typeof ensureMarketplaceInputSchema>;
} = {}) {
  const ensured = await ensureMarketplaceSeedReleases({
    data: {
      actorUserId: data?.actorUserId ?? 'system-migration',
    },
  });

  return {
    migrationId: MARKETPLACE_SEED_MIGRATION_ID,
    ...ensured,
  } as const;
}

const releaseUninstallInputSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.enum(['owner', 'admin', 'staff']),
  businessId: z.string(),
  pluginId: z.string(),
});

export async function uninstallPluginRelease({
  data,
}: {
  data: z.infer<typeof releaseUninstallInputSchema>;
}) {
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
