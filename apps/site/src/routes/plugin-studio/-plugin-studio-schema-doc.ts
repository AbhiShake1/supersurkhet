import type { SchemaDoc, SchemaFieldDoc, SchemaWorkflowDoc } from '@/lib/plugins/types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSchemaFieldDoc(input: unknown): SchemaFieldDoc | null {
  if (!isRecord(input)) {
    return null;
  }
  const key = typeof input.key === 'string' ? input.key.trim() : '';
  if (!key) {
    return null;
  }

  return input as SchemaFieldDoc;
}

function normalizeSchemaDoc(input: unknown): SchemaDoc | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  const schemaId = typeof input.schemaId === 'string' ? input.schemaId.trim() : '';
  if (!schemaId) {
    return undefined;
  }

  const normalized: SchemaDoc = {
    schemaId,
    fields: Array.isArray(input.fields)
      ? input.fields
        .map(normalizeSchemaFieldDoc)
        .filter((entry): entry is SchemaFieldDoc => entry !== null)
      : [],
  };

  if (typeof input.title === 'string') normalized.title = input.title;
  if (typeof input.description === 'string') normalized.description = input.description;
  if (Array.isArray(input.refinements)) {
    normalized.refinements = input.refinements.filter(isRecord) as SchemaDoc['refinements'];
  }
  if (isRecord(input.tokens)) {
    normalized.tokens = input.tokens as SchemaDoc['tokens'];
  }
  const workflowDiagnostics: string[] = [];
  if (Array.isArray(input.workflows)) {
    const workflows = input.workflows
      .map((entry, index) => normalizeSchemaWorkflowDoc(entry, index, workflowDiagnostics))
      .filter((entry): entry is SchemaWorkflowDoc => entry !== null);
    if (workflows.length > 0) {
      normalized.workflows = workflows;
    }
  }
  if (workflowDiagnostics.length > 0) {
    console.warn(
      `[plugin-studio] filtered malformed schema workflows for "${schemaId}": ${workflowDiagnostics.join('; ')}`,
    );
  }

  return normalized;
}

export function parseStoredSchemaDoc(doc: unknown): SchemaDoc | undefined {
  if (typeof doc === 'string') {
    try {
      return normalizeSchemaDoc(JSON.parse(doc));
    } catch {
      return undefined;
    }
  }
  return normalizeSchemaDoc(doc);
}

function normalizeSchemaWorkflowDoc(
  input: unknown,
  index: number,
  diagnostics: string[],
): SchemaWorkflowDoc | null {
  if (!isRecord(input)) {
    diagnostics.push(`workflows[${index}] is not an object`);
    return null;
  }
  const workflowId = typeof input.workflowId === 'string' ? input.workflowId.trim() : '';
  const hook = typeof input.hook === 'string' ? input.hook.trim() : '';
  if (!workflowId || !hook) {
    diagnostics.push(`workflows[${index}] missing workflowId/hook`);
    return null;
  }
  if (!Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    diagnostics.push(`workflows[${index}] missing nodes/edges arrays`);
    return null;
  }

  return input as SchemaWorkflowDoc;
}
