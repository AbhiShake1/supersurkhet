import type {
  ActionDefinitionV3,
  ActionManifestDoc,
  AdminTabDoc,
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  DeriveIR,
  ExecutionContextV3,
  ExpressionDoc,
  FieldConfigIR,
  JsonValue,
  LifecycleHook,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginProjectDoc,
  PluginProjectInviteDoc,
  PluginProjectMemberDoc,
  PluginProjectRole,
  PluginRecordDoc,
  PluginReleaseDoc,
  PluginWorkflowDeadLetter,
  PluginWorkflowEventLog,
  PluginWorkflowJob,
  PluginWorkflowJobAttempt,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  SchemaWorkflowDoc,
  WorkflowDbAdapter,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
} from '@supersurkhet/sdk';

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
  SchemaWorkflowDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
  PluginWorkflowDeadLetter,
  PluginWorkflowEventLog,
  PluginWorkflowJob,
  PluginWorkflowJobAttempt,
  WorkflowDbAdapter,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
};

export type PluginDocsBundle = {
  schemaDocs?: SchemaDoc[];
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

export type PluginUserReviewReplyDoc = {
  id: string;
  reviewId: string;
  pluginId: string;
  businessId?: string;
  parentReplyId?: string;
  userId: string;
  userLabel: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type PluginUserReviewVoteDoc = {
  id: string;
  reviewId: string;
  pluginId: string;
  businessId?: string;
  targetType: 'review' | 'reply';
  targetId: string;
  userId: string;
  value: 'up' | 'down';
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
  formValues?: unknown;
  db?: WorkflowDbAdapter;
  ctx?: Record<string, unknown>;
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
  db?: WorkflowDbAdapter;
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

export type UiTemplatePluginBundleDoc = {
  pluginId: string;
  version: string;
  requestedCapabilities?: string[];
  release: PluginReleaseDoc;
};

export type UiTemplateReleaseDoc = {
  id: string;
  templateId: string;
  version: string;
  visibility: 'public';
  publisher: {
    businessId: string;
    userId: string;
    label?: string;
  };
  docs: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
  };
  uiSnapshot: {
    layers: string;
  };
  pluginBundles: UiTemplatePluginBundleDoc[];
  publishedAt: string;
  created_at?: string;
  updated_at?: string;
};

export type BusinessUiTemplateInstallDoc = {
  id: string;
  businessId: string;
  templateId: string;
  version: string;
  installedByUserId: string;
  installedAt: string;
  mergeStrategy: 'best-effort';
  status: 'active';
  summary: {
    pagesAdded: number;
    pagesMerged: number;
    conflictsCount: number;
    pluginsInstalled: number;
    pluginsUpdated: number;
  };
};

export type UiTemplateInstallPreview = {
  templateId: string;
  version: string;
  mergeSummary: {
    pagesAdded: number;
    pagesMerged: number;
    hardConflicts: number;
  };
  pluginPlan: {
    install: Array<{
      pluginId: string;
      version: string;
      releaseMissingInTarget: boolean;
    }>;
    update: Array<{
      pluginId: string;
      fromVersion: string;
      toVersion: string;
      releaseMissingInTarget: boolean;
      requiresConfirmation: boolean;
    }>;
    noOp: Array<{
      pluginId: string;
      version: string;
      releaseMissingInTarget: boolean;
    }>;
  };
  hardConflicts: Array<{
    code:
      | 'id-type-mismatch'
      | 'children-shape-mismatch'
      | 'duplicate-id'
      | 'invalid-template-snapshot'
      | 'invalid-target-snapshot';
    message: string;
    pageKey: string;
    path: string;
    layerId?: string;
    targetType?: string;
    templateType?: string;
    source?: 'template' | 'target';
  }>;
  requiresPluginUpdateConfirmation: boolean;
};
