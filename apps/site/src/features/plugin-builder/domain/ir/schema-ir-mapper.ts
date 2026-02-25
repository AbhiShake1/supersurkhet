import {
  BUILTIN_SCHEMA_FIELD_TYPES,
  type DeriveIR,
  type ExpressionDoc,
  type ExpressionOpDoc,
  type ExpressionRefDoc,
  type FieldConfigIR,
  type JsonPrimitive,
  type JsonValue,
  type RefineIssueIR,
  type SchemaBehaviorIR,
  type SchemaDoc,
  type SchemaFieldDoc,
  type SchemaFieldType,
} from '@supersurkhet/sdk';

const SUPPORTED_SCHEMA_FIELD_TYPES = new Set<SchemaFieldType>([
  ...BUILTIN_SCHEMA_FIELD_TYPES,
  'enum',
  'array',
  'object',
]);

export type WorkspaceExpression =
  | {
      kind: 'literal';
      value: JsonPrimitive;
    }
  | {
      kind: 'ref';
      source: ExpressionRefDoc['source'];
      path: string[];
    }
  | {
      kind: 'array';
      items: WorkspaceExpression[];
    }
  | {
      kind: 'object';
      value: Record<string, WorkspaceExpression>;
    }
  | {
      kind: 'op';
      op: ExpressionOpDoc['op'];
      args: WorkspaceExpression[];
    };

export type WorkspaceFieldConfig = {
  fieldType?: SchemaFieldType;
  label?: string;
  description?: string;
  inputProps?: Record<string, JsonValue | WorkspaceExpression>;
  customData?: Record<string, JsonValue | WorkspaceExpression>;
};

export type WorkspaceDerive = {
  target: DeriveIR['target'];
  key?: string;
  expression: WorkspaceExpression;
};

export type WorkspaceRefineIssue = {
  code?: RefineIssueIR['code'];
  path?: string[];
  message: string;
  when: WorkspaceExpression;
};

export type WorkspaceSchemaBehavior = {
  fieldConfig?: WorkspaceFieldConfig;
  derivations?: WorkspaceDerive[];
  refinements?: WorkspaceRefineIssue[];
};

export type WorkspaceSchemaField = {
  key: string;
  type: SchemaFieldType;
  label?: string;
  description?: string;
  optional?: boolean;
  defaultValue?: JsonValue;
  enumValues?: string[];
  itemType?: WorkspaceSchemaFieldItem;
  fields?: WorkspaceSchemaField[];
  tokens?: Record<string, JsonValue>;
  behavior?: WorkspaceSchemaBehavior;
  rules?: SchemaFieldDoc['rules'];
};

export type WorkspaceSchemaFieldItem = Omit<WorkspaceSchemaField, 'key'>;

export type WorkspaceSchema = {
  schemaId: string;
  title?: string;
  description?: string;
  fields: WorkspaceSchemaField[];
  refinements?: WorkspaceRefineIssue[];
  tokens?: Record<string, JsonValue>;
};

export type SchemaIrMapperDiagnostic = {
  code: 'unsupported-field-type' | 'unsupported-expression';
  message: string;
  path: string[];
};

export type WorkspaceFromSchemaDocsResult = {
  workspaceSchemas: WorkspaceSchema[];
  diagnostics: SchemaIrMapperDiagnostic[];
};

export type SchemaDocsFromWorkspaceResult = {
  schemaDocs: SchemaDoc[];
  diagnostics: SchemaIrMapperDiagnostic[];
};

export function mapSchemaDocsToWorkspace(
  schemaDocs: readonly SchemaDoc[],
): WorkspaceFromSchemaDocsResult {
  const diagnostics: SchemaIrMapperDiagnostic[] = [];

  const workspaceSchemas = schemaDocs.map((schemaDoc) => ({
    schemaId: schemaDoc.schemaId,
    title: schemaDoc.title,
    description: schemaDoc.description,
    fields: mapSchemaFieldsToWorkspace(
      schemaDoc.fields,
      diagnostics,
      ['workspaceSchemas', schemaDoc.schemaId, 'fields'],
    ),
    refinements: mapRefinementsToWorkspace(
      schemaDoc.refinements,
      diagnostics,
      ['workspaceSchemas', schemaDoc.schemaId, 'refinements'],
    ),
    tokens: schemaDoc.tokens,
  }));

  return {
    workspaceSchemas,
    diagnostics,
  };
}

