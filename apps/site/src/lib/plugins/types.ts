import type {
  ActionManifestDoc,
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  DeriveIR,
  ExpressionDoc,
  FieldConfigIR,
  JsonValue,
  LifecycleHook,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginRecordDoc,
  PluginReleaseDoc,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  WorkflowDoc,
  WorkflowNodeDoc,
} from 'supersurkhet-sdk';

export type {
  ActionManifestDoc,
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  DeriveIR,
  ExpressionDoc,
  FieldConfigIR,
  JsonValue,
  LifecycleHook,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginRecordDoc,
  PluginReleaseDoc,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  WorkflowDoc,
  WorkflowNodeDoc,
};

export type PluginDocsBundle = {
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
};

export type RuntimeActionHandler = (
  input: unknown,
  ctx: PluginExecutionContext,
) => Promise<unknown> | unknown;

export type RuntimeActionHandlers = Record<string, RuntimeActionHandler>;

export type PluginExecutionContext = {
  businessId: string;
  table: string;
  hook: LifecycleHook;
  payload: unknown;
  capabilities?: readonly string[];
  timeoutMs?: number;
};

export type ExecuteLifecycleHookInput = {
  businessId: string;
  teamId?: string;
  table: string;
  hook: LifecycleHook;
  payload: unknown;
  actionHandlers: RuntimeActionHandlers;
  draftInstalls?: BusinessPluginDraftInstallDoc[];
};

export type ExecuteLifecycleHookResult = {
  executedNodeIds: string[];
  actionOutputsByNodeId: Record<string, unknown>;
};
