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

const pluginSchemaFieldDocSchema = z.object({
  key: z.string(),
  type: z.enum(pluginSchemaFieldTypes),
  label: z.string().optional(),
  description: z.string().optional(),
  optional: z.boolean().optional(),
  defaultValue: jsonValueSchema.optional(),
  enumValues: z.array(z.string()).optional(),
  itemType: z.record(z.string(), jsonValueSchema).optional(),
  fields: z.array(z.record(z.string(), jsonValueSchema)).optional(),
  tokens: z.record(z.string(), jsonValueSchema).optional(),
  rules: z
    .array(
      z.object({
        kind: z
          .enum(['min', 'max', 'nonnegative', 'positive', 'int', 'customToken'])
          .describe('Declarative validation rule type'),
        value: z.union([z.string(), z.number()]).optional(),
        token: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});

const pluginSchemaDocSchema = z.object({
  schemaId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(pluginSchemaFieldDocSchema),
  tokens: z.record(z.string(), jsonValueSchema).optional(),
});

const workflowNodeDocSchema = z.object({
  nodeId: z.string(),
  type: z.literal('action'),
  actionId: z.string(),
  input: jsonValueSchema.optional(),
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
