import { useAuth } from '@/components/auth-provider';
import { AutoAdmin } from '@/components/auto-admin';
import { useConfetti } from '@/components/confetti-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AUTOFORM_FIELD_TYPES } from '@/components/ui/autoform';
import { ClassNameFieldControl } from '@/components/ui/autoform/components/ClassNameField';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { PluginBuildDiagnostic } from '@/features/plugin-builder/domain/validation/diagnostics-contract';
import { validateWorkflowDags } from '@/features/plugin-builder/domain/validation/workflow-dag-validator';
import type {
  FieldEntity,
  SchemaEntity,
} from '@/features/plugin-builder/domain/workspace/workspace-entities';
import { createActionsManifestEditorState } from '@/features/plugin-builder/workspace/tabs/actions-manifest-editor';
import { buildDerivationPathOptions } from '@/features/plugin-builder/workspace/tabs/derivation-path-options';
import {
  compileDerivedFieldToDeriveIr,
  DERIVED_FIELD_OPERATION_OPTIONS,
  DERIVED_FIELD_SOURCE_OPTIONS,
  parseDerivedFieldsFromSchemaDoc,
  type DerivedFieldOperation,
  type SchemaBuilderDerivedField
} from '@/features/plugin-builder/workspace/tabs/derived-fields';
import {
  type ExpressionRow
} from '@/features/plugin-builder/workspace/tabs/expression-row-builder';
import {
  createFieldConfigPanelModel,
  serializeFieldConfigPanelDraft,
} from '@/features/plugin-builder/workspace/tabs/field-config-panel';
import {
  createGuardedIrEditorState
} from '@/features/plugin-builder/workspace/tabs/guarded-ir-editor';
import {
  createPublishGateTabState
} from '@/features/plugin-builder/workspace/tabs/publish-gate-tab';
import {
  mapRoutesTabsToAutoAdminConfig
} from '@/features/plugin-builder/workspace/tabs/routes-tabs-mapper';
import {
  validateWorkflowReferencePaths,
  WorkflowGraphEditor,
} from '@/features/plugin-builder/workspace/tabs/workflow-graph-editor';
import { api } from '@/lib/api';
import {
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  DeriveIR,
  ExpressionDoc,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  SchemaDoc,
  SchemaFieldDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  createPluginDraft,
  createPluginDraftRevision,
  previewPluginReleaseHashes,
  publishPluginRelease,
} from '@/server-functions/plugins';
import type { CompileVerifyDiagnostic } from '@/server-functions/plugins-v2-compile-verify';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import * as LucideIcons from 'lucide-react';
import {
  ArrowRight,
  BadgePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  type LucideIcon
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { throwOnFailedPersistenceWrites } from './-plugin-studio-persistence';
import {
  resolvePluginStudioPluginId,
  shouldSyncPluginStudioSearch,
} from './-plugin-studio-plugin-id';
import {
  buildPluginStudioSidebarSnapshotStorageKey,
  pickLatestPluginStudioSidebarSnapshot,
  PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
  shouldApplyPluginStudioSidebarSnapshot,
  type PluginStudioSidebarSnapshot,
} from './-plugin-studio-sidebar-snapshot';

const optionalSearchStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().optional(),
);

const pluginStudioSearchSchema = z.object({
  pluginId: optionalSearchStringSchema,
  draftId: optionalSearchStringSchema,
  sortBy: optionalSearchStringSchema,
  sortOrder: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : undefined),
      z.enum(['asc', 'desc']).optional(),
    ),
});

export const Route = createFileRoute('/plugin-studio/')({
  validateSearch: pluginStudioSearchSchema,
  component: PluginStudioRoute,
});

const DEFAULT_SCHEMA_DOC = {
  schemaId: 'example.table',
  title: 'Example Table',
  fields: [
    {
      key: 'title',
      type: 'string',
      behavior: {
        fieldConfig: {
          fieldType: 'string',
          label: 'Title',
        },
      },
    },
  ],
} satisfies SchemaDoc;

const DEFAULT_WORKFLOW_DOC = {
  workflowId: 'example.workflow',
  table: 'example.table',
  hook: 'afterCreate',
  nodes: [
    {
      nodeId: 'n1',
      type: 'action',
      actionId: 'example.action',
      input: {
        expression: {
          kind: 'ref',
          source: 'payload',
          path: [],
        },
      },
    },
  ],
  edges: [],
} satisfies WorkflowDoc;

type SystemTabKey = 'dashboard' | 'qr' | 'website';

type SystemTabState = Record<
  SystemTabKey,
  {
    title: string;
    group?: string;
    iconName?: string;
  }
>;

const DEFAULT_SYSTEM_TABS: SystemTabState = {
  dashboard: {
    title: 'Dashboard',
  },
  qr: {
    title: 'QR Management',
    group: 'System Configuration',
  },
  website: {
    title: 'Website UI',
    group: 'System Configuration',
  },
};

const DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX = '__plugin_studio_group__/';
const DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX = '__plugin_studio_system__/';
const DEFAULT_DRAFT_ADMIN_TABS = serializeDraftAdminTabs({
  schemaTabs: [
    {
      schema: DEFAULT_SCHEMA_DOC.schemaId,
      title: DEFAULT_SCHEMA_DOC.title,
    },
  ],
  orderedGroups: [],
  systemTabs: DEFAULT_SYSTEM_TABS,
});

function canonicalStringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

function toErrorMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const messageCandidates = [
      record.message,
      record.error,
      record.reason,
      record.details,
    ];
    for (const candidate of messageCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    if (Array.isArray(record.issues)) {
      const firstIssue = record.issues[0] as { message?: unknown } | undefined;
      if (typeof firstIssue?.message === 'string' && firstIssue.message.trim()) {
        return firstIssue.message.trim();
      }
    }
  }
  return 'Unknown error';
}

function isMissingPluginDraftError(error: unknown) {
  const message = toErrorMessage(error);
  return (
    message.includes('Plugin draft "') && message.includes('" does not exist')
  );
}

function isDuplicatePersistenceError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('duplicate') ||
    message.includes('already exists') ||
    message.includes('unique constraint') ||
    message.includes('conflict')
  );
}

function toStableWorkspaceSuffix(input: string) {
  const normalized = input
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'entity';
}

function toStableDraftIdSuffix(value: string | undefined) {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'anon';
}

function toDraftId({
  actorUserId,
}: {
  actorUserId: string;
}) {
  return `draft.${toStableDraftIdSuffix(actorUserId)}`;
}

function parseVersionParts(version: string): [number, number, number] | null {
  const parts = version?.split('.');
  if (parts?.length !== 3) return null;
  const numeric = parts.map((part) => Number(part));
  if (numeric.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }
  return [numeric[0], numeric[1], numeric[2]];
}

function isVersionGreater(left: string, right: string): boolean {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  if (!leftParts && !rightParts) return left > right;
  if (!leftParts) return false;
  if (!rightParts) return true;
  if (leftParts[0] !== rightParts[0]) return leftParts[0] > rightParts[0];
  if (leftParts[1] !== rightParts[1]) return leftParts[1] > rightParts[1];
  return leftParts[2] > rightParts[2];
}

function formatUserHandle(userId: string): string {
  const segments = userId.split('/');
  const lastSegment = segments[segments.length - 1] ?? userId;

  // For UUID-style IDs (anonymous users), use first 8 chars which provides sufficient uniqueness
  // For other IDs (authenticated users), use up to 16 chars for better readability
  const isUuidStyle =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      lastSegment,
    );
  const maxLength = isUuidStyle ? 8 : 16;

  const normalized = lastSegment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.slice(0, maxLength) || 'user';
}

function appendActorUserIdAliases(
  aliases: Set<string>,
  value: string | undefined,
) {
  const normalized = value?.trim();
  if (!normalized) return;
  aliases.add(normalized);
  const slashSegments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const slashTail = slashSegments[slashSegments.length - 1];
  if (slashTail) {
    aliases.add(slashTail);
  }
}

function buildActorUserIdAliases(user: {
  pub?: string;
  _?: { soul?: string };
} | null | undefined): string[] {
  const aliases = new Set<string>();
  appendActorUserIdAliases(aliases, user?.pub);
  appendActorUserIdAliases(aliases, user?._?.soul);
  return [...aliases];
}

function toDraftHydrationKey({
  draftId,
  revision,
}: {
  draftId: string;
  revision?: Pick<PluginDraftRevisionDoc, 'revisionId' | 'createdAt'> | null;
}) {
  if (!revision) {
    return `${draftId}:empty`;
  }
  return `${draftId}:${revision.revisionId ?? revision.createdAt ?? 'latest'}`;
}

function toDraftRevisionRecencyKey(
  revision: Pick<PluginDraftRevisionDoc, 'createdAt' | 'revisionId'>,
) {
  return `${revision.createdAt ?? ''}:${revision.revisionId ?? ''}`;
}

function toDraftSnapshotString({
  schemaDocs,
  workflows,
  adminTabs,
}: {
  schemaDocs: readonly SchemaDoc[];
  workflows: readonly WorkflowDoc[];
  adminTabs: readonly AdminTabDoc[];
}) {
  return canonicalStringify({
    schemaDocs,
    workflows,
    adminTabs,
  });
}

function computeOrderedGroupNames({
  customGroups,
  groupOrder,
  schemaGroupById,
  schemaOrder,
  systemTabs,
}: {
  customGroups: readonly string[];
  groupOrder: readonly string[];
  schemaGroupById: Record<string, string>;
  schemaOrder: readonly string[];
  systemTabs: SystemTabState;
}): string[] {
  const discoveredBySchemaOrder: string[] = [];
  for (const schemaId of schemaOrder) {
    const normalized = (schemaGroupById[schemaId] ?? '').trim();
    if (!normalized || discoveredBySchemaOrder.includes(normalized)) continue;
    discoveredBySchemaOrder.push(normalized);
  }
  const discoveredBySystemOrder: string[] = [];
  for (const key of ['dashboard', 'qr', 'website'] as const) {
    const normalized = systemTabs[key].group?.trim();
    if (!normalized || discoveredBySystemOrder.includes(normalized)) continue;
    discoveredBySystemOrder.push(normalized);
  }

  const pool = new Set<string>();
  for (const groupName of customGroups) {
    const normalized = groupName.trim();
    if (normalized) pool.add(normalized);
  }
  for (const groupName of Object.values(schemaGroupById)) {
    const normalized = groupName.trim();
    if (normalized) pool.add(normalized);
  }
  for (const key of ['dashboard', 'qr', 'website'] as const) {
    const normalized = systemTabs[key].group?.trim();
    if (normalized) pool.add(normalized);
  }

  const preferred = groupOrder.filter((groupName) => pool.has(groupName));
  const append: string[] = [
    ...customGroups,
    ...discoveredBySchemaOrder,
    ...discoveredBySystemOrder,
  ];
  for (const groupName of append) {
    const normalized = groupName.trim();
    if (
      !normalized ||
      !pool.has(normalized) ||
      preferred.includes(normalized)
    ) {
      continue;
    }
    preferred.push(normalized);
  }
  return preferred;
}

function isGroupSentinelSchemaId(schemaId: string): boolean {
  return schemaId.startsWith(DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX);
}

function toGroupSentinelSchemaId(index: number): string {
  return `${DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX}${index}`;
}

function isSystemSentinelSchemaId(schemaId: string): boolean {
  return schemaId.startsWith(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX);
}

function toSystemSentinelSchemaId(key: SystemTabKey): string {
  return `${DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX}${key}`;
}

function parseSystemSentinelSchemaId(schemaId: string): SystemTabKey | null {
  if (!isSystemSentinelSchemaId(schemaId)) return null;
  const key = schemaId.slice(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX.length);
  if (key === 'dashboard' || key === 'qr' || key === 'website') {
    return key;
  }
  return null;
}

function serializeDraftAdminTabs({
  schemaTabs,
  orderedGroups,
  systemTabs,
}: {
  schemaTabs: readonly AdminTabDoc[];
  orderedGroups: readonly string[];
  systemTabs: SystemTabState;
}): AdminTabDoc[] {
  const groupSentinels: AdminTabDoc[] = orderedGroups.map(
    (groupName, index) => ({
      schema: toGroupSentinelSchemaId(index),
      group: groupName,
    }),
  );
  const systemSentinels: AdminTabDoc[] = (
    Object.entries(systemTabs) as Array<
      [SystemTabKey, SystemTabState[SystemTabKey]]
    >
  ).map(([key, value]) => ({
    schema: toSystemSentinelSchemaId(key),
    title: value.title,
    group: value.group,
    icon: value.iconName,
  }));
  return [...groupSentinels, ...schemaTabs, ...systemSentinels];
}

function deserializeDraftAdminTabs(
  adminTabs: readonly AdminTabDoc[] | undefined,
): {
  schemaTabs: AdminTabDoc[];
  orderedGroups: string[];
  systemTabs: SystemTabState;
} {
  const tabs = adminTabs ?? [];
  const schemaTabs: AdminTabDoc[] = [];
  const orderedGroups: string[] = [];
  const systemTabs: SystemTabState = { ...DEFAULT_SYSTEM_TABS };

  for (const tab of tabs) {
    if (isGroupSentinelSchemaId(tab.schema)) {
      const groupName = tab.group?.trim();
      if (groupName && !orderedGroups.includes(groupName)) {
        orderedGroups.push(groupName);
      }
      continue;
    }

    const systemKey = parseSystemSentinelSchemaId(tab.schema);
    if (systemKey) {
      const normalizedTitle = tab.title?.trim();
      const normalizedGroup = tab.group?.trim();
      const normalizedIcon = tab.icon?.trim();
      systemTabs[systemKey] = {
        title: normalizedTitle || DEFAULT_SYSTEM_TABS[systemKey].title,
        group: normalizedGroup || undefined,
        iconName: normalizedIcon || undefined,
      };
      continue;
    }

    schemaTabs.push(tab);
  }

  if (orderedGroups.length === 0) {
    for (const tab of schemaTabs) {
      const groupName = tab.group?.trim();
      if (!groupName || orderedGroups.includes(groupName)) continue;
      orderedGroups.push(groupName);
    }
  }

  return {
    schemaTabs,
    orderedGroups,
    systemTabs,
  };
}

function toRouteSegmentFromSchemaId(schemaId: string) {
  return schemaId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tab';
}

function toDraftRoutesFromAdminTabs(
  adminTabs: readonly AdminTabDoc[],
): Array<{
  id: string;
  schema: string;
  title: string;
  group?: string;
  order: number;
  routeSegment: string;
  routePath: string;
  iconName?: string;
}> {
  return adminTabs.map((tab, index) => {
    const routeSegment = toRouteSegmentFromSchemaId(`${tab.schema}-${index}`);
    return {
      id: `${tab.schema}:${index}`,
      schema: tab.schema,
      title: tab.title ?? tab.schema,
      group: tab.group?.trim() || undefined,
      order: index,
      routeSegment,
      routePath: `/plugin-studio/${routeSegment}`,
      iconName: tab.icon?.trim() || undefined,
    };
  });
}

function toAdminTabsFromDraftRoutes(
  routes:
    | Array<{
      schema: string;
      title: string;
      group?: string;
      order: number;
      iconName?: string;
    }>
    | undefined,
): AdminTabDoc[] {
  if (!routes || routes.length === 0) return DEFAULT_DRAFT_ADMIN_TABS;
  return [...routes]
    .sort((left, right) => left.order - right.order)
    .map((route) => ({
      schema: route.schema,
      title: route.title,
      group: route.group?.trim() || undefined,
      icon: route.iconName?.trim() || undefined,
    }));
}

function toWorkspaceSchemasAndFields(schemaDocs: readonly SchemaDoc[]): {
  schemas: SchemaEntity[];
  fields: FieldEntity[];
} {
  const schemas: SchemaEntity[] = [];
  const fields: FieldEntity[] = [];

  for (const [schemaIndex, schemaDoc] of schemaDocs.entries()) {
    const schemaSuffix = toStableWorkspaceSuffix(
      schemaDoc.schemaId || `schema_${schemaIndex + 1}`,
    );
    const schemaEntityId = `schema_${schemaSuffix}` as const;
    const rootFieldIds: FieldEntity['id'][] = [];

    const appendField = (
      fieldDoc: SchemaFieldDoc,
      context: {
        suffix: string;
        parentFieldId?: FieldEntity['id'];
      },
    ): FieldEntity['id'] => {
      const fieldSuffix = toStableWorkspaceSuffix(context.suffix);
      const fieldId = `field_${fieldSuffix}` as const;
      const childFieldIds: FieldEntity['id'][] = [];
      let itemFieldId: FieldEntity['id'] | undefined;

      if (fieldDoc.type === 'array' && fieldDoc.itemType) {
        const itemFieldDoc: SchemaFieldDoc = {
          key: `${fieldDoc.key || 'item'}_item`,
          type: fieldDoc.itemType.type,
          optional: fieldDoc.optional,
          enumValues: fieldDoc.itemType.enumValues,
          fields: fieldDoc.itemType.fields,
        };
        itemFieldId = appendField(itemFieldDoc, {
          suffix: `${fieldSuffix}_item`,
          parentFieldId: fieldId,
        });
      }

      if (fieldDoc.type === 'object' && fieldDoc.fields?.length) {
        for (const [childIndex, childDoc] of fieldDoc.fields.entries()) {
          const childId = appendField(childDoc, {
            suffix: `${fieldSuffix}_${childDoc.key || `child_${childIndex + 1}`}`,
            parentFieldId: fieldId,
          });
          childFieldIds.push(childId);
        }
      }

      const nextField: FieldEntity = {
        id: fieldId,
        schemaId: schemaEntityId,
        parentFieldId: context.parentFieldId,
        itemFieldId,
        childFieldIds: childFieldIds.length > 0 ? childFieldIds : undefined,
        key: fieldDoc.key || `field_${fieldSuffix}`,
        type: fieldDoc.type,
        optional: fieldDoc.optional,
        derivationIds: [],
        refinementIds: [],
      };

      fields.push(nextField);
      return fieldId;
    };

    for (const [fieldIndex, fieldDoc] of schemaDoc.fields.entries()) {
      const fieldId = appendField(fieldDoc, {
        suffix: `${schemaSuffix}_${fieldDoc.key || `field_${fieldIndex + 1}`}`,
      });
      rootFieldIds.push(fieldId);
    }

    schemas.push({
      id: schemaEntityId,
      schemaId: schemaDoc.schemaId,
      title: schemaDoc.title,
      description: schemaDoc.description,
      fieldIds: rootFieldIds,
      refinementIds: [],
    });
  }

  return {
    schemas,
    fields,
  };
}

function toLatestTemplateReleases(releases: PluginReleaseDoc[]) {
  const map = new Map<string, PluginReleaseDoc>();
  for (const release of releases) {
    const existing = map.get(release.pluginId);
    if (!existing || isVersionGreater(release.version, existing.version)) {
      map.set(release.pluginId, release);
    }
  }
  return [...map.values()].sort((left, right) =>
    (left.pluginId ?? '').localeCompare(right?.pluginId ?? ''),
  );
}

function toFallbackTemplateSchemaDocs(template: PluginReleaseDoc): SchemaDoc[] {
  const tabs = template.adminTabs ?? [];
  if (tabs.length === 0) {
    return [DEFAULT_SCHEMA_DOC];
  }

  return tabs.map((tab) => ({
    schemaId: tab.schema || DEFAULT_SCHEMA_DOC.schemaId,
    title: tab.title || tab.schema || DEFAULT_SCHEMA_DOC.title,
    fields: [
      {
        key: 'title',
        type: 'string',
        behavior: {
          fieldConfig: {
            fieldType: 'string',
            label: 'Title',
          },
        },
      },
    ],
  }));
}

function toFallbackTemplateWorkflows(
  template: PluginReleaseDoc,
  schemaDocs: readonly SchemaDoc[],
): WorkflowDoc[] {
  if (schemaDocs.length === 0) {
    return [DEFAULT_WORKFLOW_DOC];
  }

  return schemaDocs.map((schemaDoc, index) => ({
    workflowId: `${template.pluginId}.workflow.${schemaDoc.schemaId || index + 1}`,
    table: schemaDoc.schemaId || DEFAULT_SCHEMA_DOC.schemaId,
    hook: 'afterCreate',
    nodes: [
      {
        nodeId: 'n1',
        type: 'action',
        actionId:
          template.actionManifest[index]?.actionId ??
          template.actionManifest[0]?.actionId ??
          DEFAULT_WORKFLOW_DOC.nodes[0]?.actionId ??
          'example.action',
        input: {
          expression: {
            kind: 'ref',
            source: 'payload',
            path: [],
          },
        },
      },
    ],
    edges: [],
  }));
}

function titleToPluginId(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug.length > 0 ? `plugin.${slug}` : 'example.plugin';
}

function bumpPatchVersion(version: string) {
  const [major, minor, patch] = version.split('.').map((part) => Number(part));
  if (
    Number.isNaN(major) ||
    Number.isNaN(minor) ||
    Number.isNaN(patch) ||
    major < 0 ||
    minor < 0 ||
    patch < 0
  ) {
    return '1.0.0';
  }
  return `${major}.${minor}.${patch + 1}`;
}

function getNextVersion(releases: PluginReleaseDoc[], currentPluginId: string) {
  const versions = releases
    .filter((release) => release.pluginId === currentPluginId)
    .map((release) => release.version)
    .filter((candidate) => /^\d+\.\d+\.\d+$/.test(candidate));

  if (versions.length === 0) {
    return '1.0.0';
  }

  const sorted = versions.sort((left, right) => {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);
    if (leftParts[0] !== rightParts[0]) return leftParts[0] - rightParts[0];
    if (leftParts[1] !== rightParts[1]) return leftParts[1] - rightParts[1];
    return leftParts[2] - rightParts[2];
  });

  return bumpPatchVersion(sorted[sorted.length - 1] ?? '0.0.0');
}

function parseJsonObject(value: string | undefined) {
  if (!value || value.trim() === '') return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const BUILDER_SCHEMA_FIELD_TYPES = AUTOFORM_FIELD_TYPES.filter(
  (fieldType) => fieldType !== 'className',
) as Exclude<(typeof AUTOFORM_FIELD_TYPES)[number], 'className'>[];

const BUILDER_FIELD_TYPES = [
  ...BUILDER_SCHEMA_FIELD_TYPES,
  'enum',
  'array',
  'object',
] as const;
const BUILDER_LEAF_FIELD_TYPES = BUILDER_FIELD_TYPES.filter(
  (fieldType) => fieldType !== 'array' && fieldType !== 'object',
) as BuilderLeafFieldType[];

const CHOICE_FIELD_TYPES = new Set<BuilderFieldType>(['select', 'enum']);
const NUMERIC_FIELD_TYPES = new Set<BuilderFieldType>([
  'number',
  'currency',
  'slider',
  'rating',
  'timestamp',
]);
const ORDERABLE_FIELD_TYPES = new Set<BuilderFieldType>([
  'number',
  'currency',
  'slider',
  'rating',
  'timestamp',
  'date',
  'datetime',
]);

function generateBuilderId() {
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function parseCommaSeparatedValues(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isChoiceFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? CHOICE_FIELD_TYPES.has(fieldType) : false;
}

function isNumericFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? NUMERIC_FIELD_TYPES.has(fieldType) : false;
}

function getAllowedOperators(
  fieldType: BuilderFieldType | undefined,
): RuleOperator[] {
  if (fieldType && ORDERABLE_FIELD_TYPES.has(fieldType)) {
    return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
  }
  return ['eq', 'neq'];
}

function getBlocklyOperatorOptions(
  fieldType: BuilderFieldType | undefined,
): [string, RuleOperator][] {
  const allowed = getAllowedOperators(fieldType);
  const labels: Record<RuleOperator, string> = {
    eq: 'equals',
    neq: 'not equals',
    gt: 'greater than',
    gte: 'greater/equal',
    lt: 'less than',
    lte: 'less/equal',
  };
  return allowed.map((operator) => [labels[operator], operator]);
}

function getBlocklyPresets(fieldType: BuilderFieldType | undefined) {
  if (fieldType && ORDERABLE_FIELD_TYPES.has(fieldType)) {
    return [
      {
        label: 'Must Match',
        operator: 'eq' as RuleOperator,
        message: 'Values must match.',
      },
      {
        label: 'Must Be Different',
        operator: 'neq' as RuleOperator,
        message: 'Values must be different.',
      },
      {
        label: 'Must Be Greater',
        operator: 'gt' as RuleOperator,
        message: 'Value must be greater.',
      },
      {
        label: 'Must Be Greater Or Equal',
        operator: 'gte' as RuleOperator,
        message: 'Value must be greater than or equal.',
      },
      {
        label: 'Must Be Less',
        operator: 'lt' as RuleOperator,
        message: 'Value must be less.',
      },
      {
        label: 'Must Be Less Or Equal',
        operator: 'lte' as RuleOperator,
        message: 'Value must be less than or equal.',
      },
    ];
  }

  return [
    {
      label: 'Must Match',
      operator: 'eq' as RuleOperator,
      message: 'Values must match.',
    },
    {
      label: 'Must Be Different',
      operator: 'neq' as RuleOperator,
      message: 'Values must be different.',
    },
  ];
}

function parseDefaultValue(
  rawValue: string | undefined,
  type: BuilderFieldType,
) {
  if (rawValue === undefined || rawValue.trim() === '') {
    return undefined;
  }

  if (type === 'boolean') {
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
  }

  if (isNumericFieldType(type)) {
    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

function isInvalidObjectJson(rawValue: string | undefined) {
  return (
    (rawValue ?? '').trim().length > 0 &&
    parseJsonObject(rawValue) === undefined
  );
}

function parseJsonRecord(value: string | undefined): Record<string, unknown> {
  return parseJsonObject(value) ?? {};
}

function setJsonStringEntry(
  value: string | undefined,
  key: string,
  nextValue: string | undefined,
) {
  const next = parseJsonRecord(value);
  const normalized = nextValue?.trim() ?? '';
  if (!normalized) {
    delete next[key];
  } else {
    next[key] = normalized;
  }
  return stringifyJsonInput(next);
}

function setJsonNumberEntry(
  value: string | undefined,
  key: string,
  nextValue: string | undefined,
) {
  const next = parseJsonRecord(value);
  const normalized = nextValue?.trim() ?? '';
  if (!normalized) {
    delete next[key];
  } else {
    const parsed = Number(normalized);
    next[key] = Number.isFinite(parsed) ? parsed : normalized;
  }
  return stringifyJsonInput(next);
}

function setJsonBooleanEntry(
  value: string | undefined,
  key: string,
  nextValue: boolean | undefined,
) {
  const next = parseJsonRecord(value);
  if (nextValue === undefined) {
    delete next[key];
  } else {
    next[key] = nextValue;
  }
  return stringifyJsonInput(next);
}

function readJsonStringEntry(value: string | undefined, key: string): string {
  const record = parseJsonRecord(value);
  return typeof record[key] === 'string' ? (record[key] as string) : '';
}

function readJsonNumberEntry(value: string | undefined, key: string): string {
  const record = parseJsonRecord(value);
  const entry = record[key];
  if (typeof entry === 'number') return String(entry);
  if (typeof entry === 'string') return entry;
  return '';
}

function readJsonBooleanEntry(value: string | undefined, key: string): boolean {
  const record = parseJsonRecord(value);
  const entry = record[key];
  return entry === true || entry === 'true';
}

function stringifyJsonEntryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) return 'null';
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  return '';
}

function parseJsonEntryValue(rawValue: string): unknown {
  const trimmed = rawValue.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}

function listJsonEntries(
  value: string | undefined,
  options?: {
    excludeKeys?: ReadonlySet<string>;
  },
): Array<{ key: string; value: string }> {
  return Object.entries(parseJsonRecord(value))
    .filter(([key]) => !options?.excludeKeys?.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, entryValue]) => ({
      key,
      value: stringifyJsonEntryValue(entryValue),
    }));
}

