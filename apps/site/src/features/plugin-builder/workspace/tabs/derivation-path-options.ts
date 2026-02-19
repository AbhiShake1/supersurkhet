import type { SchemaDoc, SchemaFieldDoc } from '@/lib/plugins/types';

export type DerivationPathOption = {
  value: string;
  label: string;
};

export type DerivationSource =
  | 'payload'
  | 'formValues'
  | 'context'
  | 'sourceRow'
  | 'row';

export function buildDerivationPathOptions(
  schemaDocs: readonly SchemaDoc[],
  source?: DerivationSource,
  currentSchemaFields?: readonly SchemaFieldDoc[],
): DerivationPathOption[] {
  const resolvedSource = source ?? 'payload';

  if (resolvedSource === 'context') {
    return buildContextPathOptions();
  }

  if (resolvedSource === 'formValues' && currentSchemaFields) {
    return buildFormValuesPathOptions(currentSchemaFields);
  }

  return buildSchemaPathOptions(schemaDocs);
}

function buildContextPathOptions(): DerivationPathOption[] {
  return [
    {
      value: 'hook',
      label: 'hook - Lifecycle hook (e.g., beforeCreate, afterUpdate)',
    },
    { value: 'mode', label: 'mode - Execution mode' },
    { value: 'businessId', label: 'businessId - Business identifier' },
    { value: 'table', label: 'table - Target table name' },
    { value: 'capabilities', label: 'capabilities - Available capabilities' },
  ];
}

function buildFormValuesPathOptions(
  fields: readonly SchemaFieldDoc[],
): DerivationPathOption[] {
  const seenValues = new Set<string>();
  const options: DerivationPathOption[] = [];

  for (const field of fields) {
    appendFieldPathOptions({
      field,
      prefix: [],
      schemaId: 'formValues',
      options,
      seenValues,
    });
  }

  return options;
}

function buildSchemaPathOptions(
  schemaDocs: readonly SchemaDoc[],
): DerivationPathOption[] {
  const seenValues = new Set<string>();
  const options: DerivationPathOption[] = [];

  for (const schemaDoc of schemaDocs) {
    const schemaId = normalizeSegment(schemaDoc.schemaId) || 'schema';
    for (const field of schemaDoc.fields ?? []) {
      appendFieldPathOptions({
        field,
        prefix: [],
        schemaId,
        options,
        seenValues,
      });
    }
  }

  return options;
}

function appendFieldPathOptions(input: {
  field: SchemaFieldDoc;
  prefix: string[];
  schemaId: string;
  options: DerivationPathOption[];
  seenValues: Set<string>;
}) {
  const key = normalizeSegment(input.field.key);
  if (!key) {
    return;
  }

  const currentPath = [...input.prefix, key];
  addOption(currentPath, input.schemaId, input.options, input.seenValues);

  const nestedFields = Array.isArray(input.field.fields)
    ? input.field.fields
    : [];
  for (const nestedField of nestedFields) {
    appendFieldPathOptions({
      ...input,
      field: nestedField,
      prefix: currentPath,
    });
  }

  const itemType = readArrayItemType(input.field);
  if (!itemType) {
    return;
  }

  const itemPath = [...currentPath, 'item'];
  addOption(itemPath, input.schemaId, input.options, input.seenValues);

  const itemFields = Array.isArray(itemType.fields) ? itemType.fields : [];
  for (const nestedItemField of itemFields) {
    appendFieldPathOptions({
      ...input,
      field: nestedItemField,
      prefix: itemPath,
    });
  }
}

function addOption(
  path: string[],
  schemaId: string,
  options: DerivationPathOption[],
  seenValues: Set<string>,
) {
  const value = path.join('.');
  if (!value || seenValues.has(value)) {
    return;
  }

  seenValues.add(value);
  options.push({
    value,
    label: `${schemaId}.${value}`,
  });
}

function readArrayItemType(
  field: SchemaFieldDoc,
): { fields?: readonly SchemaFieldDoc[] } | null {
  if (
    field.type !== 'array' ||
    !field.itemType ||
    typeof field.itemType !== 'object'
  ) {
    return null;
  }

  return field.itemType as { fields?: readonly SchemaFieldDoc[] };
}

function normalizeSegment(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}
