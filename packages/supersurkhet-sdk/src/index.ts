export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type ActionSig<In, Out> = {
  input: In;
  output: Out;
};

export type ActionMap = Record<string, ActionSig<unknown, unknown>>;
export type EmptyActionMap = Record<never, never>;

export type ActionRuntimeContext = {
  businessId?: string;
  userId?: string;
  capabilities?: readonly string[];
  signal?: AbortSignal;
};

export type ActionHandler<In, Out> = (
  input: In,
  ctx: ActionRuntimeContext,
) => Promise<Out> | Out;

export type ActionManifestDoc = {
  actionId: string;
  description?: string;
  capabilities?: string[];
  runtime?: 'sandbox-worker' | 'core';
};

export type DefineActionInput<Id extends string, In, Out> = {
  id: Id;
  description?: string;
  capabilities?: string[];
  runtime?: 'sandbox-worker' | 'core';
  handler: ActionHandler<In, Out>;
};

type AnyActionDefinition = DefineActionInput<string, unknown, unknown>;

type InferActionId<TAction> = TAction extends DefineActionInput<infer Id, any, any>
  ? Id
  : never;
type InferActionInput<TAction> = TAction extends DefineActionInput<
  string,
  infer In,
  any
>
  ? In
  : never;
type InferActionOutput<TAction> = TAction extends DefineActionInput<
  string,
  any,
  infer Out
>
  ? Out
  : never;

export interface ActionRegistry<TMap extends ActionMap> {
  defineAction<const TAction extends DefineActionInput<string, any, any>>(
    input: TAction,
  ): ActionRegistry<
    TMap & {
      [K in InferActionId<TAction>]: ActionSig<
        InferActionInput<TAction>,
        InferActionOutput<TAction>
      >;
    }
  >;
  call<Id extends keyof TMap & string>(
    id: Id,
    input: TMap[Id]['input'],
    ctx?: ActionRuntimeContext,
  ): Promise<TMap[Id]['output']>;
  manifest(): ActionManifestDoc[];
}

class ActionRegistryImpl<TMap extends ActionMap>
  implements ActionRegistry<TMap>
{
  private readonly actions: Map<string, AnyActionDefinition>;

  constructor(actions?: Map<string, AnyActionDefinition>) {
    this.actions = actions ? new Map(actions) : new Map();
  }

  defineAction<const TAction extends DefineActionInput<string, any, any>>(
    input: TAction,
  ): ActionRegistry<
    TMap & {
      [K in InferActionId<TAction>]: ActionSig<
        InferActionInput<TAction>,
        InferActionOutput<TAction>
      >;
    }
  > {
    const nextActions = new Map(this.actions);
    nextActions.set(input.id, input as unknown as AnyActionDefinition);
    return new ActionRegistryImpl(nextActions);
  }

  async call<Id extends keyof TMap & string>(
    id: Id,
    input: TMap[Id]['input'],
    ctx: ActionRuntimeContext = {},
  ): Promise<TMap[Id]['output']> {
    const action = this.actions.get(id);
    if (!action) {
      throw new Error(`Unknown action "${id}"`);
    }
    return (await action.handler(input as unknown, ctx)) as Promise<
      TMap[Id]['output']
    >;
  }

  manifest(): ActionManifestDoc[] {
    return [...this.actions.values()].map((action) => ({
      actionId: action.id,
      description: action.description,
      capabilities: action.capabilities ? [...action.capabilities] : undefined,
      runtime: action.runtime ?? 'sandbox-worker',
    }));
  }
}

export function createActionRegistry(): ActionRegistry<EmptyActionMap> {
  return new ActionRegistryImpl();
}

export const BUILTIN_SCHEMA_FIELD_TYPES = [
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
] as const;

export interface SupersurkhetSdkFieldTypeMap {
  FieldTypes?: never;
}

type AugmentedSchemaFieldType = SupersurkhetSdkFieldTypeMap extends {
  FieldTypes: infer TFieldType extends string;
}
  ? TFieldType
  : never;

export type SchemaFieldType =
  | (typeof BUILTIN_SCHEMA_FIELD_TYPES)[number]
  | AugmentedSchemaFieldType
  | 'enum'
  | 'array'
  | 'object';

