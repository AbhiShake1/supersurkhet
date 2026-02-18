import type { AdminTabDoc, SchemaDoc, WorkflowDoc } from '@/lib/plugins/types';

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DraftWorkspaceState = {
  draftId: string;
  pluginId: string;
  title?: string;
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
  collaboration?: unknown;
};

export type DraftRevisionSnapshot = {
  draftId: string;
  pluginId: string;
  docs?: {
    title?: string;
  };
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
};

export type DraftRevisionSnapshotMapperResult = {
  snapshot: DraftRevisionSnapshot;
  manifestPayload: {
    pluginId: string;
    version: string;
    docs?: {
      title?: string;
    };
    actionManifest: [];
    schemaDocs?: SchemaDoc[];
    workflows?: WorkflowDoc[];
    adminTabs?: AdminTabDoc[];
  };
  artifactPayload: {
    schemaDocs?: SchemaDoc[];
    workflows?: WorkflowDoc[];
    adminTabs?: AdminTabDoc[];
  };
  manifestHashInput: string;
  artifactHashInput: string;
};

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`Expected non-empty ${field}`);
  }
}

function assertUniqueIds(items: string[], label: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      throw new Error(`Found duplicate ${label}: ${item}`);
    }
    seen.add(item);
  }
}

function compareNullableStrings(a: string | undefined, b: string | undefined) {
  return (a ?? '').localeCompare(b ?? '');
}

function sortByStableJson<T>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    canonicalizeJson(a).localeCompare(canonicalizeJson(b)),
  );
}

function mapSchemaDoc(schemaDoc: SchemaDoc): SchemaDoc {
  assertNonEmpty(schemaDoc.schemaId, 'schemaId');
  const fields = sortByStableJson(
    (schemaDoc.fields ?? []).map((field) => ({
      key: field.key,
      type: field.type,
      label: field.label,
      description: field.description,
      optional: field.optional,
      defaultValue: field.defaultValue,
      enumValues: field.enumValues ? [...field.enumValues].sort() : undefined,
      itemType: field.itemType
        ? {
            type: field.itemType.type,
            label: field.itemType.label,
            description: field.itemType.description,
            optional: field.itemType.optional,
            defaultValue: field.itemType.defaultValue,
            enumValues: field.itemType.enumValues
              ? [...field.itemType.enumValues].sort()
              : undefined,
            itemType: field.itemType.itemType,
            fields: field.itemType.fields,
            tokens: field.itemType.tokens,
            behavior: field.itemType.behavior,
            rules: field.itemType.rules,
          }
        : undefined,
      fields: field.fields ? sortByStableJson(field.fields) : undefined,
      tokens: field.tokens,
      behavior: field.behavior
        ? {
            fieldConfig: field.behavior.fieldConfig,
            derivations: field.behavior.derivations
              ? sortByStableJson(field.behavior.derivations)
              : undefined,
            refinements: field.behavior.refinements
              ? sortByStableJson(field.behavior.refinements)
              : undefined,
          }
        : undefined,
      rules: field.rules ? sortByStableJson(field.rules) : undefined,
    })),
  );

  return {
    schemaId: schemaDoc.schemaId,
    title: schemaDoc.title,
    description: schemaDoc.description,
    fields,
    refinements: schemaDoc.refinements
      ? sortByStableJson(schemaDoc.refinements)
      : undefined,
    tokens: schemaDoc.tokens,
  };
}

function mapWorkflowDoc(workflow: WorkflowDoc): WorkflowDoc {
  assertNonEmpty(workflow.workflowId, 'workflowId');
  const nodes = [...(workflow.nodes ?? [])]
    .map((node) => ({
      nodeId: node.nodeId,
      type: node.type,
      actionId: node.actionId,
      input: node.input,
      runIf: node.runIf,
    }))
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  assertUniqueIds(
    nodes.map((node) => node.nodeId),
    'workflow nodeId',
  );

  const edges = [...(workflow.edges ?? [])]
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      condition: edge.condition,
      conditionToken: edge.conditionToken,
    }))
    .sort((a, b) => {
      const fromCmp = a.from.localeCompare(b.from);
      if (fromCmp !== 0) return fromCmp;
      const toCmp = a.to.localeCompare(b.to);
      if (toCmp !== 0) return toCmp;
      return compareNullableStrings(a.conditionToken, b.conditionToken);
    });

  return {
    workflowId: workflow.workflowId,
    title: workflow.title,
    table: workflow.table,
    hook: workflow.hook,
    nodes,
    edges,
  };
}

function mapAdminTab(tab: AdminTabDoc): AdminTabDoc {
  return {
    schema: tab.schema,
    title: tab.title,
    group: tab.group,
    icon: tab.icon,
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

export function mapDraftRevisionSnapshot(
  workspace: DraftWorkspaceState,
): DraftRevisionSnapshotMapperResult {
  assertNonEmpty(workspace.draftId, 'draftId');
  assertNonEmpty(workspace.pluginId, 'pluginId');

  const schemaDocs = [...(workspace.schemaDocs ?? [])]
    .map((schemaDoc) => mapSchemaDoc(schemaDoc))
    .sort((a, b) => a.schemaId.localeCompare(b.schemaId));
  assertUniqueIds(
    schemaDocs.map((schemaDoc) => schemaDoc.schemaId),
    'schemaId',
  );

  const workflows = [...(workspace.workflows ?? [])]
    .map((workflow) => mapWorkflowDoc(workflow))
    .sort((a, b) => a.workflowId.localeCompare(b.workflowId));
  assertUniqueIds(
    workflows.map((workflow) => workflow.workflowId),
    'workflowId',
  );

  const adminTabs = [...(workspace.adminTabs ?? [])]
    .map((tab) => mapAdminTab(tab))
    .sort((a, b) => {
      const schemaCmp = a.schema.localeCompare(b.schema);
      if (schemaCmp !== 0) return schemaCmp;
      return compareNullableStrings(a.title, b.title);
    });

  const docs = workspace.title ? { title: workspace.title } : undefined;

  const snapshot: DraftRevisionSnapshot = {
    draftId: workspace.draftId,
    pluginId: workspace.pluginId,
    docs,
    schemaDocs: schemaDocs.length ? schemaDocs : undefined,
    workflows: workflows.length ? workflows : undefined,
    adminTabs: adminTabs.length ? adminTabs : undefined,
  };

  const artifactPayload = {
    schemaDocs: snapshot.schemaDocs,
    workflows: snapshot.workflows,
    adminTabs: snapshot.adminTabs,
  };
  const manifestPayload = {
    pluginId: snapshot.pluginId,
    version: snapshot.draftId,
    docs: snapshot.docs,
    actionManifest: [],
    schemaDocs: snapshot.schemaDocs,
    workflows: snapshot.workflows,
    adminTabs: snapshot.adminTabs,
  };

  return {
    snapshot,
    manifestPayload,
    artifactPayload,
    manifestHashInput: canonicalizeJson(manifestPayload),
    artifactHashInput: canonicalizeJson(artifactPayload),
  };
}