export function mapWorkspaceSchemasToSchemaDocs(
  workspaceSchemas: readonly WorkspaceSchema[],
): SchemaDocsFromWorkspaceResult {
  const diagnostics: SchemaIrMapperDiagnostic[] = [];

  const schemaDocs = workspaceSchemas.map((workspaceSchema) => ({
    schemaId: workspaceSchema.schemaId,
    title: workspaceSchema.title,
    description: workspaceSchema.description,
    fields: mapWorkspaceFieldsToSchema(
      workspaceSchema.fields,
      diagnostics,
      ['schemaDocs', workspaceSchema.schemaId, 'fields'],
    ),
    refinements: mapRefinementsToSchema(
      workspaceSchema.refinements,
      diagnostics,
      ['schemaDocs', workspaceSchema.schemaId, 'refinements'],
    ),
    tokens: workspaceSchema.tokens,
  }));

  return {
    schemaDocs,
    diagnostics,
  };
}

function mapSchemaFieldsToWorkspace(
  fields: readonly SchemaFieldDoc[],
  diagnostics: SchemaIrMapperDiagnostic[],
  basePath: string[],
): WorkspaceSchemaField[] {
  const mappedFields: WorkspaceSchemaField[] = [];

  for (const field of fields) {
    const fieldPath = [...basePath, field.key];

    if (!isSupportedFieldType(field.type)) {
      diagnostics.push({
        code: 'unsupported-field-type',
        message: `Unsupported sdk field type "${field.type}"`,
        path: fieldPath,
      });
      continue;
    }

    const itemType = mapSchemaFieldItemToWorkspace(
      field.itemType,
      diagnostics,
      [...fieldPath, 'itemType'],
    );
    const nestedFields = mapSchemaFieldsToWorkspace(field.fields ?? [], diagnostics, [
      ...fieldPath,
      'fields',
    ]);
    const behavior = mapBehaviorToWorkspace(field.behavior, diagnostics, [
      ...fieldPath,
      'behavior',
    ]);

    mappedFields.push({
      key: field.key,
      type: field.type,
      label: field.label,
      description: field.description,
      optional: field.optional,
      defaultValue: field.defaultValue,
      enumValues: field.enumValues,
      itemType,
      fields: nestedFields.length > 0 ? nestedFields : undefined,
      tokens: field.tokens,
      behavior,
      rules: field.rules,
    });
  }

  return mappedFields;
}

function mapWorkspaceFieldsToSchema(
  fields: readonly WorkspaceSchemaField[],
  diagnostics: SchemaIrMapperDiagnostic[],
  basePath: string[],
): SchemaFieldDoc[] {
  const mappedFields: SchemaFieldDoc[] = [];

  for (const field of fields) {
    const fieldPath = [...basePath, field.key];

    if (!isSupportedFieldType(field.type)) {
      diagnostics.push({
        code: 'unsupported-field-type',
        message: `Unsupported workspace field type "${field.type}"`,
        path: fieldPath,
      });
      // Collect nested expression diagnostics even when dropping the field.
      mapBehaviorToSchema(field.behavior, diagnostics, [...fieldPath, 'behavior']);
      continue;
    }

    const behavior = mapBehaviorToSchema(field.behavior, diagnostics, [
      ...fieldPath,
      'behavior',
    ]);

    const itemType = mapWorkspaceFieldItemToSchema(
      field.itemType,
      diagnostics,
      [...fieldPath, 'itemType'],
    );
    const nestedFields = mapWorkspaceFieldsToSchema(field.fields ?? [], diagnostics, [
      ...fieldPath,
      'fields',
    ]);

    mappedFields.push({
      key: field.key,
      type: field.type,
      label: field.label,
      description: field.description,
      optional: field.optional,
      defaultValue: field.defaultValue,
      enumValues: field.enumValues,
      itemType,
      fields: nestedFields.length > 0 ? nestedFields : undefined,
      tokens: field.tokens,
      behavior,
      rules: field.rules,
    });
  }

  return mappedFields;
}

