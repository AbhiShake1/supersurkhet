import type {
  ActionManifestDoc,
  AdminTabDoc,
  ActionDefinitionV3,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  DeriveIR,
  ExecutionContextV3,
  ExpressionDoc,
  FieldConfigIR,
  JsonValue,
  LifecycleHook,
  PluginProjectDoc,
  PluginProjectInviteDoc,
  PluginProjectMemberDoc,
  PluginProjectRole,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginRecordDoc,
  PluginReleaseDoc,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  PluginWorkflowDeadLetter,
  PluginWorkflowEventLog,
  PluginWorkflowJob,
  PluginWorkflowJobAttempt,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
} from 'supersurkhet-sdk';

export type {
  ActionManifestDoc,
  AdminTabDoc,
  ActionDefinitionV3,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  DeriveIR,
  ExecutionContextV3,
  ExpressionDoc,
  FieldConfigIR,
  JsonValue,
  LifecycleHook,
  PluginProjectDoc,
  PluginProjectInviteDoc,
  PluginProjectMemberDoc,
  PluginProjectRole,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginRecordDoc,
  PluginReleaseDoc,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  PluginWorkflowDeadLetter,
  PluginWorkflowEventLog,
  PluginWorkflowJob,
  PluginWorkflowJobAttempt,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
};

export type PluginDocsBundle = {
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
};

export type PluginUserReviewDoc = {
  id: string;
  pluginId: string;
  businessId?: string;
  userId: string;
  userLabel: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeActionHandler = (
  input: unknown,
  ctx: PluginExecutionContext,
) => Promise<unknown> | unknown;

export type RuntimeActionHandlers = Record<string, RuntimeActionHandler>;

export type PluginExecutionContext = {
  businessId?: string;
  table?: string;
  hook?: LifecycleHook;
  payload?: unknown;
  event?: ExecutionContextV3['event'];
  record?: ExecutionContextV3['record'];
  workflow?: ExecutionContextV3['workflow'];
  capabilities?: readonly string[];
  timeoutMs?: number;
};

export type ExecuteLifecycleHookInput = {
  businessId: string;
  teamId?: string;
  table: string;
  hook: LifecycleHook;
  payload?: unknown;
  envelope?: {
    requestId?: string;
    rowId?: string;
    before?: unknown;
    after?: unknown;
    patch?: unknown;
  };
  actionHandlers: RuntimeActionHandlers;
  draftInstalls?: BusinessPluginDraftInstallDoc[];
};

export type ExecuteLifecycleHookResult = {
  executedNodeIds: string[];
  actionOutputsByNodeId: Record<string, unknown>;
};
