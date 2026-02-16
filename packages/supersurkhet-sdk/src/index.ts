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

export type SchemaFieldDoc = {
  key: string;
  type: SchemaFieldType;
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

export type PluginDraftDoc = {
  draftId: string;
  pluginId: string;
  ownerUserId: string;
  collaboratorUserIds?: string[];
  status: 'active' | 'archived';
  title?: string;
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
