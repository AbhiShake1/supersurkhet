import {
  BUILTIN_SCHEMA_FIELD_TYPES,
  type ExpressionDoc,
  type LifecycleHook,
  type WorkflowNodeInputDoc,
} from '@supersurkhet/sdk';
import { z } from 'zod';

export type SchemaEntityId = `schema_${string}`;
export type FieldEntityId = `field_${string}`;
export type DerivationEntityId = `derivation_${string}`;
export type RefinementEntityId = `refinement_${string}`;
export type WorkflowEntityId = `workflow_${string}`;
export type NodeEntityId = `node_${string}`;
export type EdgeEntityId = `edge_${string}`;
export type ActionEntityId = `action_${string}`;
export type TabEntityId = `tab_${string}`;

const ID_SUFFIX_PATTERN = '[A-Za-z0-9][A-Za-z0-9._:-]*';

function createStableIdSchema(prefix: string) {
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}_${ID_SUFFIX_PATTERN}$`),
      `${prefix} id must be stable and prefixed with "${prefix}_"`,
    );
}

const schemaEntityIdSchema = createStableIdSchema('schema');
const fieldEntityIdSchema = createStableIdSchema('field');
const derivationEntityIdSchema = createStableIdSchema('derivation');
const refinementEntityIdSchema = createStableIdSchema('refinement');
const workflowEntityIdSchema = createStableIdSchema('workflow');
const nodeEntityIdSchema = createStableIdSchema('node');
const edgeEntityIdSchema = createStableIdSchema('edge');
const actionEntityIdSchema = createStableIdSchema('action');
const tabEntityIdSchema = createStableIdSchema('tab');

const workflowHookSchema = z.enum([
  'beforeCreate',
  'afterCreate',
  'beforeUpdate',
  'afterUpdate',
  'beforeDelete',
  'afterDelete',
]);

const schemaFieldTypeSchema = z.enum([
  ...BUILTIN_SCHEMA_FIELD_TYPES,
  'enum',
  'array',
  'object',
] as const);

const expressionSchema: z.ZodType<ExpressionDoc> =
  z.unknown() as z.ZodType<ExpressionDoc>;
const workflowNodeInputSchema: z.ZodType<WorkflowNodeInputDoc> =
  z.unknown() as z.ZodType<WorkflowNodeInputDoc>;

export const schemaEntitySchema = z
  .object({
    id: schemaEntityIdSchema,
    schemaId: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    fieldIds: z.array(fieldEntityIdSchema),
    refinementIds: z.array(refinementEntityIdSchema),
  })
  .strict();

export const fieldEntitySchema = z
  .object({
    id: fieldEntityIdSchema,
    schemaId: schemaEntityIdSchema,
    parentFieldId: fieldEntityIdSchema.optional(),
    itemFieldId: fieldEntityIdSchema.optional(),
    childFieldIds: z.array(fieldEntityIdSchema).optional(),
    key: z.string().min(1),
    type: schemaFieldTypeSchema,
    optional: z.boolean().optional(),
    derivationIds: z.array(derivationEntityIdSchema),
    refinementIds: z.array(refinementEntityIdSchema),
  })
  .strict();

export const derivationEntitySchema = z
  .object({
    id: derivationEntityIdSchema,
    schemaId: schemaEntityIdSchema,
    fieldId: fieldEntityIdSchema,
    target: z.enum(['value', 'inputProps', 'customData']),
    key: z.string().min(1).optional(),
    expression: expressionSchema,
  })
  .strict();

export const refinementEntitySchema = z
  .object({
    id: refinementEntityIdSchema,
    schemaId: schemaEntityIdSchema,
    fieldId: fieldEntityIdSchema.optional(),
    code: z.literal('custom').optional(),
    path: z.array(z.string()).optional(),
    message: z.string().min(1),
    when: expressionSchema,
  })
  .strict();

export const workflowEntitySchema = z
  .object({
    id: workflowEntityIdSchema,
    workflowId: z.string().min(1),
    title: z.string().min(1).optional(),
    table: z.string().min(1),
    hook: workflowHookSchema,
    nodeIds: z.array(nodeEntityIdSchema),
    edgeIds: z.array(edgeEntityIdSchema),
  })
  .strict();

export const nodeEntitySchema = z
  .object({
    id: nodeEntityIdSchema,
    workflowId: workflowEntityIdSchema,
    nodeId: z.string().min(1),
    type: z.literal('action'),
    actionId: actionEntityIdSchema,
    input: workflowNodeInputSchema.optional(),
    runIf: expressionSchema.optional(),
  })
  .strict();

export const edgeEntitySchema = z
  .object({
    id: edgeEntityIdSchema,
    workflowId: workflowEntityIdSchema,
    fromNodeId: nodeEntityIdSchema,
    toNodeId: nodeEntityIdSchema,
    condition: expressionSchema.optional(),
    conditionToken: z.string().min(1).optional(),
  })
  .strict();

export const actionEntitySchema = z
  .object({
    id: actionEntityIdSchema,
    actionId: z.string().min(1),
    description: z.string().optional(),
    capabilities: z.array(z.string()),
    runtime: z.enum(['sandbox-worker', 'core']).optional(),
  })
  .strict();

export const tabEntitySchema = z
  .object({
    id: tabEntityIdSchema,
    schemaId: schemaEntityIdSchema,
    schema: z.string().min(1),
    title: z.string().min(1).optional(),
    group: z.string().optional(),
    icon: z.string().optional(),
  })
  .strict();

export type SchemaEntity = z.infer<typeof schemaEntitySchema>;
export type FieldEntity = z.infer<typeof fieldEntitySchema>;
export type DerivationEntity = z.infer<typeof derivationEntitySchema>;
export type RefinementEntity = z.infer<typeof refinementEntitySchema>;
export type WorkflowEntity = z.infer<typeof workflowEntitySchema>;
export type NodeEntity = z.infer<typeof nodeEntitySchema>;
export type EdgeEntity = z.infer<typeof edgeEntitySchema>;
export type ActionEntity = z.infer<typeof actionEntitySchema>;
export type TabEntity = z.infer<typeof tabEntitySchema>;

export const workspaceEntityCollectionSchema = z
  .object({
    schemas: z.array(schemaEntitySchema),
    fields: z.array(fieldEntitySchema),
    derivations: z.array(derivationEntitySchema),
    refinements: z.array(refinementEntitySchema),
    workflows: z.array(workflowEntitySchema),
    nodes: z.array(nodeEntitySchema),
    edges: z.array(edgeEntitySchema),
    actions: z.array(actionEntitySchema),
    tabs: z.array(tabEntitySchema),
  })
  .strict();

export type WorkspaceEntityCollectionInput = z.input<
  typeof workspaceEntityCollectionSchema
>;

export type WorkspaceEntityMap = {
  schemas: Record<string, SchemaEntity>;
  fields: Record<string, FieldEntity>;
  derivations: Record<string, DerivationEntity>;
  refinements: Record<string, RefinementEntity>;
  workflows: Record<string, WorkflowEntity>;
  nodes: Record<string, NodeEntity>;
  edges: Record<string, EdgeEntity>;
  actions: Record<string, ActionEntity>;
  tabs: Record<string, TabEntity>;
};

function toCanonicalRecord<Id extends string, T extends { id: Id }>(
  entities: readonly T[],
): Record<Id, T> {
  const sortedEntities = [...entities].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  return Object.fromEntries(
    sortedEntities.map((entity) => [entity.id, entity]),
  ) as Record<Id, T>;
}

function assertNoDuplicateIds<T extends { id: string }>(
  kind: string,
  entities: readonly T[],
) {
  const seenIds = new Set<string>();

  for (const entity of entities) {
    if (seenIds.has(entity.id)) {
      throw new Error(`Duplicate id in ${kind}: ${entity.id}`);
    }
    seenIds.add(entity.id);
  }
}

function assertReferencesExist(map: WorkspaceEntityMap) {
  for (const schema of Object.values(map.schemas)) {
    for (const fieldId of schema.fieldIds) {
      if (!map.fields[fieldId]) {
        throw new Error(
          `Schema ${schema.id} references unknown field ${fieldId}`,
        );
      }
    }
    for (const refinementId of schema.refinementIds) {
      if (!map.refinements[refinementId]) {
        throw new Error(
          `Schema ${schema.id} references unknown refinement ${refinementId}`,
        );
      }
    }
  }

  for (const field of Object.values(map.fields)) {
    if (!map.schemas[field.schemaId]) {
      throw new Error(
        `Field ${field.id} references unknown schema ${field.schemaId}`,
      );
    }
    if (field.parentFieldId && !map.fields[field.parentFieldId]) {
      throw new Error(
        `Field ${field.id} references unknown parent field ${field.parentFieldId}`,
      );
    }
    if (field.itemFieldId && !map.fields[field.itemFieldId]) {
      throw new Error(
        `Field ${field.id} references unknown item field ${field.itemFieldId}`,
      );
    }
    if (field.childFieldIds) {
      for (const childFieldId of field.childFieldIds) {
        if (!map.fields[childFieldId]) {
          throw new Error(
            `Field ${field.id} references unknown child field ${childFieldId}`,
          );
        }
      }
    }
    for (const derivationId of field.derivationIds) {
      if (!map.derivations[derivationId]) {
        throw new Error(
          `Field ${field.id} references unknown derivation ${derivationId}`,
        );
      }
    }
    for (const refinementId of field.refinementIds) {
      if (!map.refinements[refinementId]) {
        throw new Error(
          `Field ${field.id} references unknown refinement ${refinementId}`,
        );
      }
    }
  }

  for (const derivation of Object.values(map.derivations)) {
    if (!map.schemas[derivation.schemaId]) {
      throw new Error(
        `Derivation ${derivation.id} references unknown schema ${derivation.schemaId}`,
      );
    }
    if (!map.fields[derivation.fieldId]) {
      throw new Error(
        `Derivation ${derivation.id} references unknown field ${derivation.fieldId}`,
      );
    }
  }

  for (const refinement of Object.values(map.refinements)) {
    if (!map.schemas[refinement.schemaId]) {
      throw new Error(
        `Refinement ${refinement.id} references unknown schema ${refinement.schemaId}`,
      );
    }
    if (refinement.fieldId && !map.fields[refinement.fieldId]) {
      throw new Error(
        `Refinement ${refinement.id} references unknown field ${refinement.fieldId}`,
      );
    }
  }

  for (const workflow of Object.values(map.workflows)) {
    for (const nodeId of workflow.nodeIds) {
      if (!map.nodes[nodeId]) {
        throw new Error(
          `Workflow ${workflow.id} references unknown node ${nodeId}`,
        );
      }
    }
    for (const edgeId of workflow.edgeIds) {
      if (!map.edges[edgeId]) {
        throw new Error(
          `Workflow ${workflow.id} references unknown edge ${edgeId}`,
        );
      }
    }
  }

  for (const node of Object.values(map.nodes)) {
    if (!map.workflows[node.workflowId]) {
      throw new Error(
        `Node ${node.id} references unknown workflow ${node.workflowId}`,
      );
    }
    if (!map.actions[node.actionId]) {
      throw new Error(
        `Node ${node.id} references unknown action ${node.actionId}`,
      );
    }
  }

  for (const edge of Object.values(map.edges)) {
    if (!map.workflows[edge.workflowId]) {
      throw new Error(
        `Edge ${edge.id} references unknown workflow ${edge.workflowId}`,
      );
    }
    if (!map.nodes[edge.fromNodeId]) {
      throw new Error(
        `Edge ${edge.id} references unknown from node ${edge.fromNodeId}`,
      );
    }
    if (!map.nodes[edge.toNodeId]) {
      throw new Error(
        `Edge ${edge.id} references unknown to node ${edge.toNodeId}`,
      );
    }
  }

  for (const tab of Object.values(map.tabs)) {
    if (!map.schemas[tab.schemaId]) {
      throw new Error(
        `Tab ${tab.id} references unknown schema ${tab.schemaId}`,
      );
    }
  }
}

export function createWorkspaceEntityMap(
  input: WorkspaceEntityCollectionInput,
): WorkspaceEntityMap {
  const parsed = workspaceEntityCollectionSchema.parse(input);

  assertNoDuplicateIds('schemas', parsed.schemas);
  assertNoDuplicateIds('fields', parsed.fields);
  assertNoDuplicateIds('derivations', parsed.derivations);
  assertNoDuplicateIds('refinements', parsed.refinements);
  assertNoDuplicateIds('workflows', parsed.workflows);
  assertNoDuplicateIds('nodes', parsed.nodes);
  assertNoDuplicateIds('edges', parsed.edges);
  assertNoDuplicateIds('actions', parsed.actions);
  assertNoDuplicateIds('tabs', parsed.tabs);

  const entityMap: WorkspaceEntityMap = {
    schemas: toCanonicalRecord(parsed.schemas),
    fields: toCanonicalRecord(parsed.fields),
    derivations: toCanonicalRecord(parsed.derivations),
    refinements: toCanonicalRecord(parsed.refinements),
    workflows: toCanonicalRecord(parsed.workflows),
    nodes: toCanonicalRecord(parsed.nodes),
    edges: toCanonicalRecord(parsed.edges),
    actions: toCanonicalRecord(parsed.actions),
    tabs: toCanonicalRecord(parsed.tabs),
  };

  assertReferencesExist(entityMap);

  return entityMap;
}

export type WorkspaceWorkflowHook = LifecycleHook;
