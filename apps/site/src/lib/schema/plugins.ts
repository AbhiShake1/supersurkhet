import { z } from 'zod';
import { AUTOFORM_FIELD_TYPES } from '@/components/ui/autoform';
import { compileSchemaDocs } from '@/lib/plugins/schema-compiler';
import type { SchemaDoc } from '@/lib/plugins/types';
import { table } from '../schemas/listings';

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

const jsonOrExpressionValueSchema = z.union([expressionDocSchema, jsonValueSchema]);

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

const pluginSchemaDocSchema = z.object({
  schemaId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(pluginSchemaFieldDocSchema),
  refinements: z.array(refineIssueIRSchema).optional(),
  tokens: z.record(z.string(), jsonValueSchema).optional(),
});

const workflowNodeDocSchema = z.object({
  nodeId: z.string(),
  type: z.literal('action'),
  actionId: z.string(),
  input: z
    .union([
      jsonValueSchema,
      z.object({
        expression: expressionDocSchema,
      }),
    ])
    .optional(),
  runIf: expressionDocSchema.optional(),
});

const workflowDocSchema = z.object({
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
  nodes: z.array(workflowNodeDocSchema),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      condition: expressionDocSchema.optional(),
      conditionToken: z.string().optional(),
    }),
  ),
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

const routesTabsMapperDiagnosticSchema = z.object({
  code: z.enum(['duplicate-route', 'invalid-icon']),
  message: z.string(),
  path: z.array(z.string()),
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
    workflows: z.array(workflowDocSchema).optional(),
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

export const pluginDraftSchema = z
  .object({
    id: z.string().describe('Draft id'),
    draftId: z.string(),
    pluginId: z.string(),
    ownerUserId: z.string(),
    collaboratorUserIds: z.array(z.string()).optional(),
    status: z.enum(['active', 'archived']).default('active'),
    title: z.string().optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginDraftRevisionSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic draft revision id: draftId@revisionId'),
    revisionId: z.string(),
    draftId: z.string(),
    pluginId: z.string(),
    manifestHash: z.string(),
    artifactHash: z.string(),
    schemaDocs: z.array(pluginSchemaDocSchema).optional(),
    workflows: z.array(workflowDocSchema).optional(),
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
      .describe(
        'Deterministic review id: draftId@revisionId@environment',
      ),
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

export const pluginActionCapabilityEnvelopeSchema = z
  .object({
    id: z
      .string()
      .describe('Deterministic capability envelope id: businessId::environment'),
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
    diagnostics: z.array(routesTabsMapperDiagnosticSchema),
    savedByUserId: z.string(),
    savedAt: z.string().datetime({ offset: true }),
  })
  .extend(table);

export const pluginSchemaDocStorageSchema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    schemaId: z.string(),
    doc: jsonValueSchema.describe('Canonical serializable schema doc'),
  })
  .extend(table);

export const pluginWorkflowDocStorageSchema = z
  .object({
    pluginId: z.string(),
    version: z.string(),
    workflowId: z.string(),
    doc: jsonValueSchema.describe('Canonical serializable workflow doc'),
  })
  .extend(table);

export function compilePluginSchemasFromDocs(schemaDocs: SchemaDoc[]) {
  return compileSchemaDocs(schemaDocs);
}