function getNextJsonEntryKey(
  record: Record<string, unknown>,
  prefix: string,
  blockedKeys?: ReadonlySet<string>,
): string {
  const normalizedPrefix = prefix.trim() || 'key';
  let counter = 0;
  while (true) {
    const candidate =
      counter === 0 ? normalizedPrefix : `${normalizedPrefix}${counter}`;
    if (!(candidate in record) && !blockedKeys?.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

function upsertJsonEntry(
  value: string | undefined,
  currentKey: string,
  nextKey: string,
  nextValue: string,
): string {
  const record = parseJsonRecord(value);
  const normalizedCurrentKey = currentKey.trim();
  const normalizedNextKey = nextKey.trim();

  if (
    normalizedCurrentKey &&
    normalizedCurrentKey !== normalizedNextKey &&
    normalizedCurrentKey in record
  ) {
    delete record[normalizedCurrentKey];
  }

  if (!normalizedNextKey) {
    return stringifyJsonInput(record);
  }

  record[normalizedNextKey] = parseJsonEntryValue(nextValue);
  return stringifyJsonInput(record);
}

function removeJsonEntry(value: string | undefined, key: string): string {
  const record = parseJsonRecord(value);
  const normalizedKey = key.trim();
  if (normalizedKey) {
    delete record[normalizedKey];
  }
  return stringifyJsonInput(record);
}

const BUILDER_INPUT_PROP_RESERVED_KEYS = new Set<string>([
  'placeholder',
  'step',
  'rows',
  'readOnly',
  'disabled',
  'className',
]);

const BUILDER_FIELD_CONFIG_RESERVED_KEYS = new Set<string>([
  'fieldType',
  'label',
  'description',
  'inputProps',
  'customData',
]);

function toExpressionLiteral(value: string | undefined): ExpressionDoc {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return asNumber;
  }
  return trimmed;
}

function toSinglePayloadFieldPath(value: string | undefined): string[] {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return [];
  }
  const [firstSegment] = normalized
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return firstSegment ? [firstSegment] : [];
}

function toBuilderFieldRefinements(
  behaviorJson: string | undefined,
  fieldKey: string,
): BuilderFieldRefinement[] {
  const behavior = parseJsonRecord(behaviorJson);
  const refinements = behavior.refinements;
  if (!Array.isArray(refinements)) return [];

  const result: BuilderFieldRefinement[] = [];
  for (const entry of refinements) {
    if (!isRecord(entry) || !isRecord(entry.when)) continue;
    const when = entry.when;
    if (
      when.kind !== 'op' ||
      when.op !== 'not' ||
      !Array.isArray(when.args) ||
      !isRecord(when.args[0])
    ) {
      continue;
    }
    const compare = when.args[0];
    if (
      compare.kind !== 'op' ||
      !Array.isArray(compare.args) ||
      compare.args.length < 2
    ) {
      continue;
    }
    const operator = parseRuleOperator(compare.op);
    if (!operator) continue;
    const left = compare.args[0];
    const right = compare.args[1];
    const leftField = tryReadPayloadRefField(left);
    if (!leftField || leftField !== fieldKey) continue;

    if (tryReadPayloadRefField(right)) {
      result.push({
        id: generateBuilderId(),
        operator,
        rightKind: 'payloadField',
        rightPath: tryReadPayloadRefField(right) ?? '',
        message:
          typeof entry.message === 'string'
            ? entry.message
            : 'Validation failed',
      });
      continue;
    }

    result.push({
      id: generateBuilderId(),
      operator,
      rightKind: 'literal',
      rightLiteral:
        typeof right === 'string' || typeof right === 'number'
          ? String(right)
          : right === true
            ? 'true'
            : right === false
              ? 'false'
              : '',
      message:
        typeof entry.message === 'string' ? entry.message : 'Validation failed',
    });
  }
  return result;
}

type BuilderField = {
  id: string;
  key: string;
  label: string;
  description: string;
  type: BuilderFieldType;
  fieldType?: (typeof AUTOFORM_FIELD_TYPES)[number];
  required: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  enumValuesText?: string;
  fieldConfigJson?: string;
  behaviorJson?: string;
  inputPropsJson?: string;
  customDataJson?: string;
  arrayItemType?: BuilderLeafFieldType;
  arrayItemEnumValuesText?: string;
  objectFields?: BuilderObjectField[];
  fieldRefinements?: BuilderFieldRefinement[];
  useInt?: boolean;
  usePositive?: boolean;
  useNonNegative?: boolean;
};

type BuilderSchema = {
  schemaId: string;
  title: string;
  fields: BuilderField[];
  derivedFields: SchemaBuilderDerivedField[];
};

type BuilderRefinement = {
  id: string;
  leftField: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  rightField: string;
  message: string;
};

type RuleOperator = BuilderRefinement['operator'];

type BlocklyDraft = {
  fieldId: string | null;
  operator: RuleOperator;
  rightField: string;
  message: string;
};

type BlocklyRefinement = {
  id: string;
  leftField: string;
  message: string;
  condition: ExpressionDoc;
};

type BlocklyRuntime = {
  Blockly: Record<string, unknown>;
  workspace: {
    getBlockById: (id: string) => {
      getField: (name: string) => {
        menuGenerator_: unknown;
        setValue: (value: string) => void;
      } | null;
      getFieldValue: (name: string) => string;
      setFieldValue: (value: string, name: string) => void;
    } | null;
    render: () => void;
    dispose: () => void;
  };
};

type BuilderFieldType =
  | (typeof AUTOFORM_FIELD_TYPES)[number]
  | 'enum'
  | 'array'
  | 'object';

type BuilderLeafFieldType = Exclude<BuilderFieldType, 'array' | 'object'>;

type BuilderObjectField = {
  id: string;
  key: string;
  label: string;
  description: string;
  type: BuilderLeafFieldType;
  required: boolean;
  enumValuesText?: string;
};

type BuilderFieldRefinement = {
  id: string;
  operator: RuleOperator;
  rightKind: 'literal' | 'payloadField';
  rightLiteral?: string;
  rightPath?: string;
  message: string;
};

type AddColumnDraft = {
  key: string;
  label: string;
  description: string;
  type: BuilderFieldType;
  fieldType: BuilderLeafFieldType;
  required: boolean;
  defaultValue: string;
  enumValuesText: string;
  min: string;
  max: string;
};

type ColumnSheetMode = 'add' | 'edit';

function createAddColumnDraft(fieldCount: number): AddColumnDraft {
  const nextIndex = fieldCount + 1;
  return {
    key: `field_${nextIndex}`,
    label: `Field ${nextIndex}`,
    description: '',
    type: 'string',
    fieldType: 'string',
    required: false,
    defaultValue: '',
    enumValuesText: '',
    min: '',
    max: '',
  };
}

function toAddColumnDraftFromField(field: BuilderField): AddColumnDraft {
  return {
    key: field.key,
    label: field.label,
    description: field.description,
    type: field.type,
    fieldType: normalizeBuilderLeafFieldType(
      typeof field.fieldType === 'string' ? field.fieldType : field.type,
    ),
    required: field.required,
    defaultValue: field.defaultValue ?? '',
    enumValuesText: field.enumValuesText ?? '',
    min: field.min ?? '',
    max: field.max ?? '',
  };
}

type HashPreviewInput = {
  pluginId: string;
  version: string;
  docs: {
    title: string;
    description: string;
  };
  actionManifest: ActionManifestDoc[];
  schemaDocs: SchemaDoc[];
  workflows: WorkflowDoc[];
  adminTabs: AdminTabDoc[];
};

function toObjectFieldDoc(field: BuilderObjectField): SchemaFieldDoc {
  return {
    key: field.key || 'field_key',
    type: field.type,
    description: field.description || undefined,
    optional: !field.required,
    enumValues: isChoiceFieldType(field.type)
      ? parseCommaSeparatedValues(field.enumValuesText)
      : undefined,
    behavior: {
      fieldConfig: {
        fieldType: field.type,
        label: field.label || field.key || 'Field',
        description: field.description || undefined,
      },
    },
  };
}

function toSchemaFieldDoc(
  field: BuilderField,
  derivedFieldEntries: readonly SchemaBuilderDerivedField[],
): SchemaFieldDoc {
  const parseNumeric = (value: string | undefined) => {
    if (!value) return undefined;
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  };

  const resolvedFieldType =
    field.fieldType ??
    (AUTOFORM_FIELD_TYPES.includes(
      field.type as (typeof AUTOFORM_FIELD_TYPES)[number],
    )
      ? (field.type as (typeof AUTOFORM_FIELD_TYPES)[number])
      : undefined);

  const fieldConfig = {
    ...(parseJsonObject(field.fieldConfigJson) ?? {}),
    ...(resolvedFieldType ? { fieldType: resolvedFieldType } : {}),
    label: field.label || field.key || 'Field',
    description: field.description || undefined,
    ...(parseJsonObject(field.inputPropsJson)
      ? { inputProps: parseJsonObject(field.inputPropsJson) }
      : {}),
    ...(parseJsonObject(field.customDataJson)
      ? { customData: parseJsonObject(field.customDataJson) }
      : {}),
  };
  const compiledDerivations = derivedFieldEntries
    .map((entry) => compileDerivedFieldToDeriveIr(entry))
    .filter((entry): entry is DeriveIR => entry !== null);

  const behavior = {
    ...(parseJsonObject(field.behaviorJson) ?? {}),
    fieldConfig,
    ...(compiledDerivations.length > 0
      ? {
        derivations: compiledDerivations,
      }
      : {}),
    ...(field.fieldRefinements && field.fieldRefinements.length > 0
      ? {
        refinements: field.fieldRefinements.map((refinement) => ({
          code: 'custom' as const,
          path: field.key ? [field.key] : undefined,
          message: refinement.message || 'Validation failed',
          when: {
            kind: 'op' as const,
            op: 'not' as const,
            args: [
              {
                kind: 'op' as const,
                op: refinement.operator,
                args: [
                  {
                    kind: 'ref' as const,
                    source: 'payload' as const,
                    path: [field.key],
                  },
                  refinement.rightKind === 'payloadField'
                    ? {
                      kind: 'ref' as const,
                      source: 'payload' as const,
                      path:
                        toSinglePayloadFieldPath(refinement.rightPath)
                          .length > 0
                          ? toSinglePayloadFieldPath(refinement.rightPath)
                          : toSinglePayloadFieldPath(field.key),
                    }
                    : toExpressionLiteral(refinement.rightLiteral),
                ],
              },
            ],
          },
        })),
      }
      : {}),
  };

  return {
    key: field.key || 'field_key',
    type: field.type,
    description: field.description || undefined,
    optional: !field.required,
    defaultValue: parseDefaultValue(field.defaultValue, field.type),
    enumValues: isChoiceFieldType(field.type)
      ? parseCommaSeparatedValues(field.enumValuesText)
      : undefined,
    itemType:
      field.type === 'array'
        ? {
          type: field.arrayItemType ?? 'string',
          enumValues: isChoiceFieldType(field.arrayItemType)
            ? parseCommaSeparatedValues(field.arrayItemEnumValuesText)
            : undefined,
          behavior: {
            fieldConfig: {
              fieldType: field.arrayItemType ?? 'string',
            },
          },
        }
        : undefined,
    fields:
      field.type === 'object'
        ? (field.objectFields ?? []).map((nestedField) =>
          toObjectFieldDoc(nestedField),
        )
        : undefined,
    behavior,
    rules: [
      ...(parseNumeric(field.min) !== undefined
        ? [{ kind: 'min' as const, value: parseNumeric(field.min) }]
        : []),
      ...(parseNumeric(field.max) !== undefined
        ? [{ kind: 'max' as const, value: parseNumeric(field.max) }]
        : []),
      ...(field.useInt ? [{ kind: 'int' as const }] : []),
      ...(field.usePositive ? [{ kind: 'positive' as const }] : []),
      ...(field.useNonNegative ? [{ kind: 'nonnegative' as const }] : []),
    ],
  };
}

function hasFieldValidationErrors(field: BuilderField) {
  if (!field.key.trim()) return true;
  if (
    isChoiceFieldType(field.type) &&
    parseCommaSeparatedValues(field.enumValuesText).length === 0
  ) {
    return true;
  }
  if (field.type === 'array' && !field.arrayItemType) return true;
  if (
    field.type === 'array' &&
    isChoiceFieldType(field.arrayItemType) &&
    parseCommaSeparatedValues(field.arrayItemEnumValuesText).length === 0
  ) {
    return true;
  }
  if (
    field.type === 'object' &&
    ((field.objectFields ?? []).length === 0 ||
      field.objectFields?.some(
        (nestedField) =>
          !nestedField.key.trim() ||
          (isChoiceFieldType(nestedField.type) &&
            parseCommaSeparatedValues(nestedField.enumValuesText).length === 0),
      ))
  ) {
    return true;
  }
  if (isInvalidObjectJson(field.inputPropsJson)) return true;
  if (isInvalidObjectJson(field.customDataJson)) return true;
  if (isInvalidObjectJson(field.fieldConfigJson)) return true;
  if (isInvalidObjectJson(field.behaviorJson)) return true;
  return false;
}

function hasDerivedFieldValidationErrors(
  derivedField: SchemaBuilderDerivedField,
  fieldKeys: Set<string>,
) {
  if (!derivedField.targetFieldKey.trim()) return true;
  if (!fieldKeys.has(derivedField.targetFieldKey.trim())) return true;
  if (derivedField.target !== 'value' && !derivedField.key.trim()) return true;
  if (!derivedField.sources.length) return true;
  if (derivedField.sources.some((source) => !source.path.trim())) return true;
  return false;
}

const blocklyModulePromise = import('blockly');

type BlocklyBlockLike = {
  type: string;
  getFieldValue: (fieldName: string) => string;
  getInputTargetBlock: (inputName: string) => BlocklyBlockLike | null;
};

function buildConditionFromBlocklyBlock(
  block: BlocklyBlockLike | null,
  leftField: string,
): ExpressionDoc | null {
  if (!block || !leftField) return null;

  if (block.type === 'plugin_rule_compare') {
    const operator = block.getFieldValue('OP') as RuleOperator;
    const rightField = block.getFieldValue('RIGHT');
    if (!rightField) return null;
    return {
      kind: 'op',
      op: operator,
      args: [
        { kind: 'ref', source: 'payload', path: [leftField] },
        { kind: 'ref', source: 'payload', path: [rightField] },
      ],
    };
  }

  if (block.type === 'plugin_rule_compare_number') {
    const operator = block.getFieldValue('OP') as RuleOperator;
    const literalValue = Number(block.getFieldValue('VALUE'));
    if (!Number.isFinite(literalValue)) return null;
    return {
      kind: 'op',
      op: operator,
      args: [
        { kind: 'ref', source: 'payload', path: [leftField] },
        literalValue,
      ],
    };
  }

  if (block.type === 'plugin_rule_compare_text') {
    const operator = block.getFieldValue('OP') as RuleOperator;
    const literalValue = block.getFieldValue('VALUE');
    return {
      kind: 'op',
      op: operator,
      args: [
        { kind: 'ref', source: 'payload', path: [leftField] },
        literalValue,
      ],
    };
  }

  if (block.type === 'plugin_rule_compare_boolean') {
    const operator = block.getFieldValue('OP') as RuleOperator;
    const literalValue = block.getFieldValue('VALUE') === 'true';
    return {
      kind: 'op',
      op: operator,
      args: [
        { kind: 'ref', source: 'payload', path: [leftField] },
        literalValue,
      ],
    };
  }

  if (block.type === 'plugin_logic_and' || block.type === 'plugin_logic_or') {
    const leftCondition = buildConditionFromBlocklyBlock(
      block.getInputTargetBlock('A'),
      leftField,
    );
    const rightCondition = buildConditionFromBlocklyBlock(
      block.getInputTargetBlock('B'),
      leftField,
    );
    if (!leftCondition || !rightCondition) return null;
    return {
      kind: 'op',
      op: block.type === 'plugin_logic_and' ? 'and' : 'or',
      args: [leftCondition, rightCondition],
    };
  }

  if (block.type === 'plugin_logic_not') {
    const nestedCondition = buildConditionFromBlocklyBlock(
      block.getInputTargetBlock('VALUE'),
      leftField,
    );
    if (!nestedCondition) return null;
    return {
      kind: 'op',
      op: 'not',
      args: [nestedCondition],
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBuilderFieldType(value: string): value is BuilderFieldType {
  return (BUILDER_FIELD_TYPES as readonly string[]).includes(value);
}

function isBuilderLeafFieldType(value: string): value is BuilderLeafFieldType {
  return (BUILDER_LEAF_FIELD_TYPES as readonly string[]).includes(value);
}

function stringifyJsonInput(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return '{}';
  }
  return canonicalStringify(value);
}

function normalizeBuilderFieldType(
  fieldType: string | undefined,
): BuilderFieldType {
  if (fieldType && isBuilderFieldType(fieldType)) {
    return fieldType;
  }
  return 'string';
}

function normalizeBuilderLeafFieldType(
  fieldType: string | undefined,
): BuilderLeafFieldType {
  if (fieldType && isBuilderLeafFieldType(fieldType)) {
    return fieldType;
  }
  return 'string';
}

function resolveLucideIconByName(
  iconName: string | undefined,
): LucideIcon | undefined {
  if (!iconName) return undefined;
  const fromIconMap = (
    LucideIcons.icons as Record<string, LucideIcon | undefined>
  )[iconName];
  if (fromIconMap) return fromIconMap;
  const fromNamespace = (LucideIcons as Record<string, LucideIcon | undefined>)[
    iconName
  ];
  return fromNamespace;
}

function getRuleValue(
  field: SchemaFieldDoc,
  kind: 'min' | 'max',
): string | undefined {
  const rule = field.rules?.find((entry) => entry.kind === kind);
  if (!rule || rule.value === undefined) {
    return undefined;
  }
  return String(rule.value);
}

function toDefaultValueText(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function toBuilderObjectField(field: SchemaFieldDoc): BuilderObjectField {
  return {
    id: generateBuilderId(),
    key: field.key,
    label:
      field.behavior?.fieldConfig?.label ?? field.label ?? field.key ?? 'Field',
    description:
      field.behavior?.fieldConfig?.description ?? field.description ?? '',
    type: normalizeBuilderLeafFieldType(field.type),
    required: !field.optional,
    enumValuesText: (field.enumValues ?? []).join(','),
  };
}

function toBuilderField(field: SchemaFieldDoc): BuilderField {
  const behavior = isRecord(field.behavior) ? field.behavior : {};
  const fieldConfig = isRecord(behavior.fieldConfig)
    ? behavior.fieldConfig
    : {};
  const extraBehavior = Object.fromEntries(
    Object.entries(behavior).filter(([key]) => key !== 'fieldConfig'),
  );
  const { label, description, fieldType, inputProps, customData, ...extra } =
    fieldConfig;
  const normalizedType = normalizeBuilderFieldType(field.type);
  const normalizedFieldType = normalizeBuilderLeafFieldType(
    typeof fieldType === 'string' ? fieldType : undefined,
  );

  return {
    id: generateBuilderId(),
    key: field.key,
    label: typeof label === 'string' ? label : field.key,
    description:
      typeof description === 'string' ? description : (field.description ?? ''),
    type: normalizedType,
    fieldType: AUTOFORM_FIELD_TYPES.includes(normalizedFieldType)
      ? normalizedFieldType
      : 'string',
    required: !field.optional,
    min: getRuleValue(field, 'min'),
    max: getRuleValue(field, 'max'),
    useInt: Boolean(field.rules?.some((rule) => rule.kind === 'int')),
    usePositive: Boolean(field.rules?.some((rule) => rule.kind === 'positive')),
    useNonNegative: Boolean(
      field.rules?.some((rule) => rule.kind === 'nonnegative'),
    ),
    defaultValue: toDefaultValueText(field.defaultValue),
    enumValuesText: (field.enumValues ?? []).join(','),
    fieldConfigJson: stringifyJsonInput(extra),
    behaviorJson: stringifyJsonInput(extraBehavior),
    inputPropsJson: stringifyJsonInput(inputProps),
    customDataJson: stringifyJsonInput(customData),
    arrayItemType:
      normalizedType === 'array'
        ? normalizeBuilderLeafFieldType(field.itemType?.type)
        : undefined,
    arrayItemEnumValuesText:
      normalizedType === 'array'
        ? (field.itemType?.enumValues ?? []).join(',')
        : undefined,
    objectFields:
      normalizedType === 'object'
        ? (field.fields ?? [])
          .filter(
            (nested) => nested.type !== 'object' && nested.type !== 'array',
          )
          .map(toBuilderObjectField)
        : undefined,
    fieldRefinements: toBuilderFieldRefinements(
      stringifyJsonInput(extraBehavior),
      field.key,
    ),
  };
}

function parseRuleOperator(value: unknown): RuleOperator | null {
  if (typeof value !== 'string') {
    return null;
  }
  return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(value)
    ? (value as RuleOperator)
    : null;
}

function tryReadPayloadRefField(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.kind !== 'ref' || value.source !== 'payload') {
    return null;
  }
  if (!Array.isArray(value.path) || value.path.length !== 1) {
    return null;
  }
  return typeof value.path[0] === 'string' ? value.path[0] : null;
}

function unwrapNotCondition(value: ExpressionDoc): ExpressionDoc {
  if (!isRecord(value)) {
    return value;
  }
  if (value.kind !== 'op' || value.op !== 'not' || !Array.isArray(value.args)) {
    return value;
  }
  if (value.args.length !== 1) {
    return value;
  }
  return value.args[0] as ExpressionDoc;
}

function toBuilderRefinements(schemaDoc: SchemaDoc): {
  schemaRefinements: BuilderRefinement[];
  blocklyRefinements: BlocklyRefinement[];
} {
  const schemaRefinements: BuilderRefinement[] = [];
  const blocklyRefinements: BlocklyRefinement[] = [];
  const fallbackFieldKey = schemaDoc.fields[0]?.key ?? '';

  for (const refinement of schemaDoc.refinements ?? []) {
    const when = refinement.when;
    if (
      isRecord(when) &&
      when.kind === 'op' &&
      when.op === 'not' &&
      Array.isArray(when.args) &&
      when.args.length === 1 &&
      isRecord(when.args[0]) &&
      when.args[0].kind === 'op' &&
      Array.isArray(when.args[0].args) &&
      when.args[0].args.length >= 2
    ) {
      const operator = parseRuleOperator(when.args[0].op);
      const leftField = tryReadPayloadRefField(when.args[0].args[0]);
      const rightField = tryReadPayloadRefField(when.args[0].args[1]);
      if (operator && leftField && rightField) {
        schemaRefinements.push({
          id: generateBuilderId(),
          leftField,
          operator,
          rightField,
          message: refinement.message || 'Validation failed',
        });
        continue;
      }
    }

    const leftField =
      refinement.path?.find((segment) => typeof segment === 'string') ??
      fallbackFieldKey;

    if (!leftField) {
      continue;
    }

    blocklyRefinements.push({
      id: generateBuilderId(),
      leftField,
      message: refinement.message || 'Validation failed',
      condition: unwrapNotCondition(refinement.when),
    });
  }

  return {
    schemaRefinements,
    blocklyRefinements,
  };
}

function applyRevisionToBuilderState(revision: PluginDraftRevisionDoc): {
  pluginId: string;
  schemaBuilder: BuilderSchema;
  schemaRefinements: BuilderRefinement[];
  blocklyRefinements: BlocklyRefinement[];
  schemaText: string;
  workflowText: string;
} {
  const schemaDoc = revision.schemaDocs?.[0] ?? DEFAULT_SCHEMA_DOC;
  const { schemaRefinements, blocklyRefinements } =
    toBuilderRefinements(schemaDoc);

  return {
    pluginId: revision.pluginId,
    schemaBuilder: {
      schemaId: schemaDoc.schemaId,
      title: schemaDoc.title ?? schemaDoc.schemaId,
      fields: schemaDoc.fields.map(toBuilderField),
      derivedFields: parseDerivedFieldsFromSchemaDoc(schemaDoc),
    },
    schemaRefinements,
    blocklyRefinements,
    schemaText: canonicalStringify(revision.schemaDocs ?? [schemaDoc]),
    workflowText: canonicalStringify(
      revision.workflows ?? [DEFAULT_WORKFLOW_DOC],
    ),
  };
}

type PluginStudioPresenterProps = {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  isAuthenticated: boolean;
};

export function PluginStudioPage(_props?: {
  initialProjectId?: string;
  initialPluginId?: string;
  initialStudioView?: 'org' | 'workspace';
}) {
  return <PluginStudioRoute />;
}

function PluginStudioRoute() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <PluginStudioSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Studio</CardTitle>
          </CardHeader>
          <CardContent>Sign in to access the plugin studio.</CardContent>
        </Card>
      </div>
    );
  }

  return <PluginStudioPresenter user={user} isAuthenticated={isAuthenticated} />;
}

