import { z } from 'zod';
import { AUTOFORM_FIELD_TYPES } from '@/components/ui/autoform';
import { compileSchemaDocs } from '@/lib/plugins/schema-compiler';
import type { SchemaDoc } from '@/lib/plugins/types';
import { table } from '../schemas/listings';
import { uiBuilderLayerSchema } from '../schemas/ui-builder-schema';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const actionManifestDocSchema = z.object({
  actionId: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  runtime: z.enum(['sandbox-worker', 'core']).optional(),
});

const actionDefinitionV3Schema = z.object({
  actionId: z.string(),
  runtime: z.enum(['sandbox-worker', 'core']),
  capabilities: z.array(z.string()).optional(),
  inputSchema: jsonValueSchema.optional(),
  outputSchema: jsonValueSchema.optional(),
  handlerRef: z.string().min(1),
  security: z.object({
    networkPolicy: z.enum(['deny-all', 'allow-listed']).optional(),
    secretRefs: z.array(z.string()).optional(),
    maxCpuMs: z.number().int().positive().optional(),
    maxMemoryMb: z.number().int().positive().optional(),
  }),
});

const pluginSchemaFieldTypes = [
  ...AUTOFORM_FIELD_TYPES,
  'enum',
  'array',
  'object',
] as const;

const expressionSourceSchema = z.enum([
  'payload',
  'formValues',
  'context',
  'sourceRow',
  'row',
]);

const expressionRefDocSchema = z.object({
  kind: z.literal('ref'),
  source: expressionSourceSchema,
  path: z.array(z.string()),
});

const expressionOpSchema = z.enum([
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
]);

const expressionDocSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    expressionRefDocSchema,
    z.object({
      kind: z.literal('array'),
      items: z.array(expressionDocSchema),
    }),
    z.object({
      kind: z.literal('object'),
      value: z.record(z.string(), expressionDocSchema),
    }),
    z.object({
      kind: z.literal('op'),
      op: expressionOpSchema,
      args: z.array(expressionDocSchema),
    }),
  ]),
);

const jsonOrExpressionValueSchema = z.union([
  expressionDocSchema,
  jsonValueSchema,
]);

const fieldConfigIRSchema = z.object({
  fieldType: z.enum(pluginSchemaFieldTypes).optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  inputProps: z.record(z.string(), jsonOrExpressionValueSchema).optional(),
  customData: z.record(z.string(), jsonOrExpressionValueSchema).optional(),
});

const deriveIRSchema = z.object({
  target: z.enum(['value', 'inputProps', 'customData']),
  key: z.string().optional(),
  expression: expressionDocSchema,
});

const refineIssueIRSchema = z.object({
  code: z.literal('custom').optional(),
  path: z.array(z.string()).optional(),
  message: z.string(),
  when: expressionDocSchema,
});

const schemaBehaviorIRSchema = z.object({
  fieldConfig: fieldConfigIRSchema.optional(),
  derivations: z.array(deriveIRSchema).optional(),
  refinements: z.array(refineIssueIRSchema).optional(),
});

const schemaRuleDocSchema = z.object({
  kind: z
    .enum(['min', 'max', 'nonnegative', 'positive', 'int', 'customToken'])
    .describe('Declarative validation rule type'),
  value: z.union([z.string(), z.number()]).optional(),
  token: z.string().optional(),
  message: z.string().optional(),
});

const pluginSchemaFieldBaseShape = {
  type: z.enum(pluginSchemaFieldTypes),
  label: z.string().optional(),
  description: z.string().optional(),
  optional: z.boolean().optional(),
  defaultValue: jsonValueSchema.optional(),
  enumValues: z.array(z.string()).optional(),
  tokens: z.record(z.string(), jsonValueSchema).optional(),
  behavior: schemaBehaviorIRSchema.optional(),
  rules: z.array(schemaRuleDocSchema).optional(),
};

let pluginSchemaFieldDocSchema: z.ZodType<unknown>;
let pluginSchemaNestedFieldDocSchema: z.ZodType<unknown>;

pluginSchemaNestedFieldDocSchema = z.lazy(() =>
  z.object({
    ...pluginSchemaFieldBaseShape,
    itemType: pluginSchemaNestedFieldDocSchema.optional(),
    fields: z.array(pluginSchemaFieldDocSchema).optional(),
  }),
);

pluginSchemaFieldDocSchema = z.lazy(() =>
  z.object({
    key: z.string(),
    ...pluginSchemaFieldBaseShape,
    itemType: pluginSchemaNestedFieldDocSchema.optional(),
    fields: z.array(pluginSchemaFieldDocSchema).optional(),
  }),
);

const pluginSchemaDocBaseSchema = z.object({
  schemaId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(pluginSchemaFieldDocSchema),
  refinements: z.array(refineIssueIRSchema).optional(),
  tokens: z.record(z.string(), jsonValueSchema).optional(),
});