function mapSchemaFieldItemToWorkspace(
  itemType: SchemaFieldDoc['itemType'] | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceSchemaFieldItem | undefined {
  if (!itemType) {
    return undefined;
  }

  if (!isSupportedFieldType(itemType.type)) {
    diagnostics.push({
      code: 'unsupported-field-type',
      message: `Unsupported sdk field type "${itemType.type}"`,
      path,
    });
    return undefined;
  }

  const nestedFields = mapSchemaFieldsToWorkspace(itemType.fields ?? [], diagnostics, [
    ...path,
    'fields',
  ]);
  const behavior = mapBehaviorToWorkspace(itemType.behavior, diagnostics, [
    ...path,
    'behavior',
  ]);

  return {
    type: itemType.type,
    label: itemType.label,
    description: itemType.description,
    optional: itemType.optional,
    defaultValue: itemType.defaultValue,
    enumValues: itemType.enumValues,
    itemType: mapSchemaFieldItemToWorkspace(
      itemType.itemType,
      diagnostics,
      [...path, 'itemType'],
    ),
    fields: nestedFields.length > 0 ? nestedFields : undefined,
    tokens: itemType.tokens,
    behavior,
    rules: itemType.rules,
  };
}

function mapWorkspaceFieldItemToSchema(
  itemType: WorkspaceSchemaFieldItem | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): SchemaFieldDoc['itemType'] | undefined {
  if (!itemType) {
    return undefined;
  }

  if (!isSupportedFieldType(itemType.type)) {
    diagnostics.push({
      code: 'unsupported-field-type',
      message: `Unsupported workspace field type "${itemType.type}"`,
      path,
    });
    mapBehaviorToSchema(itemType.behavior, diagnostics, [...path, 'behavior']);
    return undefined;
  }

  const behavior = mapBehaviorToSchema(itemType.behavior, diagnostics, [
    ...path,
    'behavior',
  ]);

  const nestedFields = mapWorkspaceFieldsToSchema(itemType.fields ?? [], diagnostics, [
    ...path,
    'fields',
  ]);

  return {
    type: itemType.type,
    label: itemType.label,
    description: itemType.description,
    optional: itemType.optional,
    defaultValue: itemType.defaultValue,
    enumValues: itemType.enumValues,
    itemType: mapWorkspaceFieldItemToSchema(
      itemType.itemType,
      diagnostics,
      [...path, 'itemType'],
    ),
    fields: nestedFields.length > 0 ? nestedFields : undefined,
    tokens: itemType.tokens,
    behavior,
    rules: itemType.rules,
  };
}

function mapBehaviorToWorkspace(
  behavior: SchemaBehaviorIR | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceSchemaBehavior | undefined {
  if (!behavior) {
    return undefined;
  }

  const fieldConfig = mapFieldConfigToWorkspace(behavior.fieldConfig, diagnostics, [
    ...path,
    'fieldConfig',
  ]);
  const derivations = mapDerivationsToWorkspace(behavior.derivations, diagnostics, [
    ...path,
    'derivations',
  ]);
  const refinements = mapRefinementsToWorkspace(behavior.refinements, diagnostics, [
    ...path,
    'refinements',
  ]);

  if (!fieldConfig && !derivations && !refinements) {
    return undefined;
  }

  return {
    fieldConfig,
    derivations,
    refinements,
  };
}

function mapBehaviorToSchema(
  behavior: WorkspaceSchemaBehavior | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): SchemaBehaviorIR | undefined {
  if (!behavior) {
    return undefined;
  }

  const fieldConfig = mapFieldConfigToSchema(behavior.fieldConfig, diagnostics, [
    ...path,
    'fieldConfig',
  ]);
  const derivations = mapDerivationsToSchema(behavior.derivations, diagnostics, [
    ...path,
    'derivations',
  ]);
  const refinements = mapRefinementsToSchema(behavior.refinements, diagnostics, [
    ...path,
    'refinements',
  ]);

  if (!fieldConfig && !derivations && !refinements) {
    return undefined;
  }

  return {
    fieldConfig,
    derivations,
    refinements,
  };
}

function mapFieldConfigToWorkspace(
  fieldConfig: FieldConfigIR | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceFieldConfig | undefined {
  if (!fieldConfig) {
    return undefined;
  }

  const inputProps = mapRecordValueToWorkspace(
    fieldConfig.inputProps,
    diagnostics,
    [...path, 'inputProps'],
  );
  const customData = mapRecordValueToWorkspace(
    fieldConfig.customData,
    diagnostics,
    [...path, 'customData'],
  );

  if (
    fieldConfig.fieldType === undefined &&
    fieldConfig.label === undefined &&
    fieldConfig.description === undefined &&
    inputProps === undefined &&
    customData === undefined
  ) {
    return undefined;
  }

  return {
    fieldType: fieldConfig.fieldType,
    label: fieldConfig.label,
    description: fieldConfig.description,
    inputProps,
    customData,
  };
}

function mapFieldConfigToSchema(
  fieldConfig: WorkspaceFieldConfig | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): FieldConfigIR | undefined {
  if (!fieldConfig) {
    return undefined;
  }

  const inputProps = mapRecordValueToSchema(
    fieldConfig.inputProps,
    diagnostics,
    [...path, 'inputProps'],
  );
  const customData = mapRecordValueToSchema(
    fieldConfig.customData,
    diagnostics,
    [...path, 'customData'],
  );

  if (
    fieldConfig.fieldType === undefined &&
    fieldConfig.label === undefined &&
    fieldConfig.description === undefined &&
    inputProps === undefined &&
    customData === undefined
  ) {
    return undefined;
  }

  return {
    fieldType: fieldConfig.fieldType,
    label: fieldConfig.label,
    description: fieldConfig.description,
    inputProps,
    customData,
  };
}

function mapDerivationsToWorkspace(
  derivations: readonly DeriveIR[] | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceDerive[] | undefined {
  if (!derivations) {
    return undefined;
  }

  const mapped: WorkspaceDerive[] = [];

  for (const [index, derivation] of derivations.entries()) {
    const expression = mapExpressionToWorkspace(
      derivation.expression,
      diagnostics,
      [...path, String(index), 'expression'],
    );

    if (!expression) {
      continue;
    }

    mapped.push({
      target: derivation.target,
      key: derivation.key,
      expression,
    });
  }

  return mapped.length > 0 ? mapped : undefined;
}

function mapDerivationsToSchema(
  derivations: readonly WorkspaceDerive[] | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): DeriveIR[] | undefined {
  if (!derivations) {
    return undefined;
  }

  const mapped: DeriveIR[] = [];

  for (const [index, derivation] of derivations.entries()) {
    const expression = mapExpressionToSchema(
      derivation.expression,
      diagnostics,
      [...path, String(index), 'expression'],
    );

    if (expression === undefined) {
      continue;
    }

    mapped.push({
      target: derivation.target,
      key: derivation.key,
      expression,
    });
  }

  return mapped.length > 0 ? mapped : undefined;
}

function mapRefinementsToWorkspace(
  refinements: readonly RefineIssueIR[] | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceRefineIssue[] | undefined {
  if (!refinements) {
    return undefined;
  }

  const mapped: WorkspaceRefineIssue[] = [];

  for (const [index, refinement] of refinements.entries()) {
    const when = mapExpressionToWorkspace(refinement.when, diagnostics, [
      ...path,
      String(index),
      'when',
    ]);

    if (!when) {
      continue;
    }

    mapped.push({
      code: refinement.code,
      path: refinement.path,
      message: refinement.message,
      when,
    });
  }

  return mapped.length > 0 ? mapped : undefined;
}

function mapRefinementsToSchema(
  refinements: readonly WorkspaceRefineIssue[] | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): RefineIssueIR[] | undefined {
  if (!refinements) {
    return undefined;
  }

  const mapped: RefineIssueIR[] = [];

  for (const [index, refinement] of refinements.entries()) {
    const when = mapExpressionToSchema(refinement.when, diagnostics, [
      ...path,
      String(index),
      'when',
    ]);

    if (when === undefined) {
      continue;
    }

    mapped.push({
      code: refinement.code,
      path: refinement.path,
      message: refinement.message,
      when,
    });
  }

  return mapped.length > 0 ? mapped : undefined;
}

function mapRecordValueToWorkspace(
  record: Record<string, JsonValue | ExpressionDoc> | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): Record<string, JsonValue | WorkspaceExpression> | undefined {
  if (!record) {
    return undefined;
  }

  const next: Record<string, JsonValue | WorkspaceExpression> = {};

  for (const [key, value] of Object.entries(record)) {
    if (isExpressionDocNode(value)) {
      const mappedExpression = mapExpressionToWorkspace(value, diagnostics, [
        ...path,
        key,
      ]);

      if (mappedExpression) {
        next[key] = mappedExpression;
      }
      continue;
    }

    next[key] = value as JsonValue;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function mapRecordValueToSchema(
  record: Record<string, JsonValue | WorkspaceExpression> | undefined,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): Record<string, JsonValue | ExpressionDoc> | undefined {
  if (!record) {
    return undefined;
  }

  const next: Record<string, JsonValue | ExpressionDoc> = {};

  for (const [key, value] of Object.entries(record)) {
    if (isWorkspaceExpression(value)) {
      const mappedExpression = mapExpressionToSchema(value, diagnostics, [
        ...path,
        key,
      ]);

      if (mappedExpression !== undefined) {
        next[key] = mappedExpression;
      }
      continue;
    }

    next[key] = value as JsonValue;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function mapExpressionToWorkspace(
  expression: ExpressionDoc,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): WorkspaceExpression | undefined {
  if (
    typeof expression === 'string' ||
    typeof expression === 'number' ||
    typeof expression === 'boolean' ||
    expression === null
  ) {
    return {
      kind: 'literal',
      value: expression,
    };
  }

  if (expression.kind === 'ref') {
    return {
      kind: 'ref',
      source: expression.source,
      path: expression.path,
    };
  }

  if (expression.kind === 'op') {
    return {
      kind: 'op',
      op: expression.op,
      args: expression.args
        .map((arg, index) =>
          mapExpressionToWorkspace(arg, diagnostics, [
            ...path,
            'args',
            String(index),
          ]),
        )
        .filter((arg): arg is WorkspaceExpression => arg !== undefined),
    };
  }

  if (expression.kind === 'array') {
    return {
      kind: 'array',
      items: expression.items
        .map((item, index) =>
          mapExpressionToWorkspace(item, diagnostics, [
            ...path,
            'items',
            String(index),
          ]),
        )
        .filter((item): item is WorkspaceExpression => item !== undefined),
    };
  }

  if (expression.kind === 'object') {
    const value: Record<string, WorkspaceExpression> = {};

    for (const [key, nested] of Object.entries(expression.value)) {
      const mapped = mapExpressionToWorkspace(nested, diagnostics, [
        ...path,
        'value',
        key,
      ]);

      if (mapped) {
        value[key] = mapped;
      }
    }

    return {
      kind: 'object',
      value,
    };
  }

  diagnostics.push({
    code: 'unsupported-expression',
    message: `Unsupported sdk expression node "${(expression as { kind?: string }).kind ?? 'unknown'}"`,
    path,
  });
  return undefined;
}

function mapExpressionToSchema(
  expression: WorkspaceExpression,
  diagnostics: SchemaIrMapperDiagnostic[],
  path: string[],
): ExpressionDoc | undefined {
  if (expression.kind === 'literal') {
    return expression.value;
  }

  if (expression.kind === 'ref') {
    return {
      kind: 'ref',
      source: expression.source,
      path: expression.path,
    };
  }

  if (expression.kind === 'op') {
    const args = expression.args
      .map((arg, index) =>
        mapExpressionToSchema(arg, diagnostics, [...path, 'args', String(index)]),
      )
      .filter((arg): arg is ExpressionDoc => arg !== undefined);

    return {
      kind: 'op',
      op: expression.op,
      args,
    };
  }

  if (expression.kind === 'array') {
    const items = expression.items
      .map((item, index) =>
        mapExpressionToSchema(item, diagnostics, [...path, 'items', String(index)]),
      )
      .filter((item): item is ExpressionDoc => item !== undefined);

    return {
      kind: 'array',
      items,
    };
  }

  if (expression.kind === 'object') {
    const value: Record<string, ExpressionDoc> = {};

    for (const [key, nested] of Object.entries(expression.value)) {
      const mapped = mapExpressionToSchema(nested, diagnostics, [
        ...path,
        'value',
        key,
      ]);

      if (mapped !== undefined) {
        value[key] = mapped;
      }
    }

    return {
      kind: 'object',
      value,
    };
  }

  diagnostics.push({
    code: 'unsupported-expression',
    message: `Unsupported workspace expression node "${(expression as { kind?: string }).kind ?? 'unknown'}"`,
    path,
  });
  return undefined;
}

function isExpressionDocNode(value: unknown): value is Exclude<ExpressionDoc, JsonPrimitive> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === 'ref' ||
    kind === 'op' ||
    kind === 'array' ||
    kind === 'object'
  );
}

function isWorkspaceExpression(value: unknown): value is WorkspaceExpression {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === 'literal' ||
    kind === 'ref' ||
    kind === 'op' ||
    kind === 'array' ||
    kind === 'object'
  );
}

function isSupportedFieldType(type: string): type is SchemaFieldType {
  return SUPPORTED_SCHEMA_FIELD_TYPES.has(type as SchemaFieldType);
}