function PluginStudioPresenter({
  user,
  isAuthenticated,
}: PluginStudioPresenterProps) {
  const { fire: fireConfetti } = useConfetti();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const actorUserIdAliases = useMemo(
    () => buildActorUserIdAliases(user),
    [user?.pub, user?._?.soul],
  );
  const actorUserId = actorUserIdAliases[0] ?? 'anon';
  const isActorIdentityReady = !isAuthenticated || actorUserIdAliases.length > 0;
  const requestedPluginId = search.pluginId;
  const draftId = useMemo(
    () => toDraftId({ actorUserId }),
    [actorUserId],
  );
  const [title, setTitle] = useState<string | undefined>('Example Plugin');
  const [description, setDescription] = useState<string | undefined>(
    'Operational plugin release.',
  );
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string>();
  const [draggingSchemaId, setDraggingSchemaId] = useState<string | null>(null);
  const [renamingSchemaId, setRenamingSchemaId] = useState<string | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState<string | null>(
    null,
  );
  const [coreExtensionSchemaIds, setCoreExtensionSchemaIds] = useState<
    Record<string, true>
  >({});
  const [lockedCoreFieldKeysBySchemaId, setLockedCoreFieldKeysBySchemaId] =
    useState<Record<string, string[]>>({});
  const [activeSchemaId, setActiveSchemaId] = useState(
    DEFAULT_SCHEMA_DOC.schemaId,
  );
  const [activeWorkflowId, setActiveWorkflowId] = useState(
    DEFAULT_WORKFLOW_DOC.workflowId,
  );
  const [isAddColumnSheetOpen, setIsAddColumnSheetOpen] = useState(false);
  const [addColumnDraft, setAddColumnDraft] = useState<AddColumnDraft>({
    key: '',
    label: '',
    description: '',
    type: 'string',
    fieldType: 'string',
    required: false,
    defaultValue: '',
    enumValuesText: '',
    min: '',
    max: '',
  });
  const [columnSheetMode, setColumnSheetMode] =
    useState<ColumnSheetMode>('add');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [isDeleteColumnDialogOpen, setIsDeleteColumnDialogOpen] =
    useState(false);
  const [pendingDeleteColumnKey, setPendingDeleteColumnKey] = useState<
    string | null
  >(null);
  const [pendingDeleteTable, setPendingDeleteTable] = useState<{
    schemaId: string;
    tabTitle: string;
  } | null>(null);
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState(false);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [isWorkflowEditorOpen, setIsWorkflowEditorOpen] = useState(false);
  const [workflowEditorLockedTable, setWorkflowEditorLockedTable] = useState<
    string | null
  >(null);
  const [blocklyDraft, setBlocklyDraft] = useState<BlocklyDraft>({
    fieldId: null,
    operator: 'eq',
    rightField: '',
    message: 'Validation rule failed',
  });
  const [isBlocklyComposerOpen, setIsBlocklyComposerOpen] = useState(false);
  const [isBlocklyReady, setIsBlocklyReady] = useState(false);
  const [blocklyError, setBlocklyError] = useState<string | null>(null);
  const blocklyWorkspaceId = useId();
  const [blocklyMountElement, setBlocklyMountElement] =
    useState<HTMLDivElement | null>(null);
  const schemaEditorOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const blocklyRuntimeRef = useRef<BlocklyRuntime | null>(null);
  const blocklyRightFieldOptionsRef = useRef<[string, string][]>([
    ['No compatible fields', ''],
  ]);
  const blocklyInitialOperatorRef = useRef<RuleOperator>('eq');
  const blocklyInitialRightFieldRef = useRef('');
  const [debouncedHashInput, setDebouncedHashInput] =
    useState<HashPreviewInput | null>(null);
  const hasAttemptedDraftCreationRef = useRef<Set<string>>(new Set());
  const hydratedRevisionKeyRef = useRef<string | null>(null);
  const lastHydratedRevisionRecencyRef = useRef<{
    draftId: string;
    recencyKey: string;
  } | null>(null);
  const initialSnapshotByDraftRef = useRef<Record<string, string | null>>({});
  const sidebarSnapshotSeededDraftIdRef = useRef<string | null>(null);
  const lastRequestedDraftSnapshotRef = useRef<string | null>(null);
  const lastAutosaveErrorAtRef = useRef<number>(0);
  const lastPersistenceErrorAtRef = useRef<number>(0);
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(
    null,
  );
  const [guardedIrState, setGuardedIrState] = useState(() =>
    createGuardedIrEditorState({
      schemaDocs: [DEFAULT_SCHEMA_DOC],
    }),
  );
  const [workspacePublishGateChecked, setWorkspacePublishGateChecked] =
    useState(false);
  const handleBlocklyContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setBlocklyMountElement((current) => (current === node ? current : node));
    },
    [],
  );

  const {
    data: releaseRows = [],
    isLoading: isReleaseLoading,
    refetch: refetchReleases,
  } = api.pluginRelease.useGet();
  const releases = releaseRows as PluginReleaseDoc[];
  const marketplaceReleases = releases;
  const {
    data: draftRows = [],
    isLoading: isDraftLoading,
    refetch: refetchDrafts,
  } = api.pluginDraft.useGet();
  const drafts = draftRows as PluginDraftDoc[];
  const activeDraft = useMemo(
    () => drafts.find((candidate) => candidate.draftId === draftId) ?? null,
    [draftId, drafts],
  );
  const pluginId = useMemo(
    () =>
      resolvePluginStudioPluginId({
        searchPluginId: requestedPluginId,
        persistedPluginId: activeDraft?.pluginId,
        fallbackPluginId: 'example.plugin',
      }),
    [requestedPluginId, activeDraft?.pluginId],
  );
  const draftDocScopeKeys = useMemo(() => [draftId], [draftId]);
  const {
    data: schemaDocRows = [],
    refetch: refetchSchemaDocs,
  } = api.pluginSchemaDoc.useGet({
    keys: draftDocScopeKeys,
  });
  const {
    data: workflowDocRows = [],
    refetch: refetchWorkflowDocs,
  } = api.pluginWorkflowDoc.useGet({
    keys: draftDocScopeKeys,
  });
  const {
    data: actionManifestDocRows = [],
    refetch: refetchActionManifestDocs,
  } = api.pluginActionManifestDoc.useGet({
    keys: draftDocScopeKeys,
  });
  const {
    data: routesTabsConfigRows = [],
    refetch: refetchRoutesTabsConfig,
  } = api.pluginRoutesTabsConfig.useGet({
    keys: draftDocScopeKeys,
  });
  const createSchemaDocMutation = api.pluginSchemaDoc.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateSchemaDocMutation = api.pluginSchemaDoc.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteSchemaDocMutation = api.pluginSchemaDoc.useDelete({
    keys: draftDocScopeKeys,
  });
  const createWorkflowDocMutation = api.pluginWorkflowDoc.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateWorkflowDocMutation = api.pluginWorkflowDoc.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteWorkflowDocMutation = api.pluginWorkflowDoc.useDelete({
    keys: draftDocScopeKeys,
  });
  const createActionManifestDocMutation = api.pluginActionManifestDoc.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateActionManifestDocMutation = api.pluginActionManifestDoc.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteActionManifestDocMutation = api.pluginActionManifestDoc.useDelete({
    keys: draftDocScopeKeys,
  });
  const createRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useDelete({
    keys: draftDocScopeKeys,
  });

  const workspaceSchemaDocs = useMemo(() => {
    const rows = schemaDocRows as Array<{
      id?: string;
      schemaId?: string;
      doc?: unknown;
    }>;
    const docs = rows
      .map((row) => row.doc as SchemaDoc | undefined)
      .filter((doc): doc is SchemaDoc => Boolean(doc?.schemaId));
    if (docs.length > 0) {
      return docs;
    }
    return [DEFAULT_SCHEMA_DOC];
  }, [schemaDocRows]);

  const workspaceWorkflows = useMemo(() => {
    const rows = workflowDocRows as Array<{
      id?: string;
      workflowId?: string;
      doc?: unknown;
    }>;
    const docs = rows
      .map((row) => row.doc as WorkflowDoc | undefined)
      .filter((doc): doc is WorkflowDoc => Boolean(doc?.workflowId));
    if (docs.length > 0) {
      return docs;
    }
    return [DEFAULT_WORKFLOW_DOC];
  }, [workflowDocRows]);

  const workspaceActionManifest = useMemo(() => {
    const rows = actionManifestDocRows as Array<{
      actionId?: string;
      doc?: unknown;
    }>;
    return rows
      .map((row) => row.doc as ActionManifestDoc | undefined)
      .filter((doc): doc is ActionManifestDoc => Boolean(doc?.actionId));
  }, [actionManifestDocRows]);

  const canonicalRoutesTabsConfigId = draftId;
  const legacyRoutesTabsConfigId = useMemo(
    () => `${draftId}@live`,
    [draftId],
  );

  const activeRoutesTabsConfigRow = useMemo(() => {
    const rows = routesTabsConfigRows as Array<{
      id?: string;
      draftId?: string;
      revisionId?: string;
      routes?: Array<{
        schema: string;
        title: string;
        group?: string;
        order: number;
        iconName?: string;
      }>;
    }>;
    const candidates = rows.filter(
      (row) =>
        row.draftId === draftId &&
        (row.revisionId === 'live' ||
          row.id === canonicalRoutesTabsConfigId ||
          row.id === legacyRoutesTabsConfigId),
    );
    const canonical = candidates.find(
      (row) => row.id === canonicalRoutesTabsConfigId,
    );
    if (canonical) return canonical;

    const legacy = candidates.find((row) => row.id === legacyRoutesTabsConfigId);
    if (legacy) return legacy;

    return candidates.find((row) => row.revisionId === 'live') ?? null;
  }, [
    canonicalRoutesTabsConfigId,
    legacyRoutesTabsConfigId,
    draftId,
    routesTabsConfigRows,
  ]);

  const adminTabsText = useMemo(
    () =>
      canonicalStringify(
        toAdminTabsFromDraftRoutes(activeRoutesTabsConfigRow?.routes),
      ),
    [activeRoutesTabsConfigRow],
  );

  const updatePluginIdInSearch = useCallback(
    (candidatePluginId: string) => {
      const normalizedPluginId = candidatePluginId.trim();
      if (!normalizedPluginId) return;
      navigate({
        search: (current) => {
          const { draftId: _draftId, ...rest } = current;
          return {
            ...rest,
            pluginId: normalizedPluginId,
          };
        },
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    return () => {
      if (schemaEditorOpenTimeoutRef.current !== null) {
        clearTimeout(schemaEditorOpenTimeoutRef.current);
        schemaEditorOpenTimeoutRef.current = null;
      }
    };
  }, []);

  const parsed = useMemo(() => {
    try {
      const schemaDocs = workspaceSchemaDocs;
      const workflows = workspaceWorkflows;
      const actionManifest = workspaceActionManifest;
      const parsedDraftAdminTabs = JSON.parse(adminTabsText) as AdminTabDoc[];
      const {
        schemaTabs: storedSchemaTabs,
        orderedGroups: storedGroupOrder,
        systemTabs,
      } = deserializeDraftAdminTabs(parsedDraftAdminTabs);
      const schemaIdSet = new Set(schemaDocs.map((schemaDoc) => schemaDoc.schemaId));
      const storedSchemaOrder = storedSchemaTabs
        .map((tab) => tab.schema)
        .filter((schemaId) => schemaIdSet.has(schemaId));
      const missingSchemaOrder = schemaDocs
        .map((schemaDoc) => schemaDoc.schemaId)
        .filter((schemaId) => !storedSchemaOrder.includes(schemaId));
      const schemaOrder = [...storedSchemaOrder, ...missingSchemaOrder];
      const tabBySchema = new Map(
        storedSchemaTabs.map((tab) => [tab.schema, tab]),
      );
      const schemaTitleById = Object.fromEntries(
        schemaDocs.map((schemaDoc) => [
          schemaDoc.schemaId,
          schemaDoc.title ??
          tabBySchema.get(schemaDoc.schemaId)?.title ??
          schemaDoc.schemaId,
        ]),
      );
      const schemaGroupById = Object.fromEntries(
        schemaDocs.flatMap((schemaDoc) => {
          const normalizedGroup = tabBySchema.get(schemaDoc.schemaId)?.group?.trim();
          return normalizedGroup ? [[schemaDoc.schemaId, normalizedGroup]] : [];
        }),
      );
      const schemaIconNameById = Object.fromEntries(
        schemaDocs.flatMap((schemaDoc) => {
          const normalizedIcon = tabBySchema.get(schemaDoc.schemaId)?.icon?.trim();
          return normalizedIcon ? [[schemaDoc.schemaId, normalizedIcon]] : [];
        }),
      );
      const orderedGroups = computeOrderedGroupNames({
        customGroups: storedGroupOrder,
        groupOrder: storedGroupOrder,
        schemaGroupById,
        schemaOrder,
        systemTabs,
      });
      const adminTabs: AdminTabDoc[] = schemaOrder.map((schemaId) => ({
        schema: schemaId,
        title: schemaTitleById[schemaId],
        group: schemaGroupById[schemaId],
        icon: schemaIconNameById[schemaId],
      }));
      const draftAdminTabs = serializeDraftAdminTabs({
        schemaTabs: adminTabs,
        orderedGroups,
        systemTabs,
      });
      return {
        schemaDocs,
        workflows,
        actionManifest,
        schemaOrder,
        schemaTitleById,
        schemaGroupById,
        schemaIconNameById,
        customGroups: orderedGroups,
        groupOrder: orderedGroups,
        systemTabs,
        adminTabs,
        draftAdminTabs,
      };
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }, [
    adminTabsText,
    workspaceActionManifest,
    workspaceSchemaDocs,
    workspaceWorkflows,
  ]);
  const schemaTitleById = parsed?.schemaTitleById ?? {};
  const schemaGroupById = parsed?.schemaGroupById ?? {};
  const schemaIconNameById = parsed?.schemaIconNameById ?? {};
  const customGroups = parsed?.customGroups ?? [];
  const groupOrder = parsed?.groupOrder ?? [];
  const systemTabs = parsed?.systemTabs ?? DEFAULT_SYSTEM_TABS;
  const schemaOrder = parsed?.schemaOrder ?? [DEFAULT_SCHEMA_DOC.schemaId];

  const availableSchemaDocs = parsed?.schemaDocs ?? [];
  const availableWorkflows = parsed?.workflows ?? [];
  const availableGroups = groupOrder;
  const activeSchemaDocForEditor = useMemo(
    () =>
      availableSchemaDocs.find((schemaDoc) => schemaDoc.schemaId === activeSchemaId) ??
      availableSchemaDocs[0] ??
      DEFAULT_SCHEMA_DOC,
    [activeSchemaId, availableSchemaDocs],
  );
  const schemaBuilder = useMemo(
    () => ({
      schemaId: activeSchemaDocForEditor.schemaId,
      title: activeSchemaDocForEditor.title ?? activeSchemaDocForEditor.schemaId,
      fields: activeSchemaDocForEditor.fields.map(toBuilderField),
      derivedFields: parseDerivedFieldsFromSchemaDoc(activeSchemaDocForEditor),
    }),
    [activeSchemaDocForEditor],
  );
  const schemaEditorRefinements = useMemo(
    () => toBuilderRefinements(activeSchemaDocForEditor),
    [activeSchemaDocForEditor],
  );
  const schemaRefinements = schemaEditorRefinements.schemaRefinements;
  const blocklyRefinements = schemaEditorRefinements.blocklyRefinements;
  const setSchemaBuilder = useCallback(
    (
      value:
        | BuilderSchema
        | ((current: BuilderSchema) => BuilderSchema),
    ) => {
      const nextBuilder =
        typeof value === 'function' ? value(schemaBuilder) : value;
      if (canonicalStringify(nextBuilder) === canonicalStringify(schemaBuilder)) {
        return;
      }
      persistSchemaEditorState(
        nextBuilder,
        schemaRefinements,
        blocklyRefinements,
      );
    },
    [blocklyRefinements, schemaBuilder, schemaRefinements],
  );
  const setSchemaRefinements = useCallback(
    (
      value:
        | BuilderRefinement[]
        | ((current: BuilderRefinement[]) => BuilderRefinement[]),
    ) => {
      const nextSchemaRefinements =
        typeof value === 'function' ? value(schemaRefinements) : value;
      if (
        canonicalStringify(nextSchemaRefinements) ===
        canonicalStringify(schemaRefinements)
      ) {
        return;
      }
      persistSchemaEditorState(
        schemaBuilder,
        nextSchemaRefinements,
        blocklyRefinements,
      );
    },
    [blocklyRefinements, schemaBuilder, schemaRefinements],
  );
  const setBlocklyRefinements = useCallback(
    (
      value:
        | BlocklyRefinement[]
        | ((current: BlocklyRefinement[]) => BlocklyRefinement[]),
    ) => {
      const nextBlocklyRefinements =
        typeof value === 'function' ? value(blocklyRefinements) : value;
      if (
        canonicalStringify(nextBlocklyRefinements) ===
        canonicalStringify(blocklyRefinements)
      ) {
        return;
      }
      persistSchemaEditorState(
        schemaBuilder,
        schemaRefinements,
        nextBlocklyRefinements,
      );
    },
    [blocklyRefinements, schemaBuilder, schemaRefinements],
  );
  const activeSchemaLockedCoreFields = useMemo(
    () => new Set(lockedCoreFieldKeysBySchemaId[activeSchemaId] ?? []),
    [activeSchemaId, lockedCoreFieldKeysBySchemaId],
  );
  const isActiveSchemaCoreExtension = Boolean(
    coreExtensionSchemaIds[activeSchemaId],
  );

  useEffect(() => {
    if (availableSchemaDocs.length === 0) return;
    if (
      availableSchemaDocs.some(
        (schemaDoc) => schemaDoc.schemaId === activeSchemaId,
      )
    ) {
      return;
    }
    setActiveSchemaId(
      availableSchemaDocs[0]?.schemaId ?? DEFAULT_SCHEMA_DOC.schemaId,
    );
  }, [activeSchemaId, availableSchemaDocs]);


  useEffect(() => {
    if (availableWorkflows.length === 0) return;
    if (
      availableWorkflows.some(
        (workflowDoc) => workflowDoc.workflowId === activeWorkflowId,
      )
    ) {
      return;
    }
    setActiveWorkflowId(
      availableWorkflows[0]?.workflowId ?? DEFAULT_WORKFLOW_DOC.workflowId,
    );
  }, [activeWorkflowId, availableWorkflows]);

  const isValidInputs = useMemo(() => {
    const hasInvalidFieldConfig = schemaBuilder.fields.some((field) =>
      hasFieldValidationErrors(field),
    );
    const fieldKeys = new Set(
      schemaBuilder.fields
        .map((field) => field.key.trim())
        .filter((key) => key.length > 0),
    );
    const hasInvalidDerivedFieldConfig = schemaBuilder.derivedFields.some(
      (derivedField) =>
        hasDerivedFieldValidationErrors(derivedField, fieldKeys),
    );

    return (pluginId.trim() &&
    /^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) &&
    parsed &&
    !hasInvalidFieldConfig && !hasInvalidDerivedFieldConfig)
  }, [parsed, pluginId, schemaBuilder]);
  const isDraftSaveable = useMemo(
    () =>
      Boolean(
        parsed &&
        pluginId.trim() &&
        /^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId),
      ),
    [parsed, pluginId],
  );

  const {
    data: draftRevisionRows = [],
    isLoading: isDraftRevisionLoading,
    refetch: refetchDraftRevisions,
  } = api.pluginDraftRevision.useGet({
    keys: [draftId],
  });
  const draftRevisions = draftRevisionRows as PluginDraftRevisionDoc[];

  const activeDraftRevisions = useMemo(
    () =>
      [...draftRevisions].sort((left, right) =>
        toDraftRevisionRecencyKey(right).localeCompare(
          toDraftRevisionRecencyKey(left),
        ),
      ),
    [draftRevisions],
  );
  const expectedHydratedDraftKey = useMemo(() => {
    if (isDraftRevisionLoading) return null;
    return toDraftHydrationKey({
      draftId,
      revision: activeDraftRevisions[0] ?? null,
    });
  }, [draftId, activeDraftRevisions, isDraftRevisionLoading]);
  const isDraftHydrated = Boolean(
    expectedHydratedDraftKey && hydratedDraftKey === expectedHydratedDraftKey,
  );
  const latestActiveDraftRevision = activeDraftRevisions[0] ?? null;
  const localDraftSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    localDraftSnapshotRef.current = parsed
      ? toDraftSnapshotString({
        schemaDocs: parsed.schemaDocs,
        workflows: parsed.workflows,
        adminTabs: parsed.draftAdminTabs,
      })
      : null;
  }, [parsed]);

  const sidebarSnapshotStorageKey = useMemo(() => {
    return buildPluginStudioSidebarSnapshotStorageKey({
      actorUserId,
      pluginId,
      draftId,
    });
  }, [actorUserId, draftId, pluginId]);

  useEffect(() => {
    if (isDraftLoading) {
      return;
    }
    const searchPluginId = search.pluginId;
    const searchDraftId = search.draftId;
    if (
      !shouldSyncPluginStudioSearch({
        pluginId,
        searchPluginId,
        searchDraftId,
      })
    ) {
      return;
    }
    updatePluginIdInSearch(pluginId);
  }, [isDraftLoading, pluginId, search, updatePluginIdInSearch]);

  useEffect(() => {
    if (isDraftRevisionLoading) {
      return;
    }
    const latestRevision = latestActiveDraftRevision;
    if (!latestRevision) {
      const lastHydratedRevision = lastHydratedRevisionRecencyRef.current;
      if (lastHydratedRevision && lastHydratedRevision.draftId === draftId) {
        return;
      }
      const emptyHydrationKey = toDraftHydrationKey({
        draftId,
      });
      hydratedRevisionKeyRef.current = emptyHydrationKey;
      setHydratedDraftKey((current) =>
        current === emptyHydrationKey ? current : emptyHydrationKey,
      );
      return;
    }
    const latestRevisionRecencyKey = toDraftRevisionRecencyKey(latestRevision);
    const lastHydratedRevision = lastHydratedRevisionRecencyRef.current;
    const latestRevisionSnapshot = toDraftSnapshotString({
      schemaDocs: latestRevision.schemaDocs ?? [],
      workflows: latestRevision.workflows ?? [],
      adminTabs: latestRevision.adminTabs ?? [],
    });
    const localDraftSnapshot = localDraftSnapshotRef.current;
    if (
      localDraftSnapshot &&
      localDraftSnapshot !== latestRevisionSnapshot &&
      lastHydratedRevision &&
      lastHydratedRevision.draftId === draftId
    ) {
      return;
    }
    if (
      lastHydratedRevision &&
      lastHydratedRevision.draftId === draftId &&
      latestRevisionRecencyKey.localeCompare(lastHydratedRevision.recencyKey) <
      0
    ) {
      return;
    }

    const hydrationKey = toDraftHydrationKey({
      draftId,
      revision: latestRevision,
    });
    if (hydratedRevisionKeyRef.current === hydrationKey) {
      setHydratedDraftKey((current) =>
        current === hydrationKey ? current : hydrationKey,
      );
      return;
    }
    hydratedRevisionKeyRef.current = hydrationKey;

    let nextSchemaDocs = latestRevision.schemaDocs ?? [DEFAULT_SCHEMA_DOC];
    const nextWorkflows = latestRevision.workflows ?? [DEFAULT_WORKFLOW_DOC];
    const nextActiveSchema = nextSchemaDocs[0] ?? DEFAULT_SCHEMA_DOC;

    let {
      schemaTabs: hydratedSchemaTabs,
      orderedGroups: hydratedGroups,
      systemTabs: hydratedSystemTabs,
    } = deserializeDraftAdminTabs(latestRevision.adminTabs);
    const tabBySchema = new Map(
      hydratedSchemaTabs.map((tab) => [tab.schema, tab]),
    );
    let nextSchemaOrder = nextSchemaDocs.map((schemaDoc) => schemaDoc.schemaId);
    let nextSchemaGroupById = Object.fromEntries(
      nextSchemaDocs.flatMap((schemaDoc) => {
        const groupName = tabBySchema.get(schemaDoc.schemaId)?.group?.trim();
        return groupName ? [[schemaDoc.schemaId, groupName]] : [];
      }),
    );
    let nextSchemaIconNameById = Object.fromEntries(
      nextSchemaDocs.flatMap((schemaDoc) => {
        const iconName = tabBySchema.get(schemaDoc.schemaId)?.icon?.trim();
        return iconName ? [[schemaDoc.schemaId, iconName]] : [];
      }),
    );
    const groupsFromSchemas = Array.from(
      new Set(
        hydratedSchemaTabs
          .map((tab) => tab.group?.trim())
          .filter((groupName): groupName is string => Boolean(groupName)),
      ),
    );
    let nextGroupOrder =
      hydratedGroups.length > 0 ? hydratedGroups : groupsFromSchemas;
    let nextCustomGroups = Array.from(
      new Set([...nextGroupOrder, ...groupsFromSchemas]),
    );

    let sidebarSnapshot: PluginStudioSidebarSnapshot | null = null;
    const resolvedPluginId = latestRevision.pluginId || pluginId;
    if (typeof window !== 'undefined') {
      sidebarSnapshot = pickLatestPluginStudioSidebarSnapshot({
        raws: [
          window.localStorage.getItem(
            buildPluginStudioSidebarSnapshotStorageKey({
              actorUserId,
              pluginId: resolvedPluginId,
              draftId,
            }),
          ),
          window.localStorage.getItem(
            buildPluginStudioSidebarSnapshotStorageKey({
              actorUserId,
              pluginId: resolvedPluginId,
            }),
          ),
        ],
        defaultSystemTabs: DEFAULT_SYSTEM_TABS,
      });
    }

    if (sidebarSnapshot?.pluginId !== resolvedPluginId) {
      sidebarSnapshot = null;
    }

    if (
      sidebarSnapshot &&
      shouldApplyPluginStudioSidebarSnapshot({
        snapshot: sidebarSnapshot,
        draftId,
        latestRevisionRecencyKey,
      })
    ) {
      const schemaIdSet = new Set(nextSchemaOrder);
      const snapshotSchemaOrder = sidebarSnapshot.schemaOrder.filter(
        (schemaId) => schemaIdSet.has(schemaId),
      );
      const missingSchemaOrder = nextSchemaOrder.filter(
        (schemaId) => !snapshotSchemaOrder.includes(schemaId),
      );
      nextSchemaOrder = [...snapshotSchemaOrder, ...missingSchemaOrder];

      const snapshotSchemaTitleById = Object.fromEntries(
        Object.entries(sidebarSnapshot.schemaTitleById).flatMap(
          ([schemaId, titleValue]) => {
            const normalizedTitle = titleValue.trim();
            if (!schemaIdSet.has(schemaId) || !normalizedTitle) return [];
            return [[schemaId, normalizedTitle]];
          },
        ),
      );
      const snapshotSchemaGroupById = Object.fromEntries(
        Object.entries(sidebarSnapshot.schemaGroupById).flatMap(
          ([schemaId, groupValue]) => {
            const normalizedGroup = groupValue.trim();
            if (!schemaIdSet.has(schemaId) || !normalizedGroup) return [];
            return [[schemaId, normalizedGroup]];
          },
        ),
      );
      const snapshotSchemaIconNameById = Object.fromEntries(
        Object.entries(sidebarSnapshot.schemaIconNameById).flatMap(
          ([schemaId, iconValue]) => {
            const normalizedIcon = iconValue.trim();
            if (!schemaIdSet.has(schemaId) || !normalizedIcon) return [];
            return [[schemaId, normalizedIcon]];
          },
        ),
      );

      nextSchemaDocs = nextSchemaDocs.map((schemaDoc) => {
        const snapshotTitle = snapshotSchemaTitleById[schemaDoc.schemaId];
        if (!snapshotTitle) return schemaDoc;
        return {
          ...schemaDoc,
          title: snapshotTitle,
        };
      });
      nextSchemaGroupById = snapshotSchemaGroupById;
      nextSchemaIconNameById = snapshotSchemaIconNameById;

      const snapshotCustomGroups = sidebarSnapshot.customGroups
        .map((groupName) => groupName.trim())
        .filter(Boolean);
      const snapshotGroupOrder = sidebarSnapshot.groupOrder
        .map((groupName) => groupName.trim())
        .filter(Boolean);
      const snapshotSchemaGroups = Object.values(snapshotSchemaGroupById).map(
        (groupName) => groupName.trim(),
      );
      const snapshotSystemGroups = Object.values(sidebarSnapshot.systemTabs)
        .map((tab) => tab.group?.trim())
        .filter((groupName): groupName is string => Boolean(groupName));
      const snapshotGroupPool = new Set<string>([
        ...snapshotCustomGroups,
        ...snapshotSchemaGroups,
        ...snapshotSystemGroups,
      ]);
      nextGroupOrder = snapshotGroupOrder.filter((groupName) =>
        snapshotGroupPool.has(groupName),
      );
      for (const groupName of snapshotGroupPool) {
        if (!nextGroupOrder.includes(groupName)) {
          nextGroupOrder.push(groupName);
        }
      }
      nextCustomGroups = Array.from(
        new Set([...snapshotCustomGroups, ...nextGroupOrder]),
      );
      hydratedSystemTabs = sidebarSnapshot.systemTabs;
    }

    persistSchemaDocs(nextSchemaDocs);
    persistWorkflowDocs(nextWorkflows);
    persistActionManifestDocs(latestRevision.actionManifest ?? []);
    const schemaDocById = new Map(
      nextSchemaDocs.map((schemaDoc) => [schemaDoc.schemaId, schemaDoc]),
    );
    persistSidebarAdminTabs(
      serializeDraftAdminTabs({
        schemaTabs: nextSchemaOrder.map((schemaId) => {
          const schemaDoc = schemaDocById.get(schemaId);
          return {
            schema: schemaId,
            title: schemaDoc?.title ?? schemaId,
            group: nextSchemaGroupById[schemaId],
            icon: nextSchemaIconNameById[schemaId],
          } satisfies AdminTabDoc;
        }),
        orderedGroups: nextCustomGroups.length > 0 ? nextCustomGroups : nextGroupOrder,
        systemTabs: hydratedSystemTabs,
      }),
    );
    setActiveSchemaId(nextActiveSchema.schemaId);
    setActiveWorkflowId(
      nextWorkflows[0]?.workflowId ?? DEFAULT_WORKFLOW_DOC.workflowId,
    );
    syncBuilderFromSchemaDoc(nextActiveSchema);
    lastHydratedRevisionRecencyRef.current = {
      draftId,
      recencyKey: latestRevisionRecencyKey,
    };
    setHydratedDraftKey((current) =>
      current === hydrationKey ? current : hydrationKey,
    );
  }, [
    latestActiveDraftRevision,
    actorUserId,
    draftId,
    pluginId,
    isDraftRevisionLoading,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sidebarSnapshotStorageKey) return;
    if (!parsed) return;

    if (sidebarSnapshotSeededDraftIdRef.current !== draftId) {
      sidebarSnapshotSeededDraftIdRef.current = draftId;
      return;
    }

    const latestRevision = activeDraftRevisions[0];
    const latestRevisionRecencyKey = latestRevision
      ? toDraftRevisionRecencyKey(latestRevision)
      : undefined;
    const latestPersistedSnapshot = latestRevision
      ? canonicalStringify({
        schemaDocs: latestRevision.schemaDocs ?? [],
        workflows: latestRevision.workflows ?? [],
        adminTabs: latestRevision.adminTabs ?? [],
      })
      : null;
    const currentSnapshot = canonicalStringify({
      schemaDocs: parsed.schemaDocs,
      workflows: parsed.workflows,
      adminTabs: parsed.draftAdminTabs,
    });
    if (latestPersistedSnapshot === currentSnapshot) {
      try {
        window.localStorage.removeItem(sidebarSnapshotStorageKey);
      } catch (_error) {
        // Ignore storage failures.
      }
      return;
    }

    const snapshot: PluginStudioSidebarSnapshot = {
      version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
      pluginId,
      draftId,
      updatedAt: new Date().toISOString(),
      ...(latestRevisionRecencyKey
        ? { baseRevisionRecencyKey: latestRevisionRecencyKey }
        : {}),
      schemaOrder,
      schemaTitleById: Object.fromEntries(
        parsed.schemaDocs.map((schemaDoc) => [
          schemaDoc.schemaId,
          schemaDoc.title ?? schemaDoc.schemaId,
        ]),
      ),
      schemaGroupById,
      schemaIconNameById,
      customGroups,
      groupOrder,
      systemTabs,
    };

    try {
      window.localStorage.setItem(
        sidebarSnapshotStorageKey,
        JSON.stringify(snapshot),
      );
    } catch (_error) {
      // Ignore storage quota and serialization failures.
    }
  }, [
    activeDraftRevisions,
    customGroups,
    draftId,
    groupOrder,
    parsed,
    pluginId,
    schemaGroupById,
    schemaIconNameById,
    schemaOrder,
    sidebarSnapshotStorageKey,
    systemTabs,
  ]);

  const { mutateAsync: createDraft, isPending: isCreatingDraft } = useMutation({
    mutationKey: ['plugin-studio', 'create-draft', draftId],
    onMutate: () => {
    },
    mutationFn: async () => {
      const userHandle = formatUserHandle(actorUserId);
      const draftTitle = `${pluginId} (${userHandle})`;
      return createPluginDraft({
        data: {
          actorUserId,
          pluginId,
          title: draftTitle,
        },
      });
    },
    onSuccess: async () => {
      await refetchDrafts();
      hasAttemptedDraftCreationRef.current.add(draftId);
    },
    onError: (error) => {
      hasAttemptedDraftCreationRef.current.delete(draftId);
      console.error(error);
      toast.error('Draft creation failed.');
    },
  });

  const { mutateAsync: saveDraftRevision, isPending: isSavingDraftRevision } =
    useMutation({
      mutationKey: [
        'plugin-studio',
        'save-draft-revision',
        draftId,
      ],
      onMutate: (targetDraftId) => {
      },
      mutationFn: async (targetDraftId: string) => {
        if (!parsed) {
          throw new Error('Invalid plugin payload');
        }
        const revisionPayload = {
          schemaDocs: parsed.schemaDocs,
          workflows: parsed.workflows,
          adminTabs: parsed.draftAdminTabs,
        };
        const createRevisionForDraft = (targetDraftId: string) =>
          createPluginDraftRevision({
            data: {
              actorUserId,
              draftId: targetDraftId,
              ...revisionPayload,
            },
          });

        try {
          return await createRevisionForDraft(targetDraftId);
        } catch (error) {
          if (!isMissingPluginDraftError(error)) {
            throw error;
          }

          const userHandle = formatUserHandle(actorUserId);
          const recoveredDraft = await createPluginDraft({
            data: {
              actorUserId,
              pluginId,
              title: `${pluginId} (${userHandle})`,
            },
          });
          await refetchDrafts();
          return createRevisionForDraft(recoveredDraft.draftId);
        }
      },
      onSuccess: async () => {
        await Promise.all([refetchDraftRevisions(), refetchDrafts()]);
      },
      onError: (error) => {
        lastRequestedDraftSnapshotRef.current = null;
        console.error('Auto-save failed:', error);
        const now = Date.now();
        if (now - lastAutosaveErrorAtRef.current > 5_000) {
          lastAutosaveErrorAtRef.current = now;
          toast.error(`Draft auto-save failed: ${toErrorMessage(error)}`);
        }
      },
    });

  const latestPersistedDraftSnapshot = useMemo(() => {
    const latestRevision = activeDraftRevisions[0];
    if (!latestRevision) return null;
    return toDraftSnapshotString({
      schemaDocs: latestRevision.schemaDocs ?? [],
      workflows: latestRevision.workflows ?? [],
      adminTabs: latestRevision.adminTabs ?? [],
    });
  }, [activeDraftRevisions]);

  const currentDraftSnapshot = useMemo(() => {
    if (!parsed) return null;
    return toDraftSnapshotString({
      schemaDocs: parsed.schemaDocs,
      workflows: parsed.workflows,
      adminTabs: parsed.draftAdminTabs,
    });
  }, [parsed]);

  const hasPendingDraftChanges = useMemo(() => {
    if (!activeDraft || !currentDraftSnapshot) return false;
    if (!latestPersistedDraftSnapshot) return true;
    return currentDraftSnapshot !== latestPersistedDraftSnapshot;
  }, [activeDraft, currentDraftSnapshot, latestPersistedDraftSnapshot]);

  useEffect(() => {
    if (!pluginId.trim()) {
      return;
    }
    if (isDraftLoading) {
      return;
    }
    if (!isActorIdentityReady) {
      return;
    }
    if (activeDraft && activeDraft.pluginId === pluginId) {
      return;
    }
    if (hasAttemptedDraftCreationRef.current.has(draftId)) {
      return;
    }

    hasAttemptedDraftCreationRef.current.add(draftId);
    void createDraft();
  }, [
    pluginId,
    activeDraft,
    isAuthenticated,
    isDraftLoading,
    isActorIdentityReady,
    draftId,
    actorUserId,
    createDraft,
  ]);

  useEffect(() => {
    if (!hasPendingDraftChanges) {
      lastRequestedDraftSnapshotRef.current = null;
    }
  }, [hasPendingDraftChanges]);

  useEffect(() => {
    if (!activeDraft) return;
    if (activeDraft.draftId in initialSnapshotByDraftRef.current) {
      return;
    }
    initialSnapshotByDraftRef.current = {
      ...initialSnapshotByDraftRef.current,
      [activeDraft.draftId]: currentDraftSnapshot,
    };
  }, [activeDraft, currentDraftSnapshot]);

  useEffect(() => {
    if (!parsed || !isDraftSaveable || !activeDraft) {
      return;
    }
    if (!isActorIdentityReady) {
      return;
    }
    if (!isDraftHydrated) {
      return;
    }
    if (!currentDraftSnapshot) {
      return;
    }
    if (activeDraftRevisions.length === 0) {
      if (isDraftRevisionLoading) {
        return;
      }
      const initialSnapshot =
        initialSnapshotByDraftRef.current[activeDraft.draftId] ?? null;
      // Avoid creating synthetic "default" revisions from transient empty states.
      // For brand-new drafts, save only after the user changes from activation baseline.
      if (initialSnapshot === currentDraftSnapshot) {
        return;
      }
    }
    if (!hasPendingDraftChanges || isSavingDraftRevision) {
      return;
    }
    const requestedSnapshotKey = `${activeDraft.draftId}:${currentDraftSnapshot}`;
    if (lastRequestedDraftSnapshotRef.current === requestedSnapshotKey) {
      return;
    }
    lastRequestedDraftSnapshotRef.current = requestedSnapshotKey;
    void saveDraftRevision(activeDraft.draftId);
  }, [
    pluginId,
    actorUserId,
    draftId,
    parsed,
    isDraftHydrated,
    currentDraftSnapshot,
    isDraftSaveable,
    activeDraft,
    activeDraftRevisions.length,
    hasPendingDraftChanges,
    isActorIdentityReady,
    isDraftRevisionLoading,
    isSavingDraftRevision,
    saveDraftRevision,
  ]);

  useEffect(() => {
    if (!parsed) {
      setDebouncedHashInput(null);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedHashInput({
        pluginId,
        version: getNextVersion(marketplaceReleases, pluginId),
        docs: {
          title,
          description,
        },
        actionManifest: parsed.actionManifest,
        schemaDocs: parsed.schemaDocs,
        workflows: parsed.workflows,
        adminTabs: parsed.adminTabs,
      });
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [description, marketplaceReleases, parsed, pluginId, title]);

  useEffect(() => {
    if (!parsed) return;
    setGuardedIrState((current) => {
      if (current.mode === 'ir') {
        return current;
      }
      return createGuardedIrEditorState({
        schemaDocs: parsed.schemaDocs,
        initialMode: current.mode,
      });
    });
  }, [parsed]);

  const hashPreviewQuery = useQuery({
    queryKey: ['plugin-studio', 'release-hash-preview', debouncedHashInput],
    enabled: debouncedHashInput !== null,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (!debouncedHashInput) {
        throw new Error('Missing release hash preview payload');
      }
      return previewPluginReleaseHashes({
        data: debouncedHashInput,
      });
    },
  });

  const { mutateAsync: publishRelease, isPending: isPublishing } = useMutation({
    mutationKey: ['plugin-studio', 'publish-release'],
    mutationFn: async () => {
      if (!parsed) {
        throw new Error('Invalid plugin payload');
      }
      return publishPluginRelease({
        data: {
          actorUserId,
          pluginId,
          version: getNextVersion(marketplaceReleases, pluginId),
          docs: {
            title,
            description,
          },
          actionManifest: parsed.actionManifest,
          schemaDocs: parsed.schemaDocs,
          workflows: parsed.workflows,
          adminTabs: parsed.adminTabs,
        },
      });
    },
    onSuccess: async () => {
      await refetchReleases();
      fireConfetti();
    },
    onError: (error) => {
      console.error(error);
      toast.error('Publish failed');
    },
  });

  const templates = useMemo(
    () => toLatestTemplateReleases(marketplaceReleases),
    [marketplaceReleases],
  );
  const availableRuleFieldsByType = useMemo(() => {
    const byType = new Map<BuilderFieldType, string[]>();
    for (const field of schemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      const currentValues = byType.get(field.type) ?? [];
      byType.set(field.type, [...currentValues, fieldKey]);
    }
    return byType;
  }, [schemaBuilder.fields]);
  const fieldTypeByRuleField = useMemo(() => {
    const byField = new Map<string, BuilderFieldType>();
    for (const field of schemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      byField.set(fieldKey, field.type);
    }
    return byField;
  }, [schemaBuilder.fields]);
  const availableRuleFields = useMemo(
    () => [...fieldTypeByRuleField.keys()],
    [fieldTypeByRuleField],
  );
  const compatibleRuleFieldsByLeftField = useMemo(() => {
    const byField = new Map<string, string[]>();
    for (const fieldKey of availableRuleFields) {
      const leftType = fieldTypeByRuleField.get(fieldKey);
      const compatibleFields = leftType
        ? (availableRuleFieldsByType.get(leftType) ?? [])
        : [];
      byField.set(
        fieldKey,
        compatibleFields.filter(
          (candidateField) => candidateField !== fieldKey,
        ),
      );
    }
    return byField;
  }, [availableRuleFields, availableRuleFieldsByType, fieldTypeByRuleField]);
  const leftRuleFields = useMemo(
    () =>
      availableRuleFields.filter(
        (fieldKey) =>
          (compatibleRuleFieldsByLeftField.get(fieldKey)?.length ?? 0) > 0,
      ),
    [availableRuleFields, compatibleRuleFieldsByLeftField],
  );
  const isInitialLoading = isReleaseLoading && releases.length === 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storageKey = 'plugin-studio.templates-tour-seen.v1';
    if (window.localStorage.getItem(storageKey) === '1') {
      return;
    }
    setIsTemplatesDialogOpen(true);
    window.localStorage.setItem(storageKey, '1');
  }, []);

  useEffect(() => {
    if (leftRuleFields.length === 0) {
      setSchemaRefinements((currentRules) =>
        currentRules.length === 0 ? currentRules : [],
      );
      return;
    }

    setSchemaRefinements((currentRules) => {
      let changed = false;
      const nextRules = currentRules.map((rule) => {
        const nextLeftField = leftRuleFields.includes(rule.leftField)
          ? rule.leftField
          : (leftRuleFields[0] ?? '');
        const leftType = fieldTypeByRuleField.get(nextLeftField);
        const compatibleFields = leftType
          ? (availableRuleFieldsByType.get(leftType) ?? []).filter(
            (fieldKey) => fieldKey !== nextLeftField,
          )
          : [];
        const nextRightField = compatibleFields.includes(rule.rightField)
          ? rule.rightField
          : (compatibleFields[0] ?? '');
        const allowedOperators = getAllowedOperators(leftType);
        const nextOperator = allowedOperators.includes(rule.operator)
          ? rule.operator
          : (allowedOperators[0] ?? 'eq');

        if (
          nextLeftField !== rule.leftField ||
          nextRightField !== rule.rightField ||
          nextOperator !== rule.operator
        ) {
          changed = true;
        }

        return {
          ...rule,
          leftField: nextLeftField,
          rightField: nextRightField,
          operator: nextOperator,
        };
      });

      return changed ? nextRules : currentRules;
    });
  }, [leftRuleFields, availableRuleFieldsByType, fieldTypeByRuleField]);

  const selectedBlocklyField = useMemo(
    () =>
      schemaBuilder.fields.find((field) => field.id === blocklyDraft.fieldId),
    [blocklyDraft.fieldId, schemaBuilder.fields],
  );
  const blocklyComparableFields = useMemo(() => {
    if (!selectedBlocklyField) return [];
    return schemaBuilder.fields
      .filter(
        (field) =>
          field.id !== selectedBlocklyField.id &&
          field.key.trim().length > 0 &&
          field.type === selectedBlocklyField.type,
      )
      .map((field) => field.key.trim());
  }, [schemaBuilder.fields, selectedBlocklyField]);
  const blocklyPresets = useMemo(
    () => getBlocklyPresets(selectedBlocklyField?.type),
    [selectedBlocklyField?.type],
  );
  const firstBlocklyComparableField = blocklyComparableFields[0] ?? '';
  const workspaceSchemasAndFields = useMemo(
    () =>
      toWorkspaceSchemasAndFields(parsed?.schemaDocs ?? [DEFAULT_SCHEMA_DOC]),
    [parsed?.schemaDocs],
  );
  const derivationPathOptions = useMemo(
    () =>
      buildDerivationPathOptions(parsed?.schemaDocs ?? [DEFAULT_SCHEMA_DOC]),
    [parsed?.schemaDocs],
  );
  const derivedTargetFieldOptions = useMemo(
    () =>
      schemaBuilder.fields
        .map((field) => field.key.trim())
        .filter((fieldKey): fieldKey is string => Boolean(fieldKey))
        .map((fieldKey) => ({
          value: fieldKey,
          label: fieldKey,
        })),
    [schemaBuilder.fields],
  );
  const workspaceActiveSchemaId =
    workspaceSchemasAndFields.schemas[0]?.id ?? null;
  const workspaceFieldConfigModel = useMemo(() => {
    const firstField = schemaBuilder.fields[0];
    const fallbackFieldType = 'string';
    const fieldType =
      firstField?.fieldType &&
        AUTOFORM_FIELD_TYPES.includes(firstField.fieldType)
        ? firstField.fieldType
        : fallbackFieldType;

    const model = createFieldConfigPanelModel(fieldType);
    const draft = serializeFieldConfigPanelDraft({
      fieldType,
      label: firstField?.label || firstField?.key || 'Field',
      description: firstField?.description || undefined,
      inputProps: parseJsonObject(firstField?.inputPropsJson),
      customData: parseJsonObject(firstField?.customDataJson),
    });

    return {
      model,
      draft,
    };
  }, [schemaBuilder.fields]);
  const expressionRows = useMemo<ExpressionRow[]>(
    () =>
      schemaRefinements
        .filter(
          (rule) =>
            Boolean(rule.leftField.trim()) && Boolean(rule.rightField.trim()),
        )
        .map((rule) => ({
          operator: rule.operator,
          operands: [
            {
              kind: 'fieldRef',
              path: [rule.leftField],
            },
            {
              kind: 'fieldRef',
              path: [rule.rightField],
            },
          ],
        })),
    [schemaRefinements],
  );
  const workspaceWorkflow =
    parsed?.workflows.find(
      (workflowDoc) => workflowDoc.workflowId === activeWorkflowId,
    ) ??
    parsed?.workflows[0] ??
    DEFAULT_WORKFLOW_DOC;
  const workflowEditorTable =
    workflowEditorLockedTable ?? workspaceWorkflow.table;
  const workflowEditorScopedWorkflows = useMemo(() => {
    if (!workflowEditorLockedTable) {
      return availableWorkflows;
    }
    const scoped = availableWorkflows.filter(
      (workflowDoc) => workflowDoc.table === workflowEditorLockedTable,
    );
    return scoped.length > 0 ? scoped : availableWorkflows;
  }, [availableWorkflows, workflowEditorLockedTable]);
  const workspaceActionsManifestState = useMemo(
    () =>
      createActionsManifestEditorState({
        actionManifest: parsed?.actionManifest ?? [],
        workflows: parsed?.workflows ?? [DEFAULT_WORKFLOW_DOC],
        capabilityEnvelope: ['db.read', 'db.write', 'email.send', 'http.fetch'],
        runtimeTarget: 'sandbox-worker',
      }),
    [parsed],
  );
  const workspaceRoutesTabsResult = useMemo(
    () =>
      mapRoutesTabsToAutoAdminConfig({
        businessSlug: pluginId.replace(/^plugin\./, ''),
        tabs: (parsed?.adminTabs ?? []).map((tab, index) => ({
          id: `tab_${tab.schema || index + 1}`,
          schema: tab.schema,
          title: tab.title,
          group: tab.group,
          iconName: tab.icon,
          order: index,
        })),
      }),
    [parsed?.adminTabs, pluginId],
  );
  const livePreviewTabs = useMemo(() => {
    const schemaById = new Map(
      (parsed?.schemaDocs ?? []).map((schemaDoc) => [
        schemaDoc.schemaId,
        schemaDoc,
      ]),
    );
    return (parsed?.adminTabs ?? []).flatMap((tab) => {
      const schemaDoc = schemaById.get(tab.schema);
      if (!schemaDoc) return [];
      try {
        return [
          {
            title: schemaDoc.title || tab.title || schemaDoc.schemaId,
            group: tab.group,
            iconName: tab.icon,
            icon: resolveLucideIconByName(tab.icon),
            parsedSchema: compileSchemaDoc(schemaDoc),
            slug: `plugin-studio/${actorUserId}/${pluginId}/${schemaDoc.schemaId}`,
            treatSlugAsAbsolute: true,
            editable: true,
            onAddColumn: openAddColumnSheet,
            onEditColumn: openEditColumnSheet,
            onDeleteColumn: requestDeleteColumn,
            onReorderColumns: handleReorderColumns,
          },
        ];
      } catch (error) {
        console.error('Failed to compile schema for live preview', error);
        return [];
      }
    });
  }, [
    actorUserId,
    parsed?.adminTabs,
    parsed?.schemaDocs,
    pluginId,
    schemaBuilder.derivedFields,
    schemaBuilder.fields,
  ]);
  const workspaceCompileDiagnostics = useMemo<CompileVerifyDiagnostic[]>(() => {
    const diagnostics: CompileVerifyDiagnostic[] = [];

    if (!parsed) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'invalid-json',
        severity: 'error',
        message: 'Schema/workflow JSON could not be parsed.',
        path: ['schemaDocs'],
      });
    }

    const invalidFieldCount = schemaBuilder.fields.filter((field) =>
      hasFieldValidationErrors(field),
    ).length;
    const schemaFieldKeys = new Set(
      schemaBuilder.fields
        .map((field) => field.key.trim())
        .filter((key) => key.length > 0),
    );
    const invalidDerivedCount = schemaBuilder.derivedFields.filter(
      (derivedField) =>
        hasDerivedFieldValidationErrors(derivedField, schemaFieldKeys),
    ).length;
    if (invalidFieldCount > 0) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'field-validation',
        severity: 'warning',
        message: `${invalidFieldCount} field(s) have incomplete or invalid configuration.`,
        path: ['schemaBuilder', 'fields'],
      });
    }
    if (invalidDerivedCount > 0) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'derived-field-validation',
        severity: 'warning',
        message: `${invalidDerivedCount} derived field(s) have incomplete or invalid configuration.`,
        path: ['schemaBuilder', 'derivedFields'],
      });
    }

    if (hashPreviewQuery.isError) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'hash-preview-failed',
        severity: 'warning',
        message: toErrorMessage(hashPreviewQuery.error),
        path: ['hashPreview'],
      });
    }

    if (hashPreviewQuery.data) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'hash-preview-ready',
        severity: 'info',
        message: 'Release hash preview is up to date.',
        path: ['hashPreview'],
      });
    }

    if (parsed) {
      const workflowDagDiagnostics = validateWorkflowDags(
        parsed.workflows,
      ).diagnostics;
      for (const diagnostic of workflowDagDiagnostics) {
        diagnostics.push({
          category: 'workflow-validation',
          code: diagnostic.code,
          severity: 'error',
          message: diagnostic.message,
          path: diagnostic.path,
        });
      }

      const workflowReferenceDiagnostics = validateWorkflowReferencePaths({
        workflows: parsed.workflows,
        schemaDocs: parsed.schemaDocs,
      });
      for (const diagnostic of workflowReferenceDiagnostics) {
        diagnostics.push({
          category: 'workflow-validation',
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: diagnostic.message,
          path: diagnostic.path,
        });
      }
    }

    return diagnostics;
  }, [
    hashPreviewQuery.data,
    hashPreviewQuery.error,
    hashPreviewQuery.isError,
    parsed,
    schemaBuilder,
  ]);
  const workspaceArtifactDiff = useMemo(() => {
    const currentBySchema = new Map(
      (parsed?.schemaDocs ?? []).map((schemaDoc) => [
        schemaDoc.schemaId,
        schemaDoc,
      ]),
    );
    const previousBySchema = new Map(
      (activeDraftRevisions[0]?.schemaDocs ?? []).map((schemaDoc) => [
        schemaDoc.schemaId,
        schemaDoc,
      ]),
    );

    const added = [...currentBySchema.keys()].filter(
      (schemaId) => !previousBySchema.has(schemaId),
    );
    const removed = [...previousBySchema.keys()].filter(
      (schemaId) => !currentBySchema.has(schemaId),
    );
    const changed = [...currentBySchema.keys()].filter((schemaId) => {
      if (!previousBySchema.has(schemaId)) return false;
      return (
        canonicalStringify(currentBySchema.get(schemaId)) !==
        canonicalStringify(previousBySchema.get(schemaId))
      );
    });

    return {
      added: added.sort((left, right) => left.localeCompare(right)),
      changed: changed.sort((left, right) => left.localeCompare(right)),
      removed: removed.sort((left, right) => left.localeCompare(right)),
    };
  }, [parsed?.schemaDocs, activeDraftRevisions]);
  const workspaceReviewChangelog = useMemo(
    () => [
      {
        label: 'Schemas',
        summary: `${parsed?.schemaDocs.length ?? 0} schema document(s) in current draft.`,
      },
      {
        label: 'Workflows',
        summary: `${parsed?.workflows.length ?? 0} workflow document(s) configured.`,
      },
      {
        label: 'Actions',
        summary: `${parsed?.actionManifest.length ?? 0} action(s) declared in manifest.`,
      },
    ],
    [parsed],
  );
  const workspacePublishGateDiagnostics = useMemo<PluginBuildDiagnostic[]>(
    () =>
      workspaceCompileDiagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        severity: diagnostic.severity,
        path: diagnostic.path,
        message: diagnostic.message,
      })),
    [workspaceCompileDiagnostics],
  );
  const workspacePublishGateState = useMemo(
    () =>
      createPublishGateTabState({
        diagnostics: workspacePublishGateDiagnostics,
        reviewStatus: workspaceCompileDiagnostics.some(
          (diagnostic) => diagnostic.severity === 'error',
        )
          ? 'required-pending'
          : 'required-approved',
        environment: 'production',
        tenantId: actorUserId,
        warningBlocklistPolicy: {
          defaultWarningBlocklistByEnvironment: {
            production: ['field-validation', 'hash-preview-failed'],
          },
        },
        immutableRevision: {
          revisionId:
            activeDraftRevisions[0]?.revisionId ??
            `draft.${formatUserHandle(actorUserId)}.${pluginId.replace(/[^a-z0-9_.-]+/gi, '_')}`,
          summary: activeDraft?.title ?? `${pluginId} (draft)`,
          artifactHash:
            hashPreviewQuery.data?.artifactHash ??
            'pending-artifact-hash-preview',
        },
        isPublishConfirmationChecked: workspacePublishGateChecked,
      }),
    [
      actorUserId,
      hashPreviewQuery.data?.artifactHash,
      activeDraft?.title,
      activeDraftRevisions,
      pluginId,
      title,
      workspaceCompileDiagnostics,
      workspacePublishGateChecked,
      workspacePublishGateDiagnostics,
    ],
  );

  useEffect(() => {
    const nextOptions = blocklyComparableFields.length
      ? blocklyComparableFields.map(
        (fieldKey) => [fieldKey, fieldKey] as [string, string],
      )
      : [['No compatible fields', '']];
    blocklyRightFieldOptionsRef.current = nextOptions;

    const runtime = blocklyRuntimeRef.current;
    if (!runtime?.workspace) return;
    const rootBlock = runtime.workspace.getBlockById('plugin_rule_root');
    const conditionBlock = rootBlock?.getInputTargetBlock('CONDITION');
    const operatorField = conditionBlock?.getField('OP');
    const rightField =
      conditionBlock?.type === 'plugin_rule_compare'
        ? conditionBlock.getField('RIGHT')
        : null;
    if (operatorField && selectedBlocklyField) {
      const allowedOperators = getAllowedOperators(selectedBlocklyField.type);
      const operatorOptions = getBlocklyOperatorOptions(
        selectedBlocklyField.type,
      );
      operatorField.menuGenerator_ =
        conditionBlock?.type === 'plugin_rule_compare_text' ||
          conditionBlock?.type === 'plugin_rule_compare_boolean'
          ? operatorOptions.filter(
            ([, operator]) => operator === 'eq' || operator === 'neq',
          )
          : operatorOptions;
      const selectedOperator = conditionBlock.getFieldValue(
        'OP',
      ) as RuleOperator;
      if (!allowedOperators.includes(selectedOperator)) {
        conditionBlock.setFieldValue(allowedOperators[0] ?? 'eq', 'OP');
      }
    }
    if (!rightField) return;
    rightField.menuGenerator_ = nextOptions;
    const selectedValue = conditionBlock.getFieldValue('RIGHT');
    const hasSelection = blocklyComparableFields.includes(selectedValue);
    rightField.setValue(
      hasSelection ? selectedValue : (blocklyComparableFields[0] ?? ''),
    );
    runtime.workspace.render();
  }, [blocklyComparableFields, selectedBlocklyField]);

  useEffect(() => {
    const runtime = blocklyRuntimeRef.current;
    const rootBlock = runtime?.workspace?.getBlockById('plugin_rule_root');
    const conditionBlock = rootBlock?.getInputTargetBlock('CONDITION');
    if (
      !conditionBlock ||
      ![
        'plugin_rule_compare',
        'plugin_rule_compare_number',
        'plugin_rule_compare_text',
        'plugin_rule_compare_boolean',
      ].includes(conditionBlock.type)
    ) {
      return;
    }
    conditionBlock.setFieldValue(blocklyDraft.operator, 'OP');
  }, [blocklyDraft.operator]);

  useEffect(() => {
    blocklyInitialOperatorRef.current = blocklyDraft.operator;
    blocklyInitialRightFieldRef.current = blocklyDraft.rightField;
  }, [blocklyDraft.operator, blocklyDraft.rightField]);

  useEffect(() => {
    if (
      !isBlocklyComposerOpen ||
      !selectedBlocklyField ||
      !blocklyMountElement
    ) {
      return;
    }

    let cancelled = false;
    setIsBlocklyReady(false);
    setBlocklyError(null);

    const mountBlockly = async () => {
      try {
        const Blockly = await blocklyModulePromise;
        if (cancelled || !blocklyMountElement) return;
        const operatorOptions = getBlocklyOperatorOptions(
          selectedBlocklyField.type,
        );

        Blockly.Blocks.plugin_rule_compare = {
          init() {
            this.appendDummyInput()
              .appendField('compare with')
              .appendField(
                new Blockly.FieldDropdown(blocklyRightFieldOptionsRef.current),
                'RIGHT',
              )
              .appendField('using')
              .appendField(new Blockly.FieldDropdown(operatorOptions), 'OP');
            this.setOutput(true, 'Boolean');
            this.setColour(210);
          },
        };
        Blockly.Blocks.plugin_rule_compare_number = {
          init() {
            this.appendDummyInput()
              .appendField('value')
              .appendField(new Blockly.FieldDropdown(operatorOptions), 'OP')
              .appendField('number')
              .appendField(new Blockly.FieldNumber(0), 'VALUE');
            this.setOutput(true, 'Boolean');
            this.setColour(200);
          },
        };
        Blockly.Blocks.plugin_rule_compare_text = {
          init() {
            this.appendDummyInput()
              .appendField('value')
              .appendField(
                new Blockly.FieldDropdown(
                  operatorOptions.filter(
                    ([, operator]) => operator === 'eq' || operator === 'neq',
                  ),
                ),
                'OP',
              )
              .appendField('text')
              .appendField(new Blockly.FieldTextInput(''), 'VALUE');
            this.setOutput(true, 'Boolean');
            this.setColour(200);
          },
        };
        Blockly.Blocks.plugin_rule_compare_boolean = {
          init() {
            this.appendDummyInput()
              .appendField('value')
              .appendField(
                new Blockly.FieldDropdown(
                  operatorOptions.filter(
                    ([, operator]) => operator === 'eq' || operator === 'neq',
                  ),
                ),
                'OP',
              )
              .appendField('boolean')
              .appendField(
                new Blockly.FieldDropdown([
                  ['true', 'true'],
                  ['false', 'false'],
                ]),
                'VALUE',
              );
            this.setOutput(true, 'Boolean');
            this.setColour(200);
          },
        };
        if (!Blockly.Blocks.plugin_logic_and) {
          Blockly.Blocks.plugin_logic_and = {
            init() {
              this.appendValueInput('A')
                .setCheck('Boolean')
                .appendField('all of');
              this.appendValueInput('B').setCheck('Boolean').appendField('and');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }
        if (!Blockly.Blocks.plugin_logic_or) {
          Blockly.Blocks.plugin_logic_or = {
            init() {
              this.appendValueInput('A')
                .setCheck('Boolean')
                .appendField('any of');
              this.appendValueInput('B').setCheck('Boolean').appendField('or');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }
        if (!Blockly.Blocks.plugin_logic_not) {
          Blockly.Blocks.plugin_logic_not = {
            init() {
              this.appendValueInput('VALUE')
                .setCheck('Boolean')
                .appendField('not');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }
        if (!Blockly.Blocks.plugin_rule_root) {
          Blockly.Blocks.plugin_rule_root = {
            init() {
              this.appendDummyInput().appendField('validation condition');
              this.appendValueInput('CONDITION')
                .setCheck('Boolean')
                .appendField('must satisfy');
              this.setColour(260);
              this.setMovable(false);
              this.setDeletable(false);
            },
          };
        }

        const workspace = Blockly.inject(blocklyMountElement, {
          toolbox: {
            kind: 'flyoutToolbox',
            contents: [
              { kind: 'block', type: 'plugin_rule_compare' },
              { kind: 'block', type: 'plugin_rule_compare_number' },
              { kind: 'block', type: 'plugin_rule_compare_text' },
              { kind: 'block', type: 'plugin_rule_compare_boolean' },
              { kind: 'block', type: 'plugin_logic_and' },
              { kind: 'block', type: 'plugin_logic_or' },
              { kind: 'block', type: 'plugin_logic_not' },
            ],
          },
          trashcan: true,
          move: { wheel: true, drag: true, scrollbars: true },
        });

        const xml = Blockly.utils.xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml"><block type="plugin_rule_root" id="plugin_rule_root" x="24" y="24"><value name="CONDITION"><block type="plugin_rule_compare" id="plugin_rule_compare_default"></block></value></block></xml>',
        );
        Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);

        const rootBlock = workspace.getBlockById('plugin_rule_root');
        const compareBlock = rootBlock?.getInputTargetBlock('CONDITION');
        if (compareBlock && compareBlock.type === 'plugin_rule_compare') {
          const allowedOperators = getAllowedOperators(
            selectedBlocklyField.type,
          );
          const initialOperator = blocklyInitialOperatorRef.current;
          const nextOperator = allowedOperators.includes(initialOperator)
            ? initialOperator
            : (allowedOperators[0] ?? 'eq');
          compareBlock.setFieldValue(nextOperator, 'OP');
          compareBlock.setFieldValue(
            blocklyInitialRightFieldRef.current || firstBlocklyComparableField,
            'RIGHT',
          );
        }

        blocklyRuntimeRef.current = { Blockly, workspace };
        if (!cancelled) setIsBlocklyReady(true);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setBlocklyError('Failed to load Blockly composer.');
        }
      }
    };

    void mountBlockly();

    return () => {
      cancelled = true;
      const runtime = blocklyRuntimeRef.current;
      if (runtime?.workspace) {
        runtime.workspace.dispose();
      }
      blocklyRuntimeRef.current = null;
      setIsBlocklyReady(false);
    };
  }, [
    isBlocklyComposerOpen,
    blocklyMountElement,
    firstBlocklyComparableField,
    selectedBlocklyField,
  ]);

  function syncBuilderFromSchemaDoc(schemaDoc: SchemaDoc) {
    setActiveSchemaId(schemaDoc.schemaId);
  }

  function selectSchema(schemaId: string) {
    const schemaDoc = availableSchemaDocs.find(
      (candidate) => candidate.schemaId === schemaId,
    );
    if (!schemaDoc) return;
    syncBuilderFromSchemaDoc(schemaDoc);
  }

  function reportPersistenceError(context: string, error: unknown) {
    console.error(`[plugin-studio] ${context} failed`, error);
    const now = Date.now();
    if (now - lastPersistenceErrorAtRef.current > 3_000) {
      lastPersistenceErrorAtRef.current = now;
      toast.error(`${context} failed: ${toErrorMessage(error)}`);
    }
  }

  function persistSchemaDocs(nextSchemaDocs: readonly SchemaDoc[]) {
    const nextBySchemaId = new Map(
      nextSchemaDocs.map((schemaDoc) => [schemaDoc.schemaId, schemaDoc]),
    );
    const currentRows = schemaDocRows as Array<{
      id?: string;
      schemaId?: string;
      doc?: unknown;
    }>;
    const writes: Array<Promise<unknown>> = [];

    for (const row of currentRows) {
      const schemaId =
        row.schemaId ||
        ((row.doc as { schemaId?: string } | undefined)?.schemaId ?? '');
      const rowId = row.id || schemaId;
      if (!schemaId || !rowId) continue;
      const nextDoc = nextBySchemaId.get(schemaId);
      if (!nextDoc) {
        writes.push(deleteSchemaDocMutation.mutateAsync(rowId));
        continue;
      }
      writes.push(updateSchemaDocMutation.mutateAsync({
        id: rowId,
        pluginId,
        version: draftId,
        schemaId,
        doc: nextDoc,
      }));
      nextBySchemaId.delete(schemaId);
    }

    for (const [schemaId, nextDoc] of nextBySchemaId) {
      writes.push(createSchemaDocMutation.mutateAsync({
        id: schemaId,
        pluginId,
        version: draftId,
        schemaId,
        doc: nextDoc,
      }));
    }

    if (writes.length === 0) {
      return;
    }
    void Promise.allSettled(writes)
      .then((settled) => {
        throwOnFailedPersistenceWrites({
          context: 'Schema persistence',
          settled,
        });
        return refetchSchemaDocs();
      })
      .catch((error) => reportPersistenceError('Schema persistence', error));
  }

  function persistWorkflowDocs(nextWorkflowDocs: readonly WorkflowDoc[]) {
    const nextByWorkflowId = new Map(
      nextWorkflowDocs.map((workflowDoc) => [workflowDoc.workflowId, workflowDoc]),
    );
    const currentRows = workflowDocRows as Array<{
      id?: string;
      workflowId?: string;
      doc?: unknown;
    }>;
    const writes: Array<Promise<unknown>> = [];

    for (const row of currentRows) {
      const workflowId =
        row.workflowId ||
        ((row.doc as { workflowId?: string } | undefined)?.workflowId ?? '');
      const rowId = row.id || workflowId;
      if (!workflowId || !rowId) continue;
      const nextDoc = nextByWorkflowId.get(workflowId);
      if (!nextDoc) {
        writes.push(deleteWorkflowDocMutation.mutateAsync(rowId));
        continue;
      }
      writes.push(updateWorkflowDocMutation.mutateAsync({
        id: rowId,
        pluginId,
        version: draftId,
        workflowId,
        doc: nextDoc,
      }));
      nextByWorkflowId.delete(workflowId);
    }

    for (const [workflowId, nextDoc] of nextByWorkflowId) {
      writes.push(createWorkflowDocMutation.mutateAsync({
        id: workflowId,
        pluginId,
        version: draftId,
        workflowId,
        doc: nextDoc,
      }));
    }

    if (writes.length === 0) {
      return;
    }
    void Promise.allSettled(writes)
      .then((settled) => {
        throwOnFailedPersistenceWrites({
          context: 'Workflow persistence',
          settled,
        });
        return refetchWorkflowDocs();
      })
      .catch((error) => reportPersistenceError('Workflow persistence', error));
  }

  function persistActionManifestDocs(nextActionManifest: readonly ActionManifestDoc[]) {
    const nextByActionId = new Map(
      nextActionManifest.map((manifestDoc) => [manifestDoc.actionId, manifestDoc]),
    );
    const currentRows = actionManifestDocRows as Array<{
      id?: string;
      actionId?: string;
      doc?: unknown;
    }>;
    const writes: Array<Promise<unknown>> = [];

    for (const row of currentRows) {
      const actionId =
        row.actionId ||
        ((row.doc as { actionId?: string } | undefined)?.actionId ?? '');
      const rowId = row.id || actionId;
      if (!actionId || !rowId) continue;
      const nextDoc = nextByActionId.get(actionId);
      if (!nextDoc) {
        writes.push(deleteActionManifestDocMutation.mutateAsync(rowId));
        continue;
      }
      writes.push(updateActionManifestDocMutation.mutateAsync({
        id: rowId,
        pluginId,
        version: draftId,
        actionId,
        doc: nextDoc,
      }));
      nextByActionId.delete(actionId);
    }

    for (const [actionId, nextDoc] of nextByActionId) {
      writes.push(createActionManifestDocMutation.mutateAsync({
        id: actionId,
        pluginId,
        version: draftId,
        actionId,
        doc: nextDoc,
      }));
    }

    if (writes.length === 0) {
      return;
    }
    void Promise.allSettled(writes)
      .then((settled) => {
        throwOnFailedPersistenceWrites({
          context: 'Action manifest persistence',
          settled,
        });
        return refetchActionManifestDocs();
      })
      .catch((error) =>
        reportPersistenceError('Action manifest persistence', error),
      );
  }

  function persistSchemaEditorState(
    nextSchemaBuilder: BuilderSchema,
    nextSchemaRefinements: BuilderRefinement[],
    nextBlocklyRefinements: BlocklyRefinement[],
  ) {
    const fieldTypeByKey = new Map<string, BuilderFieldType>();
    const fieldsByType = new Map<BuilderFieldType, string[]>();
    for (const field of nextSchemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      fieldTypeByKey.set(fieldKey, field.type);
      fieldsByType.set(field.type, [
        ...(fieldsByType.get(field.type) ?? []),
        fieldKey,
      ]);
    }

    const validRefinements = nextSchemaRefinements.filter((rule) => {
      const leftFieldType = fieldTypeByKey.get(rule.leftField);
      if (!leftFieldType) return false;
      if (!getAllowedOperators(leftFieldType).includes(rule.operator))
        return false;
      const compatibleFields = (fieldsByType.get(leftFieldType) ?? []).filter(
        (fieldKey) => fieldKey !== rule.leftField,
      );
      return compatibleFields.includes(rule.rightField);
    });

    const fieldKeySet = new Set(fieldTypeByKey.keys());
    const derivationsByFieldKey = new Map<string, SchemaBuilderDerivedField[]>();
    for (const derivedField of nextSchemaBuilder.derivedFields) {
      const targetFieldKey = derivedField.targetFieldKey.trim();
      if (!fieldKeySet.has(targetFieldKey)) {
        continue;
      }
      if (hasDerivedFieldValidationErrors(derivedField, fieldKeySet)) {
        continue;
      }
      derivationsByFieldKey.set(targetFieldKey, [
        ...(derivationsByFieldKey.get(targetFieldKey) ?? []),
        derivedField,
      ]);
    }

    const nextSchemaDoc: SchemaDoc = {
      schemaId:
        nextSchemaBuilder.schemaId || activeSchemaId || 'plugin.custom.table',
      title: nextSchemaBuilder.title || 'Custom Schema',
      fields: nextSchemaBuilder.fields.map((field) =>
        toSchemaFieldDoc(
          field,
          derivationsByFieldKey.get(field.key.trim()) ?? [],
        ),
      ),
      refinements: [
        ...validRefinements.map((rule) => ({
          code: 'custom',
          path: rule.leftField ? [rule.leftField] : undefined,
          message: rule.message || 'Validation failed',
          when: {
            kind: 'op',
            op: 'not',
            args: [
              {
                kind: 'op',
                op: rule.operator,
                args: [
                  { kind: 'ref', source: 'payload', path: [rule.leftField] },
                  { kind: 'ref', source: 'payload', path: [rule.rightField] },
                ],
              },
            ],
          },
        })),
        ...nextBlocklyRefinements.map((rule) => ({
          code: 'custom',
          path: rule.leftField ? [rule.leftField] : undefined,
          message: rule.message || 'Validation failed',
          when: {
            kind: 'op',
            op: 'not',
            args: [rule.condition],
          },
        })),
      ],
    };
    const schemaIndex = availableSchemaDocs.findIndex(
      (schemaDoc) => schemaDoc.schemaId === activeSchemaId,
    );
    const nextDocs =
      schemaIndex >= 0
        ? availableSchemaDocs.map((schemaDoc, index) =>
          index === schemaIndex ? nextSchemaDoc : schemaDoc,
        )
        : [...availableSchemaDocs, nextSchemaDoc];
    persistSchemaDocs(nextDocs);
    if (activeSchemaId !== nextSchemaDoc.schemaId) {
      setActiveSchemaId(nextSchemaDoc.schemaId);
    }
  }

  function persistSidebarAdminTabs(nextAdminTabs: readonly AdminTabDoc[]) {
    const rowId = canonicalRoutesTabsConfigId;
    const payload = {
      id: rowId,
      draftId: draftId,
      revisionId: 'live',
      pluginId,
      businessSlug: 'draft',
      routes: toDraftRoutesFromAdminTabs(nextAdminTabs),
      diagnostics: [],
      savedByUserId: actorUserId,
      savedAt: new Date().toISOString(),
    };

    void (async () => {
      if (activeRoutesTabsConfigRow?.id === canonicalRoutesTabsConfigId) {
        await updateRoutesTabsConfigMutation.mutateAsync(payload);
      } else {
        try {
          await createRoutesTabsConfigMutation.mutateAsync(payload);
        } catch (error) {
          if (!isDuplicatePersistenceError(error)) {
            throw error;
          }
          await updateRoutesTabsConfigMutation.mutateAsync(payload);
        }
      }

      // Cleanup legacy row key shape (`draftId@live`) after canonical write (`draftId`).
      if (
        activeRoutesTabsConfigRow?.id &&
        activeRoutesTabsConfigRow.id !== canonicalRoutesTabsConfigId
      ) {
        try {
          await deleteRoutesTabsConfigMutation.mutateAsync(
            activeRoutesTabsConfigRow.id,
          );
        } catch (_error) {
          // Best-effort cleanup only; canonical write has already succeeded.
        }
      }

      await refetchRoutesTabsConfig();
    })().catch((error) =>
      reportPersistenceError('Sidebar tab persistence', error),
    );
  }

  function updateSchemaDoc(
    schemaId: string,
    updater: (schemaDoc: SchemaDoc) => SchemaDoc,
  ) {
    persistSchemaDocs(
      availableSchemaDocs.map((schemaDoc) =>
        schemaDoc.schemaId === schemaId ? updater(schemaDoc) : schemaDoc,
      ),
    );
  }

  function updateSidebarAdminTabs(
    updater: (state: {
      schemaTabs: AdminTabDoc[];
      orderedGroups: string[];
      systemTabs: SystemTabState;
    }) => void,
  ) {
    let currentTabs: AdminTabDoc[] = [];
    try {
      currentTabs = JSON.parse(adminTabsText) as AdminTabDoc[];
    } catch {
      currentTabs = [];
    }

    const state = deserializeDraftAdminTabs(currentTabs);
    updater(state);

    const availableSchemaById = new Map(
      availableSchemaDocs.map((schemaDoc) => [schemaDoc.schemaId, schemaDoc]),
    );
    const filteredSchemaTabs = state.schemaTabs.filter((tab) =>
      availableSchemaById.has(tab.schema),
    );
    const existingSchemaIds = new Set(filteredSchemaTabs.map((tab) => tab.schema));
    const appendedSchemaTabs = [
      ...filteredSchemaTabs,
      ...availableSchemaDocs
        .filter((schemaDoc) => !existingSchemaIds.has(schemaDoc.schemaId))
        .map(
          (schemaDoc) =>
            ({
              schema: schemaDoc.schemaId,
              title: schemaDoc.title ?? schemaDoc.schemaId,
            }) satisfies AdminTabDoc,
        ),
    ];

    const schemaOrder = appendedSchemaTabs.map((tab) => tab.schema);
    const schemaGroupById = Object.fromEntries(
      appendedSchemaTabs.flatMap((tab) => {
        const groupName = tab.group?.trim();
        return groupName ? [[tab.schema, groupName]] : [];
      }),
    );
    const orderedGroups = computeOrderedGroupNames({
      customGroups: state.orderedGroups,
      groupOrder: state.orderedGroups,
      schemaGroupById,
      schemaOrder,
      systemTabs: state.systemTabs,
    });

    persistSidebarAdminTabs(
      serializeDraftAdminTabs({
        schemaTabs: appendedSchemaTabs,
        orderedGroups,
        systemTabs: state.systemTabs,
      }),
    );
  }

  function applySchemaRename(schemaId: string, nextTitle: string) {
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.schema === schemaId ? { ...tab, title: nextTitle } : tab,
      );
    });
    updateSchemaDoc(schemaId, (schemaDoc) => ({
      ...schemaDoc,
      title: nextTitle,
    }));
  }

  function handleDropSchemaOnSchema(targetSchemaId: string) {
    if (!draggingSchemaId || draggingSchemaId === targetSchemaId) return;
    updateSidebarAdminTabs((state) => {
      const current = state.schemaTabs.map((tab) => tab.schema);
      const next = current.filter((schemaId) => schemaId !== draggingSchemaId);
      const targetIndex = next.indexOf(targetSchemaId);
      if (targetIndex < 0) {
        next.push(draggingSchemaId);
      } else {
        next.splice(targetIndex + 1, 0, draggingSchemaId);
      }
      const tabBySchema = new Map(state.schemaTabs.map((tab) => [tab.schema, tab]));
      state.schemaTabs = next
        .map((schemaId) => tabBySchema.get(schemaId))
        .filter((tab): tab is AdminTabDoc => Boolean(tab));
    });
    setDraggingSchemaId(null);
  }

  function handleDropSchemaOnGroup(targetGroup: string) {
    if (!draggingSchemaId) return;
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.schema === draggingSchemaId
          ? { ...tab, group: targetGroup }
          : tab,
      );
    });
    setDraggingSchemaId(null);
  }

  function applyGroupRename(previousGroup: string, nextGroup: string) {
    const from = previousGroup.trim();
    const to = nextGroup.trim();
    if (!from || !to || from === to) return;
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.group === from ? { ...tab, group: to } : tab,
      );
      state.orderedGroups = state.orderedGroups.map((groupName) =>
        groupName === from ? to : groupName,
      );
    });
  }

  function handleRenameGroup(previousGroupName: string, nextGroupName: string) {
    applyGroupRename(previousGroupName, nextGroupName);
  }

  function handleDeleteGroup(groupName: string) {
    const normalized = groupName.trim();
    if (!normalized) return;
    updateSidebarAdminTabs((state) => {
      state.orderedGroups = state.orderedGroups.filter(
        (candidate) => candidate !== normalized,
      );
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.group === normalized ? { ...tab, group: undefined } : tab,
      );
    });
  }

  function handleRenameTab(previousTabTitle: string, nextTabTitle: string) {
    const normalized = nextTabTitle.trim();
    if (!normalized) return;
    const previousNormalized = previousTabTitle.trim().toLowerCase();
    const schemaTitleById = new Map(
      availableSchemaDocs.map((schemaDoc) => [
        schemaDoc.schemaId,
        schemaDoc.title ?? schemaDoc.schemaId,
      ]),
    );
    const matchedSchemaIds: string[] = [];
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) => {
        const currentTitle = (
          tab.title ??
          schemaTitleById.get(tab.schema) ??
          tab.schema
        ).trim();
        if (currentTitle.toLowerCase() !== previousNormalized) {
          return tab;
        }
        matchedSchemaIds.push(tab.schema);
        return { ...tab, title: normalized };
      });
    });

    if (matchedSchemaIds.length === 0) {
      const fallbackSchemaId = resolveSchemaIdForTabTitle(previousTabTitle);
      if (!fallbackSchemaId) {
        return;
      }
      applySchemaRename(fallbackSchemaId, normalized);
      return;
    }

    const matchedSet = new Set(matchedSchemaIds);
    persistSchemaDocs(
      availableSchemaDocs.map((schemaDoc) =>
        matchedSet.has(schemaDoc.schemaId)
          ? { ...schemaDoc, title: normalized }
          : schemaDoc,
      ),
    );
  }

  function handleRenameTabIcon(tabTitle: string, iconName: string) {
    const schemaId = resolveSchemaIdForTabTitle(tabTitle);
    if (!schemaId) return;
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.schema === schemaId
          ? { ...tab, icon: iconName.trim() || undefined }
          : tab,
      );
    });
  }

  function handleSystemTabChange(
    key: SystemTabKey,
    next: SystemTabState[SystemTabKey],
  ) {
    updateSidebarAdminTabs((state) => {
      state.systemTabs = {
        ...state.systemTabs,
        [key]: {
          title: next.title,
          group: next.group?.trim() || undefined,
          iconName: next.iconName?.trim() || undefined,
        },
      };
    });
  }

  function openAddColumnSheet() {
    setColumnSheetMode('add');
    setEditingColumnId(null);
    setAddColumnDraft(createAddColumnDraft(schemaBuilder.fields.length));
    setIsAddColumnSheetOpen(true);
  }

  function openEditColumnSheet(columnKey: string) {
    const normalizedColumnKey = columnKey.trim();
    if (!normalizedColumnKey) return;
    const targetField = schemaBuilder.fields.find(
      (field) => field.key.trim() === normalizedColumnKey,
    );
    if (!targetField) {
      toast.error(`Column ${normalizedColumnKey} was not found.`);
      return;
    }
    setColumnSheetMode('edit');
    setEditingColumnId(targetField.id);
    setAddColumnDraft(toAddColumnDraftFromField(targetField));
    setIsAddColumnSheetOpen(true);
  }

  function resetColumnSheetState() {
    setColumnSheetMode('add');
    setEditingColumnId(null);
  }

  function closeColumnSheet() {
    setIsAddColumnSheetOpen(false);
    resetColumnSheetState();
  }

  function handleColumnSheetOpenChange(nextOpen: boolean) {
    setIsAddColumnSheetOpen(nextOpen);
    if (!nextOpen) {
      resetColumnSheetState();
    }
  }

  function handleReorderColumns(
    sourceColumnKey: string,
    targetColumnKey: string,
  ) {
    const source = sourceColumnKey.trim();
    const target = targetColumnKey.trim();
    if (!source || !target || source === target) return;

    setSchemaBuilder((current) => {
      const sourceIndex = current.fields.findIndex(
        (field) => field.key.trim() === source,
      );
      const targetIndex = current.fields.findIndex(
        (field) => field.key.trim() === target,
      );
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }

      const nextFields = [...current.fields];
      const [movedField] = nextFields.splice(sourceIndex, 1);
      if (!movedField) return current;
      nextFields.splice(targetIndex, 0, movedField);

      return {
        ...current,
        fields: nextFields,
      };
    });
  }

  function requestDeleteColumn(columnKey: string) {
    const normalizedColumnKey = columnKey.trim();
    if (!normalizedColumnKey) return;
    if (schemaBuilder.fields.length <= 1) {
      toast.error('At least one column is required.');
      return;
    }
    if (
      !schemaBuilder.fields.some(
        (field) => field.key.trim() === normalizedColumnKey,
      )
    ) {
      toast.error(`Column ${normalizedColumnKey} was not found.`);
      return;
    }
    setPendingDeleteColumnKey(normalizedColumnKey);
    setIsDeleteColumnDialogOpen(true);
  }

  function handleDeleteColumnDialogOpenChange(nextOpen: boolean) {
    setIsDeleteColumnDialogOpen(nextOpen);
    if (!nextOpen) {
      setPendingDeleteColumnKey(null);
    }
  }

  function confirmDeleteColumn() {
    const normalizedColumnKey = pendingDeleteColumnKey?.trim();
    if (!normalizedColumnKey) {
      handleDeleteColumnDialogOpenChange(false);
      return;
    }
    if (schemaBuilder.fields.length <= 1) {
      toast.error('At least one column is required.');
      handleDeleteColumnDialogOpenChange(false);
      return;
    }
    if (
      !schemaBuilder.fields.some(
        (field) => field.key.trim() === normalizedColumnKey,
      )
    ) {
      toast.error(`Column ${normalizedColumnKey} was not found.`);
      handleDeleteColumnDialogOpenChange(false);
      return;
    }
    setSchemaBuilder((current) => ({
      ...current,
      fields: current.fields.filter(
        (field) => field.key.trim() !== normalizedColumnKey,
      ),
      derivedFields: current.derivedFields.filter(
        (derivedField) =>
          derivedField.targetFieldKey.trim() !== normalizedColumnKey,
      ),
    }));
    setSchemaRefinements((current) =>
      current.filter(
        (rule) =>
          rule.leftField !== normalizedColumnKey &&
          rule.rightField !== normalizedColumnKey,
      ),
    );
    setBlocklyRefinements((current) =>
      current.filter((rule) => rule.leftField !== normalizedColumnKey),
    );
    handleDeleteColumnDialogOpenChange(false);
  }

  function submitAddColumnFromSheet() {
    const nextKey = addColumnDraft.key.trim();
    if (!nextKey) {
      toast.error('Column key is required.');
      return;
    }
    const editingField =
      columnSheetMode === 'edit' && editingColumnId
        ? schemaBuilder.fields.find((field) => field.id === editingColumnId)
        : undefined;
    const conflictingField = schemaBuilder.fields.find(
      (field) =>
        field.key.trim() === nextKey &&
        (!editingField || field.id !== editingField.id),
    );
    if (conflictingField) {
      toast.error('A column with this key already exists.');
      return;
    }

    if (editingField) {
      const previousKey = editingField.key.trim();
      setSchemaBuilder((current) => {
        const nextDerivedFields = current.derivedFields.map((derivedField) =>
          derivedField.targetFieldKey.trim() === previousKey
            ? {
              ...derivedField,
              targetFieldKey: nextKey,
            }
            : derivedField,
        );

        return {
          ...current,
          fields: current.fields.map((field) =>
            field.id === editingField.id
              ? {
                ...field,
                key: nextKey,
                label: addColumnDraft.label.trim() || nextKey,
                description: addColumnDraft.description.trim(),
                type: addColumnDraft.type,
                fieldType: addColumnDraft.fieldType,
                required: addColumnDraft.required,
                defaultValue: addColumnDraft.defaultValue.trim() || undefined,
                enumValuesText:
                  addColumnDraft.enumValuesText.trim() || undefined,
                min: addColumnDraft.min.trim() || undefined,
                max: addColumnDraft.max.trim() || undefined,
              }
              : field,
          ),
          derivedFields: nextDerivedFields,
        };
      });
      if (previousKey !== nextKey) {
        setSchemaRefinements((current) =>
          current.map((rule) => ({
            ...rule,
            leftField:
              rule.leftField === previousKey ? nextKey : rule.leftField,
            rightField:
              rule.rightField === previousKey ? nextKey : rule.rightField,
          })),
        );
        setBlocklyRefinements((current) =>
          current.map((rule) => ({
            ...rule,
            leftField:
              rule.leftField === previousKey ? nextKey : rule.leftField,
          })),
        );
      }
      closeColumnSheet();
      return;
    }

    const nextField: BuilderField = {
      id: generateBuilderId(),
      key: nextKey,
      label: addColumnDraft.label.trim() || nextKey,
      description: addColumnDraft.description.trim(),
      type: addColumnDraft.type,
      fieldType: addColumnDraft.fieldType,
      required: addColumnDraft.required,
      defaultValue: addColumnDraft.defaultValue.trim() || undefined,
      enumValuesText: addColumnDraft.enumValuesText.trim() || undefined,
      min: addColumnDraft.min.trim() || undefined,
      max: addColumnDraft.max.trim() || undefined,
      inputPropsJson: '{}',
      customDataJson: '{}',
      fieldConfigJson: '{}',
      behaviorJson: '{}',
    };
    setSchemaBuilder((current) => ({
      ...current,
      fields: [...current.fields, nextField],
      derivedFields: current.derivedFields,
    }));
    closeColumnSheet();
  }

  function handleAddGroup(
    nextGroupName?: string,
    options?: { relativeTo?: string; position?: 'above' | 'below' },
  ) {
    const fallbackGroupName = `Group ${availableGroups.length + 1}`;
    const normalized = (nextGroupName ?? fallbackGroupName).trim();
    if (!normalized) {
      toast.error('Enter a group name first.');
      return;
    }
    updateSidebarAdminTabs((state) => {
      const current = state.orderedGroups;
      const withCandidate = current.includes(normalized)
        ? current
        : [...current, normalized];
      // Build order from persisted state plus currently visible groups so relative
      // insertion works even when a target group was not yet persisted in groupOrder.
      const base = [
        ...withCandidate,
        ...availableGroups.filter((groupName) => !withCandidate.includes(groupName)),
      ].filter((groupName) => groupName !== normalized);
      const relativeTo = options?.relativeTo?.trim();
      const relativeIndex = relativeTo ? base.indexOf(relativeTo) : -1;
      if (relativeIndex >= 0) {
        const insertAt =
          options?.position === 'above' ? relativeIndex : relativeIndex + 1;
        base.splice(insertAt, 0, normalized);
        state.orderedGroups = base;
        return;
      }
      state.orderedGroups = [...base, normalized];
    });
  }

  function handleReorderGroups(
    fromGroupName: string,
    toGroupName: string,
    position: 'above' | 'below' = 'below',
  ) {
    const from = fromGroupName.trim();
    const to = toGroupName.trim();
    if (!from || !to || from === to) return;
    updateSidebarAdminTabs((state) => {
      const current = state.orderedGroups;
      const baseline = [...current];
      if (!baseline.includes(from)) baseline.push(from);
      if (!baseline.includes(to)) baseline.push(to);
      const next = baseline.filter((groupName) => groupName !== from);
      const toIndex = next.indexOf(to);
      if (toIndex < 0) return;
      const insertAt = position === 'above' ? toIndex : toIndex + 1;
      next.splice(insertAt, 0, from);
      state.orderedGroups = next;
    });
  }

  function resolveSchemaIdForTabTitle(tabTitle: string): string | undefined {
    const normalized = tabTitle.trim();
    if (!normalized) return undefined;
    const normalizedLower = normalized.toLowerCase();
    const matchingTab = (parsed?.adminTabs ?? []).find(
      (tab) =>
        (tab.title ?? tab.schema).trim() === normalized ||
        (tab.title ?? tab.schema).trim().toLowerCase() === normalizedLower,
    );
    return (
      matchingTab?.schema ??
      Object.entries(
        Object.fromEntries(
          availableSchemaDocs.map((schemaDoc) => [
            schemaDoc.schemaId,
            schemaDoc.title ?? schemaDoc.schemaId,
          ]),
        ),
      ).find(
        ([, titleValue]) =>
          titleValue.trim() === normalized ||
          titleValue.trim().toLowerCase() === normalizedLower,
      )?.[0]
    );
  }

  function getNextWorkflowId() {
    let counter = availableWorkflows.length + 1;
    while (true) {
      const candidate = `${pluginId}.workflow.${counter}`;
      if (!availableWorkflows.some((workflow) => workflow.workflowId === candidate)) {
        return candidate;
      }
      counter += 1;
    }
  }

  function openWorkflowEditorForTable(table: string) {
    const trimmedTable = table.trim();
    if (!trimmedTable) return;
    const preferredWorkflow =
      availableWorkflows.find(
        (workflowDoc) =>
          workflowDoc.workflowId === activeWorkflowId &&
          workflowDoc.table === trimmedTable,
      ) ??
      availableWorkflows.find(
        (workflowDoc) => workflowDoc.table === trimmedTable,
      );
    if (preferredWorkflow) {
      setActiveWorkflowId(preferredWorkflow.workflowId);
      setWorkflowEditorLockedTable(trimmedTable);
      setIsWorkflowEditorOpen(true);
      return;
    }
    const nextWorkflow: WorkflowDoc = {
      workflowId: getNextWorkflowId(),
      table: trimmedTable,
      hook: 'afterCreate',
      nodes: [],
      edges: [],
    };
    persistWorkflowDocs([...availableWorkflows, nextWorkflow]);
    setActiveWorkflowId(nextWorkflow.workflowId);
    setWorkflowEditorLockedTable(trimmedTable);
    setIsWorkflowEditorOpen(true);
  }

  function handleOpenWorkflowEditorForTab(tabTitle: string) {
    const schemaId = resolveSchemaIdForTabTitle(tabTitle);
    if (!schemaId) {
      toast.error(`Could not resolve schema for "${tabTitle}".`);
      return;
    }
    openWorkflowEditorForTable(schemaId);
  }

  function handleDeleteTableFromTab(tabTitle: string) {
    const normalizedTabTitle = tabTitle.trim();
    if (!normalizedTabTitle) return;
    const schemaId = resolveSchemaIdForTabTitle(normalizedTabTitle);
    if (!schemaId) {
      toast.error(`Could not resolve schema for "${tabTitle}".`);
      return;
    }
    const matchingSchemaDoc = availableSchemaDocs.find(
      (schemaDoc) => schemaDoc.schemaId === schemaId,
    );
    if (!matchingSchemaDoc) {
      toast.error(`Table "${normalizedTabTitle}" was not found.`);
      return;
    }
    setPendingDeleteTable({
      schemaId,
      tabTitle: matchingSchemaDoc.title?.trim() || normalizedTabTitle,
    });
  }

  function handleDeleteTableDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingDeleteTable(null);
    }
  }

  function confirmDeleteTable() {
    const schemaId = pendingDeleteTable?.schemaId?.trim();
    if (!schemaId) {
      handleDeleteTableDialogOpenChange(false);
      return;
    }
    handleRemoveSchema(schemaId);
    handleDeleteTableDialogOpenChange(false);
  }

  function handleMoveTabToGroup(tabTitle: string, nextGroup?: string) {
    const normalizedGroup = nextGroup?.trim();
    const schemaId = resolveSchemaIdForTabTitle(tabTitle);
    if (!schemaId) return;
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.map((tab) =>
        tab.schema === schemaId
          ? {
            ...tab,
            group: normalizedGroup || undefined,
          }
          : tab,
      );
    });
  }

  function handleAddSchema(targetGroupName?: string) {
    const nextSchemaId = `plugin.${pluginId.split('.').pop() || 'custom'}.${availableSchemaDocs.length + 1}`;
    const normalizedGroupName = targetGroupName?.trim();
    const nextSchemaDoc: SchemaDoc = {
      schemaId: nextSchemaId,
      title: `Schema ${availableSchemaDocs.length + 1}`,
      fields: [
        {
          key: 'name',
          type: 'string',
          optional: false,
          behavior: {
            fieldConfig: {
              fieldType: 'string',
              label: 'Name',
            },
          },
        },
      ],
    };
    persistSchemaDocs([...availableSchemaDocs, nextSchemaDoc]);
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = [
        ...state.schemaTabs.filter((tab) => tab.schema !== nextSchemaId),
        {
          schema: nextSchemaId,
          title: nextSchemaDoc.title ?? nextSchemaId,
          group: normalizedGroupName,
        },
      ];
    });
    setActiveSchemaId(nextSchemaId);
    syncBuilderFromSchemaDoc(nextSchemaDoc);
  }

  function handleRemoveSchema(schemaId: string) {
    if (availableSchemaDocs.length <= 1) {
      toast.error('At least one schema is required.');
      return;
    }
    const nextDocs = availableSchemaDocs.filter(
      (schemaDoc) => schemaDoc.schemaId !== schemaId,
    );
    persistSchemaDocs(nextDocs);
    updateSidebarAdminTabs((state) => {
      state.schemaTabs = state.schemaTabs.filter(
        (tab) => tab.schema !== schemaId,
      );
    });
    setCoreExtensionSchemaIds((current) => {
      const next = { ...current };
      delete next[schemaId];
      return next;
    });
    setLockedCoreFieldKeysBySchemaId((current) => {
      const next = { ...current };
      delete next[schemaId];
      return next;
    });
    if (activeSchemaId === schemaId) {
      const fallbackSchema = nextDocs[0];
      if (fallbackSchema) {
        setActiveSchemaId(fallbackSchema.schemaId);
        syncBuilderFromSchemaDoc(fallbackSchema);
      }
    }
  }

  function handleAddWorkflow() {
    const nextWorkflow: WorkflowDoc = {
      workflowId: getNextWorkflowId(),
      table:
        workflowEditorLockedTable ||
        activeSchemaId ||
        schemaBuilder.schemaId ||
        DEFAULT_WORKFLOW_DOC.table,
      hook: 'afterCreate',
      nodes: [],
      edges: [],
    };
    persistWorkflowDocs([...availableWorkflows, nextWorkflow]);
    setActiveWorkflowId(nextWorkflow.workflowId);
  }

  function handleRemoveWorkflow(workflowId: string) {
    if (availableWorkflows.length <= 1) {
      toast.error('At least one workflow is required.');
      return;
    }
    const nextWorkflows = availableWorkflows.filter(
      (workflow) => workflow.workflowId !== workflowId,
    );
    persistWorkflowDocs(nextWorkflows);
    if (activeWorkflowId === workflowId) {
      setActiveWorkflowId(
        nextWorkflows[0]?.workflowId ?? DEFAULT_WORKFLOW_DOC.workflowId,
      );
    }
  }

  function handleDuplicateActiveWorkflow() {
    if (!workspaceWorkflow) return;
    const nextWorkflow: WorkflowDoc = {
      ...workspaceWorkflow,
      workflowId: getNextWorkflowId(),
      hook: workspaceWorkflow.hook,
      table: workflowEditorTable,
      nodes: workspaceWorkflow.nodes.map((node) => ({ ...node })),
      edges: workspaceWorkflow.edges.map((edge) => ({ ...edge })),
    };
    persistWorkflowDocs([...availableWorkflows, nextWorkflow]);
    setActiveWorkflowId(nextWorkflow.workflowId);
  }

  function updateActiveWorkflow(
    updater: (workflow: WorkflowDoc) => WorkflowDoc,
  ) {
    const selectedWorkflow =
      availableWorkflows.find(
        (workflowDoc) => workflowDoc.workflowId === activeWorkflowId,
      ) ?? availableWorkflows[0];
    if (!selectedWorkflow) return;
    const nextWorkflow = updater(selectedWorkflow);
    const nextWorkflows = availableWorkflows.map((workflowDoc) =>
      workflowDoc.workflowId === selectedWorkflow.workflowId
        ? nextWorkflow
        : workflowDoc,
    );
    persistWorkflowDocs(nextWorkflows);
    if (nextWorkflow.workflowId !== activeWorkflowId) {
      setActiveWorkflowId(nextWorkflow.workflowId);
    }
  }

  function addWorkflowActionStep() {
    updateActiveWorkflow((current) => {
      const nextNodeId = `n${current.nodes.length + 1}`;
      const nextNodes = [
        ...current.nodes,
        {
          nodeId: nextNodeId,
          type: 'action',
          actionId: `${pluginId}.action.${current.nodes.length + 1}`,
          input: {
            expression: {
              kind: 'ref',
              source: 'payload',
              path: [],
            },
          },
        },
      ];
      return {
        ...current,
        nodes: nextNodes,
        edges: [],
      };
    });
  }

  function removeWorkflowStep(nodeId: string) {
    updateActiveWorkflow((current) => {
      const nextNodes = current.nodes.filter((node) => node.nodeId !== nodeId);
      return {
        ...current,
        nodes: nextNodes,
        edges: [],
      };
    });
  }

  function applyTemplatePreset(releaseId: string) {
    let parsedReleaseId = parseReleaseId(releaseId);

    if (!parsedReleaseId) {
      const parts = releaseId.split('@');
      if (parts.length === 2) {
        parsedReleaseId = { pluginId: parts[0], version: parts[1] };
      }
    }

    if (!parsedReleaseId) {
      toast.error('Failed to parse template release id.');
      return;
    }

    const template = templates.find(
      (release) =>
        release.pluginId === parsedReleaseId.pluginId &&
        release.version === parsedReleaseId.version,
    );

    if (!template) {
      toast.error('Template was not found.');
      return;
    }

    updatePluginIdInSearch(template.pluginId);
    setTitle(template.docs.title);
    setDescription(template.docs.description);
    persistActionManifestDocs(template.actionManifest);
    const nextSchemaDocs =
      template.schemaDocs && template.schemaDocs.length > 0
        ? template.schemaDocs
        : toFallbackTemplateSchemaDocs(template);
    const nextWorkflows =
      template.workflows && template.workflows.length > 0
        ? template.workflows
        : toFallbackTemplateWorkflows(template, nextSchemaDocs);
    const nextActiveSchema = nextSchemaDocs[0] ?? DEFAULT_SCHEMA_DOC;

    persistSchemaDocs(nextSchemaDocs);
    persistWorkflowDocs(nextWorkflows);
    setActiveSchemaId(nextActiveSchema.schemaId);
    setActiveWorkflowId(
      nextWorkflows[0]?.workflowId ?? DEFAULT_WORKFLOW_DOC.workflowId,
    );
    syncBuilderFromSchemaDoc(nextActiveSchema);
    setSelectedTemplateLabel(template.docs?.title);
    setIsTemplatesDialogOpen(false);
    persistSidebarAdminTabs(
      serializeDraftAdminTabs({
        schemaTabs: nextSchemaDocs.map((schemaDoc) => {
          const templateTab = (template.adminTabs ?? []).find(
            (tab) => tab.schema === schemaDoc.schemaId,
          );
          return {
            schema: schemaDoc.schemaId,
            title: schemaDoc.title ?? schemaDoc.schemaId,
            group: templateTab?.group,
            icon: templateTab?.icon,
          } satisfies AdminTabDoc;
        }),
        orderedGroups: Array.from(
          new Set(
            (template.adminTabs ?? [])
              .map((tab) => tab.group?.trim())
              .filter((group): group is string => Boolean(group)),
          ),
        ),
        systemTabs,
      }),
    );
  }

  function openSchemaEditor(
    schemaId: string,
    options?: { closeWorkflowEditor?: boolean },
  ) {
    if (coreExtensionSchemaIds[schemaId]) {
      toast.info('Core extension tables are edited inline in the sidebar.');
      return;
    }
    const schemaDoc = availableSchemaDocs.find(
      (candidate) => candidate.schemaId === schemaId,
    );
    if (!schemaDoc) return;
    const openEditor = () => {
      selectSchema(schemaId);
      setIsSchemaEditorOpen(true);
    };
    if (options?.closeWorkflowEditor) {
      setIsWorkflowEditorOpen(false);
      setWorkflowEditorLockedTable(null);
      if (schemaEditorOpenTimeoutRef.current !== null) {
        clearTimeout(schemaEditorOpenTimeoutRef.current);
        schemaEditorOpenTimeoutRef.current = null;
      }
      if (typeof window === 'undefined') {
        openEditor();
        return;
      }
      schemaEditorOpenTimeoutRef.current = window.setTimeout(() => {
        schemaEditorOpenTimeoutRef.current = null;
        openEditor();
      }, 260);
      return;
    }
    openEditor();
  }

  if (isInitialLoading) return <PluginStudioSkeleton />;

  return (
    <div className="w-full py-6">
      <div className="mx-auto w-full max-w-7xl px-4 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-background via-muted/30 to-background p-6 md:p-8">
          <div className="absolute -right-10 top-6 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5" />
                Plugin Studio
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Build Powerful Plugin Data Models.
              </h1>
              <p className="text-sm text-muted-foreground">
                Use full metadata-powered schema and automation dialogs with
                type safety and advanced customization.
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Draft Workspace
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplatesDialogOpen(true)}
              >
                <Wand2 className="mr-2 size-4" />
                Templates
              </Button>
              <Button
                size="lg"
                disabled={!isValidInputs || isPublishing}
                onClick={() => {
                  if (!isValidInputs) return;
                  void publishRelease();
                }}
              >
                {isPublishing ? 'Publishing...' : 'Publish Plugin'}
                {!isPublishing && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </div>
            <div className="flex w-full items-center gap-2 md:justify-end">
              <Button type="button" size="sm" variant="outline" disabled>
                Save Draft Revision
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled>
                Load Revision
              </Button>
            </div>
          </div>
        </section>

        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle className="text-base">Sidebar Builder</CardTitle>
            <CardDescription>
              Design tables, columns, and workflows inline while the admin UI
              renders from the same schema docs in real time.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {parsed === null ? (
              <div className="p-4 text-sm text-muted-foreground">
                Fix schema/workflow JSON parse issues to render preview.
              </div>
            ) : livePreviewTabs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Add at least one table schema to render live preview.
              </div>
            ) : (
              <AutoAdmin
                tabs={livePreviewTabs}
                editable
                onAddTable={handleAddSchema}
                onAddGroup={handleAddGroup}
                onReorderGroups={handleReorderGroups}
                onMoveTabToGroup={handleMoveTabToGroup}
                onRenameGroup={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
                onRenameTab={handleRenameTab}
                onRenameTabIcon={handleRenameTabIcon}
                onOpenWorkflowEditorForTab={handleOpenWorkflowEditorForTab}
                onDeleteTableForTab={handleDeleteTableFromTab}
                systemTabs={systemTabs}
                onSystemTabChange={handleSystemTabChange}
                groups={availableGroups}
              />
            )}
          </CardContent>
        </Card>

        <Sheet
          open={isAddColumnSheetOpen}
          onOpenChange={handleColumnSheetOpenChange}
        >
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-lg"
          >
            <SheetHeader>
              <SheetTitle>
                {columnSheetMode === 'edit' ? 'Edit Column' : 'Add Column'}
              </SheetTitle>
              <SheetDescription>
                {columnSheetMode === 'edit'
                  ? 'Update this column using the same form used when creating new columns.'
                  : 'Add a new column to the end of the active table with full field customization.'}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="add-column-key">Column key</Label>
                  <Input
                    id="add-column-key"
                    value={addColumnDraft.key}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-column-label">Label</Label>
                  <Input
                    id="add-column-label"
                    value={addColumnDraft.label}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-column-description">Description</Label>
                <Input
                  id="add-column-description"
                  value={addColumnDraft.description}
                  onChange={(event) =>
                    setAddColumnDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Data type</Label>
                  <Select
                    value={addColumnDraft.type}
                    onValueChange={(value) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        type: value as BuilderFieldType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Data type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDER_FIELD_TYPES.map((fieldType) => (
                        <SelectItem
                          key={`sheet-type-${fieldType}`}
                          value={fieldType}
                        >
                          {fieldType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>UI field type</Label>
                  <Select
                    value={addColumnDraft.fieldType}
                    onValueChange={(value) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        fieldType: value as BuilderLeafFieldType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UI field type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDER_LEAF_FIELD_TYPES.map((fieldType) => (
                        <SelectItem
                          key={`sheet-ui-${fieldType}`}
                          value={fieldType}
                        >
                          {fieldType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="add-column-default">Default value</Label>
                  <Input
                    id="add-column-default"
                    value={addColumnDraft.defaultValue}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        defaultValue: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-column-enum">Enum values</Label>
                  <Input
                    id="add-column-enum"
                    value={addColumnDraft.enumValuesText}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        enumValuesText: event.target.value,
                      }))
                    }
                    placeholder="comma,separated"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="add-column-min">Min</Label>
                  <Input
                    id="add-column-min"
                    value={addColumnDraft.min}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        min: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-column-max">Max</Label>
                  <Input
                    id="add-column-max"
                    value={addColumnDraft.max}
                    onChange={(event) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        max: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={addColumnDraft.required}
                    onCheckedChange={(checked) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        required: checked === true,
                      }))
                    }
                  />
                  Required
                </Label>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeColumnSheet}
              >
                Cancel
              </Button>
              <Button type="button" onClick={submitAddColumnFromSheet}>
                {columnSheetMode === 'edit' ? 'Save Column' : 'Add Column'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <AlertDialog
          open={pendingDeleteTable !== null}
          onOpenChange={handleDeleteTableDialogOpenChange}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete table?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteTable
                  ? `Table "${pendingDeleteTable.tabTitle}" will be removed from this draft. This action cannot be undone.`
                  : 'This table will be removed from this draft. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTable}>
                Delete Table
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteColumnDialogOpen}
          onOpenChange={handleDeleteColumnDialogOpenChange}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete column?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteColumnKey
                  ? `Column "${pendingDeleteColumnKey}" will be removed from this table. Existing rows may lose this value. This action cannot be undone.`
                  : 'This column will be removed from this table. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteColumn}>
                Delete Column
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={isTemplatesDialogOpen}
          onOpenChange={setIsTemplatesDialogOpen}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="size-4" />
                Starter Templates
              </DialogTitle>
              <DialogDescription>
                Load template releases on demand without blocking the main
                workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => (
                <div
                  key={`${template.pluginId}@${template.version}`}
                  className={`rounded-xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedTemplateLabel === template.docs?.title
                    ? 'ring-2 ring-primary'
                    : ''
                    }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">
                      {template.docs?.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {template.pluginId}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {template.docs?.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() =>
                      applyTemplatePreset(
                        `${template.pluginId}@${template.version}`,
                      )
                    }
                  >
                    <BadgePlus className="mr-2 size-4" />
                    Load Template
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSchemaEditorOpen} onOpenChange={setIsSchemaEditorOpen}>
          <DialogContent className="!w-screen !h-screen !max-w-none !max-h-none gap-0 flex flex-col overflow-hidden !translate-x-0 !translate-y-0 !top-0 !left-0 !rounded-none !m-0">
            <DialogHeader>
              <DialogTitle>Schema Editor</DialogTitle>
              <DialogDescription>
                Build schema fields, advanced field config, derivations, and
                validation rules with safe visual controls.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 grid gap-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="schema-editor-schema-id">Schema ID</Label>
                  <Input
                    id="schema-editor-schema-id"
                    value={schemaBuilder.schemaId}
                    onChange={(event) =>
                      setSchemaBuilder((current) => ({
                        ...current,
                        schemaId: event.target.value,
                      }))
                    }
                    placeholder="Schema ID"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="schema-editor-schema-title">
                    Schema title
                  </Label>
                  <Input
                    id="schema-editor-schema-title"
                    value={schemaBuilder.title}
                    onChange={(event) =>
                      setSchemaBuilder((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Schema title"
                  />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Schema Fields</div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setSchemaBuilder((current) => ({
                        ...current,
                        fields: [
                          ...current.fields,
                          {
                            id: generateBuilderId(),
                            key: `field_${current.fields.length + 1}`,
                            label: `Field ${current.fields.length + 1}`,
                            description: '',
                            type: 'string',
                            fieldType: 'string',
                            required: false,
                            fieldConfigJson: '{}',
                            behaviorJson: '{}',
                            inputPropsJson: '{}',
                            customDataJson: '{}',
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    Add Field
                  </Button>
                </div>
                {schemaBuilder.fields.map((field, fieldIndex) => {
                  const choiceFieldType = isChoiceFieldType(field.type);
                  const showMinMax =
                    isNumericFieldType(field.type) ||
                    field.type === 'string' ||
                    field.type === 'array' ||
                    field.type === 'tags';
                  const invalidField = hasFieldValidationErrors(field);
                  const inputPlaceholder = readJsonStringEntry(
                    field.inputPropsJson,
                    'placeholder',
                  );
                  const inputRows = readJsonNumberEntry(
                    field.inputPropsJson,
                    'rows',
                  );
                  const inputStep = readJsonNumberEntry(
                    field.inputPropsJson,
                    'step',
                  );
                  const inputReadOnly = readJsonBooleanEntry(
                    field.inputPropsJson,
                    'readOnly',
                  );
                  const inputDisabled = readJsonBooleanEntry(
                    field.inputPropsJson,
                    'disabled',
                  );
                  const inputClassName = readJsonStringEntry(
                    field.inputPropsJson,
                    'className',
                  );
                  const additionalInputPropsEntries = listJsonEntries(
                    field.inputPropsJson,
                    {
                      excludeKeys: BUILDER_INPUT_PROP_RESERVED_KEYS,
                    },
                  );
                  const customDataEntries = listJsonEntries(
                    field.customDataJson,
                  );
                  const fieldConfigExtraEntries = listJsonEntries(
                    field.fieldConfigJson,
                    {
                      excludeKeys: BUILDER_FIELD_CONFIG_RESERVED_KEYS,
                    },
                  );
                  const fieldRefinements = field.fieldRefinements ?? [];
                  const compatiblePayloadFieldKeys = schemaBuilder.fields
                    .filter(
                      (candidate) =>
                        candidate.id !== field.id &&
                        candidate.type === field.type &&
                        candidate.key.trim().length > 0,
                    )
                    .map((candidate) => candidate.key.trim());
                  const hasCompatiblePayloadField =
                    compatiblePayloadFieldKeys.length > 0;

                  return (
                    <div
                      key={field.id}
                      className="rounded-md border bg-card p-3 space-y-3"
                    >
                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-key-${field.id}`}>
                            Field key
                          </Label>
                          <Input
                            id={`schema-field-key-${field.id}`}
                            value={field.key}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        key: event.target.value,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Field key"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-label-${field.id}`}>
                            Field label
                          </Label>
                          <Input
                            id={`schema-field-label-${field.id}`}
                            value={field.label}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        label: event.target.value,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Field label"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`schema-field-description-${field.id}`}
                          >
                            Description
                          </Label>
                          <Input
                            id={`schema-field-description-${field.id}`}
                            value={field.description}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        description: event.target.value,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Description"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-type-${field.id}`}>
                            Field type
                          </Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        type: value as BuilderFieldType,
                                        fieldType:
                                          AUTOFORM_FIELD_TYPES.includes(
                                            value as (typeof AUTOFORM_FIELD_TYPES)[number],
                                          )
                                            ? (value as (typeof AUTOFORM_FIELD_TYPES)[number])
                                            : candidate.fieldType,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger id={`schema-field-type-${field.id}`}>
                              <SelectValue placeholder="Field type" />
                            </SelectTrigger>
                            <SelectContent>
                              {BUILDER_FIELD_TYPES.map((fieldType) => (
                                <SelectItem
                                  key={`dialog-${field.id}-${fieldType}`}
                                  value={fieldType}
                                >
                                  {fieldType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-ui-type-${field.id}`}>
                            UI component type
                          </Label>
                          <Select
                            value={field.fieldType ?? 'string'}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        fieldType:
                                          value as (typeof AUTOFORM_FIELD_TYPES)[number],
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger
                              id={`schema-field-ui-type-${field.id}`}
                            >
                              <SelectValue placeholder="UI component type" />
                            </SelectTrigger>
                            <SelectContent>
                              {AUTOFORM_FIELD_TYPES.map((fieldType) => (
                                <SelectItem
                                  key={`ui-${field.id}-${fieldType}`}
                                  value={fieldType}
                                >
                                  {fieldType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-default-${field.id}`}>
                            Default value
                          </Label>
                          <Input
                            id={`schema-field-default-${field.id}`}
                            value={field.defaultValue ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        defaultValue:
                                          event.target.value || undefined,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Default value"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-min-${field.id}`}>
                            Min constraint
                          </Label>
                          <Input
                            id={`schema-field-min-${field.id}`}
                            type={
                              isNumericFieldType(field.type) ? 'number' : 'text'
                            }
                            value={field.min ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        min: event.target.value || undefined,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder={
                              showMinMax ? 'Min constraint' : 'Min (n/a)'
                            }
                            disabled={!showMinMax}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`schema-field-max-${field.id}`}>
                            Max constraint
                          </Label>
                          <Input
                            id={`schema-field-max-${field.id}`}
                            type={
                              isNumericFieldType(field.type) ? 'number' : 'text'
                            }
                            value={field.max ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        max: event.target.value || undefined,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder={
                              showMinMax ? 'Max constraint' : 'Max (n/a)'
                            }
                            disabled={!showMinMax}
                          />
                        </div>
                      </div>

                      {choiceFieldType ? (
                        <div className="space-y-1">
                          <Label
                            htmlFor={`schema-field-enum-values-${field.id}`}
                          >
                            Enum values
                          </Label>
                          <Input
                            id={`schema-field-enum-values-${field.id}`}
                            value={field.enumValuesText ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        enumValuesText: event.target.value,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Enum values (comma-separated)"
                          />
                        </div>
                      ) : null}

                      {field.type === 'array' ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-array-item-type-${field.id}`}
                            >
                              Array item type
                            </Label>
                            <Select
                              value={field.arrayItemType ?? 'string'}
                              onValueChange={(value) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          arrayItemType:
                                            value as BuilderLeafFieldType,
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger
                                id={`schema-field-array-item-type-${field.id}`}
                              >
                                <SelectValue placeholder="Array item type" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUILDER_LEAF_FIELD_TYPES.map((fieldType) => (
                                  <SelectItem
                                    key={`array-${field.id}-${fieldType}`}
                                    value={fieldType}
                                  >
                                    {fieldType}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-array-enum-values-${field.id}`}
                            >
                              Array enum values
                            </Label>
                            <Input
                              id={`schema-field-array-enum-values-${field.id}`}
                              value={field.arrayItemEnumValuesText ?? ''}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          arrayItemEnumValuesText:
                                            event.target.value,
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Array enum values (if needed)"
                              disabled={!isChoiceFieldType(field.arrayItemType)}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2 rounded-md border p-2">
                        <div className="text-xs font-medium">Input props</div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-input-placeholder-${field.id}`}
                            >
                              Input placeholder
                            </Label>
                            <Input
                              id={`schema-field-input-placeholder-${field.id}`}
                              value={inputPlaceholder}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          inputPropsJson: setJsonStringEntry(
                                            candidate.inputPropsJson,
                                            'placeholder',
                                            event.target.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Input placeholder"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-input-step-${field.id}`}
                            >
                              Input step
                            </Label>
                            <Input
                              id={`schema-field-input-step-${field.id}`}
                              type={
                                isNumericFieldType(field.type)
                                  ? 'number'
                                  : 'text'
                              }
                              value={inputStep}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          inputPropsJson: setJsonNumberEntry(
                                            candidate.inputPropsJson,
                                            'step',
                                            event.target.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Input step"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-input-rows-${field.id}`}
                            >
                              Input rows
                            </Label>
                            <Input
                              id={`schema-field-input-rows-${field.id}`}
                              value={inputRows}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          inputPropsJson: setJsonNumberEntry(
                                            candidate.inputPropsJson,
                                            'rows',
                                            event.target.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Rows (textarea-like fields)"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <Label className="flex items-center gap-2 text-sm font-normal">
                            <Checkbox
                              checked={inputReadOnly}
                              onCheckedChange={(checked) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          inputPropsJson: setJsonBooleanEntry(
                                            candidate.inputPropsJson,
                                            'readOnly',
                                            checked === true
                                              ? true
                                              : undefined,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                            />
                            Read only
                          </Label>
                          <Label className="flex items-center gap-2 text-sm font-normal">
                            <Checkbox
                              checked={inputDisabled}
                              onCheckedChange={(checked) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          inputPropsJson: setJsonBooleanEntry(
                                            candidate.inputPropsJson,
                                            'disabled',
                                            checked === true
                                              ? true
                                              : undefined,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                            />
                            Disabled
                          </Label>
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`schema-field-input-classname-${field.id}`}
                          >
                            Input className
                          </Label>
                          <div id={`schema-field-input-classname-${field.id}`}>
                            <ClassNameFieldControl
                              value={inputClassName}
                              onChange={(value) =>
                                setSchemaBuilder((current) => {
                                  let changed = false;
                                  const nextFields = current.fields.map(
                                    (candidate, candidateIndex) => {
                                      if (candidateIndex !== fieldIndex) {
                                        return candidate;
                                      }

                                      const nextInputPropsJson =
                                        setJsonStringEntry(
                                          candidate.inputPropsJson,
                                          'className',
                                          value,
                                        );

                                      if (
                                        nextInputPropsJson ===
                                        candidate.inputPropsJson
                                      ) {
                                        return candidate;
                                      }

                                      changed = true;
                                      return {
                                        ...candidate,
                                        inputPropsJson: nextInputPropsJson,
                                      };
                                    },
                                  );

                                  if (!changed) {
                                    return current;
                                  }

                                  return {
                                    ...current,
                                    fields: nextFields,
                                  };
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            Additional Input Props
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) => {
                                    if (candidateIndex !== fieldIndex) {
                                      return candidate;
                                    }
                                    const nextRecord = parseJsonRecord(
                                      candidate.inputPropsJson,
                                    );
                                    const nextKey = getNextJsonEntryKey(
                                      nextRecord,
                                      'prop',
                                      BUILDER_INPUT_PROP_RESERVED_KEYS,
                                    );
                                    nextRecord[nextKey] = '';
                                    return {
                                      ...candidate,
                                      inputPropsJson:
                                        stringifyJsonInput(nextRecord),
                                    };
                                  },
                                ),
                              }))
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Add Prop
                          </Button>
                        </div>
                        {additionalInputPropsEntries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Add input prop entries as key/value pairs.
                          </p>
                        ) : null}
                        {additionalInputPropsEntries.map(
                          (entry, entryIndex) => (
                            <div
                              key={`${field.id}-input-prop-${entryIndex}-${entry.key}`}
                              className="grid gap-2 md:grid-cols-[1fr_1fr_auto] rounded border p-2"
                            >
                              <Input
                                value={entry.key}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            inputPropsJson: upsertJsonEntry(
                                              candidate.inputPropsJson,
                                              entry.key,
                                              event.target.value,
                                              entry.value,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                                placeholder="Input prop key"
                              />
                              <Input
                                value={entry.value}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            inputPropsJson: upsertJsonEntry(
                                              candidate.inputPropsJson,
                                              entry.key,
                                              entry.key,
                                              event.target.value,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                                placeholder="Input prop value"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            inputPropsJson: removeJsonEntry(
                                              candidate.inputPropsJson,
                                              entry.key,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="space-y-2 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">Custom data</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) => {
                                    if (candidateIndex !== fieldIndex) {
                                      return candidate;
                                    }
                                    const nextRecord = parseJsonRecord(
                                      candidate.customDataJson,
                                    );
                                    const nextKey = getNextJsonEntryKey(
                                      nextRecord,
                                      'custom',
                                    );
                                    nextRecord[nextKey] = '';
                                    return {
                                      ...candidate,
                                      customDataJson:
                                        stringifyJsonInput(nextRecord),
                                    };
                                  },
                                ),
                              }))
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Add Custom Data
                          </Button>
                        </div>
                        {customDataEntries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Add custom data entries as key/value pairs.
                          </p>
                        ) : null}
                        {customDataEntries.map((entry, entryIndex) => (
                          <div
                            key={`${field.id}-custom-data-${entryIndex}-${entry.key}`}
                            className="grid gap-2 md:grid-cols-[1fr_1fr_auto] rounded border p-2"
                          >
                            <Input
                              value={entry.key}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          customDataJson: upsertJsonEntry(
                                            candidate.customDataJson,
                                            entry.key,
                                            event.target.value,
                                            entry.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Custom data key"
                            />
                            <Input
                              value={entry.value}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          customDataJson: upsertJsonEntry(
                                            candidate.customDataJson,
                                            entry.key,
                                            entry.key,
                                            event.target.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Custom data value"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          customDataJson: removeJsonEntry(
                                            candidate.customDataJson,
                                            entry.key,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            Field Config Extras
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) => {
                                    if (candidateIndex !== fieldIndex) {
                                      return candidate;
                                    }
                                    const nextRecord = parseJsonRecord(
                                      candidate.fieldConfigJson,
                                    );
                                    const nextKey = getNextJsonEntryKey(
                                      nextRecord,
                                      'config',
                                      BUILDER_FIELD_CONFIG_RESERVED_KEYS,
                                    );
                                    nextRecord[nextKey] = '';
                                    return {
                                      ...candidate,
                                      fieldConfigJson:
                                        stringifyJsonInput(nextRecord),
                                    };
                                  },
                                ),
                              }))
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Add Config Key
                          </Button>
                        </div>
                        {fieldConfigExtraEntries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Add additional field-config entries as key/value
                            pairs.
                          </p>
                        ) : null}
                        {fieldConfigExtraEntries.map((entry, entryIndex) => (
                          <div
                            key={`${field.id}-field-config-${entryIndex}-${entry.key}`}
                            className="grid gap-2 md:grid-cols-[1fr_1fr_auto] rounded border p-2"
                          >
                            <Input
                              value={entry.key}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          fieldConfigJson: upsertJsonEntry(
                                            candidate.fieldConfigJson,
                                            entry.key,
                                            event.target.value,
                                            entry.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Field config key"
                            />
                            <Input
                              value={entry.value}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          fieldConfigJson: upsertJsonEntry(
                                            candidate.fieldConfigJson,
                                            entry.key,
                                            entry.key,
                                            event.target.value,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Field config value"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                          ...candidate,
                                          fieldConfigJson: removeJsonEntry(
                                            candidate.fieldConfigJson,
                                            entry.key,
                                          ),
                                        }
                                        : candidate,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            Field Refinements
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        fieldRefinements: [
                                          ...(candidate.fieldRefinements ??
                                            []),
                                          {
                                            id: generateBuilderId(),
                                            operator: 'eq',
                                            rightKind: 'literal',
                                            rightLiteral: '',
                                            message: 'Validation failed',
                                          },
                                        ],
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Add Field Refinement
                          </Button>
                        </div>
                        {fieldRefinements.map((refinement) => (
                          <div
                            key={refinement.id}
                            className="grid gap-2 md:grid-cols-5 rounded border p-2"
                          >
                            <div className="space-y-1">
                              <Label className="text-xs">Operator</Label>
                              <Select
                                value={refinement.operator}
                                onValueChange={(value) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            fieldRefinements: (
                                              candidate.fieldRefinements ?? []
                                            ).map((entry) =>
                                              entry.id === refinement.id
                                                ? {
                                                  ...entry,
                                                  operator:
                                                    value as RuleOperator,
                                                }
                                                : entry,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="eq">equals</SelectItem>
                                  <SelectItem value="neq">
                                    not equals
                                  </SelectItem>
                                  <SelectItem value="gt">
                                    greater than
                                  </SelectItem>
                                  <SelectItem value="gte">
                                    greater/equal
                                  </SelectItem>
                                  <SelectItem value="lt">less than</SelectItem>
                                  <SelectItem value="lte">
                                    less/equal
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Right side type</Label>
                              <Select
                                value={refinement.rightKind}
                                onValueChange={(value) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            fieldRefinements: (
                                              candidate.fieldRefinements ?? []
                                            ).map((entry) =>
                                              entry.id === refinement.id
                                                ? {
                                                  ...entry,
                                                  rightKind:
                                                    value as BuilderFieldRefinement['rightKind'],
                                                  rightPath:
                                                    value === 'payloadField'
                                                      ? compatiblePayloadFieldKeys.includes(
                                                        entry.rightPath ??
                                                        '',
                                                      )
                                                        ? entry.rightPath
                                                        : (compatiblePayloadFieldKeys[0] ??
                                                          undefined)
                                                      : entry.rightPath,
                                                }
                                                : entry,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Right side" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="literal">
                                    Literal value
                                  </SelectItem>
                                  <SelectItem
                                    value="payloadField"
                                    disabled={!hasCompatiblePayloadField}
                                  >
                                    Payload field (same type)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Right side value
                              </Label>
                              {refinement.rightKind === 'literal' ? (
                                <Input
                                  value={refinement.rightLiteral ?? ''}
                                  onChange={(event) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (candidate, candidateIndex) =>
                                          candidateIndex === fieldIndex
                                            ? {
                                              ...candidate,
                                              fieldRefinements: (
                                                candidate.fieldRefinements ??
                                                []
                                              ).map((entry) =>
                                                entry.id === refinement.id
                                                  ? {
                                                    ...entry,
                                                    rightLiteral:
                                                      event.target.value,
                                                  }
                                                  : entry,
                                              ),
                                            }
                                            : candidate,
                                      ),
                                    }))
                                  }
                                  placeholder="Literal value"
                                />
                              ) : (
                                <Select
                                  value={refinement.rightPath ?? ''}
                                  onValueChange={(value) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (candidate, candidateIndex) =>
                                          candidateIndex === fieldIndex
                                            ? {
                                              ...candidate,
                                              fieldRefinements: (
                                                candidate.fieldRefinements ??
                                                []
                                              ).map((entry) =>
                                                entry.id === refinement.id
                                                  ? {
                                                    ...entry,
                                                    rightPath:
                                                      value || undefined,
                                                  }
                                                  : entry,
                                              ),
                                            }
                                            : candidate,
                                      ),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payload field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {compatiblePayloadFieldKeys.map(
                                      (candidateKey) => (
                                        <SelectItem
                                          key={`${refinement.id}-${candidateKey}`}
                                          value={candidateKey}
                                        >
                                          {candidateKey}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Error message</Label>
                              <Input
                                value={refinement.message}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            fieldRefinements: (
                                              candidate.fieldRefinements ?? []
                                            ).map((entry) =>
                                              entry.id === refinement.id
                                                ? {
                                                  ...entry,
                                                  message:
                                                    event.target.value,
                                                }
                                                : entry,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                                placeholder="Error message"
                              />
                            </div>
                            <div className="flex items-end justify-center">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                            ...candidate,
                                            fieldRefinements: (
                                              candidate.fieldRefinements ?? []
                                            ).filter(
                                              (entry) =>
                                                entry.id !== refinement.id,
                                            ),
                                          }
                                          : candidate,
                                    ),
                                  }))
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Label className="flex items-center gap-2 text-sm font-normal">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        required: checked === true,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          />
                          Required
                        </Label>
                        <Label className="flex items-center gap-2 text-sm font-normal">
                          <Checkbox
                            checked={field.useInt === true}
                            onCheckedChange={(checked) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        useInt: checked === true,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          />
                          Integer
                        </Label>
                        <Label className="flex items-center gap-2 text-sm font-normal">
                          <Checkbox
                            checked={field.usePositive === true}
                            onCheckedChange={(checked) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        usePositive: checked === true,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          />
                          Positive
                        </Label>
                        <Label className="flex items-center gap-2 text-sm font-normal">
                          <Checkbox
                            checked={field.useNonNegative === true}
                            onCheckedChange={(checked) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === fieldIndex
                                      ? {
                                        ...candidate,
                                        useNonNegative: checked === true,
                                      }
                                      : candidate,
                                ),
                              }))
                            }
                          />
                          Non-negative
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={schemaBuilder.fields.length <= 1}
                          onClick={() =>
                            setSchemaBuilder((current) => ({
                              ...current,
                              fields: current.fields.filter(
                                (_, candidateIndex) =>
                                  candidateIndex !== fieldIndex,
                              ),
                            }))
                          }
                        >
                          <Trash2 className="mr-2 size-4 text-destructive" />
                          Remove Field
                        </Button>
                      </div>
                      {invalidField ? (
                        <p className="text-xs text-destructive">
                          Complete required options for safe schema generation.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Derived Fields</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const targetFieldKey =
                        derivedTargetFieldOptions[0]?.value ?? '';
                      if (!targetFieldKey) {
                        toast.error(
                          'Add a field key before creating a derived field.',
                        );
                        return;
                      }
                      const initialPath =
                        derivationPathOptions[0]?.value || targetFieldKey;

                      setSchemaBuilder((current) => ({
                        ...current,
                        derivedFields: [
                          ...current.derivedFields,
                          {
                            id: generateBuilderId(),
                            targetFieldKey,
                            target: 'value',
                            key: '',
                            operation: 'coalesce',
                            sources: [
                              {
                                id: generateBuilderId(),
                                source: 'payload',
                                path: initialPath,
                              },
                            ],
                          },
                        ],
                      }));
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Derived Field
                  </Button>
                </div>
                {schemaBuilder.derivedFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add derived fields once and map them to any target field.
                  </p>
                ) : null}
                {schemaBuilder.derivedFields.map((derivedField) => {
                  const hasCustomTargetField =
                    Boolean(derivedField.targetFieldKey.trim()) &&
                    !derivedTargetFieldOptions.some(
                      (option) => option.value === derivedField.targetFieldKey,
                    );
                  const targetFieldOptions = hasCustomTargetField
                    ? [
                      {
                        value: derivedField.targetFieldKey,
                        label: `Custom: ${derivedField.targetFieldKey}`,
                      },
                      ...derivedTargetFieldOptions,
                    ]
                    : derivedTargetFieldOptions;

                  return (
                    <div
                      key={derivedField.id}
                      className="space-y-2 rounded-md border bg-card p-2"
                    >
                      <div className="grid gap-2 md:grid-cols-5">
                        <div className="space-y-1">
                          <Label className="text-xs">Target field</Label>
                          <Select
                            value={derivedField.targetFieldKey}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? { ...entry, targetFieldKey: value }
                                      : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Target field" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetFieldOptions.length === 0 ? (
                                <SelectItem value="__no_fields__" disabled>
                                  No field keys available
                                </SelectItem>
                              ) : (
                                targetFieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Target branch</Label>
                          <Select
                            value={derivedField.target}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? {
                                        ...entry,
                                        target:
                                          value as SchemaBuilderDerivedField['target'],
                                      }
                                      : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Target branch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="value">value</SelectItem>
                              <SelectItem value="inputProps">
                                inputProps
                              </SelectItem>
                              <SelectItem value="customData">
                                customData
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Target key</Label>
                          <Input
                            value={derivedField.key}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? { ...entry, key: event.target.value }
                                      : entry,
                                ),
                              }))
                            }
                            placeholder="Required for inputProps/customData"
                            disabled={derivedField.target === 'value'}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Operation</Label>
                          <Select
                            value={derivedField.operation}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? {
                                        ...entry,
                                        operation:
                                          value as DerivedFieldOperation,
                                      }
                                      : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operation" />
                            </SelectTrigger>
                            <SelectContent>
                              {DERIVED_FIELD_OPERATION_OPTIONS.map(
                                (operation) => (
                                  <SelectItem key={operation} value={operation}>
                                    {operation}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fallback</Label>
                          <Input
                            value={derivedField.fallbackValue ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? {
                                        ...entry,
                                        fallbackValue:
                                          event.target.value.trim() === ''
                                            ? undefined
                                            : event.target.value,
                                      }
                                      : entry,
                                ),
                              }))
                            }
                            placeholder="Used by coalesce"
                            disabled={derivedField.operation !== 'coalesce'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 rounded border p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            Source references
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                derivedFields: current.derivedFields.map(
                                  (entry) =>
                                    entry.id === derivedField.id
                                      ? {
                                        ...entry,
                                        sources: [
                                          ...entry.sources,
                                          {
                                            id: generateBuilderId(),
                                            source: 'payload',
                                            path:
                                              derivationPathOptions[0]
                                                ?.value ||
                                              entry.targetFieldKey,
                                          },
                                        ],
                                      }
                                      : entry,
                                ),
                              }))
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Add Source
                          </Button>
                        </div>

                        {derivedField.sources.map((sourceField) => {
                          const currentSchemaFields: SchemaFieldDoc[] =
                            schemaBuilder.fields.map((field) => ({
                              key: field.key,
                              type: field.type,
                              fields: field.objectFields?.map((objField) => ({
                                key: objField.key,
                                type: objField.type,
                                fields: [],
                              })),
                              itemType: field.arrayItemType
                                ? { type: field.arrayItemType }
                                : undefined,
                            }));
                          const sourceSpecificOptions =
                            buildDerivationPathOptions(
                              parsed?.schemaDocs ?? [DEFAULT_SCHEMA_DOC],
                              sourceField.source,
                              currentSchemaFields,
                            );
                          const hasCustomPath =
                            Boolean(sourceField.path.trim()) &&
                            !sourceSpecificOptions.some(
                              (option) => option.value === sourceField.path,
                            );
                          const pathOptions = hasCustomPath
                            ? [
                              {
                                value: sourceField.path,
                                label: `Custom: ${sourceField.path}`,
                              },
                              ...sourceSpecificOptions,
                            ]
                            : sourceSpecificOptions;

                          return (
                            <div
                              key={sourceField.id}
                              className="grid gap-2 md:grid-cols-3 rounded border p-2"
                            >
                              <div className="space-y-1">
                                <Label className="text-xs">Source</Label>
                                <Select
                                  value={sourceField.source}
                                  onValueChange={(value) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      derivedFields: current.derivedFields.map(
                                        (entry) =>
                                          entry.id === derivedField.id
                                            ? {
                                              ...entry,
                                              sources: entry.sources.map(
                                                (candidate) =>
                                                  candidate.id ===
                                                    sourceField.id
                                                    ? {
                                                      ...candidate,
                                                      source:
                                                        value as (typeof DERIVED_FIELD_SOURCE_OPTIONS)[number],
                                                    }
                                                    : candidate,
                                              ),
                                            }
                                            : entry,
                                      ),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Source" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DERIVED_FIELD_SOURCE_OPTIONS.map(
                                      (sourceOption) => (
                                        <SelectItem
                                          key={sourceOption}
                                          value={sourceOption}
                                        >
                                          {sourceOption}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Source path</Label>
                                <Select
                                  value={sourceField.path}
                                  onValueChange={(value) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      derivedFields: current.derivedFields.map(
                                        (entry) =>
                                          entry.id === derivedField.id
                                            ? {
                                              ...entry,
                                              sources: entry.sources.map(
                                                (candidate) =>
                                                  candidate.id ===
                                                    sourceField.id
                                                    ? {
                                                      ...candidate,
                                                      path: value,
                                                    }
                                                    : candidate,
                                              ),
                                            }
                                            : entry,
                                      ),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Source path" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {pathOptions.length === 0 ? (
                                      <SelectItem value="__no_paths__" disabled>
                                        No paths available for this source
                                      </SelectItem>
                                    ) : (
                                      pathOptions.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end justify-center">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      derivedFields: current.derivedFields.map(
                                        (entry) =>
                                          entry.id === derivedField.id
                                            ? {
                                              ...entry,
                                              sources: entry.sources.filter(
                                                (candidate) =>
                                                  candidate.id !==
                                                  sourceField.id,
                                              ),
                                            }
                                            : entry,
                                      ),
                                    }))
                                  }
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSchemaBuilder((current) => ({
                              ...current,
                              derivedFields: current.derivedFields.filter(
                                (entry) => entry.id !== derivedField.id,
                              ),
                            }))
                          }
                        >
                          <Trash2 className="mr-2 size-4 text-destructive" />
                          Remove Derived Field
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Cross-Field Refinements
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextLeftField = leftRuleFields[0] ?? '';
                      if (!nextLeftField) {
                        toast.error(
                          'Add compatible fields before adding a refinement.',
                        );
                        return;
                      }
                      const nextLeftType =
                        fieldTypeByRuleField.get(nextLeftField);
                      const nextCompatibleFields = nextLeftType
                        ? (
                          availableRuleFieldsByType.get(nextLeftType) ?? []
                        ).filter((fieldKey) => fieldKey !== nextLeftField)
                        : [];
                      setSchemaRefinements((current) => [
                        ...current,
                        {
                          id: generateBuilderId(),
                          leftField: nextLeftField,
                          operator:
                            getAllowedOperators(nextLeftType)[0] ?? 'eq',
                          rightField: nextCompatibleFields[0] ?? '',
                          message: 'Validation failed',
                        },
                      ]);
                    }}
                    disabled={leftRuleFields.length === 0}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Refinement
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the Blockly composer for nested logic; these rules cover
                  common type-safe comparisons.
                </p>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="schema-field-logic-composer-field">
                      Field for logic composer
                    </Label>
                    <Select
                      value={blocklyDraft.fieldId ?? ''}
                      onValueChange={(value) =>
                        setBlocklyDraft((current) => ({
                          ...current,
                          fieldId: value || null,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="schema-field-logic-composer-field"
                        className="w-[280px]"
                      >
                        <SelectValue placeholder="Field for logic composer" />
                      </SelectTrigger>
                      <SelectContent>
                        {schemaBuilder.fields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.key || field.label || field.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsBlocklyComposerOpen(true)}
                    disabled={!selectedBlocklyField}
                  >
                    Compose Logic
                  </Button>
                </div>
                {schemaRefinements.map((rule) => (
                  <div
                    key={rule.id}
                    className="grid gap-2 md:grid-cols-4 rounded-md border bg-card p-2"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Left field</Label>
                      <Input value={rule.leftField} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Input value={rule.operator} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Right field</Label>
                      <Input value={rule.rightField} disabled />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 grow">
                        <Label className="text-xs">Error message</Label>
                        <Input
                          value={rule.message}
                          onChange={(event) =>
                            setSchemaRefinements((current) =>
                              current.map((candidate) =>
                                candidate.id === rule.id
                                  ? {
                                    ...candidate,
                                    message: event.target.value,
                                  }
                                  : candidate,
                              ),
                            )
                          }
                          placeholder="Error message"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setSchemaRefinements((current) =>
                            current.filter(
                              (candidate) => candidate.id !== rule.id,
                            ),
                          )
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isWorkflowEditorOpen}
          onOpenChange={(open) => {
            setIsWorkflowEditorOpen(open);
            if (!open) setWorkflowEditorLockedTable(null);
          }}
        >
          <DialogContent className="!w-screen !h-screen !max-w-none !max-h-none gap-0 flex flex-col overflow-hidden !translate-x-0 !translate-y-0 !top-0 !left-0 !rounded-none !m-0">
            <DialogHeader>
              <DialogTitle>Workflow Editor</DialogTitle>
              <DialogDescription>
                Configure trigger, linked schema, and action sequence visually.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {!workspaceWorkflow ? null : (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/25 p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Workflow Library</div>
                        <p className="text-xs text-muted-foreground">
                          Pick a workflow, then create, duplicate, or remove it.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          openSchemaEditor(workspaceWorkflow.table, {
                            closeWorkflowEditor: true,
                          })
                        }
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit Connected Schema
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                      <div className="space-y-1">
                        <Label htmlFor="workflow-editor-selector">Workflow</Label>
                        <Select
                          value={workspaceWorkflow.workflowId}
                          onValueChange={(value) => setActiveWorkflowId(value)}
                        >
                          <SelectTrigger id="workflow-editor-selector">
                            <SelectValue placeholder="Select workflow" />
                          </SelectTrigger>
                          <SelectContent>
                            {workflowEditorScopedWorkflows.map((workflow) => (
                              <SelectItem
                                key={workflow.workflowId}
                                value={workflow.workflowId}
                              >
                                {workflow.workflowId} ({workflow.table} · {workflow.hook})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button type="button" size="sm" onClick={handleAddWorkflow}>
                          <Plus className="mr-2 size-4" />
                          New Workflow
                        </Button>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleDuplicateActiveWorkflow}
                        >
                          Duplicate Selected
                        </Button>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveWorkflow(workspaceWorkflow.workflowId)}
                        >
                          Remove Selected
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      New starts blank for this schema. Duplicate copies nodes
                      and connections.
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="workflow-editor-workflow-id">
                        Workflow ID
                      </Label>
                      <Input
                        id="workflow-editor-workflow-id"
                        value={workspaceWorkflow.workflowId}
                        onChange={(event) =>
                          updateActiveWorkflow((current) => ({
                            ...current,
                            workflowId: event.target.value,
                          }))
                        }
                        placeholder="Workflow ID"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="workflow-editor-table">
                        Connected schema ID
                      </Label>
                      <Input
                        id="workflow-editor-table"
                        value={workflowEditorTable}
                        onChange={(event) => {
                          if (workflowEditorLockedTable) return;
                          updateActiveWorkflow((current) => ({
                            ...current,
                            table: event.target.value,
                          }));
                        }}
                        placeholder="Connected schema ID"
                        disabled={Boolean(workflowEditorLockedTable)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="workflow-editor-hook">Hook</Label>
                      <Select
                        value={workspaceWorkflow.hook}
                        onValueChange={(value) =>
                          updateActiveWorkflow((current) => ({
                            ...current,
                            hook: value as WorkflowDoc['hook'],
                          }))
                        }
                      >
                        <SelectTrigger id="workflow-editor-hook">
                          <SelectValue placeholder="Hook" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beforeCreate">
                            beforeCreate
                          </SelectItem>
                          <SelectItem value="afterCreate">afterCreate</SelectItem>
                          <SelectItem value="beforeUpdate">
                            beforeUpdate
                          </SelectItem>
                          <SelectItem value="afterUpdate">afterUpdate</SelectItem>
                          <SelectItem value="beforeDelete">
                            beforeDelete
                          </SelectItem>
                          <SelectItem value="afterDelete">afterDelete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-2">
                    <WorkflowGraphEditor
                      workflow={workspaceWorkflow}
                      onWorkflowChange={(nextWorkflow) => updateActiveWorkflow(() => nextWorkflow)}
                      schemaDocs={availableSchemaDocs}
                      actionManifest={parsed?.actionManifest ?? []}
                      lockedTable={Boolean(workflowEditorLockedTable)}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isBlocklyComposerOpen}
          onOpenChange={setIsBlocklyComposerOpen}
        >
          <DialogContent className="!w-screen !h-screen !max-w-none !max-h-none gap-0 flex flex-col overflow-hidden !translate-x-0 !translate-y-0 !top-0 !left-0 !rounded-none !m-0">
            <DialogHeader>
              <DialogTitle>Blockly Composer</DialogTitle>
              <DialogDescription>
                Compose advanced field logic with guided, type-safe building
                blocks.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {!selectedBlocklyField ? (
                <p className="text-sm text-muted-foreground">
                  Choose a field from the builder and click `Compose Logic`.
                </p>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Building Logic For Field
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {selectedBlocklyField.key}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-2">
                    <div
                      id={blocklyWorkspaceId}
                      ref={handleBlocklyContainerRef}
                      className="h-[360px] w-full rounded-md"
                    />
                    {!isBlocklyReady && !blocklyError && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Loading Blockly workspace...
                      </p>
                    )}
                    {blocklyError && (
                      <p className="mt-2 text-xs text-destructive">
                        {blocklyError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Preset Logic
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {blocklyPresets.map((preset) => (
                        <Button
                          key={`${preset.label}-${preset.operator}`}
                          type="button"
                          size="sm"
                          variant={
                            blocklyDraft.operator === preset.operator &&
                              blocklyDraft.message === preset.message
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            setBlocklyDraft((current) => ({
                              ...current,
                              operator: preset.operator,
                              message: preset.message,
                            }))
                          }
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Error Message
                    </div>
                    <Input
                      value={blocklyDraft.message}
                      onChange={(event) =>
                        setBlocklyDraft((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Message shown when this logic fails"
                    />
                  </div>
                  {blocklyComparableFields.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Field-to-field compare needs another `
                      {selectedBlocklyField.type}` field. Literal blocks can still
                      be used right now.
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBlocklyComposerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!selectedBlocklyField) return;
                  const runtime = blocklyRuntimeRef.current;
                  const rootBlock =
                    runtime?.workspace?.getBlockById('plugin_rule_root');
                  const conditionBlock =
                    rootBlock?.getInputTargetBlock('CONDITION') ?? null;
                  const condition = buildConditionFromBlocklyBlock(
                    conditionBlock,
                    selectedBlocklyField.key,
                  );
                  if (!condition) {
                    toast.error(
                      'Compose a valid Blockly condition before applying.',
                    );
                    return;
                  }
                  setBlocklyRefinements((current) => [
                    ...current,
                    {
                      id: generateBuilderId(),
                      leftField: selectedBlocklyField.key,
                      condition,
                      message: blocklyDraft.message || 'Validation rule failed',
                    },
                  ]);
                  fireConfetti();
                  setIsBlocklyComposerOpen(false);
                }}
                disabled={!selectedBlocklyField}
              >
                Apply Logic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function PluginStudioSkeleton() {
  const templateSkeletonIds = ['template-a', 'template-b', 'template-c'];
  const marketSkeletonIds = ['market-a', 'market-b', 'market-c', 'market-d'];
  const editorSkeletonIds = ['editor-a', 'editor-b', 'editor-c'];

  return (
    <div className="w-full py-6">
      <div className="mx-auto w-full max-w-7xl px-4 space-y-6">
      <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/15 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl w-full">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="rounded-xl border bg-background/70 p-3 text-sm w-[180px] space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </section>

      <Card className="py-4 gap-4">
        <CardHeader className="px-4 md:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="grid gap-3 px-4 md:px-6 md:grid-cols-2 xl:grid-cols-3">
          {templateSkeletonIds.map((skeletonId) => (
            <div key={skeletonId} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-10 w-full md:col-span-2" />
            <Skeleton className="h-10 w-full md:col-span-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {marketSkeletonIds.map((skeletonId) => (
                <Skeleton key={skeletonId} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        {editorSkeletonIds.map((skeletonId) => (
          <Card key={skeletonId}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-[320px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-52" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-md" />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