const workflowNodeDocSchema = z.object({
  nodeId: z.string(),
  type: z.literal('action').optional(),
  kind: z.enum(['action', 'branch', 'delay', 'humanGate']).optional(),
  actionId: z.string().optional(),
  input: z
    .union([
      jsonValueSchema,
      z.object({
        expression: expressionDocSchema,
      }),
    ])
    .optional(),
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
});

const lifecycleHookSchema = z.enum([
  'beforeCreate',
  'afterCreate',
  'beforeUpdate',
  'afterUpdate',
  'beforeDelete',
  'afterDelete',
]);

const workflowDocSchema = z.object({
  pluginContractVersion: z.literal('3').optional(),
  workflowId: z.string(),
  title: z.string().optional(),
  table: z.string(),
  hook: lifecycleHookSchema,
  trigger: z
    .object({
      table: z.string(),
      event: lifecycleHookSchema,
      filters: expressionDocSchema.optional(),
      fieldChange: z.record(z.string(), expressionDocSchema).optional(),
    })
    .optional(),
  nodes: z.array(workflowNodeDocSchema),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      condition: expressionDocSchema.optional(),
      conditionToken: z.string().optional(),
      on: z.enum(['success', 'failure', 'always']).optional(),
    }),
  ),
});

const schemaWorkflowDocSchema = workflowDocSchema
  .omit({
    table: true,
    trigger: true,
  })
  .extend({
    trigger: z
      .object({
        event: lifecycleHookSchema,
        filters: expressionDocSchema.optional(),
        fieldChange: z.record(z.string(), expressionDocSchema).optional(),
      })
      .optional(),
  });

const pluginSchemaDocSchema = pluginSchemaDocBaseSchema.extend({
  workflows: z.array(schemaWorkflowDocSchema).optional(),
});

const pluginTabDocSchema = z.object({
  schema: z.string(),
  title: z.string().optional(),
  group: z.string().optional(),
  icon: z.string().optional(),
});

const compileVerifyDiagnosticSchema = z.object({
  category: z.enum([
    'schema-compile',
    'derivation-compile',
    'refinement-compile',
    'workflow-validation',
    'capability-validation',
  ]),
  code: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  path: z.array(z.string()),
});

const artifactDiffSchema = z.object({
  added: z.array(z.string()),
  changed: z.array(z.string()),
  removed: z.array(z.string()),
});

const hashPreviewSchema = z.object({
  manifestHash: z.string(),
  artifactHash: z.string(),
});

const routesTabsMappedRouteSchema = z.object({
  id: z.string(),
  schema: z.string(),
  title: z.string(),
  group: z.string().optional(),
  order: z.number(),
  routeSegment: z.string(),
  routePath: z.string(),
  iconName: z.string().optional(),
});

const uiTemplateLayersStringSchema = z.string().superRefine((value, ctx) => {
  try {
    const parsed = JSON.parse(value);
    const result = uiBuilderLayerSchema.array().safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message: 'uiSnapshot.layers must be a JSON array of uiBuilder layers',
      });
    }
  } catch (_error) {
    ctx.addIssue({
      code: 'custom',
      message: 'uiSnapshot.layers must be valid JSON',
    });
  }
});

export const pluginReleaseSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic plugin release id: pluginId@version'),
    pluginId: z.string().describe('Plugin identifier'),
    version: z.string().describe('Immutable plugin release version'),
    manifestHash: z.string().describe('Hash of serialized manifest'),
    artifactHash: z.string().describe('Hash of release artifact bundle'),
    author: z.object({
      userId: z.string(),
      name: z.string().optional(),
    }),
    visibility: z.literal('public').default('public'),
    docs: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
    actionManifest: z.array(actionManifestDocSchema),
    schemaDocs: z.array(pluginSchemaDocSchema).optional(),
    adminTabs: z.array(pluginTabDocSchema).optional(),
    publishedAt: z.string().datetime({ offset: true }).optional(),
  })
  .extend(table);

export const businessPluginInstallSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic business install id: businessId::pluginId'),
    businessId: z.string().describe('Business id that installed the release'),
    pluginId: z.string().describe('Plugin id'),
    version: z.string().describe('Pinned release version'),
    manifestHash: z.string(),
    artifactHash: z.string(),
    installedAt: z.string().datetime({ offset: true }),
    installedByUserId: z.string(),
    status: z.enum(['active', 'paused']).default('active'),
    requestedCapabilities: z.array(z.string()).optional(),
  })
  .extend(table);

const uiTemplatePluginBundleSchema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    requestedCapabilities: z.array(z.string()).optional(),
    release: pluginReleaseSchema,
  })
  .strict();

