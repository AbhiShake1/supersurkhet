import type { SchemaDoc, SchemaFieldDoc } from '@/lib/plugins/types';

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