export type ExpressionSource =
  | 'payload'
  | 'formValues'
  | 'context'
  | 'sourceRow'
  | 'row';

export type ExpressionRefDoc = {
  kind: 'ref';
  source: ExpressionSource;
  path: string[];
};

export type ExpressionOpDoc = {
  kind: 'op';
  op:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'and'
    | 'or'
    | 'not'
    | 'add'
    | 'sub'
    | 'mul'
    | 'div'
    | 'coalesce'
    | 'concat'
    | 'sum'
    | 'if';
  args: ExpressionDoc[];
};

export type ExpressionDoc =
  | JsonPrimitive
  | ExpressionRefDoc
  | {
      kind: 'array';
      items: ExpressionDoc[];
    }
  | {
      kind: 'object';
      value: Record<string, ExpressionDoc>;
    }
  | ExpressionOpDoc;

export type FieldConfigIR = {
  fieldType?: SchemaFieldType;
  label?: string;
  description?: string;
  inputProps?: Record<string, JsonValue | ExpressionDoc>;
  customData?: Record<string, JsonValue | ExpressionDoc>;
};

export type DeriveIR = {
  target: 'value' | 'inputProps' | 'customData';
  key?: string;
  expression: ExpressionDoc;
};

export type RefineIssueIR = {
  code?: 'custom';
  path?: string[];
  message: string;
  when: ExpressionDoc;
};

export type SchemaBehaviorIR = {
  fieldConfig?: FieldConfigIR;
  derivations?: DeriveIR[];
  refinements?: RefineIssueIR[];
};

export type SchemaDoc = {
  schemaId: string;
  title?: string;
  description?: string;
  fields: SchemaFieldDoc[];
  refinements?: RefineIssueIR[];
  tokens?: Record<string, JsonValue>;
};

export type SchemaDataType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';

export type SchemaFieldDoc = {
  key: string;
  /**
   * Data type used for validation/storage semantics.
   */
  dataType?: SchemaDataType;
  /**
   * @deprecated Use dataType for storage semantics.
   */
  type: SchemaFieldType;
  /**
   * UI presentation field type.
   */
  fieldType?: SchemaFieldType;
  label?: string;
  description?: string;
  optional?: boolean;
  defaultValue?: JsonValue;
  enumValues?: string[];
  itemType?: Omit<SchemaFieldDoc, 'key'>;
  fields?: SchemaFieldDoc[];
  tokens?: Record<string, JsonValue>;
  behavior?: SchemaBehaviorIR;
  rules?: SchemaRuleDoc[];
};

export type SchemaRuleDoc = {
  kind: 'min' | 'max' | 'nonnegative' | 'positive' | 'int' | 'customToken';
  value?: number | string;
  token?: string;
  message?: string;
};

export type LifecycleHook =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete';

export type WorkflowNodeInputDoc =
  | JsonValue
  | {
      expression: ExpressionDoc;
    };

export type WorkflowNodeDoc = {
  nodeId: string;
  type: 'action';
  actionId: string;
  input?: WorkflowNodeInputDoc;
  runIf?: ExpressionDoc;
};

export type WorkflowEdgeDoc = {
  from: string;
  to: string;
  condition?: ExpressionDoc;
  conditionToken?: string;
};

export type WorkflowDoc = {
  workflowId: string;
  title?: string;
  table: string;
  hook: LifecycleHook;
  nodes: WorkflowNodeDoc[];
  edges: WorkflowEdgeDoc[];
};

export type PluginReleaseDoc = {
  id: string;
  pluginId: string;
  version: string;
  manifestHash: string;
  artifactHash: string;
  author: {
    userId: string;
    name?: string;
  };
  visibility: 'public';
  docs?: {
    title?: string;
    description?: string;
  };
  actionManifest: ActionManifestDoc[];
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
  publishedAt?: string;
};

export type BusinessPluginInstallDoc = {
  id: string;
  businessId: string;
  pluginId: string;
  version: string;
  manifestHash: string;
  artifactHash: string;
  installedAt: string;
  installedByUserId: string;
  status: 'active' | 'paused';
  requestedCapabilities?: string[];
};