export const uiTemplateReleaseSchema = z
  .object({
    id: z.string().describe('Deterministic template release id: templateId@version'),
    templateId: z.string().describe('Stable template identifier'),
    version: z.string().describe('Immutable template release version'),
    visibility: z.literal('public').default('public'),
    publisher: z
      .object({
        businessId: z.string(),
        userId: z.string(),
        label: z.string().optional(),
      })
      .strict(),
    docs: z
      .object({
        title: z.string(),
        description: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
      .strict(),
    uiSnapshot: z
      .object({
        layers: uiTemplateLayersStringSchema,
      })
      .strict(),
    pluginBundles: z.array(uiTemplatePluginBundleSchema),
    publishedAt: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .extend(table);

export const businessUiTemplateInstallSchema = z
  .object({
    id: z.string().describe('Deterministic install id: businessId::templateId'),
    businessId: z.string(),
    templateId: z.string(),
    version: z.string(),
    installedByUserId: z.string(),
    installedAt: z.string().datetime({ offset: true }),
    mergeStrategy: z.literal('best-effort').default('best-effort'),
    status: z.enum(['active']).default('active'),
    summary: z
      .object({
        pagesAdded: z.number().int().min(0),
        pagesMerged: z.number().int().min(0),
        conflictsCount: z.number().int().min(0),
        pluginsInstalled: z.number().int().min(0),
        pluginsUpdated: z.number().int().min(0),
      })
      .strict(),
  })
  .extend(table);

export const pluginProjectSchema = z
  .object({
    id: z
      .string()
      .describe(
        'Deterministic project id: plugin-project::<slug-or-stable-id>',
      ),
    slug: z
      .string()
      .describe('URL-friendly project slug scoped by owner')
      .optional(),
    name: z.string().describe('Human-readable project name'),
    description: z.string().optional(),
    gitIntegration: z
      .object({
        provider: z.literal('github'),
        connectedAt: z.string().datetime({ offset: true }),
        account: z.object({
          id: z.string(),
          login: z.string(),
          avatarUrl: z.string().url().optional(),
        }),
        repositories: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            fullName: z.string(),
            owner: z.string(),
            defaultBranch: z.string(),
            private: z.boolean(),
            htmlUrl: z.string().url().optional(),
            connectedAt: z.string().datetime({ offset: true }),
            connectedByUserId: z.string(),
          }),
        ),
      })
      .optional(),
    ownerUserId: z.string().describe('Project owner user id'),
    visibility: z.enum(['private', 'internal']).default('private'),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginProjectMemberSchema = z
  .object({
    id: z.string().describe('Deterministic member id: projectId::userId'),
    projectId: z.string(),
    userId: z.string(),
    role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('editor'),
    invitedByUserId: z.string().optional(),
    joinedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginProjectInviteSchema = z
  .object({
    id: z.string().describe('Deterministic invite id'),
    projectId: z.string(),
    email: z.string().email(),
    role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('editor'),
    status: z.enum(['pending', 'accepted', 'revoked']).default('pending'),
    token: z.string(),
    invitedByUserId: z.string(),
    invitedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    acceptedByUserId: z.string().optional(),
    acceptedAt: z.string().datetime({ offset: true }).optional(),
  })
  .extend(table);

export const pluginDraftSchema = z
  .object({
    id: z.string().describe('Draft id'),
    draftId: z.string(),
    projectId: z.string().optional(),
    pluginId: z.string(),
    ownerUserId: z.string(),
    collaboratorUserIds: z.array(z.string()).optional(),
    status: z.enum(['active', 'archived']).default('active'),
    title: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginDraftRevisionSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic draft revision row id derived from draftId+revisionId'),
    revisionId: z.string(),
    draftId: z.string(),
    pluginId: z.string(),
    manifestHash: z.string(),
    artifactHash: z.string(),
    schemaDocs: z.array(pluginSchemaDocSchema).optional(),
    adminTabs: z.array(pluginTabDocSchema).optional(),
    createdAt: z.string().datetime({ offset: true }),
    createdByUserId: z.string(),
  })
  .extend(table);

export const businessPluginDraftInstallSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic draft install id: businessId::draftId'),
    businessId: z.string(),
    pluginId: z.string(),
    draftId: z.string(),
    revisionId: z.string(),
    teamId: z.string(),
    manifestHash: z.string(),
    artifactHash: z.string(),
    installedAt: z.string().datetime({ offset: true }),
    installedByUserId: z.string(),
    status: z.enum(['active', 'paused']).default('active'),
  })
  .extend(table);

export const pluginRecordSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic namespace id: business/plugin/schema/row'),
    businessId: z.string(),
    pluginId: z.string(),
    schemaId: z.string(),
    rowId: z.string(),
    namespacePath: z.string(),
    payload: jsonValueSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginV2DiagnosticsSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic diagnostics snapshot id: draftId@revisionId'),
    draftId: z.string(),
    revisionId: z.string(),
    pluginId: z.string(),
    environment: z.string().default('production'),
    status: z.enum(['ready', 'blocking']).default('blocking'),
    diagnostics: z.array(compileVerifyDiagnosticSchema),
    artifactDiff: artifactDiffSchema,
    hashPreview: hashPreviewSchema,
    createdByUserId: z.string(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginPublishReviewSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic review id: draftId@revisionId@environment'),
    draftId: z.string(),
    revisionId: z.string(),
    pluginId: z.string(),
    environment: z.string().default('production'),
    status: z.enum(['not-required', 'required-pending', 'approved']),
    approvedByUserId: z.string().optional(),
    decidedAt: z.string().datetime({ offset: true }),
    note: z.string().optional(),
  })
  .extend(table);

export const pluginUserReviewSchema = z
  .object({
    id: z.string().describe('Deterministic review id: pluginId::userId'),
    pluginId: z.string(),
    businessId: z.string().optional(),
    userId: z.string(),
    userLabel: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).default(''),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginUserReviewReplySchema = z
  .object({
    id: z.string().describe('Deterministic reply id'),
    reviewId: z.string().describe('Parent review id: pluginId::userId'),
    pluginId: z.string(),
    businessId: z.string().optional(),
    parentReplyId: z.string().optional(),
    userId: z.string(),
    userLabel: z.string(),
    comment: z.string().max(2000),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginUserReviewVoteSchema = z
  .object({
    id: z.string().describe('Deterministic vote id: targetType::targetId::userId'),
    reviewId: z.string().describe('Top-level review id this vote belongs to'),
    pluginId: z.string(),
    businessId: z.string().optional(),
    targetType: z.enum(['review', 'reply']),
    targetId: z.string(),
    userId: z.string(),
    value: z.enum(['up', 'down']),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginActionCapabilityEnvelopeSchema = z
  .object({
    id: z
      .string()
      .describe(
        'Deterministic capability envelope id: businessId::environment',
      ),
    businessId: z.string(),
    environment: z.string().default('production'),
    runtimeTarget: z.enum(['sandbox-worker', 'core']).default('sandbox-worker'),
    capabilities: z.array(z.string()),
    deniedActionIds: z.array(z.string()).optional(),
    updatedByUserId: z.string(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginRoutesTabsConfigSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic routes-tabs config id: draftId@revisionId'),
    draftId: z.string(),
    revisionId: z.string(),
    pluginId: z.string(),
    businessSlug: z.string(),
    routes: z.array(routesTabsMappedRouteSchema),
    savedByUserId: z.string(),
    savedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginSchemaDocStorageSchema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    schemaId: z.string(),
    doc: z.string().describe('Stringified schema doc JSON payload'),
  })
  .extend(table);

export const pluginActionManifestDocStorageSchema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    actionId: z.string(),
    doc: jsonValueSchema.describe('Canonical serializable action manifest doc'),
  })
  .extend(table);

export const pluginActionDefinitionV3Schema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    actionId: z.string(),
    doc: actionDefinitionV3Schema,
  })
  .extend(table);

export const pluginWorkflowJobSchema = z
  .object({
    id: z.string(),
    businessId: z.string(),
    pluginId: z.string(),
    workflowId: z.string(),
    table: z.string(),
    hook: lifecycleHookSchema,
    status: z.enum([
      'queued',
      'leased',
      'running',
      'completed',
      'failed',
      'dead-lettered',
      'cancelled',
    ]),
    idempotencyKey: z.string(),
    fingerprint: z.string(),
    payload: jsonValueSchema,
    attempts: z.number().int().min(0),
    nextRunAt: z.string().datetime({ offset: true }),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginWorkflowJobAttemptSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    attempt: z.number().int().min(1),
    status: z.enum(['running', 'completed', 'failed', 'timed_out', 'cancelled']),
    leasedAt: z.string().datetime({ offset: true }),
    finishedAt: z.string().datetime({ offset: true }).optional(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
  })
  .extend(table);

export const pluginWorkflowEventLogSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    workflowId: z.string(),
    nodeId: z.string().optional(),
    level: z.enum(['info', 'warn', 'error']),
    eventType: z.string(),
    message: z.string(),
    data: jsonValueSchema.optional(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginWorkflowDeadLetterSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    workflowId: z.string(),
    reasonCode: z.string(),
    reasonMessage: z.string(),
    payload: jsonValueSchema,
    failedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export function compilePluginSchemasFromDocs(schemaDocs: SchemaDoc[]) {
  return compileSchemaDocs(schemaDocs);
}