export type PluginProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type PluginProjectDoc = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  gitIntegration?: {
    provider: 'github';
    connectedAt: string;
    account: {
      id: string;
      login: string;
      avatarUrl?: string;
    };
    repositories: Array<{
      id: string;
      name: string;
      fullName: string;
      owner: string;
      defaultBranch: string;
      private: boolean;
      htmlUrl?: string;
      connectedAt: string;
      connectedByUserId: string;
    }>;
  };
  ownerUserId: string;
  visibility: 'private' | 'internal';
  createdAt: string;
  updatedAt: string;
};

export type PluginProjectMemberDoc = {
  id: string;
  projectId: string;
  userId: string;
  role: PluginProjectRole;
  invitedByUserId?: string;
  joinedAt: string;
};

export type PluginProjectInviteDoc = {
  id: string;
  projectId: string;
  email: string;
  role: PluginProjectRole;
  status: 'pending' | 'accepted' | 'revoked';
  token: string;
  invitedByUserId: string;
  invitedAt: string;
  expiresAt?: string;
  acceptedByUserId?: string;
  acceptedAt?: string;
};

export type PluginDraftDoc = {
  draftId: string;
  projectId?: string;
  pluginId: string;
  ownerUserId: string;
  collaboratorUserIds?: string[];
  status: 'active' | 'archived';
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type PluginDraftRevisionDoc = {
  revisionId: string;
  draftId: string;
  pluginId: string;
  manifestHash: string;
  artifactHash: string;
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
  createdAt: string;
  createdByUserId: string;
};

export type BusinessPluginDraftInstallDoc = {
  id: string;
  businessId: string;
  pluginId: string;
  draftId: string;
  revisionId: string;
  teamId: string;
  manifestHash: string;
  artifactHash: string;
  installedAt: string;
  installedByUserId: string;
  status: 'active' | 'paused';
};

export type PluginRecordDoc = {
  id: string;
  businessId: string;
  pluginId: string;
  schemaId: string;
  rowId: string;
  namespacePath: string;
  payload: JsonValue;
  createdAt: string;
  updatedAt: string;
};

export type AdminTabDoc = {
  schema: string;
  title?: string;
  group?: string;
  icon?: string;
};

export type PluginDefinition<TMap extends ActionMap = EmptyActionMap> = {
  pluginId: string;
  version: string;
  docs?: {
    title?: string;
    description?: string;
  };
  actions?: ActionRegistry<TMap>;
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
};

export function definePlugin<T extends PluginDefinition>(plugin: T): T {
  return plugin;
}

export function defineSchemaDoc<T extends SchemaDoc>(doc: T): T {
  return doc;
}

export function defineWorkflowDoc<T extends WorkflowDoc>(doc: T): T {
  return doc;
}

export type DefineZodSchemaDocInput<TSchema extends ZodLikeObjectSchema = ZodLikeObjectSchema> = {
  schemaId: string;
  schema: TSchema;
  title?: string;
  description?: string;
  tokens?: Record<string, JsonValue>;
};

export type InferSchemaType<TInput extends DefineZodSchemaDocInput> = TInput['schema'] extends {
  _output: infer TOutput;
}
  ? TOutput
  : unknown;

type ZodLikeType = {
  _def?: {
    typeName?: string;
    schema?: ZodLikeType;
    innerType?: ZodLikeType;
    shape?: (() => Record<string, ZodLikeType>) | Record<string, ZodLikeType>;
    checks?: Array<{
      kind?: string;
      value?: number;
      message?: string;
    }>;
    values?: Set<string>;
  };
  unwrap?: () => ZodLikeType;
  isOptional?: () => boolean;
  shape?: Record<string, ZodLikeType>;
  element?: ZodLikeType;
  options?: readonly string[];
};

export type ZodLikeObjectSchema = ZodLikeType & {
  shape?: Record<string, ZodLikeType>;
  _def?: {
    shape?: (() => Record<string, ZodLikeType>) | Record<string, ZodLikeType>;
  } & ZodLikeType['_def'];
};

const zodTypeName = (schema: ZodLikeType): string | undefined => schema._def?.typeName;

const isWrappedZodType = (schema: ZodLikeType): boolean =>
  zodTypeName(schema) === 'ZodOptional' ||
  zodTypeName(schema) === 'ZodNullable' ||
  zodTypeName(schema) === 'ZodDefault' ||
  zodTypeName(schema) === 'ZodEffects';

const unwrappedZodType = (schema: ZodLikeType): ZodLikeType => {
  if (!isWrappedZodType(schema)) {
    return schema;
  }

  const unwrapped =
    schema.unwrap?.() ?? schema._def?.innerType ?? schema._def?.schema ?? schema;

  if (unwrapped === schema) {
    return schema;
  }

  return unwrappedZodType(unwrapped);
};

const readFieldRules = (schema: ZodLikeType): SchemaRuleDoc[] | undefined => {
  if (zodTypeName(schema) !== 'ZodNumber') {
    return undefined;
  }

  const rules: SchemaRuleDoc[] = [];
  for (const check of schema._def?.checks ?? []) {
    if (check.kind === 'min') {
      rules.push({ kind: 'min', value: check.value, message: check.message });
    }
    if (check.kind === 'max') {
      rules.push({ kind: 'max', value: check.value, message: check.message });
    }
    if (check.kind === 'int') {
      rules.push({ kind: 'int', message: check.message });
    }
  }
  return rules.length > 0 ? rules : undefined;
};

const getObjectShape = (schema: ZodLikeType): Record<string, ZodLikeType> => {
  const fromDef = schema._def?.shape;
  if (typeof fromDef === 'function') {
    return fromDef();
  }
  if (fromDef) {
    return fromDef;
  }
  return schema.shape ?? {};
};

const zodFieldToSchemaField = (
  key: string,
  schema: ZodLikeType,
): SchemaFieldDoc => {
  const optional = schema.isOptional?.() ?? zodTypeName(schema) === 'ZodOptional';
  const base = unwrappedZodType(schema);
  const baseType = zodTypeName(base);

  const common = {
    key,
    optional,
  };

  if (baseType === 'ZodString') {
    return { ...common, type: 'string', dataType: 'string', fieldType: 'string' };
  }

  if (baseType === 'ZodNumber') {
    return { ...common, type: 'number', dataType: 'number', fieldType: 'number', rules: readFieldRules(base) };
  }

  if (baseType === 'ZodBoolean') {
    return { ...common, type: 'boolean', dataType: 'boolean', fieldType: 'boolean' };
  }

  if (baseType === 'ZodDate') {
    return { ...common, type: 'date', dataType: 'date', fieldType: 'date' };
  }

  if (baseType === 'ZodEnum') {
    const enumValues = base.options ? [...base.options] : [...(base._def?.values ?? [])];
    return { ...common, type: 'enum', dataType: 'enum', fieldType: 'select', enumValues };
  }

  if (baseType === 'ZodArray') {
    const item = zodFieldToSchemaField('item', base.element ?? (base._def?.innerType as ZodLikeType));
    return {
      ...common,
      type: 'array',
      dataType: 'array',
      fieldType: 'array',
      itemType: {
        type: item.type,
        label: item.label,
        description: item.description,
        optional: item.optional,
        defaultValue: item.defaultValue,
        enumValues: item.enumValues,
        itemType: item.itemType,
        fields: item.fields,
        tokens: item.tokens,
        behavior: item.behavior,
        rules: item.rules,
      },
    };
  }

  if (baseType === 'ZodObject') {
    const shape = getObjectShape(base);
    return {
      ...common,
      type: 'object',
      dataType: 'object',
      fieldType: 'object',
      fields: Object.entries(shape).map(([fieldKey, fieldSchema]) =>
        zodFieldToSchemaField(fieldKey, fieldSchema),
      ),
    };
  }

  throw new Error(`Unsupported zod field type for "${key}": ${baseType ?? 'unknown'}`);
};

export function defineZodSchemaDoc<TSchema extends ZodLikeObjectSchema>(
  input: DefineZodSchemaDocInput<TSchema>,
): SchemaDoc {
  const fields = Object.entries(getObjectShape(input.schema)).map(([key, schema]) =>
    zodFieldToSchemaField(key, schema),
  );

  return {
    schemaId: input.schemaId,
    title: input.title,
    description: input.description,
    fields,
    tokens: input.tokens,
  };
}

export type SchemaSyncOperation =
  | {
      op: 'upsertSchema';
      schema: SchemaDoc;
    }
  | {
      op: 'removeSchema';
      schemaId: string;
    };

export type SchemaSyncEnvelope = {
  source: 'cli' | 'ui' | 'relay' | 'sdk';
  timestamp: string;
  operations: SchemaSyncOperation[];
};

export type SchemaSyncSubscriber = (envelope: SchemaSyncEnvelope) => void;

export interface SchemaSyncStore {
  list(): SchemaDoc[];
  get(schemaId: string): SchemaDoc | undefined;
  upsert(schema: SchemaDoc, source?: SchemaSyncEnvelope['source']): void;
  remove(schemaId: string, source?: SchemaSyncEnvelope['source']): void;
  apply(envelope: SchemaSyncEnvelope): void;
  subscribe(subscriber: SchemaSyncSubscriber): () => void;
}

export type CreateSchemaSyncStoreInput = {
  initialSchemas?: SchemaDoc[];
};

export function createSchemaSyncStore(
  input: CreateSchemaSyncStoreInput = {},
): SchemaSyncStore {
  const schemas = new Map<string, SchemaDoc>();
  const subscribers = new Set<SchemaSyncSubscriber>();

  for (const schema of input.initialSchemas ?? []) {
    schemas.set(schema.schemaId, schema);
  }

  const emit = (envelope: SchemaSyncEnvelope): void => {
    for (const subscriber of subscribers) {
      subscriber(envelope);
    }
  };

  return {
    list() {
      return [...schemas.values()];
    },
    get(schemaId: string) {
      return schemas.get(schemaId);
    },
    upsert(schema, source = 'sdk') {
      schemas.set(schema.schemaId, schema);
      emit({
        source,
        timestamp: new Date().toISOString(),
        operations: [{ op: 'upsertSchema', schema }],
      });
    },
    remove(schemaId, source = 'sdk') {
      const deleted = schemas.delete(schemaId);
      if (!deleted) {
        return;
      }
      emit({
        source,
        timestamp: new Date().toISOString(),
        operations: [{ op: 'removeSchema', schemaId }],
      });
    },
    apply(envelope) {
      for (const operation of envelope.operations) {
        if (operation.op === 'upsertSchema') {
          schemas.set(operation.schema.schemaId, operation.schema);
        }
        if (operation.op === 'removeSchema') {
          schemas.delete(operation.schemaId);
        }
      }
      emit(envelope);
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
  };
}

const schemaDataTypeToTsType = (field: SchemaFieldDoc): string => {
  const dataType = field.dataType ?? (field.type as SchemaDataType);

  switch (dataType) {
    case 'string':
    case 'date':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return field.enumValues?.map((value) => JSON.stringify(value)).join(' | ') ?? 'string';
    case 'array': {
      const itemType = field.itemType
        ? schemaDataTypeToTsType({ ...field.itemType, key: 'item' })
        : 'unknown';
      return `${itemType}[]`;
    }
    case 'object': {
      const shape = field.fields
        ?.map(
          (nestedField) =>
            `${nestedField.key}${nestedField.optional ? '?' : ''}: ${schemaDataTypeToTsType(nestedField)};`,
        )
        .join(' ');
      return `{ ${shape ?? ''} }`;
    }
    default:
      return 'unknown';
  }
};

export function generateSchemaTypes(
  schemaDocs: SchemaDoc[],
  options: {
    rootTypeName?: string;
  } = {},
): string {
  const rootTypeName = options.rootTypeName ?? 'SupersurkhetSchemaMap';

  const lines = [
    '// Auto-generated by supersurkhet-sdk. Do not edit manually.',
    `export type ${rootTypeName} = {`,
  ];

  for (const schema of schemaDocs) {
    const fields = schema.fields
      .map((field) =>
        `    ${field.key}${field.optional ? '?' : ''}: ${schemaDataTypeToTsType(field)};`,
      )
      .join('\n');

    lines.push(`  ${JSON.stringify(schema.schemaId)}: {`);
    lines.push(fields);
    lines.push('  };');
  }

  lines.push('};');
  lines.push(`export type SupersurkhetSchemaIds = keyof ${rootTypeName};`);
  lines.push(
    `export type SupersurkhetSchemaRow<TSchemaId extends SupersurkhetSchemaIds> = ${rootTypeName}[TSchemaId];`,
  );

  return lines.join('\n');
}
