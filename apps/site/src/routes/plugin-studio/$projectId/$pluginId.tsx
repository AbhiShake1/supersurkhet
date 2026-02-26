import { flattenSchemaWorkflows } from '@supersurkhet/sdk';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import deepEqual from 'fast-deep-equal';
import * as LucideIcons from 'lucide-react';
import {
  ArrowLeft,
  BadgePlus,
  CloudUpload,
  GripVertical,
  type LucideIcon,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin } from '@/components/auto-admin';
import { PluginStudioEditableAutoAdmin } from '@/components/auto-admin/auto-admin-plugin-studio-editable';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import UIBuilder from '@/components/ui/ui-builder';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { buildDerivationPathOptions } from '@/features/plugin-builder/workspace/tabs/derivation-path-options';
import {
  compileDerivedFieldToDeriveIr,
  DERIVED_FIELD_OPERATION_OPTIONS,
  DERIVED_FIELD_SOURCE_OPTIONS,
  type DerivedFieldOperation,
  parseDerivedFieldsFromSchemaDoc,
  type SchemaBuilderDerivedField,
} from '@/features/plugin-builder/workspace/tabs/derived-fields';
import { PluginStudioV3Tabs } from '@/features/plugin-builder/workspace/tabs/plugin-studio-v3-tabs';
import { WorkflowGraphEditor } from '@/features/plugin-builder/workspace/tabs/workflow-graph-editor';
import { api } from '@/lib/api';
import { toDraftRevisionRowId } from '@/lib/plugins/draft-revision-row-id';
import {
  mergeMarketplaceReleasesWithSeed,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import { isPluginSystemSentinelSchema } from '@/lib/plugins/subdomain-surface';
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
  SchemaWorkflowDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import { evaluateV3PublishGates } from '@/lib/plugins/v3-gates';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { publishPluginRelease } from '@/server-functions/plugins';
import { throwOnFailedPersistenceWrites } from '../-plugin-studio-persistence';
import { resolvePluginStudioPluginId } from '../-plugin-studio-plugin-id';
import { toProjectScopedDraftId } from '../-plugin-studio-project-draft-id';
import { parseStoredSchemaDoc } from '../-plugin-studio-schema-doc';

const optionalSearchStringSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}, z.string().optional());

const pluginStudioSearchSchema = z.object({
  pluginId: optionalSearchStringSchema,
  draftId: optionalSearchStringSchema,
  sortBy: optionalSearchStringSchema,
  subdomain: optionalSearchStringSchema,
  sortOrder: z.preprocess(
    (value) =>
      typeof value === 'string' ? value.trim().toLowerCase() : undefined,
    z.enum(['asc', 'desc']).optional(),
  ),
});

export const Route = createFileRoute('/plugin-studio/$projectId/$pluginId')({
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

type SystemTabKey = 'dashboard' | 'qr';

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
};
const DEFAULT_SYSTEM_TAB_ORDER: SystemTabKey[] = ['dashboard', 'qr'];
const COLUMN_SHEET_SHORTCUTS = {
  cancel: {
    id: 'pluginStudio.columnSheetCancel',
    label: 'Cancel column sheet',
    description: 'Close the add/edit column sheet without saving.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  save: {
    id: 'pluginStudio.columnSheetSave',
    label: 'Save column',
    description: 'Save the current add/edit column changes.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
} as const;
const SUBDOMAIN_STUDIO_SHORTCUTS = {
  prevCard: {
    id: 'pluginStudio.subdomainPrevCard',
    label: 'Previous subdomain card',
    description: 'Focus the previous subdomain card.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'ArrowLeft',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  nextCard: {
    id: 'pluginStudio.subdomainNextCard',
    label: 'Next subdomain card',
    description: 'Focus the next subdomain card.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'ArrowRight',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  openBuilder: {
    id: 'pluginStudio.subdomainOpenBuilder',
    label: 'Open subdomain builder',
    description: 'Open builder for the focused subdomain card.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  moveLeft: {
    id: 'pluginStudio.subdomainMoveLeft',
    label: 'Move subdomain left',
    description: 'Reorder focused subdomain card to the left.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'ArrowLeft',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  moveRight: {
    id: 'pluginStudio.subdomainMoveRight',
    label: 'Move subdomain right',
    description: 'Reorder focused subdomain card to the right.',
    scope: 'Plugin Studio',
    defaultBinding: {
      key: 'ArrowRight',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const;

const DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX = '__plugin_studio_group__/';
const DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX = '__plugin_studio_system__/';
const DRAFT_SUBDOMAIN_SENTINEL_SCHEMA_PREFIX = '__plugin_studio_subdomain__/';
const DRAFT_SUBDOMAIN_UI_SENTINEL_SCHEMA_PREFIX =
  '__plugin_studio_subdomain_ui__/';
const DRAFT_SUBDOMAIN_GUARD_SENTINEL_SCHEMA_PREFIX =
  '__plugin_studio_subdomain_guard__/';
const DRAFT_DNS_SENTINEL_SCHEMA_ID = '__plugin_studio_dns__/cloudflare';
type SubdomainAccessRule = 'authenticated-user' | 'organization-member';
type SubdomainUiProjectKind = 'index' | 'admin' | 'custom';
type SubdomainPipelineState = Array<{
  subdomain: string;
  basePath: string;
  uiProject: SubdomainUiProjectKind;
  autoAdminInjected: boolean;
  accessRule: SubdomainAccessRule | null;
}>;
type SubdomainUiLayersState = Record<string, string>;
const DEFAULT_SUBDOMAIN_PIPELINE: SubdomainPipelineState = [
  {
    subdomain: 'index',
    basePath: '/',
    uiProject: 'index',
    autoAdminInjected: false,
    accessRule: null,
  },
  {
    subdomain: 'admin',
    basePath: '/',
    uiProject: 'admin',
    autoAdminInjected: true,
    accessRule: null,
  },
];
const DEFAULT_DRAFT_ADMIN_TABS = serializeDraftAdminTabs({
  schemaTabs: [
    {
      schema: DEFAULT_SCHEMA_DOC.schemaId,
      title: DEFAULT_SCHEMA_DOC.title,
    },
  ],
  orderedGroups: [],
  systemTabs: DEFAULT_SYSTEM_TABS,
  subdomains: DEFAULT_SUBDOMAIN_PIPELINE,
  cloudflareDnsAutoConfigured: true,
});

function canonicalStringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

function stringifySchemaDocForStorage(schemaDoc: SchemaDoc) {
  return canonicalStringify(schemaDoc);
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
      if (
        typeof firstIssue?.message === 'string' &&
        firstIssue.message.trim()
      ) {
        return firstIssue.message.trim();
      }
    }
  }
  return 'Unknown error';
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

function isMissingPersistenceError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('missing') ||
    message.includes('does not exist') ||
    message.includes('no record')
  );
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

function buildActorUserIdAliases(
  user:
    | {
        pub?: string;
        _?: { soul?: string };
      }
    | null
    | undefined,
): string[] {
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
  adminTabs,
}: {
  schemaDocs: readonly SchemaDoc[];
  adminTabs: readonly AdminTabDoc[];
}) {
  return canonicalStringify({
    schemaDocs,
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
  for (const key of ['dashboard', 'qr'] as const) {
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
  for (const key of ['dashboard', 'qr'] as const) {
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

function isGroupSentinelSchemaId(schemaId: unknown): boolean {
  return (
    typeof schemaId === 'string' &&
    schemaId.startsWith(DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX)
  );
}

function toGroupSentinelSchemaId(index: number): string {
  return `${DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX}${index}`;
}

function isSystemSentinelSchemaId(schemaId: unknown): boolean {
  return (
    typeof schemaId === 'string' &&
    schemaId.startsWith(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX)
  );
}

function toSystemSentinelSchemaId(key: SystemTabKey): string {
  return `${DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX}${key}`;
}

function isSubdomainSentinelSchemaId(schemaId: unknown): boolean {
  return (
    typeof schemaId === 'string' &&
    schemaId.startsWith(DRAFT_SUBDOMAIN_SENTINEL_SCHEMA_PREFIX)
  );
}

function parseSubdomainSentinelSchemaId(schemaId: unknown): string | null {
  if (!isSubdomainSentinelSchemaId(schemaId)) return null;
  const value = schemaId
    .slice(DRAFT_SUBDOMAIN_SENTINEL_SCHEMA_PREFIX.length)
    .trim();
  return value.length > 0 ? value : null;
}

function toSubdomainSentinelSchemaId(subdomain: string): string {
  return `${DRAFT_SUBDOMAIN_SENTINEL_SCHEMA_PREFIX}${subdomain}`;
}

function parseSystemSentinelSchemaId(schemaId: unknown): SystemTabKey | null {
  if (!isSystemSentinelSchemaId(schemaId)) return null;
  const key = schemaId.slice(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX.length);
  if (key === 'dashboard' || key === 'qr') {
    return key;
  }
  return null;
}

function toSchemaTabOrderToken(schemaId: string) {
  return `schema:${schemaId}`;
}

function toSystemTabOrderToken(key: SystemTabKey) {
  return `system:${key}`;
}

function parseSystemTabOrderToken(token: string): SystemTabKey | null {
  const normalized = token.trim();
  if (!normalized.startsWith('system:')) return null;
  const key = normalized.slice('system:'.length);
  if (key === 'dashboard' || key === 'qr') return key;
  return null;
}

function parseSchemaTabOrderToken(token: string): string | null {
  const normalized = token.trim();
  if (normalized.startsWith('schema:')) {
    const value = normalized.slice('schema:'.length).trim();
    return value || null;
  }
  if (normalized.startsWith('system:')) return null;
  return normalized || null;
}

function normalizeSubdomainName(value: string | undefined): string {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'index';
}

function normalizeSubdomainBasePath(value: string | undefined): string {
  const normalized = (value ?? '').trim();
  if (!normalized) return '/';
  const withLeadingSlash = normalized.startsWith('/')
    ? normalized
    : `/${normalized}`;
  const compact = withLeadingSlash.replace(/\/{2,}/g, '/');
  return compact || '/';
}

function parseSubdomainUiSentinelSchemaId(schemaId: string): string | null {
  if (!schemaId.startsWith(DRAFT_SUBDOMAIN_UI_SENTINEL_SCHEMA_PREFIX)) {
    return null;
  }
  const value = schemaId
    .slice(DRAFT_SUBDOMAIN_UI_SENTINEL_SCHEMA_PREFIX.length)
    .trim();
  if (!value) return null;
  return normalizeSubdomainName(value);
}

function parseSubdomainGuardSentinelSchemaId(schemaId: string): string | null {
  if (!schemaId.startsWith(DRAFT_SUBDOMAIN_GUARD_SENTINEL_SCHEMA_PREFIX)) {
    return null;
  }
  const value = schemaId
    .slice(DRAFT_SUBDOMAIN_GUARD_SENTINEL_SCHEMA_PREFIX.length)
    .trim();
  if (!value) return null;
  return normalizeSubdomainName(value);
}

function toSubdomainGuardSentinelSchemaId(subdomain: string): string {
  return `${DRAFT_SUBDOMAIN_GUARD_SENTINEL_SCHEMA_PREFIX}${subdomain}`;
}

function normalizeSubdomainAccessRule(
  value: string | undefined,
): SubdomainAccessRule | null {
  if (value === 'authenticated-user' || value === 'organization-member') {
    return value;
  }
  return null;
}

function toSubdomainUiSentinelSchemaId(subdomain: string): string {
  return `${DRAFT_SUBDOMAIN_UI_SENTINEL_SCHEMA_PREFIX}${subdomain}`;
}

function toBlankSubdomainUiLayers(subdomain: string): ComponentLayer[] {
  return [
    {
      id: `${subdomain}-page-root`,
      name: `${subdomain} page`,
      type: 'div',
      props: {
        className:
          'min-h-screen w-full bg-background px-8 py-10 text-foreground',
      },
      children: [],
    },
  ];
}

function toAdminInjectedSubdomainUiLayers(subdomain: string): ComponentLayer[] {
  return [
    {
      id: `${subdomain}-page-root`,
      name: `${subdomain} page`,
      type: 'div',
      props: {
        className: 'min-h-svh w-full bg-background text-foreground',
      },
      children: [
        {
          id: `${subdomain}-admin-root`,
          name: 'Auto Admin',
          type: 'AutoAdmin',
          props: {},
          children: [],
        },
      ],
    },
  ];
}

function normalizeAdminCanvasLayers(
  subdomain: string,
  layers: ComponentLayer[],
): ComponentLayer[] {
  if (layers.length !== 1) return layers;
  const [single] = layers;
  if (!single) return layers;
  if (single.type !== 'AutoAdmin' && single.type !== 'AutoAdminRoot') {
    return layers;
  }
  return toAdminInjectedSubdomainUiLayers(subdomain);
}

function parseStoredSubdomainUiLayers(
  value: string | undefined,
): ComponentLayer[] | null {
  if (!value || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ComponentLayer[];
  } catch {
    return null;
  }
}

function computeOrderedTabTokens({
  tabOrder,
  schemaOrder,
}: {
  tabOrder: readonly string[];
  schemaOrder: readonly string[];
}): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  const validSchemaTokens = new Set(
    schemaOrder.map((schemaId) => toSchemaTabOrderToken(schemaId)),
  );
  const validSystemTokens = new Set(
    DEFAULT_SYSTEM_TAB_ORDER.map((key) => toSystemTabOrderToken(key)),
  );

  for (const token of tabOrder) {
    const systemKey = parseSystemTabOrderToken(token);
    if (systemKey) {
      const normalizedToken = toSystemTabOrderToken(systemKey);
      if (
        !seen.has(normalizedToken) &&
        validSystemTokens.has(normalizedToken)
      ) {
        normalized.push(normalizedToken);
        seen.add(normalizedToken);
      }
      continue;
    }
    const schemaId = parseSchemaTabOrderToken(token);
    if (!schemaId) continue;
    const normalizedToken = toSchemaTabOrderToken(schemaId);
    if (!seen.has(normalizedToken) && validSchemaTokens.has(normalizedToken)) {
      normalized.push(normalizedToken);
      seen.add(normalizedToken);
    }
  }

  for (const schemaId of schemaOrder) {
    const token = toSchemaTabOrderToken(schemaId);
    if (!seen.has(token)) {
      normalized.push(token);
      seen.add(token);
    }
  }
  for (const key of DEFAULT_SYSTEM_TAB_ORDER) {
    const token = toSystemTabOrderToken(key);
    if (!seen.has(token)) {
      normalized.push(token);
      seen.add(token);
    }
  }
  return normalized;
}

function serializeDraftAdminTabs({
  schemaTabs,
  orderedGroups,
  systemTabs,
  subdomains = DEFAULT_SUBDOMAIN_PIPELINE,
  subdomainUiLayers = {},
  cloudflareDnsAutoConfigured = true,
  tabOrder = [],
}: {
  schemaTabs: readonly AdminTabDoc[];
  orderedGroups: readonly string[];
  systemTabs: SystemTabState;
  subdomains?: SubdomainPipelineState;
  subdomainUiLayers?: SubdomainUiLayersState;
  cloudflareDnsAutoConfigured?: boolean;
  tabOrder?: readonly string[];
}): AdminTabDoc[] {
  const groupSentinels: AdminTabDoc[] = orderedGroups.map(
    (groupName, index) => ({
      schema: toGroupSentinelSchemaId(index),
      group: groupName,
    }),
  );
  const schemaById = new Map(schemaTabs.map((tab) => [tab.schema, tab]));
  const systemSentinelByKey = new Map<SystemTabKey, AdminTabDoc>(
    (
      Object.entries(systemTabs) as Array<
        [SystemTabKey, SystemTabState[SystemTabKey]]
      >
    ).map(([key, value]) => [
      key,
      {
        schema: toSystemSentinelSchemaId(key),
        title: value.title,
        group: value.group,
        icon: value.iconName,
      },
    ]),
  );
  const subdomainSentinels: AdminTabDoc[] = subdomains.map((entry) => ({
    schema: toSubdomainSentinelSchemaId(
      normalizeSubdomainName(entry.subdomain),
    ),
    title: normalizeSubdomainBasePath(entry.basePath),
    group: entry.uiProject,
    icon: entry.autoAdminInjected ? 'autoadmin' : 'none',
  }));
  const subdomainGuardSentinels: AdminTabDoc[] = subdomains.flatMap((entry) => {
    const normalizedSubdomain = normalizeSubdomainName(entry.subdomain);
    const accessRule = entry.accessRule ?? null;
    if (!accessRule) return [];
    return [
      {
        schema: toSubdomainGuardSentinelSchemaId(normalizedSubdomain),
        title: accessRule,
      } satisfies AdminTabDoc,
    ];
  });
  const subdomainUiSentinels: AdminTabDoc[] = subdomains
    .map((entry) => normalizeSubdomainName(entry.subdomain))
    .flatMap((subdomain) => {
      const layers = subdomainUiLayers[subdomain];
      if (!layers) return [];
      return [
        {
          schema: toSubdomainUiSentinelSchemaId(subdomain),
          title: layers,
        } satisfies AdminTabDoc,
      ];
    });
  const dnsSentinel: AdminTabDoc = {
    schema: DRAFT_DNS_SENTINEL_SCHEMA_ID,
    title: cloudflareDnsAutoConfigured ? 'auto' : 'manual',
  };
  const orderedTabs: AdminTabDoc[] = [];
  const usedSchemaIds = new Set<string>();
  const usedSystemKeys = new Set<SystemTabKey>();

  for (const token of tabOrder) {
    const systemKey = parseSystemTabOrderToken(token);
    if (systemKey) {
      const sentinel = systemSentinelByKey.get(systemKey);
      if (sentinel && !usedSystemKeys.has(systemKey)) {
        orderedTabs.push(sentinel);
        usedSystemKeys.add(systemKey);
      }
      continue;
    }
    const schemaId = parseSchemaTabOrderToken(token);
    if (!schemaId) continue;
    const schemaTab = schemaById.get(schemaId);
    if (schemaTab && !usedSchemaIds.has(schemaId)) {
      orderedTabs.push(schemaTab);
      usedSchemaIds.add(schemaId);
    }
  }

  for (const schemaTab of schemaTabs) {
    if (usedSchemaIds.has(schemaTab.schema)) continue;
    orderedTabs.push(schemaTab);
    usedSchemaIds.add(schemaTab.schema);
  }
  for (const key of DEFAULT_SYSTEM_TAB_ORDER) {
    if (usedSystemKeys.has(key)) continue;
    const sentinel = systemSentinelByKey.get(key);
    if (!sentinel) continue;
    orderedTabs.push(sentinel);
    usedSystemKeys.add(key);
  }

  return [
    ...groupSentinels,
    ...subdomainSentinels,
    ...subdomainGuardSentinels,
    ...subdomainUiSentinels,
    dnsSentinel,
    ...orderedTabs,
  ];
}

function deserializeDraftAdminTabs(
  adminTabs: readonly AdminTabDoc[] | undefined,
): {
  schemaTabs: AdminTabDoc[];
  orderedGroups: string[];
  systemTabs: SystemTabState;
  subdomains: SubdomainPipelineState;
  subdomainUiLayers: SubdomainUiLayersState;
  cloudflareDnsAutoConfigured: boolean;
  tabOrder: string[];
} {
  const tabs = adminTabs ?? [];
  const schemaTabs: AdminTabDoc[] = [];
  const orderedGroups: string[] = [];
  const systemTabs: SystemTabState = { ...DEFAULT_SYSTEM_TABS };
  const subdomains: SubdomainPipelineState = [];
  const subdomainUiLayers: SubdomainUiLayersState = {};
  const subdomainAccessRuleBySubdomain: Record<string, SubdomainAccessRule> =
    {};
  let cloudflareDnsAutoConfigured = true;
  const tabOrder: string[] = [];

  for (const tab of tabs) {
    if (
      !tab ||
      typeof tab !== 'object' ||
      typeof tab.schema !== 'string' ||
      tab.schema.trim().length === 0
    ) {
      continue;
    }

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
      const token = toSystemTabOrderToken(systemKey);
      if (!tabOrder.includes(token)) tabOrder.push(token);
      continue;
    }

    const subdomain = parseSubdomainSentinelSchemaId(tab.schema);
    if (subdomain) {
      const normalizedProject = tab.group?.trim();
      subdomains.push({
        subdomain: normalizeSubdomainName(subdomain),
        basePath: normalizeSubdomainBasePath(tab.title),
        uiProject:
          normalizedProject === 'index' ||
          normalizedProject === 'admin' ||
          normalizedProject === 'custom'
            ? normalizedProject
            : 'custom',
        autoAdminInjected: tab.icon?.trim() === 'autoadmin',
      });
      continue;
    }

    const subdomainUi = parseSubdomainUiSentinelSchemaId(tab.schema);
    if (subdomainUi) {
      const encodedLayers = tab.title?.trim();
      if (encodedLayers) {
        subdomainUiLayers[subdomainUi] = encodedLayers;
      }
      continue;
    }

    const subdomainGuard = parseSubdomainGuardSentinelSchemaId(tab.schema);
    if (subdomainGuard) {
      const accessRule = normalizeSubdomainAccessRule(tab.title?.trim());
      if (accessRule) {
        subdomainAccessRuleBySubdomain[subdomainGuard] = accessRule;
      }
      continue;
    }

    if (tab.schema === DRAFT_DNS_SENTINEL_SCHEMA_ID) {
      cloudflareDnsAutoConfigured = (tab.title?.trim() || 'auto') !== 'manual';
      continue;
    }

    schemaTabs.push(tab);
    const schemaToken = toSchemaTabOrderToken(tab.schema);
    if (!tabOrder.includes(schemaToken)) tabOrder.push(schemaToken);
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
    subdomains: (subdomains.length > 0
      ? subdomains
      : [...DEFAULT_SUBDOMAIN_PIPELINE]
    ).map((entry) => {
      const normalizedSubdomain = normalizeSubdomainName(entry.subdomain);
      return {
        ...entry,
        accessRule: subdomainAccessRuleBySubdomain[normalizedSubdomain] ?? null,
      };
    }),
    subdomainUiLayers,
    cloudflareDnsAutoConfigured,
    tabOrder: computeOrderedTabTokens({
      tabOrder,
      schemaOrder: schemaTabs.map((tab) => tab.schema),
    }),
  };
}

function toRouteSegmentFromSchemaId(schemaId: string) {
  return (
    schemaId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tab'
  );
}

function toDraftRoutesFromAdminTabs(adminTabs: readonly AdminTabDoc[]): Array<{
  id: string;
  schema: string;
  title: string;
  group: string | null;
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
      group: tab.group?.trim() || null,
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
        group?: string | null;
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
  const tabs = (template.adminTabs ?? []).filter(
    (tab) =>
      typeof tab.schema === 'string' &&
      tab.schema.trim().length > 0 &&
      !isPluginSystemSentinelSchema(tab.schema),
  );
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
    workflows: [],
  }));
}

function toDefaultPluginTitle(_pluginId: string) {
  return 'no name provided';
}

function toDisplayPluginTitle(input: string | undefined, pluginId: string) {
  const normalizedInput = input?.trim() ?? '';
  const normalizedPluginId = pluginId.trim();
  const normalizedPluginSlug = pluginId.replace(/^plugin\./, '').trim();
  if (!normalizedInput) return 'no name provided';
  if (
    normalizedInput === normalizedPluginId ||
    normalizedInput === normalizedPluginSlug
  ) {
    return 'no name provided';
  }
  return normalizedInput;
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
) as Exclude<(typeof BUILDER_FIELD_TYPES)[number], 'array' | 'object'>[];
const BUILDER_FIELD_TYPE_OPTIONS = BUILDER_FIELD_TYPES.map((fieldType) => ({
  value: fieldType,
  label: fieldType,
}));
const BUILDER_LEAF_FIELD_TYPE_OPTIONS = BUILDER_LEAF_FIELD_TYPES.map(
  (fieldType) => ({
    value: fieldType,
    label: fieldType,
  }),
);

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

function normalizeStringArray(value: readonly string[] | undefined) {
  return (value ?? []).map((entry) => entry.trim()).filter(Boolean);
}

function isChoiceFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? CHOICE_FIELD_TYPES.has(fieldType) : false;
}

function isNumericFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? NUMERIC_FIELD_TYPES.has(fieldType) : false;
}

function resolveFieldTypeSelection(
  selectedType: BuilderFieldType,
  currentFieldType: BuilderLeafFieldType,
) {
  if (selectedType === 'array' || selectedType === 'object') {
    return {
      type: selectedType,
      fieldType: currentFieldType,
    };
  }

  if (selectedType === 'enum') {
    return {
      type: selectedType,
      fieldType: 'select' as BuilderLeafFieldType,
    };
  }

  return {
    type: selectedType,
    fieldType: normalizeBuilderLeafFieldType(selectedType),
  };
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

function readJsonStringArrayEntry(
  value: string | undefined,
  key: string,
): string[] {
  const record = parseJsonRecord(value);
  const entry = record[key];
  if (!Array.isArray(entry)) return [];
  return entry
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function setJsonStringArrayEntry(
  value: string | undefined,
  key: string,
  nextValues: readonly string[],
): string {
  const next = parseJsonRecord(value);
  const normalizedValues = normalizeStringArray([...nextValues]);
  if (normalizedValues.length === 0) {
    delete next[key];
  } else {
    next[key] = normalizedValues;
  }
  return stringifyJsonInput(next);
}

function readJsonEntryText(value: string | undefined, key: string): string {
  const record = parseJsonRecord(value);
  const entry = record[key];
  return entry === undefined ? '' : stringifyJsonEntryValue(entry);
}

function setJsonEntryValue(
  value: string | undefined,
  key: string,
  nextValue: string | undefined,
): string {
  const next = parseJsonRecord(value);
  const normalized = nextValue?.trim() ?? '';
  if (!normalized) {
    delete next[key];
  } else {
    next[key] = parseJsonEntryValue(nextValue ?? '');
  }
  return stringifyJsonInput(next);
}

type OptionPair = {
  value: string;
  label: string;
};

function readJsonOptionPairsEntry(
  value: string | undefined,
  key: string,
): OptionPair[] {
  const record = parseJsonRecord(value);
  const entry = record[key];
  if (!Array.isArray(entry)) return [];

  const pairs: OptionPair[] = [];
  for (const item of entry) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const [rawValue, rawLabel] = item;
    pairs.push({
      value: String(rawValue ?? ''),
      label: String(rawLabel ?? ''),
    });
  }
  return pairs;
}

function setJsonOptionPairsEntry(
  value: string | undefined,
  key: string,
  nextPairs: readonly OptionPair[],
): string {
  const next = parseJsonRecord(value);
  const normalizedPairs = nextPairs
    .map((pair) => ({
      value: pair.value.trim(),
      label: pair.label.trim(),
    }))
    .filter((pair) => pair.value.length > 0);

  if (normalizedPairs.length === 0) {
    delete next[key];
  } else {
    next[key] = normalizedPairs.map(
      (pair) => [pair.value, pair.label] as const,
    );
  }

  return stringifyJsonInput(next);
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

const BUILDER_CUSTOM_DATA_RESERVED_KEYS = new Set<string>([
  'displayKey',
  'source',
  'sources',
  'options',
  'disableWhenValueIn',
  'tabs',
  'onlyAllow',
  'configDisabled',
  'onValueChange',
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
  fieldType?: BuilderLeafFieldType;
  required: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  enumValues?: string[];
  fieldConfigJson?: string;
  behaviorJson?: string;
  inputPropsJson?: string;
  customDataJson?: string;
  arrayItemType?: BuilderLeafFieldType;
  arrayItemEnumValues?: string[];
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

type BuilderFieldType = (typeof BUILDER_FIELD_TYPES)[number];

type BuilderLeafFieldType = (typeof BUILDER_LEAF_FIELD_TYPES)[number];

type BuilderObjectField = {
  id: string;
  key: string;
  label: string;
  description: string;
  type: BuilderLeafFieldType;
  required: boolean;
  enumValues?: string[];
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
  inputClassName: string;
  type: BuilderFieldType;
  fieldType: BuilderLeafFieldType;
  required: boolean;
  defaultValue: string;
  enumValues: string[];
  min: string;
  max: string;
};

type ColumnSheetMode = 'add' | 'edit';

type StringListEditorProps = {
  values: readonly string[];
  onChange: (nextValues: string[]) => void;
  addLabel: string;
  emptyLabel: string;
  itemPlaceholder: string;
};

function StringListEditor({
  values,
  onChange,
  addLabel,
  emptyLabel,
  itemPlaceholder,
}: StringListEditorProps) {
  const rowIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const rowIds = rowIdsRef.current;
    if (values.length > rowIds.length) {
      for (let index = rowIds.length; index < values.length; index += 1) {
        rowIds.push(generateBuilderId());
      }
    } else if (values.length < rowIds.length) {
      rowIds.splice(values.length);
    }
  }, [values.length]);

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{emptyLabel}</div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...(values ?? []), ''])}
        >
          <Plus className="mr-2 size-4" />
          {addLabel}
        </Button>
      </div>
      {(values ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No values yet. Add at least one value.
        </p>
      ) : null}
      {values.map((value, index) => {
        const rowId =
          rowIdsRef.current[index] ??
          (() => {
            const nextId = generateBuilderId();
            rowIdsRef.current[index] = nextId;
            return nextId;
          })();

        return (
          <div key={rowId} className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input
              value={value}
              onChange={(event) => {
                const nextValues = [...values];
                nextValues[index] = event.target.value;
                onChange(nextValues);
              }}
              placeholder={itemPlaceholder}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                onChange(values.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function createAddColumnDraft(fieldCount: number): AddColumnDraft {
  const nextIndex = fieldCount + 1;
  return {
    key: `field_${nextIndex}`,
    label: `Field ${nextIndex}`,
    description: '',
    inputClassName: '',
    type: 'string',
    fieldType: 'string',
    required: false,
    defaultValue: '',
    enumValues: [],
    min: '',
    max: '',
  };
}

function toAddColumnDraftFromField(field: BuilderField): AddColumnDraft {
  return {
    key: field.key,
    label: field.label,
    description: field.description,
    inputClassName: readJsonStringEntry(field.inputPropsJson, 'className'),
    type: field.type,
    fieldType: normalizeBuilderLeafFieldType(
      typeof field.fieldType === 'string' ? field.fieldType : field.type,
    ),
    required: field.required,
    defaultValue: field.defaultValue ?? '',
    enumValues: normalizeStringArray(field.enumValues),
    min: field.min ?? '',
    max: field.max ?? '',
  };
}

function toObjectFieldDoc(field: BuilderObjectField): SchemaFieldDoc {
  return {
    key: field.key || 'field_key',
    type: field.type,
    description: field.description || undefined,
    optional: !field.required,
    enumValues: isChoiceFieldType(field.type)
      ? normalizeStringArray(field.enumValues)
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
      ? normalizeStringArray(field.enumValues)
      : undefined,
    itemType:
      field.type === 'array'
        ? {
            type: field.arrayItemType ?? 'string',
            enumValues: isChoiceFieldType(field.arrayItemType)
              ? normalizeStringArray(field.arrayItemEnumValues)
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
    normalizeStringArray(field.enumValues).length === 0
  ) {
    return true;
  }
  if (field.type === 'array' && !field.arrayItemType) return true;
  if (
    field.type === 'array' &&
    isChoiceFieldType(field.arrayItemType) &&
    normalizeStringArray(field.arrayItemEnumValues).length === 0
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
            normalizeStringArray(nestedField.enumValues).length === 0),
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
  if (fieldType === 'enum') {
    return 'select';
  }
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
    enumValues: normalizeStringArray(field.enumValues),
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
    enumValues: normalizeStringArray(field.enumValues),
    fieldConfigJson: stringifyJsonInput(extra),
    behaviorJson: stringifyJsonInput(extraBehavior),
    inputPropsJson: stringifyJsonInput(inputProps),
    customDataJson: stringifyJsonInput(customData),
    arrayItemType:
      normalizedType === 'array'
        ? normalizeBuilderLeafFieldType(field.itemType?.type)
        : undefined,
    arrayItemEnumValues:
      normalizedType === 'array'
        ? normalizeStringArray(field.itemType?.enumValues)
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

  return (
    <PluginStudioPresenter user={user} isAuthenticated={isAuthenticated} />
  );
}

function PluginStudioPresenter({
  user,
  isAuthenticated,
}: PluginStudioPresenterProps) {
  const navigate = useNavigate();
  const { fire: fireConfetti } = useConfetti();
  const params = Route.useParams();
  const search = Route.useSearch();
  const actorUserIdAliases = useMemo(
    () => buildActorUserIdAliases(user),
    [user],
  );
  const actorUserId = actorUserIdAliases[0] ?? '';
  const actorUserIdSet = useMemo(
    () => new Set(actorUserIdAliases),
    [actorUserIdAliases],
  );
  const isActorIdentityReady =
    !isAuthenticated || actorUserIdAliases.length > 0;
  const projectId = params.projectId;
  const requestedPluginId = params.pluginId;
  const draftId = useMemo(
    () =>
      toProjectScopedDraftId({
        projectId,
        pluginId: requestedPluginId || 'example.plugin',
      }),
    [projectId, requestedPluginId],
  );
  const [editingMetadataField, setEditingMetadataField] = useState<
    'title' | 'description' | null
  >(null);
  const [editingMetadataValue, setEditingMetadataValue] = useState('');
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string>();
  const [coreExtensionSchemaIds, setCoreExtensionSchemaIds] = useState<
    Record<string, true>
  >({});
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
    inputClassName: '',
    type: 'string',
    fieldType: 'string',
    required: false,
    defaultValue: '',
    enumValues: [],
    min: '',
    max: '',
  });
  const [columnSheetMode, setColumnSheetMode] =
    useState<ColumnSheetMode>('add');
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
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
  const [editingSubdomainTitle, setEditingSubdomainTitle] = useState<{
    originalSubdomain: string;
    value: string;
  } | null>(null);
  const [pendingDeleteSubdomain, setPendingDeleteSubdomain] = useState<
    string | null
  >(null);
  const [openRouteGuardSubdomain, setOpenRouteGuardSubdomain] = useState<
    string | null
  >(null);
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
  const addColumnFieldIdBase = useId();
  const schemaEditorFieldIdBase = useId();
  const workflowEditorFieldIdBase = useId();
  const addColumnKeyId = `${addColumnFieldIdBase}-key`;
  const addColumnLabelId = `${addColumnFieldIdBase}-label`;
  const addColumnDescriptionId = `${addColumnFieldIdBase}-description`;
  const addColumnClassNameId = `${addColumnFieldIdBase}-className`;
  const addColumnDefaultId = `${addColumnFieldIdBase}-default`;
  const addColumnEnumId = `${addColumnFieldIdBase}-enum`;
  const addColumnMinId = `${addColumnFieldIdBase}-min`;
  const addColumnMaxId = `${addColumnFieldIdBase}-max`;
  const schemaEditorSchemaIdInputId = `${schemaEditorFieldIdBase}-schema-id`;
  const schemaEditorSchemaTitleInputId = `${schemaEditorFieldIdBase}-schema-title`;
  const workflowEditorSelectorId = `${workflowEditorFieldIdBase}-selector`;
  const workflowEditorWorkflowIdInputId = `${workflowEditorFieldIdBase}-workflow-id`;
  const workflowEditorTableInputId = `${workflowEditorFieldIdBase}-table`;
  const workflowEditorHookId = `${workflowEditorFieldIdBase}-hook`;
  const logicComposerFieldId = `${blocklyWorkspaceId}-logic-composer-field`;
  const [blocklyMountElement, setBlocklyMountElement] =
    useState<HTMLDivElement | null>(null);
  const schemaEditorOpenTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const blocklyRuntimeRef = useRef<BlocklyRuntime | null>(null);
  const blocklyRightFieldOptionsRef = useRef<[string, string][]>([
    ['No compatible fields', ''],
  ]);
  const blocklyInitialOperatorRef = useRef<RuleOperator>('eq');
  const blocklyInitialRightFieldRef = useRef('');
  const hasAttemptedDraftCreationRef = useRef<Set<string>>(new Set());
  const initialSnapshotByDraftRef = useRef<Record<string, string | null>>({});
  const lastRequestedDraftSnapshotRef = useRef<string | null>(null);
  const lastAutosaveErrorAtRef = useRef<number>(0);
  const lastPersistenceErrorAtRef = useRef<number>(0);
  const isSidebarTabPersistInFlightRef = useRef(false);
  const pendingSidebarTabPersistRef = useRef<readonly AdminTabDoc[] | null>(
    null,
  );
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(null);
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
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );
  const marketplaceReleases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(releases),
    [releases],
  );
  const {
    data: draftRows = [],
    isLoading: isDraftLoading,
    refetch: refetchDrafts,
  } = api.pluginDraft.useGet({
    keys: [draftId],
    single: true,
  });
  const createDraftMutation = api.pluginDraft.useCreate();
  const updateDraftMutation = api.pluginDraft.useUpdate();
  const createDraftRevisionMutation = api.pluginDraftRevision.useCreate();
  const activeDraft = useMemo(() => {
    const candidate = (draftRows as PluginDraftDoc[])[0] ?? null;
    if (!candidate) return null;
    if (candidate.draftId !== draftId) return null;
    if ((candidate.projectId ?? projectId) !== projectId) return null;
    const hasAccess =
      actorUserIdSet.has(candidate.ownerUserId) ||
      (candidate.collaboratorUserIds ?? []).some((id) =>
        actorUserIdSet.has(id),
      );
    return hasAccess ? candidate : null;
  }, [actorUserIdSet, draftId, draftRows, projectId]);
  const pluginId = useMemo(
    () =>
      resolvePluginStudioPluginId({
        searchPluginId: requestedPluginId,
        persistedPluginId: activeDraft?.pluginId,
        fallbackPluginId: 'example.plugin',
      }),
    [requestedPluginId, activeDraft?.pluginId],
  );
  const defaultPluginTitle = useMemo(
    () => toDefaultPluginTitle(pluginId),
    [pluginId],
  );
  const activeDraftTitle = toDisplayPluginTitle(activeDraft?.title, pluginId);
  const activeDraftDescription = activeDraft?.description?.trim() || '';
  const draftDocScopeKeys = useMemo(() => [draftId], [draftId]);
  const { data: schemaDocRows = [], refetch: refetchSchemaDocs } =
    api.pluginSchemaDoc.useGet({
      keys: draftDocScopeKeys,
    });
  const {
    data: actionManifestDocRows = [],
    refetch: refetchActionManifestDocs,
  } = api.pluginActionManifestDoc.useGet({
    keys: draftDocScopeKeys,
  });
  const { data: routesTabsConfigRows = [], refetch: refetchRoutesTabsConfig } =
    api.pluginRoutesTabsConfig.useGet({
      keys: draftDocScopeKeys,
    });
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
  const latestActiveDraftRevision = activeDraftRevisions[0] ?? null;
  const createSchemaDocMutation = api.pluginSchemaDoc.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateSchemaDocMutation = api.pluginSchemaDoc.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteSchemaDocMutation = api.pluginSchemaDoc.useDelete({
    keys: draftDocScopeKeys,
  });
  const createActionManifestDocMutation = api.pluginActionManifestDoc.useCreate(
    {
      keys: draftDocScopeKeys,
    },
  );
  const updateActionManifestDocMutation = api.pluginActionManifestDoc.useUpdate(
    {
      keys: draftDocScopeKeys,
    },
  );
  const deleteActionManifestDocMutation = api.pluginActionManifestDoc.useDelete(
    {
      keys: draftDocScopeKeys,
    },
  );
  const createRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useCreate({
    keys: draftDocScopeKeys,
  });
  const updateRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useUpdate({
    keys: draftDocScopeKeys,
  });
  const deleteRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useDelete({
    keys: draftDocScopeKeys,
  });
  const { data: workflowJobs = [] } = api.pluginWorkflowJob.useGet();
  const { data: workflowEventLogs = [] } = api.pluginWorkflowEventLog.useGet();

  const workspaceSchemaDocs = useMemo(() => {
    const rows = schemaDocRows;
    const docsBySchemaId = new Map<string, { doc: SchemaDoc; score: number }>();
    for (const row of rows) {
      const doc = parseStoredSchemaDoc(row.doc);
      const schemaId = row.schemaId || doc?.schemaId;
      if (!schemaId || !doc?.schemaId) continue;

      const canonicalRowId = `${draftId}:${schemaId}`;
      const rowId = row.id ?? '';
      const score = rowId === canonicalRowId ? 2 : rowId ? 1 : 0;
      const existing = docsBySchemaId.get(schemaId);
      if (!existing || score >= existing.score) {
        docsBySchemaId.set(schemaId, { doc, score });
      }
    }
    const docs = [...docsBySchemaId.values()].map((entry) => entry.doc);
    if (docs.length > 0) {
      return docs;
    }
    const revisionDocs = (latestActiveDraftRevision?.schemaDocs ?? [])
      .map((doc) => parseStoredSchemaDoc(doc))
      .filter((doc): doc is SchemaDoc => Boolean(doc?.schemaId));
    if (revisionDocs.length > 0) {
      return revisionDocs;
    }
    return [DEFAULT_SCHEMA_DOC];
  }, [draftId, schemaDocRows, latestActiveDraftRevision?.schemaDocs]);

  const workspaceActionManifest = useMemo(() => {
    const rows = actionManifestDocRows as Array<{
      actionId?: string;
      doc?: unknown;
    }>;
    const docs = rows
      .map((row) => row.doc as ActionManifestDoc | undefined)
      .filter((doc): doc is ActionManifestDoc => Boolean(doc?.actionId));
    if (docs.length > 0) {
      return docs;
    }
    return (latestActiveDraftRevision?.actionManifest ?? []).filter(
      (doc): doc is ActionManifestDoc => Boolean(doc?.actionId),
    );
  }, [actionManifestDocRows, latestActiveDraftRevision?.actionManifest]);

  const canonicalRoutesTabsConfigId = draftId;
  const legacyRoutesTabsConfigId = useMemo(() => `${draftId}@live`, [draftId]);

  const activeRoutesTabsConfigRow = useMemo(() => {
    const rows = routesTabsConfigRows as Array<{
      id?: string;
      draftId?: string;
      revisionId?: string;
      routes?: Array<{
        schema: string;
        title: string;
        group?: string | null;
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

    const legacy = candidates.find(
      (row) => row.id === legacyRoutesTabsConfigId,
    );
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
        activeRoutesTabsConfigRow
          ? toAdminTabsFromDraftRoutes(activeRoutesTabsConfigRow.routes)
          : (latestActiveDraftRevision?.adminTabs ?? DEFAULT_DRAFT_ADMIN_TABS),
      ),
    [activeRoutesTabsConfigRow, latestActiveDraftRevision?.adminTabs],
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
      const workflows = flattenSchemaWorkflows(schemaDocs);
      const actionManifest = workspaceActionManifest;
      const parsedDraftAdminTabs = JSON.parse(adminTabsText) as AdminTabDoc[];
      const {
        schemaTabs: storedSchemaTabs,
        orderedGroups: storedGroupOrder,
        systemTabs,
        subdomains,
        subdomainUiLayers,
        cloudflareDnsAutoConfigured,
        tabOrder: storedTabOrder,
      } = deserializeDraftAdminTabs(parsedDraftAdminTabs);
      const schemaIdSet = new Set(
        schemaDocs.map((schemaDoc) => schemaDoc.schemaId),
      );
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
          const normalizedGroup = tabBySchema
            .get(schemaDoc.schemaId)
            ?.group?.trim();
          return normalizedGroup ? [[schemaDoc.schemaId, normalizedGroup]] : [];
        }),
      );
      const schemaIconNameById = Object.fromEntries(
        schemaDocs.flatMap((schemaDoc) => {
          const normalizedIcon = tabBySchema
            .get(schemaDoc.schemaId)
            ?.icon?.trim();
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
      const tabOrder = computeOrderedTabTokens({
        tabOrder: storedTabOrder,
        schemaOrder,
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
        subdomains,
        subdomainUiLayers,
        cloudflareDnsAutoConfigured,
        tabOrder,
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
        subdomains,
        subdomainUiLayers,
        cloudflareDnsAutoConfigured,
        tabOrder,
        adminTabs,
        draftAdminTabs,
      };
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }, [adminTabsText, workspaceActionManifest, workspaceSchemaDocs]);
  const groupOrder = parsed?.groupOrder ?? [];
  const systemTabs = parsed?.systemTabs ?? DEFAULT_SYSTEM_TABS;
  const subdomains = parsed?.subdomains ?? DEFAULT_SUBDOMAIN_PIPELINE;
  const subdomainUiLayers = parsed?.subdomainUiLayers ?? {};
  const cloudflareDnsAutoConfigured =
    parsed?.cloudflareDnsAutoConfigured ?? true;
  const tabOrder = parsed?.tabOrder ?? [];
  const isSubdomainStudioMode = true;

  const availableSchemaDocs = parsed?.schemaDocs ?? [];
  const availableWorkflows = useMemo(() => {
    const schemaDocs = parsed?.schemaDocs ?? [];
    const fallbackSchema =
      schemaDocs.find((schemaDoc) => schemaDoc.schemaId === activeSchemaId) ??
      schemaDocs[0] ??
      DEFAULT_SCHEMA_DOC;
    const schemaId = fallbackSchema.schemaId;
    const scopedWorkflows = (fallbackSchema.workflows ?? []).map(
      (workflow) => ({
        ...workflow,
        table: schemaId,
        trigger: workflow.trigger
          ? {
              ...workflow.trigger,
              table: schemaId,
            }
          : undefined,
      }),
    );
    if (scopedWorkflows.length > 0) {
      return scopedWorkflows;
    }
    return [
      {
        ...DEFAULT_WORKFLOW_DOC,
        table: schemaId,
      },
    ];
  }, [activeSchemaId, parsed?.schemaDocs]);
  const availableGroups = groupOrder;
  const activeSchemaDocForEditor = useMemo(
    () =>
      availableSchemaDocs.find(
        (schemaDoc) => schemaDoc.schemaId === activeSchemaId,
      ) ??
      availableSchemaDocs[0] ??
      DEFAULT_SCHEMA_DOC,
    [activeSchemaId, availableSchemaDocs],
  );
  const schemaBuilder = useMemo(
    () => ({
      schemaId: activeSchemaDocForEditor.schemaId,
      title:
        activeSchemaDocForEditor.title ?? activeSchemaDocForEditor.schemaId,
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
  function setSchemaBuilder(
    value: BuilderSchema | ((current: BuilderSchema) => BuilderSchema),
  ) {
    const nextBuilder =
      typeof value === 'function' ? value(schemaBuilder) : value;
    if (deepEqual(nextBuilder, schemaBuilder)) {
      return;
    }
    persistSchemaEditorState(
      nextBuilder,
      schemaRefinements,
      blocklyRefinements,
    );
  }
  function setSchemaRefinements(
    value:
      | BuilderRefinement[]
      | ((current: BuilderRefinement[]) => BuilderRefinement[]),
  ) {
    const nextSchemaRefinements =
      typeof value === 'function' ? value(schemaRefinements) : value;
    if (deepEqual(nextSchemaRefinements, schemaRefinements)) {
      return;
    }
    persistSchemaEditorState(
      schemaBuilder,
      nextSchemaRefinements,
      blocklyRefinements,
    );
  }
  function setBlocklyRefinements(
    value:
      | BlocklyRefinement[]
      | ((current: BlocklyRefinement[]) => BlocklyRefinement[]),
  ) {
    const nextBlocklyRefinements =
      typeof value === 'function' ? value(blocklyRefinements) : value;
    if (deepEqual(nextBlocklyRefinements, blocklyRefinements)) {
      return;
    }
    persistSchemaEditorState(
      schemaBuilder,
      schemaRefinements,
      nextBlocklyRefinements,
    );
  }
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

    return (
      pluginId.trim() &&
      /^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) &&
      parsed &&
      !hasInvalidFieldConfig &&
      !hasInvalidDerivedFieldConfig
    );
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

  const expectedHydratedDraftKey = useMemo(() => {
    if (isDraftRevisionLoading) return null;
    return toDraftHydrationKey({
      draftId,
      revision: latestActiveDraftRevision,
    });
  }, [draftId, latestActiveDraftRevision, isDraftRevisionLoading]);
  const isDraftHydrated = Boolean(
    expectedHydratedDraftKey && hydratedDraftKey === expectedHydratedDraftKey,
  );

  const beginMetadataEdit = useCallback(
    (field: 'title' | 'description') => {
      setEditingMetadataField(field);
      setEditingMetadataValue(
        field === 'title' ? activeDraftTitle : activeDraftDescription,
      );
    },
    [activeDraftDescription, activeDraftTitle],
  );

  const persistDraftMetadata = useCallback(
    (nextMetadata: { title: string; description: string }) => {
      if (!activeDraft) return;
      if (activeDraft.pluginId !== pluginId) return;
      if (!isActorIdentityReady) return;

      const nextTitle = toDisplayPluginTitle(nextMetadata.title, pluginId);
      const nextDescription = nextMetadata.description.trim();
      const currentTitle = toDisplayPluginTitle(activeDraft.title, pluginId);
      const currentDescription = activeDraft.description?.trim() || '';

      if (
        nextTitle === currentTitle &&
        nextDescription === currentDescription
      ) {
        return;
      }

      void updateDraftMutation
        .mutateAsync({
          ...activeDraft,
          title: nextTitle,
          description: nextDescription || undefined,
          updatedAt: new Date().toISOString(),
        } as never)
        .then(() => refetchDrafts())
        .catch((error) => {
          console.error(error);
          toast.error('Saving draft metadata failed.');
        });
    },
    [
      activeDraft,
      isActorIdentityReady,
      pluginId,
      refetchDrafts,
      updateDraftMutation,
    ],
  );

  const commitMetadataEdit = useCallback(() => {
    if (!editingMetadataField) return;
    const nextValue = editingMetadataValue;
    const nextTitle =
      editingMetadataField === 'title' ? nextValue : activeDraftTitle;
    const nextDescription =
      editingMetadataField === 'description'
        ? nextValue
        : activeDraftDescription;
    setEditingMetadataField(null);
    setEditingMetadataValue('');
    persistDraftMetadata({
      title: nextTitle,
      description: nextDescription,
    });
  }, [
    activeDraftDescription,
    activeDraftTitle,
    editingMetadataField,
    editingMetadataValue,
    persistDraftMetadata,
  ]);

  const stopMetadataEdit = useCallback(() => {
    setEditingMetadataField(null);
    setEditingMetadataValue('');
  }, []);

  useEffect(() => {
    if (!expectedHydratedDraftKey) return;
    setHydratedDraftKey((current) =>
      current === expectedHydratedDraftKey ? current : expectedHydratedDraftKey,
    );
  }, [expectedHydratedDraftKey]);

  const { mutateAsync: createDraft } = useMutation({
    mutationKey: ['plugin-studio', 'create-draft', draftId],
    onMutate: () => {},
    mutationFn: async () => {
      const userHandle = formatUserHandle(actorUserId);
      const draftTitle = `${pluginId} (${userHandle})`;
      const now = new Date().toISOString();
      const nextTitle = activeDraftTitle || draftTitle;
      const nextDescription = activeDraftDescription || undefined;
      const nextDraft: PluginDraftDoc = {
        id: draftId,
        draftId,
        projectId,
        pluginId,
        ownerUserId: actorUserId,
        status: 'active',
        title: nextTitle,
        description: nextDescription,
        createdAt: now,
        updatedAt: now,
      };

      if (activeDraft) {
        const hasHeaderChanges =
          (activeDraft.projectId ?? undefined) !== (projectId || undefined) ||
          activeDraft.pluginId !== pluginId ||
          activeDraft.status !== 'active' ||
          (activeDraft.title ?? undefined) !== nextTitle ||
          (activeDraft.description?.trim() || undefined) !== nextDescription;

        if (!hasHeaderChanges) {
          return activeDraft;
        }

        await updateDraftMutation.mutateAsync({
          ...activeDraft,
          projectId,
          pluginId,
          status: 'active',
          title: nextTitle,
          description: nextDescription,
          updatedAt: now,
          createdAt: activeDraft.createdAt ?? now,
        } as never);
      } else {
        await createDraftMutation.mutateAsync(nextDraft as never);
      }
      return nextDraft;
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
      mutationKey: ['plugin-studio', 'save-draft-revision', draftId],
      onMutate: (_targetDraftId) => {},
      mutationFn: async (targetDraftId: string) => {
        if (!parsed) {
          throw new Error('Invalid plugin payload');
        }
        await createDraft();
        const revisionPayload = {
          schemaDocs: parsed.schemaDocs,
          adminTabs: parsed.draftAdminTabs,
        };
        const now = new Date().toISOString();
        const revisionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        const snapshotString = canonicalStringify(revisionPayload);
        const digest = snapshotString.length.toString(36);
        const draftRevisionRowId = toDraftRevisionRowId({
          draftId: targetDraftId,
          revisionId,
        });
        return createDraftRevisionMutation.mutateAsync({
          id: draftRevisionRowId,
          revisionId,
          draftId: targetDraftId,
          pluginId,
          manifestHash: `manifest-${digest}-${revisionId.slice(0, 8)}`,
          artifactHash: `artifact-${digest}-${revisionId.slice(-8)}`,
          schemaDocs: revisionPayload.schemaDocs,
          adminTabs: revisionPayload.adminTabs,
          createdAt: now,
          createdByUserId: actorUserId,
        } as never);
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
      adminTabs: latestRevision.adminTabs ?? [],
    });
  }, [activeDraftRevisions]);

  const currentDraftSnapshot = useMemo(() => {
    if (!parsed) return null;
    return toDraftSnapshotString({
      schemaDocs: parsed.schemaDocs,
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

  const { mutateAsync: publishRelease, isPending: isPublishing } = useMutation({
    mutationKey: ['plugin-studio', 'publish-release'],
    mutationFn: async () => {
      if (!parsed) {
        throw new Error('Invalid plugin payload');
      }
      const version = getNextVersion(marketplaceReleases, pluginId);
      await publishPluginRelease({
        data: {
          actorUserId,
          pluginId,
          version,
          docs: {
            title: activeDraftTitle,
            description: activeDraftDescription,
          },
          actionManifest: parsed.actionManifest,
          schemaDocs: parsed.schemaDocs,
          adminTabs: parsed.adminTabs,
        },
      });
      return { pluginId, version };
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
  const v3PublishGateDiagnostics = useMemo(() => {
    if (!parsed) return [];
    return evaluateV3PublishGates({
      actionManifest: parsed.actionManifest ?? [],
      schemaDocs: parsed.schemaDocs ?? [],
      workflows: parsed.workflows ?? [],
    });
  }, [parsed]);

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
  }, [
    leftRuleFields,
    availableRuleFieldsByType,
    fieldTypeByRuleField,
    setSchemaRefinements,
  ]);

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
  const workspaceWorkflow =
    availableWorkflows.find(
      (workflowDoc) => workflowDoc.workflowId === activeWorkflowId,
    ) ??
    availableWorkflows[0] ??
    DEFAULT_WORKFLOW_DOC;
  const workflowEditorTable =
    workflowEditorLockedTable ??
    workspaceWorkflow.table ??
    activeSchemaDocForEditor.schemaId;
  const workflowEditorScopedWorkflows = useMemo(() => {
    return availableWorkflows;
  }, [availableWorkflows]);
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
            tabId: schemaDoc.schemaId,
            title: schemaDoc.title || tab.title || schemaDoc.schemaId,
            group: tab.group,
            iconName: tab.icon,
            icon: resolveLucideIconByName(tab.icon),
            parsedSchema: compileSchemaDoc(schemaDoc),
            slug: `plugin-studio/${pluginId}/${schemaDoc.schemaId}`,
            treatSlugAsAbsolute: true,
            editable: true,
            onAddColumn: () => openAddColumnSheet(schemaDoc.schemaId),
            onEditColumn: (columnKey: string) =>
              openEditColumnSheet(columnKey, schemaDoc.schemaId),
            onDeleteColumn: (columnKey: string) =>
              requestDeleteColumn(columnKey, schemaDoc.schemaId),
            onReorderColumns: (
              sourceColumnKey: string,
              targetColumnKey: string,
            ) =>
              handleReorderColumns(
                schemaDoc.schemaId,
                sourceColumnKey,
                targetColumnKey,
              ),
          },
        ];
      } catch (error) {
        console.error('Failed to compile schema for live preview', error);
        return [];
      }
    });
  }, [
    parsed?.adminTabs,
    parsed?.schemaDocs,
    pluginId,
    openAddColumnSheet,
    openEditColumnSheet,
    requestDeleteColumn,
  ]);
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
      const parsedDoc = parseStoredSchemaDoc(row.doc);
      const schemaId = row.schemaId || parsedDoc?.schemaId || '';
      const rowId = row.id || schemaId;
      if (!schemaId || !rowId) continue;
      const nextDoc = nextBySchemaId.get(schemaId);
      if (!nextDoc) {
        writes.push(deleteSchemaDocMutation.mutateAsync(rowId));
        continue;
      }
      writes.push(
        updateSchemaDocMutation.mutateAsync({
          id: rowId,
          pluginId,
          version: draftId,
          schemaId,
          doc: stringifySchemaDocForStorage(nextDoc),
        }),
      );
      nextBySchemaId.delete(schemaId);
    }

    for (const [schemaId, nextDoc] of nextBySchemaId) {
      writes.push(
        createSchemaDocMutation.mutateAsync({
          id: `${draftId}:${schemaId}`,
          pluginId,
          version: draftId,
          schemaId,
          doc: stringifySchemaDocForStorage(nextDoc),
        }),
      );
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

  function persistSchemaWorkflows(
    schemaId: string,
    nextWorkflowDocs: readonly WorkflowDoc[],
  ) {
    const toSchemaWorkflowDoc = (
      workflowDoc: WorkflowDoc,
    ): SchemaWorkflowDoc => ({
      pluginContractVersion: workflowDoc.pluginContractVersion,
      workflowId: workflowDoc.workflowId.startsWith(`${schemaId}::`)
        ? workflowDoc.workflowId.slice(`${schemaId}::`.length)
        : workflowDoc.workflowId,
      title: workflowDoc.title,
      hook: workflowDoc.hook,
      trigger: workflowDoc.trigger
        ? {
            event: workflowDoc.trigger.event,
            filters: workflowDoc.trigger.filters,
            fieldChange: workflowDoc.trigger.fieldChange,
          }
        : undefined,
      nodes: workflowDoc.nodes,
      edges: workflowDoc.edges,
    });

    updateSchemaDoc(schemaId, (schemaDoc) => ({
      ...schemaDoc,
      workflows: nextWorkflowDocs.map(toSchemaWorkflowDoc),
    }));
  }

  function persistActionManifestDocs(
    nextActionManifest: readonly ActionManifestDoc[],
  ) {
    const nextByActionId = new Map(
      nextActionManifest.map((manifestDoc) => [
        manifestDoc.actionId,
        manifestDoc,
      ]),
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
      writes.push(
        updateActionManifestDocMutation.mutateAsync({
          id: rowId,
          pluginId,
          version: draftId,
          actionId,
          doc: nextDoc,
        }),
      );
      nextByActionId.delete(actionId);
    }

    for (const [actionId, nextDoc] of nextByActionId) {
      writes.push(
        createActionManifestDocMutation.mutateAsync({
          id: `${draftId}:${actionId}`,
          pluginId,
          version: draftId,
          actionId,
          doc: nextDoc,
        }),
      );
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
    const derivationsByFieldKey = new Map<
      string,
      SchemaBuilderDerivedField[]
    >();
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
    pendingSidebarTabPersistRef.current = nextAdminTabs;
    if (isSidebarTabPersistInFlightRef.current) return;
    isSidebarTabPersistInFlightRef.current = true;

    void (async () => {
      while (pendingSidebarTabPersistRef.current) {
        const nextTabs = pendingSidebarTabPersistRef.current;
        pendingSidebarTabPersistRef.current = null;
        const payload = {
          id: canonicalRoutesTabsConfigId,
          draftId: draftId,
          revisionId: 'live',
          pluginId,
          businessSlug: 'draft',
          routes: toDraftRoutesFromAdminTabs(nextTabs),
          savedByUserId: actorUserId,
          savedAt: new Date().toISOString(),
        };

        try {
          await updateRoutesTabsConfigMutation.mutateAsync(payload);
        } catch (error) {
          if (!isMissingPersistenceError(error)) {
            throw error;
          }
          try {
            await createRoutesTabsConfigMutation.mutateAsync(payload);
          } catch (createError) {
            if (!isDuplicatePersistenceError(createError)) {
              throw createError;
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
      }

      await refetchRoutesTabsConfig();
    })()
      .catch((error) =>
        reportPersistenceError('Sidebar tab persistence', error),
      )
      .finally(() => {
        isSidebarTabPersistInFlightRef.current = false;
        if (pendingSidebarTabPersistRef.current) {
          persistSidebarAdminTabs(pendingSidebarTabPersistRef.current);
        }
      });
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
      subdomains: SubdomainPipelineState;
      subdomainUiLayers: SubdomainUiLayersState;
      cloudflareDnsAutoConfigured: boolean;
      tabOrder: string[];
    }) => void,
    options?: {
      availableSchemaDocsOverride?: readonly SchemaDoc[];
    },
  ) {
    let currentTabs: AdminTabDoc[] = [];
    try {
      currentTabs = JSON.parse(adminTabsText) as AdminTabDoc[];
    } catch {
      currentTabs = [];
    }

    const state = deserializeDraftAdminTabs(currentTabs);
    updater(state);

    const resolvedAvailableSchemaDocs =
      options?.availableSchemaDocsOverride ?? availableSchemaDocs;
    const availableSchemaById = new Map(
      resolvedAvailableSchemaDocs.map((schemaDoc) => [
        schemaDoc.schemaId,
        schemaDoc,
      ]),
    );
    const filteredSchemaTabs = state.schemaTabs.filter((tab) =>
      availableSchemaById.has(tab.schema),
    );
    const existingSchemaIds = new Set(
      filteredSchemaTabs.map((tab) => tab.schema),
    );
    const appendedSchemaTabs = [
      ...filteredSchemaTabs,
      ...resolvedAvailableSchemaDocs
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
    const tabOrder = computeOrderedTabTokens({
      tabOrder: state.tabOrder,
      schemaOrder,
    });
    state.tabOrder = tabOrder;

    persistSidebarAdminTabs(
      serializeDraftAdminTabs({
        schemaTabs: appendedSchemaTabs,
        orderedGroups,
        systemTabs: state.systemTabs,
        subdomains: state.subdomains,
        subdomainUiLayers: state.subdomainUiLayers,
        cloudflareDnsAutoConfigured: state.cloudflareDnsAutoConfigured,
        tabOrder,
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

  function handleSubdomainChange(
    previousSubdomain: string,
    patch: Partial<SubdomainPipelineState[number]>,
  ) {
    const normalizedPrevious = normalizeSubdomainName(previousSubdomain);
    const hasAccessRulePatch = Object.hasOwn(patch, 'accessRule');
    updateSidebarAdminTabs((state) => {
      let renamedTo: string | null = null;
      state.subdomains = state.subdomains.map((entry) => {
        if (normalizeSubdomainName(entry.subdomain) !== normalizedPrevious) {
          return entry;
        }
        const nextSubdomain = normalizeSubdomainName(
          patch.subdomain ?? entry.subdomain,
        );
        renamedTo = nextSubdomain;
        const nextUiProject =
          nextSubdomain === 'index'
            ? 'index'
            : nextSubdomain === 'admin'
              ? 'admin'
              : (patch.uiProject ?? entry.uiProject);
        return {
          subdomain: nextSubdomain,
          basePath: '/',
          uiProject: nextUiProject,
          autoAdminInjected:
            nextUiProject === 'admin'
              ? true
              : (patch.autoAdminInjected ?? entry.autoAdminInjected),
          accessRule: hasAccessRulePatch
            ? (patch.accessRule ?? null)
            : (entry.accessRule ?? null),
        };
      });
      if (renamedTo && renamedTo !== normalizedPrevious) {
        const existingLayers = state.subdomainUiLayers[normalizedPrevious];
        if (existingLayers) {
          state.subdomainUiLayers[renamedTo] = existingLayers;
          delete state.subdomainUiLayers[normalizedPrevious];
        }
      }
    });
  }

  function handleAddSubdomain() {
    updateSidebarAdminTabs((state) => {
      let counter = state.subdomains.length + 1;
      let candidate = `subdomain-${counter}`;
      const existing = new Set(
        state.subdomains.map((entry) =>
          normalizeSubdomainName(entry.subdomain),
        ),
      );
      while (existing.has(candidate)) {
        counter += 1;
        candidate = `subdomain-${counter}`;
      }
      state.subdomains = [
        ...state.subdomains,
        {
          subdomain: candidate,
          basePath: '/',
          uiProject: 'custom',
          autoAdminInjected: false,
          accessRule: null,
        },
      ];
      state.subdomainUiLayers[candidate] = JSON.stringify(
        toBlankSubdomainUiLayers(candidate),
      );
    });
  }

  function handleRemoveSubdomain(subdomain: string) {
    const normalized = normalizeSubdomainName(subdomain);
    if (normalized === 'index' || normalized === 'admin') {
      toast.error('Default subdomains index and admin cannot be removed.');
      return;
    }
    updateSidebarAdminTabs((state) => {
      state.subdomains = state.subdomains.filter(
        (entry) => normalizeSubdomainName(entry.subdomain) !== normalized,
      );
      delete state.subdomainUiLayers[normalized];
    });
  }

  function beginSubdomainTitleEdit(subdomain: string) {
    setEditingSubdomainTitle({
      originalSubdomain: subdomain,
      value: subdomain,
    });
  }

  function cancelSubdomainTitleEdit() {
    setEditingSubdomainTitle(null);
  }

  function commitSubdomainTitleEdit() {
    if (!editingSubdomainTitle) return;
    const nextTitle = editingSubdomainTitle.value.trim();
    if (!nextTitle) {
      setEditingSubdomainTitle(null);
      return;
    }
    handleSubdomainChange(editingSubdomainTitle.originalSubdomain, {
      subdomain: nextTitle,
    });
    setEditingSubdomainTitle(null);
  }

  function handleDeleteSubdomainDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingDeleteSubdomain(null);
    }
  }

  function confirmDeleteSubdomain() {
    if (!pendingDeleteSubdomain) return;
    handleRemoveSubdomain(pendingDeleteSubdomain);
    setPendingDeleteSubdomain(null);
  }

  const requestedSubdomain = search.subdomain
    ? normalizeSubdomainName(search.subdomain)
    : null;
  const selectedSubdomain = normalizeSubdomainName(
    requestedSubdomain ??
      subdomains[0]?.subdomain ??
      DEFAULT_SUBDOMAIN_PIPELINE[0]?.subdomain,
  );
  const selectedSubdomainIndex = subdomains.findIndex(
    (entry) => normalizeSubdomainName(entry.subdomain) === selectedSubdomain,
  );
  const selectedSubdomainEntry = subdomains.find(
    (entry) => normalizeSubdomainName(entry.subdomain) === selectedSubdomain,
  );
  const isSubdomainBuilderOpen = requestedSubdomain !== null;
  const selectedSubdomainLayerSnapshot =
    subdomainUiLayers[selectedSubdomain] ?? undefined;
  const parsedSelectedSubdomainLayers = useMemo(
    () => parseStoredSubdomainUiLayers(selectedSubdomainLayerSnapshot),
    [selectedSubdomainLayerSnapshot],
  );
  const buildAdminInjectedLayers = useCallback(
    (subdomain: string): ComponentLayer[] =>
      toAdminInjectedSubdomainUiLayers(subdomain),
    [],
  );

  const selectedSubdomainLayers = parsedSelectedSubdomainLayers
    ? selectedSubdomain === 'admin' || selectedSubdomainEntry?.autoAdminInjected
      ? normalizeAdminCanvasLayers(
          selectedSubdomain,
          parsedSelectedSubdomainLayers,
        )
      : parsedSelectedSubdomainLayers
    : selectedSubdomain === 'admin' || selectedSubdomainEntry?.autoAdminInjected
      ? buildAdminInjectedLayers(selectedSubdomain)
      : toBlankSubdomainUiLayers(selectedSubdomain);

  function selectSubdomain(subdomain: string) {
    const normalized = normalizeSubdomainName(subdomain);
    void navigate({
      to: '.',
      search: (current) => ({
        ...(current as Record<string, unknown>),
        subdomain: normalized,
      }),
    });
  }

  function closeSubdomainBuilder() {
    void navigate({
      to: '.',
      search: (current) => {
        const next = { ...(current as Record<string, unknown>) };
        delete next.subdomain;
        return next;
      },
    });
  }

  function openSubdomainBuilder(subdomain: string) {
    selectSubdomain(subdomain);
  }

  function moveSubdomainSelection(offset: number) {
    if (subdomains.length === 0) return;
    const startIndex = selectedSubdomainIndex >= 0 ? selectedSubdomainIndex : 0;
    const nextIndex = Math.min(
      Math.max(startIndex + offset, 0),
      subdomains.length - 1,
    );
    const next = subdomains[nextIndex];
    if (!next) return;
    selectSubdomain(next.subdomain);
  }

  function reorderSubdomainByOffset(offset: number, fromSubdomain?: string) {
    if (subdomains.length < 2) return;
    const fromIndex = fromSubdomain
      ? subdomains.findIndex(
          (entry) =>
            normalizeSubdomainName(entry.subdomain) ===
            normalizeSubdomainName(fromSubdomain),
        )
      : selectedSubdomainIndex;
    if (fromIndex < 0) return;
    const targetIndex = fromIndex + offset;
    if (targetIndex < 0 || targetIndex >= subdomains.length) return;
    updateSidebarAdminTabs((state) => {
      const current = [...state.subdomains];
      const [moved] = current.splice(fromIndex, 1);
      if (!moved) return;
      current.splice(targetIndex, 0, moved);
      state.subdomains = current;
    });
    const next = subdomains[targetIndex];
    if (next) {
      selectSubdomain(next.subdomain);
    }
  }

  function handleSubdomainOrderChange(nextSubdomains: SubdomainPipelineState) {
    updateSidebarAdminTabs((state) => {
      state.subdomains = [...nextSubdomains];
    });
  }

  useShortcutAction(
    SUBDOMAIN_STUDIO_SHORTCUTS.prevCard,
    () => moveSubdomainSelection(-1),
    { enabled: isSubdomainStudioMode, allowInEditableContext: true },
  );
  useShortcutAction(
    SUBDOMAIN_STUDIO_SHORTCUTS.nextCard,
    () => moveSubdomainSelection(1),
    { enabled: isSubdomainStudioMode, allowInEditableContext: true },
  );
  useShortcutAction(
    SUBDOMAIN_STUDIO_SHORTCUTS.openBuilder,
    () => openSubdomainBuilder(selectedSubdomain),
    { enabled: isSubdomainStudioMode, allowInEditableContext: true },
  );
  useShortcutAction(
    SUBDOMAIN_STUDIO_SHORTCUTS.moveLeft,
    () => reorderSubdomainByOffset(-1),
    { enabled: isSubdomainStudioMode, allowInEditableContext: true },
  );
  useShortcutAction(
    SUBDOMAIN_STUDIO_SHORTCUTS.moveRight,
    () => reorderSubdomainByOffset(1),
    { enabled: isSubdomainStudioMode, allowInEditableContext: true },
  );

  const subdomainContextData = useMemo(
    () => ({
      plugin: {
        draftId,
        projectId,
        pluginId,
      },
      subdomain: selectedSubdomain,
      date: {
        currentTime: new Date().toISOString(),
        locale: 'en-US',
      },
    }),
    [draftId, projectId, pluginId, selectedSubdomain],
  );

  // biome-ignore lint/correctness/noNestedComponentDefinitions: registry needs a local state-bound component
  function EditableAutoAdminLayer() {
    return (
      <PluginStudioEditableAutoAdmin
        tabs={livePreviewTabs}
        tabOrder={tabOrder}
        onAddTable={handleAddSchema}
        onAddGroup={handleAddGroup}
        onReorderGroups={handleReorderGroups}
        onMoveTabToGroup={handleMoveTabToGroup}
        onReorderTabs={handleReorderTabs}
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
    );
  }

  const subdomainComponentRegistry = {
    ...primitiveComponentDefinitions,
    ...complexComponentDefinitions,
    AutoAdmin: {
      component: EditableAutoAdminLayer,
      schema: z.object({}),
      from: '@/components/auto-admin/auto-admin-plugin-studio-editable',
    },
    AutoAdminRoot: {
      component: EditableAutoAdminLayer,
      schema: z.object({}),
      from: '@/components/auto-admin/auto-admin-plugin-studio-editable',
    },
  };

  const handleSubdomainBuilderLayersChange = useCallback(
    (layers: ComponentLayer[]) => {
      const nextLayers = JSON.stringify(layers);
      updateSidebarAdminTabs((state) => {
        state.subdomainUiLayers[selectedSubdomain] = nextLayers;
      });
    },
    [selectedSubdomain],
  );

  function getSubdomainLayers(
    entry: SubdomainPipelineState[number],
  ): ComponentLayer[] {
    const normalized = normalizeSubdomainName(entry.subdomain);
    const parsedLayers = parseStoredSubdomainUiLayers(
      subdomainUiLayers[normalized],
    );
    if (parsedLayers && parsedLayers.length > 0) {
      if (entry.autoAdminInjected || normalized === 'admin') {
        return normalizeAdminCanvasLayers(normalized, parsedLayers);
      }
      return parsedLayers;
    }
    if (entry.autoAdminInjected || normalized === 'admin') {
      return buildAdminInjectedLayers(normalized);
    }
    return toBlankSubdomainUiLayers(normalized);
  }

  function getTargetSchemaDoc(schemaId?: string) {
    const normalizedSchemaId = schemaId?.trim();
    if (normalizedSchemaId) {
      return availableSchemaDocs.find(
        (schemaDoc) => schemaDoc.schemaId === normalizedSchemaId,
      );
    }
    return activeSchemaDocForEditor;
  }

  function openAddColumnSheet(schemaId?: string) {
    const targetSchemaDoc = getTargetSchemaDoc(schemaId);
    if (!targetSchemaDoc) {
      return;
    }
    if (activeSchemaId !== targetSchemaDoc.schemaId) {
      setActiveSchemaId(targetSchemaDoc.schemaId);
    }
    setColumnSheetMode('add');
    setEditingColumnKey(null);
    setAddColumnDraft(createAddColumnDraft(targetSchemaDoc.fields.length));
    setIsAddColumnSheetOpen(true);
  }

  function openEditColumnSheet(columnKey: string, schemaId?: string) {
    const targetSchemaDoc = getTargetSchemaDoc(schemaId);
    if (!targetSchemaDoc) {
      toast.error('Table was not found.');
      return;
    }
    const normalizedColumnKey = columnKey.trim();
    if (!normalizedColumnKey) return;
    const targetField = targetSchemaDoc.fields.find(
      (field) => field.key.trim() === normalizedColumnKey,
    );
    if (!targetField) {
      toast.error(`Column ${normalizedColumnKey} was not found.`);
      return;
    }
    if (activeSchemaId !== targetSchemaDoc.schemaId) {
      setActiveSchemaId(targetSchemaDoc.schemaId);
    }
    setColumnSheetMode('edit');
    setEditingColumnKey(normalizedColumnKey);
    setAddColumnDraft(toAddColumnDraftFromField(toBuilderField(targetField)));
    setIsAddColumnSheetOpen(true);
  }

  function resetColumnSheetState() {
    setColumnSheetMode('add');
    setEditingColumnKey(null);
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

  const isColumnSheetShortcutTarget = useCallback((event: KeyboardEvent) => {
    const target = event.target as Node | null;
    const active = document.activeElement as Node | null;
    const sheetContent = document.querySelector(
      '[data-plugin-studio-column-sheet-content="true"]',
    );
    if (!sheetContent) return false;
    if (target && sheetContent.contains(target)) return true;
    if (active && sheetContent.contains(active)) return true;
    return false;
  }, []);

  function handleReorderColumns(
    schemaId: string,
    sourceColumnKey: string,
    targetColumnKey: string,
  ) {
    const normalizedSchemaId = schemaId.trim();
    const source = sourceColumnKey.trim();
    const target = targetColumnKey.trim();
    if (!normalizedSchemaId || !source || !target || source === target) return;

    updateSchemaDoc(normalizedSchemaId, (current) => {
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

  function requestDeleteColumn(columnKey: string, schemaId?: string) {
    const targetSchemaDoc = getTargetSchemaDoc(schemaId);
    if (!targetSchemaDoc) {
      toast.error('Table was not found.');
      return;
    }
    const normalizedColumnKey = columnKey.trim();
    if (!normalizedColumnKey) return;
    if (targetSchemaDoc.fields.length <= 1) {
      toast.error('At least one column is required.');
      return;
    }
    if (
      !targetSchemaDoc.fields.some(
        (field) => field.key.trim() === normalizedColumnKey,
      )
    ) {
      toast.error(`Column ${normalizedColumnKey} was not found.`);
      return;
    }
    if (activeSchemaId !== targetSchemaDoc.schemaId) {
      setActiveSchemaId(targetSchemaDoc.schemaId);
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
      columnSheetMode === 'edit' && editingColumnKey
        ? schemaBuilder.fields.find(
            (field) => field.key.trim() === editingColumnKey,
          )
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
                  enumValues: normalizeStringArray(addColumnDraft.enumValues),
                  min: addColumnDraft.min.trim() || undefined,
                  max: addColumnDraft.max.trim() || undefined,
                  inputPropsJson: setJsonStringEntry(
                    field.inputPropsJson,
                    'className',
                    addColumnDraft.inputClassName,
                  ),
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
      enumValues: normalizeStringArray(addColumnDraft.enumValues),
      min: addColumnDraft.min.trim() || undefined,
      max: addColumnDraft.max.trim() || undefined,
      inputPropsJson: setJsonStringEntry(
        '{}',
        'className',
        addColumnDraft.inputClassName,
      ),
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

  useShortcutAction(
    COLUMN_SHEET_SHORTCUTS.cancel,
    () => {
      closeColumnSheet();
    },
    {
      enabled: isAddColumnSheetOpen,
      allowInEditableContext: true,
      guard: isColumnSheetShortcutTarget,
    },
  );
  useShortcutAction(
    COLUMN_SHEET_SHORTCUTS.save,
    () => {
      submitAddColumnFromSheet();
    },
    {
      enabled: isAddColumnSheetOpen,
      allowInEditableContext: true,
      guard: isColumnSheetShortcutTarget,
    },
  );

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
        ...availableGroups.filter(
          (groupName) => !withCandidate.includes(groupName),
        ),
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

  function resolveSystemTabKeyForTabTitle(
    tabTitle: string,
  ): SystemTabKey | undefined {
    const normalized = tabTitle.trim().toLowerCase();
    if (!normalized) return undefined;
    const entries = Object.entries(systemTabs) as Array<
      [SystemTabKey, SystemTabState[SystemTabKey]]
    >;
    const matched = entries.find(
      ([, value]) => value.title.trim().toLowerCase() === normalized,
    );
    return matched?.[0];
  }

  function getNextWorkflowId() {
    let counter = availableWorkflows.length + 1;
    while (true) {
      const candidate = `${pluginId}.workflow.${counter}`;
      if (
        !availableWorkflows.some(
          (workflow) => workflow.workflowId === candidate,
        )
      ) {
        return candidate;
      }
      counter += 1;
    }
  }

  function openWorkflowEditorForTable(table: string) {
    const trimmedTable = table.trim();
    if (!trimmedTable) return;
    const schemaDoc = availableSchemaDocs.find(
      (candidate) => candidate.schemaId === trimmedTable,
    );
    if (!schemaDoc) {
      toast.error(`Schema "${trimmedTable}" was not found.`);
      return;
    }
    const scopedWorkflows = (schemaDoc.workflows ?? []).map((workflow) => ({
      ...workflow,
      table: trimmedTable,
      trigger: workflow.trigger
        ? {
            ...workflow.trigger,
            table: trimmedTable,
          }
        : undefined,
    }));
    const preferredWorkflow =
      scopedWorkflows.find(
        (workflowDoc) =>
          workflowDoc.workflowId === activeWorkflowId &&
          workflowDoc.table === trimmedTable,
      ) ??
      scopedWorkflows.find((workflowDoc) => workflowDoc.table === trimmedTable);
    if (activeSchemaId !== trimmedTable) {
      setActiveSchemaId(trimmedTable);
    }
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
    persistSchemaWorkflows(trimmedTable, [...scopedWorkflows, nextWorkflow]);
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

  function handleReorderTabs(
    fromTabTitle: string,
    toTabTitle: string,
    position: 'above' | 'below' = 'below',
  ) {
    const fromSystemKey = resolveSystemTabKeyForTabTitle(fromTabTitle);
    const toSystemKey = resolveSystemTabKeyForTabTitle(toTabTitle);
    const fromSchemaId = fromSystemKey
      ? undefined
      : resolveSchemaIdForTabTitle(fromTabTitle);
    const toSchemaId = toSystemKey
      ? undefined
      : resolveSchemaIdForTabTitle(toTabTitle);
    const fromToken = fromSystemKey
      ? toSystemTabOrderToken(fromSystemKey)
      : fromSchemaId
        ? toSchemaTabOrderToken(fromSchemaId)
        : null;
    const toToken = toSystemKey
      ? toSystemTabOrderToken(toSystemKey)
      : toSchemaId
        ? toSchemaTabOrderToken(toSchemaId)
        : null;
    if (!fromToken || !toToken || fromToken === toToken) return;

    updateSidebarAdminTabs((state) => {
      const current = computeOrderedTabTokens({
        tabOrder: state.tabOrder,
        schemaOrder: state.schemaTabs.map((tab) => tab.schema),
      });
      const fromIndex = current.indexOf(fromToken);
      const toIndex = current.indexOf(toToken);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const [movedToken] = current.splice(fromIndex, 1);
      if (!movedToken) return;
      const targetIndex = current.indexOf(toToken);
      if (targetIndex < 0) return;
      const insertAt = position === 'above' ? targetIndex : targetIndex + 1;
      current.splice(insertAt, 0, movedToken);
      state.tabOrder = current;

      const targetGroup = (() => {
        if (toSystemKey) {
          return state.systemTabs[toSystemKey].group?.trim() || undefined;
        }
        if (toSchemaId) {
          return (
            state.schemaTabs
              .find((tab) => tab.schema === toSchemaId)
              ?.group?.trim() || undefined
          );
        }
        return undefined;
      })();

      if (fromSystemKey) {
        state.systemTabs = {
          ...state.systemTabs,
          [fromSystemKey]: {
            ...state.systemTabs[fromSystemKey],
            group: targetGroup,
          },
        };
        return;
      }
      if (fromSchemaId) {
        state.schemaTabs = state.schemaTabs.map((tab) =>
          tab.schema === fromSchemaId
            ? {
                ...tab,
                group: targetGroup,
              }
            : tab,
        );
      }
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
    const nextAvailableSchemaDocs = [...availableSchemaDocs, nextSchemaDoc];
    persistSchemaDocs(nextAvailableSchemaDocs);
    updateSidebarAdminTabs(
      (state) => {
        state.schemaTabs = [
          ...state.schemaTabs.filter((tab) => tab.schema !== nextSchemaId),
          {
            schema: nextSchemaId,
            title: nextSchemaDoc.title ?? nextSchemaId,
            group: normalizedGroupName,
          },
        ];
      },
      { availableSchemaDocsOverride: nextAvailableSchemaDocs },
    );
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
    persistSchemaWorkflows(workflowEditorTable, [
      ...availableWorkflows,
      nextWorkflow,
    ]);
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
    persistSchemaWorkflows(workflowEditorTable, nextWorkflows);
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
    persistSchemaWorkflows(workflowEditorTable, [
      ...availableWorkflows,
      nextWorkflow,
    ]);
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
    persistSchemaWorkflows(workflowEditorTable, nextWorkflows);
    if (nextWorkflow.workflowId !== activeWorkflowId) {
      setActiveWorkflowId(nextWorkflow.workflowId);
    }
  }

  function applyTemplatePreset(releaseId: string) {
    let parsedReleaseId = parseReleaseId(releaseId);

    if (!parsedReleaseId) {
      const parts = releaseId.split('@');
      if (parts.length === 2) {
        parsedReleaseId = {
          pluginId: parts[0]?.trim(),
          version: parts[1]?.trim(),
        };
      }
    }

    if (!parsedReleaseId) {
      toast.error('Failed to parse template release id.');
      return;
    }

    const template = templates.find((release) => {
      const candidatePluginId = String(release.pluginId ?? '').trim();
      const candidateVersion = String(release.version ?? '').trim();
      return (
        candidatePluginId === parsedReleaseId.pluginId &&
        candidateVersion === parsedReleaseId.version
      );
    });

    if (!template) {
      toast.error('Template was not found.');
      return;
    }

    persistDraftMetadata({
      title: template.docs?.title ?? defaultPluginTitle,
      description: template.docs?.description ?? '',
    });
    persistActionManifestDocs(template.actionManifest);
    const nextSchemaDocs =
      template.schemaDocs && template.schemaDocs.length > 0
        ? template.schemaDocs
        : toFallbackTemplateSchemaDocs(template);
    const nextActiveSchema = nextSchemaDocs[0] ?? DEFAULT_SCHEMA_DOC;

    persistSchemaDocs(nextSchemaDocs);
    setActiveSchemaId(nextActiveSchema.schemaId);
    setActiveWorkflowId(DEFAULT_WORKFLOW_DOC.workflowId);
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
        subdomains,
        subdomainUiLayers,
        cloudflareDnsAutoConfigured,
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

  if (isSubdomainStudioMode) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-background via-background to-accent/10">
        <div className="pointer-events-none absolute -top-24 right-[-8%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[-6%] h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div
          className={
            isSubdomainBuilderOpen
              ? 'w-full px-0 py-0'
              : 'mx-auto w-full max-w-7xl px-4 py-6 md:py-8'
          }
        >
          <div className="relative space-y-6">
            {isSubdomainBuilderOpen ? (
              <div className="relative h-dvh w-full">
                <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/90 p-2 shadow-sm backdrop-blur">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeSubdomainBuilder}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    All subdomains
                  </Button>
                  <Badge variant="secondary">{selectedSubdomain}</Badge>
                  <Button type="button" onClick={handleAddSubdomain}>
                    <Plus className="mr-2 size-4" />
                    Add subdomain
                  </Button>
                </div>
                <div className="h-dvh w-full overflow-hidden">
                  <ContextDataStore contextData={subdomainContextData}>
                    <UIBuilder
                      componentRegistry={subdomainComponentRegistry}
                      initialLayers={selectedSubdomainLayers}
                      onChange={handleSubdomainBuilderLayersChange}
                      persistLayerStore={false}
                      createNew={false}
                      enableFocusMode
                    />
                  </ContextDataStore>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="group flex items-start gap-2">
                      {editingMetadataField === 'title' ? (
                        <Input
                          value={editingMetadataValue}
                          autoFocus
                          placeholder="Plugin name"
                          onChange={(event) =>
                            setEditingMetadataValue(event.target.value)
                          }
                          onBlur={commitMetadataEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitMetadataEdit();
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              stopMetadataEdit();
                            }
                          }}
                          className="h-11 border-border/70 bg-background/80 text-2xl font-semibold text-foreground placeholder:text-muted-foreground md:text-3xl"
                        />
                      ) : (
                        <p className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-2xl font-semibold text-transparent md:text-3xl">
                          {activeDraftTitle}
                        </p>
                      )}
                      {editingMetadataField === 'title' ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => beginMetadataEdit('title')}
                          className="size-8 rounded-full border border-border/70 bg-background/75 p-0 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
                          aria-label="Edit title"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="group flex items-start gap-2">
                      {editingMetadataField === 'description' ? (
                        <Textarea
                          value={editingMetadataValue}
                          autoFocus
                          placeholder="Add a description"
                          onChange={(event) =>
                            setEditingMetadataValue(event.target.value)
                          }
                          onBlur={commitMetadataEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              stopMetadataEdit();
                            }
                            if (
                              event.key === 'Enter' &&
                              (event.metaKey || event.ctrlKey)
                            ) {
                              event.preventDefault();
                              commitMetadataEdit();
                            }
                          }}
                          className="min-h-[88px] resize-none border-border/70 bg-background/80 text-base leading-relaxed text-foreground placeholder:text-muted-foreground"
                        />
                      ) : (
                        <p className="text-base text-muted-foreground">
                          {activeDraftDescription || 'Add a description'}
                        </p>
                      )}
                      {editingMetadataField === 'description' ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => beginMetadataEdit('description')}
                          className="size-8 rounded-full border border-border/70 bg-background/75 p-0 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
                          aria-label="Edit description"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button type="button" onClick={handleAddSubdomain}>
                    <Plus className="mr-2 size-4" />
                    Add subdomain
                  </Button>
                </div>

                <Sortable
                  value={subdomains}
                  onValueChange={handleSubdomainOrderChange}
                  getItemValue={(entry) =>
                    normalizeSubdomainName(entry.subdomain)
                  }
                  orientation="mixed"
                >
                  <SortableContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subdomains.map((entry) => {
                      const normalizedSubdomain = normalizeSubdomainName(
                        entry.subdomain,
                      );
                      const previewLayers = getSubdomainLayers(entry);
                      const previewPage = previewLayers[0];
                      const displayTitle =
                        normalizedSubdomain === 'index'
                          ? 'Home'
                          : normalizedSubdomain === 'admin'
                            ? 'Admin'
                            : normalizedSubdomain;
                      const isDefaultSubdomain =
                        normalizedSubdomain === 'index' ||
                        normalizedSubdomain === 'admin';
                      const selectedAccessRule = entry.accessRule ?? null;
                      const isRouteGuardPopoverOpen =
                        openRouteGuardSubdomain === normalizedSubdomain;
                      const selectedAccessRuleLabel =
                        selectedAccessRule === 'organization-member'
                          ? 'Business members'
                          : selectedAccessRule === 'authenticated-user'
                            ? 'Authenticated users'
                            : 'Anyone';
                      const isEditingTitle =
                        editingSubdomainTitle?.originalSubdomain ===
                        entry.subdomain;
                      return (
                        <SortableItem
                          key={normalizedSubdomain}
                          value={normalizedSubdomain}
                          asChild
                        >
                          <div className="space-y-2">
                            <div className="group block h-72 w-full rounded-2xl border border-border/70 bg-card p-4 text-left transition duration-300 hover:border-primary/40 hover:bg-accent/20 hover:shadow-sm">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="group/title flex items-center gap-1">
                                  {isEditingTitle ? (
                                    <Input
                                      value={editingSubdomainTitle.value}
                                      autoFocus
                                      placeholder="Subdomain title"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      onChange={(event) =>
                                        setEditingSubdomainTitle((current) =>
                                          current
                                            ? {
                                                ...current,
                                                value: event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                      onBlur={commitSubdomainTitleEdit}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          commitSubdomainTitleEdit();
                                        }
                                        if (event.key === 'Escape') {
                                          event.preventDefault();
                                          cancelSubdomainTitleEdit();
                                        }
                                      }}
                                      className="h-8 w-40"
                                    />
                                  ) : (
                                    <>
                                      <p className="text-sm font-semibold tracking-wide text-foreground">
                                        {displayTitle}
                                      </p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="size-7 p-0 opacity-0 transition group-hover/title:opacity-100"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          beginSubdomainTitleEdit(
                                            entry.subdomain,
                                          );
                                        }}
                                        aria-label={`Edit ${displayTitle} title`}
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="relative h-7 w-[124px]">
                                    <Badge
                                      variant="secondary"
                                      className={`absolute right-0 top-0 transition-opacity ${
                                        isRouteGuardPopoverOpen
                                          ? 'pointer-events-none opacity-0'
                                          : 'opacity-100 group-hover:pointer-events-none group-hover:opacity-0 group-focus-within:pointer-events-none group-focus-within:opacity-0'
                                      }`}
                                    >
                                      Live preview
                                    </Badge>
                                    <div
                                      className={`absolute right-0 top-0 flex items-center gap-1.5 transition-opacity ${
                                        isRouteGuardPopoverOpen
                                          ? 'opacity-100'
                                          : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
                                      }`}
                                    >
                                      <Popover
                                        open={isRouteGuardPopoverOpen}
                                        onOpenChange={(nextOpen) => {
                                          setOpenRouteGuardSubdomain(
                                            nextOpen
                                              ? normalizedSubdomain
                                              : null,
                                          );
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="size-7 rounded-md border border-border/70 bg-background/90 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setOpenRouteGuardSubdomain(
                                                isRouteGuardPopoverOpen
                                                  ? null
                                                  : normalizedSubdomain,
                                              );
                                            }}
                                            aria-label={`Configure ${displayTitle} route guard`}
                                          >
                                            <Shield className="size-3.5" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          align="end"
                                          className="w-56 p-2"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                          }}
                                        >
                                          <div className="mb-2 px-1">
                                            <p className="text-xs font-medium text-foreground">
                                              Route guard
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Current: {selectedAccessRuleLabel}
                                            </p>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant={
                                                selectedAccessRule === null
                                                  ? 'secondary'
                                                  : 'ghost'
                                              }
                                              className="justify-start"
                                              onClick={() => {
                                                handleSubdomainChange(
                                                  entry.subdomain,
                                                  { accessRule: null },
                                                );
                                                setOpenRouteGuardSubdomain(
                                                  null,
                                                );
                                              }}
                                            >
                                              Anyone
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant={
                                                selectedAccessRule ===
                                                'authenticated-user'
                                                  ? 'secondary'
                                                  : 'ghost'
                                              }
                                              className="justify-start"
                                              onClick={() => {
                                                handleSubdomainChange(
                                                  entry.subdomain,
                                                  {
                                                    accessRule:
                                                      'authenticated-user',
                                                  },
                                                );
                                                setOpenRouteGuardSubdomain(
                                                  null,
                                                );
                                              }}
                                            >
                                              Authenticated users
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant={
                                                selectedAccessRule ===
                                                'organization-member'
                                                  ? 'secondary'
                                                  : 'ghost'
                                              }
                                              className="justify-start"
                                              onClick={() => {
                                                handleSubdomainChange(
                                                  entry.subdomain,
                                                  {
                                                    accessRule:
                                                      'organization-member',
                                                  },
                                                );
                                                setOpenRouteGuardSubdomain(
                                                  null,
                                                );
                                              }}
                                            >
                                              Business members
                                            </Button>
                                            <p className="px-1 pt-1 text-[11px] text-muted-foreground">
                                              System admins always keep access.
                                            </p>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="size-7 p-0"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setPendingDeleteSubdomain(
                                            entry.subdomain,
                                          );
                                        }}
                                        disabled={isDefaultSubdomain}
                                        aria-label={`Delete ${displayTitle} subdomain`}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="hidden items-center gap-1 group-hover:inline-flex group-focus-within:inline-flex">
                                    <SortableItemHandle
                                      data-subdomain-reorder-handle="true"
                                      aria-label={`Reorder ${displayTitle}`}
                                      className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/90 p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                      onPointerDownCapture={(event) => {
                                        event.stopPropagation();
                                      }}
                                      onClickCapture={(event) => {
                                        event.stopPropagation();
                                      }}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                      }}
                                      onKeyDown={(event) => {
                                        event.stopPropagation();
                                      }}
                                    >
                                      <GripVertical className="size-3.5" />
                                    </SortableItemHandle>
                                  </div>
                                </div>
                              </div>
                              <div
                                role="button"
                                tabIndex={0}
                                className="relative h-[calc(100%-2.25rem)] overflow-hidden rounded-xl border border-border/70 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openSubdomainBuilder(normalizedSubdomain);
                                }}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                  ) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    openSubdomainBuilder(normalizedSubdomain);
                                  }
                                }}
                                aria-label={`Open ${displayTitle} builder`}
                              >
                                {previewPage ? (
                                  <div className="pointer-events-none absolute left-0 top-0 h-[500%] w-[500%] origin-top-left scale-[0.2]">
                                    <ContextDataStore
                                      contextData={{
                                        ...subdomainContextData,
                                        subdomain: normalizedSubdomain,
                                      }}
                                    >
                                      <LayerRenderer
                                        componentRegistry={
                                          subdomainComponentRegistry
                                        }
                                        page={previewPage}
                                        className="min-h-screen w-screen bg-background"
                                      />
                                    </ContextDataStore>
                                  </div>
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                    No preview available yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </SortableItem>
                      );
                    })}
                  </SortableContent>
                </Sortable>
              </>
            )}
            <AlertDialog
              open={pendingDeleteSubdomain !== null}
              onOpenChange={handleDeleteSubdomainDialogOpenChange}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete subdomain?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {pendingDeleteSubdomain
                      ? `Subdomain "${pendingDeleteSubdomain}" will be removed from this plugin workspace.`
                      : 'This subdomain will be removed from this plugin workspace.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteSubdomain}>
                    Delete Subdomain
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="mx-auto w-full max-w-7xl px-4 space-y-4">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              void navigate({
                to: '/plugin-studio/$projectId',
                params: { projectId },
              })
            }
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to plugins
          </Button>
        </div>
        <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/15 p-5 md:p-7">
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="w-full max-w-3xl">
              <div className="space-y-3">
                <div className="group flex items-start gap-2">
                  {editingMetadataField === 'title' ? (
                    <Input
                      value={editingMetadataValue}
                      autoFocus
                      placeholder="Plugin name"
                      onChange={(event) =>
                        setEditingMetadataValue(event.target.value)
                      }
                      onBlur={commitMetadataEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitMetadataEdit();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          stopMetadataEdit();
                        }
                      }}
                      className="h-12 text-3xl font-bold tracking-[-0.02em] md:h-14 md:text-5xl"
                    />
                  ) : (
                    <p className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-transparent text-balance md:text-5xl">
                      {activeDraftTitle}
                    </p>
                  )}
                  {editingMetadataField === 'title' ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => beginMetadataEdit('title')}
                      className="size-8 rounded-full border border-border/60 bg-background/75 p-0 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label="Edit title"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="group flex items-start gap-2">
                  {editingMetadataField === 'description' ? (
                    <Textarea
                      value={editingMetadataValue}
                      autoFocus
                      placeholder="Add a description"
                      onChange={(event) =>
                        setEditingMetadataValue(event.target.value)
                      }
                      onBlur={commitMetadataEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          stopMetadataEdit();
                        }
                        if (
                          event.key === 'Enter' &&
                          (event.metaKey || event.ctrlKey)
                        ) {
                          event.preventDefault();
                          commitMetadataEdit();
                        }
                      }}
                      className="min-h-[108px] resize-none text-base leading-relaxed"
                    />
                  ) : (
                    <p className="max-w-2xl text-base leading-relaxed text-balance text-muted-foreground/90 md:text-lg">
                      {activeDraftDescription || 'Add a description'}
                    </p>
                  )}
                  {editingMetadataField === 'description' ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => beginMetadataEdit('description')}
                      className="size-8 rounded-full border border-border/60 bg-background/75 p-0 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label="Edit description"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-border/70 bg-card/90">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Subdomain Projects</CardTitle>
            <CardDescription>
              Create subdomain projects. Routing, DNS, and infra mapping are
              handled automatically. <code>admin</code> is bootstrapped with
              AutoAdmin by default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {subdomains.map((entry) => {
                const normalizedSubdomain = normalizeSubdomainName(
                  entry.subdomain,
                );
                const isDefaultSubdomain =
                  normalizedSubdomain === 'index' ||
                  normalizedSubdomain === 'admin';
                return (
                  <div
                    key={normalizedSubdomain}
                    className="grid gap-3 rounded-lg border border-border/60 bg-background/40 p-3 md:grid-cols-[1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label>Project</Label>
                      <Input
                        value={entry.subdomain}
                        onChange={(event) =>
                          handleSubdomainChange(entry.subdomain, {
                            subdomain: event.target.value,
                          })
                        }
                        placeholder="subdomain name"
                      />
                      <p className="text-xs text-muted-foreground">
                        Blank UI Builder project on{' '}
                        <code>{normalizedSubdomain}</code>.
                      </p>
                    </div>
                    <div className="flex flex-col items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">UI Builder</Badge>
                        <Badge
                          variant={
                            entry.autoAdminInjected ? 'default' : 'outline'
                          }
                        >
                          {entry.autoAdminInjected
                            ? 'AutoAdmin bootstrapped'
                            : 'Blank canvas'}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void navigate({
                              to: '.',
                              search: (current) => ({
                                ...(current as Record<string, unknown>),
                                tab: systemTabs.dashboard.title,
                              }),
                            })
                          }
                        >
                          Open project
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSubdomain(entry.subdomain)}
                          disabled={isDefaultSubdomain}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSubdomain}
            >
              <Plus className="mr-2 size-4" />
              New subdomain project
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Sidebar Builder</CardTitle>
              <CardDescription>
                Design tables, columns, and workflows inline while the admin UI
                renders from the same schema docs in real time.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/65">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsTemplatesDialogOpen(true)}
                    className="size-9 rounded-md hover:bg-accent/70"
                    aria-label="Open starter templates"
                  >
                    <Wand2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Starter Templates</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      size="icon"
                      variant="default"
                      disabled={!isValidInputs || isPublishing}
                      onClick={() => {
                        if (!isValidInputs) return;
                        void publishRelease();
                      }}
                      className="size-9 rounded-md shadow-sm"
                      aria-label={
                        isPublishing ? 'Publishing plugin' : 'Publish plugin'
                      }
                    >
                      <CloudUpload
                        className={
                          isPublishing ? 'size-4 animate-pulse' : 'size-4'
                        }
                      />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isPublishing ? 'Publishing...' : 'Publish Plugin'}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4">
            {parsed === null ? (
              <div className="p-4 text-sm text-muted-foreground">
                Fix schema/workflow JSON parse issues to render preview.
              </div>
            ) : livePreviewTabs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Add at least one table schema to render live preview.
              </div>
            ) : (
              <div className="min-w-0 max-w-full overflow-x-auto">
                <AutoAdmin
                  tabs={livePreviewTabs}
                  tabOrder={tabOrder}
                  editable
                  onAddTable={handleAddSchema}
                  onAddGroup={handleAddGroup}
                  onReorderGroups={handleReorderGroups}
                  onMoveTabToGroup={handleMoveTabToGroup}
                  onReorderTabs={handleReorderTabs}
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
              </div>
            )}
          </CardContent>
        </Card>
        <PluginStudioV3Tabs
          schemaDocs={parsed?.schemaDocs ?? []}
          workflows={parsed?.workflows ?? []}
          actionManifest={parsed?.actionManifest ?? []}
          diagnostics={v3PublishGateDiagnostics}
          jobCount={workflowJobs.length}
          eventLogCount={workflowEventLogs.length}
        />

        <Sheet
          open={isAddColumnSheetOpen}
          onOpenChange={handleColumnSheetOpenChange}
        >
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-lg"
            data-plugin-studio-column-sheet-content="true"
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
                  <Label htmlFor={addColumnKeyId}>Column key</Label>
                  <Input
                    id={addColumnKeyId}
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
                  <Label htmlFor={addColumnLabelId}>Label</Label>
                  <Input
                    id={addColumnLabelId}
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
                <Label htmlFor={addColumnDescriptionId}>Description</Label>
                <Input
                  id={addColumnDescriptionId}
                  value={addColumnDraft.description}
                  onChange={(event) =>
                    setAddColumnDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={addColumnClassNameId}>Field className</Label>
                <div id={addColumnClassNameId}>
                  <ClassNameFieldControl
                    value={addColumnDraft.inputClassName}
                    onChange={(value) =>
                      setAddColumnDraft((current) => ({
                        ...current,
                        inputClassName: value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Field type</Label>
                <Combobox
                  options={BUILDER_FIELD_TYPE_OPTIONS}
                  value={addColumnDraft.type}
                  onValueChange={(value) => {
                    if (!isBuilderFieldType(value)) return;
                    setAddColumnDraft((current) => {
                      const nextSelection = resolveFieldTypeSelection(
                        value,
                        current.fieldType,
                      );
                      return {
                        ...current,
                        type: nextSelection.type,
                        fieldType: nextSelection.fieldType,
                      };
                    });
                  }}
                  placeholder="Search field type"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={addColumnDefaultId}>Default value</Label>
                  <Input
                    id={addColumnDefaultId}
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
                  <Label htmlFor={addColumnEnumId}>Enum values</Label>
                  <div id={addColumnEnumId}>
                    <StringListEditor
                      values={addColumnDraft.enumValues}
                      onChange={(nextValues) =>
                        setAddColumnDraft((current) => ({
                          ...current,
                          enumValues: nextValues,
                        }))
                      }
                      addLabel="Add Value"
                      emptyLabel="Enum values"
                      itemPlaceholder="Enum value"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={addColumnMinId}>Min</Label>
                  <Input
                    id={addColumnMinId}
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
                  <Label htmlFor={addColumnMaxId}>Max</Label>
                  <Input
                    id={addColumnMaxId}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeColumnSheet}
                  >
                    Cancel
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>Cancel</span>
                  <ShortcutKbd
                    actionId={COLUMN_SHEET_SHORTCUTS.cancel.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" onClick={submitAddColumnFromSheet}>
                    {columnSheetMode === 'edit' ? 'Save Column' : 'Add Column'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>
                    {columnSheetMode === 'edit' ? 'Save column' : 'Add column'}
                  </span>
                  <ShortcutKbd
                    actionId={COLUMN_SHEET_SHORTCUTS.save.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
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
                  className={`rounded-xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    selectedTemplateLabel === template.docs?.title
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
                  <Label htmlFor={schemaEditorSchemaIdInputId}>Schema ID</Label>
                  <Input
                    id={schemaEditorSchemaIdInputId}
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
                  <Label htmlFor={schemaEditorSchemaTitleInputId}>
                    Schema title
                  </Label>
                  <Input
                    id={schemaEditorSchemaTitleInputId}
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
                    {
                      excludeKeys: BUILDER_CUSTOM_DATA_RESERVED_KEYS,
                    },
                  );
                  const customDataDisableWhenValueIn = readJsonStringArrayEntry(
                    field.customDataJson,
                    'disableWhenValueIn',
                  );
                  const customDataOnlyAllow = readJsonStringArrayEntry(
                    field.customDataJson,
                    'onlyAllow',
                  );
                  const customDataDisplayKey = readJsonStringEntry(
                    field.customDataJson,
                    'displayKey',
                  );
                  const customDataSource = readJsonEntryText(
                    field.customDataJson,
                    'source',
                  );
                  const customDataSources = readJsonEntryText(
                    field.customDataJson,
                    'sources',
                  );
                  const customDataOptions = readJsonEntryText(
                    field.customDataJson,
                    'options',
                  );
                  const customDataOptionPairs = readJsonOptionPairsEntry(
                    field.customDataJson,
                    'options',
                  );
                  const customDataTabs = readJsonEntryText(
                    field.customDataJson,
                    'tabs',
                  );
                  const customDataOnValueChange = readJsonEntryText(
                    field.customDataJson,
                    'onValueChange',
                  );
                  const customDataConfigDisabled = readJsonBooleanEntry(
                    field.customDataJson,
                    'configDisabled',
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
                          <div id={`schema-field-type-${field.id}`}>
                            <Combobox
                              options={BUILDER_FIELD_TYPE_OPTIONS}
                              value={field.type}
                              onValueChange={(value) => {
                                if (!isBuilderFieldType(value)) return;
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) => {
                                      if (candidateIndex !== fieldIndex) {
                                        return candidate;
                                      }
                                      const nextSelection =
                                        resolveFieldTypeSelection(
                                          value,
                                          candidate.fieldType ?? 'string',
                                        );
                                      return {
                                        ...candidate,
                                        type: nextSelection.type,
                                        fieldType: nextSelection.fieldType,
                                      };
                                    },
                                  ),
                                }));
                              }}
                              placeholder="Search field type"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
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
                          <div id={`schema-field-enum-values-${field.id}`}>
                            <StringListEditor
                              values={field.enumValues ?? []}
                              onChange={(nextValues) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            enumValues: nextValues,
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              addLabel="Add Value"
                              emptyLabel="Enum values"
                              itemPlaceholder="Enum value"
                            />
                          </div>
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
                            <div
                              id={`schema-field-array-item-type-${field.id}`}
                            >
                              <Combobox
                                options={BUILDER_LEAF_FIELD_TYPE_OPTIONS}
                                value={field.arrayItemType ?? 'string'}
                                onValueChange={(value) => {
                                  if (!isBuilderLeafFieldType(value)) return;
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              arrayItemType: value,
                                            }
                                          : candidate,
                                    ),
                                  }));
                                }}
                                placeholder="Search array item type"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-array-enum-values-${field.id}`}
                            >
                              Array enum values
                            </Label>
                            <div
                              id={`schema-field-array-enum-values-${field.id}`}
                              className={
                                !isChoiceFieldType(field.arrayItemType)
                                  ? 'pointer-events-none opacity-60'
                                  : undefined
                              }
                            >
                              <StringListEditor
                                values={field.arrayItemEnumValues ?? []}
                                onChange={(nextValues) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              arrayItemEnumValues: nextValues,
                                            }
                                          : candidate,
                                    ),
                                  }))
                                }
                                addLabel="Add Value"
                                emptyLabel="Array enum values"
                                itemPlaceholder="Array enum value"
                              />
                            </div>
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
                        <div className="text-xs font-medium">
                          Common Custom Data Controls
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-custom-display-key-${field.id}`}
                            >
                              displayKey
                            </Label>
                            <Input
                              id={`schema-field-custom-display-key-${field.id}`}
                              value={customDataDisplayKey}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            customDataJson: setJsonStringEntry(
                                              candidate.customDataJson,
                                              'displayKey',
                                              event.target.value,
                                            ),
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Display key"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-custom-source-${field.id}`}
                            >
                              source (JSON)
                            </Label>
                            <Textarea
                              id={`schema-field-custom-source-${field.id}`}
                              rows={3}
                              value={customDataSource}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            customDataJson: setJsonEntryValue(
                                              candidate.customDataJson,
                                              'source',
                                              event.target.value,
                                            ),
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder='{"table":"product","displayKey":"title"}'
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label
                              htmlFor={`schema-field-custom-sources-${field.id}`}
                            >
                              sources (JSON)
                            </Label>
                            <Textarea
                              id={`schema-field-custom-sources-${field.id}`}
                              rows={3}
                              value={customDataSources}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            customDataJson: setJsonEntryValue(
                                              candidate.customDataJson,
                                              'sources',
                                              event.target.value,
                                            ),
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder='[{"table":"product","displayKey":"title"}]'
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label
                              htmlFor={`schema-field-custom-options-${field.id}`}
                            >
                              options
                            </Label>
                            <div
                              id={`schema-field-custom-options-${field.id}`}
                              className="space-y-2 rounded-md border p-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  Value/label pairs used by select-like fields.
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
                                                customDataJson:
                                                  setJsonOptionPairsEntry(
                                                    candidate.customDataJson,
                                                    'options',
                                                    [
                                                      ...readJsonOptionPairsEntry(
                                                        candidate.customDataJson,
                                                        'options',
                                                      ),
                                                      { value: '', label: '' },
                                                    ],
                                                  ),
                                              }
                                            : candidate,
                                      ),
                                    }))
                                  }
                                >
                                  <Plus className="mr-2 size-4" />
                                  Add Option
                                </Button>
                              </div>
                              {customDataOptionPairs.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No options yet.
                                </p>
                              ) : null}
                              {customDataOptionPairs.map(
                                (pair, optionIndex) => (
                                  <div
                                    key={`${field.id}-option-pair-${optionIndex}`}
                                    className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                                  >
                                    <Input
                                      value={pair.value}
                                      onChange={(event) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (candidate, candidateIndex) =>
                                              candidateIndex === fieldIndex
                                                ? {
                                                    ...candidate,
                                                    customDataJson:
                                                      setJsonOptionPairsEntry(
                                                        candidate.customDataJson,
                                                        'options',
                                                        readJsonOptionPairsEntry(
                                                          candidate.customDataJson,
                                                          'options',
                                                        ).map(
                                                          (
                                                            entry,
                                                            entryIndex,
                                                          ) =>
                                                            entryIndex ===
                                                            optionIndex
                                                              ? {
                                                                  ...entry,
                                                                  value:
                                                                    event.target
                                                                      .value,
                                                                }
                                                              : entry,
                                                        ),
                                                      ),
                                                  }
                                                : candidate,
                                          ),
                                        }))
                                      }
                                      placeholder="Option value"
                                    />
                                    <Input
                                      value={pair.label}
                                      onChange={(event) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (candidate, candidateIndex) =>
                                              candidateIndex === fieldIndex
                                                ? {
                                                    ...candidate,
                                                    customDataJson:
                                                      setJsonOptionPairsEntry(
                                                        candidate.customDataJson,
                                                        'options',
                                                        readJsonOptionPairsEntry(
                                                          candidate.customDataJson,
                                                          'options',
                                                        ).map(
                                                          (
                                                            entry,
                                                            entryIndex,
                                                          ) =>
                                                            entryIndex ===
                                                            optionIndex
                                                              ? {
                                                                  ...entry,
                                                                  label:
                                                                    event.target
                                                                      .value,
                                                                }
                                                              : entry,
                                                        ),
                                                      ),
                                                  }
                                                : candidate,
                                          ),
                                        }))
                                      }
                                      placeholder="Option label"
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
                                                    customDataJson:
                                                      setJsonOptionPairsEntry(
                                                        candidate.customDataJson,
                                                        'options',
                                                        readJsonOptionPairsEntry(
                                                          candidate.customDataJson,
                                                          'options',
                                                        ).filter(
                                                          (_, entryIndex) =>
                                                            entryIndex !==
                                                            optionIndex,
                                                        ),
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
                              <Textarea
                                rows={2}
                                value={customDataOptions}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              customDataJson: setJsonEntryValue(
                                                candidate.customDataJson,
                                                'options',
                                                event.target.value,
                                              ),
                                            }
                                          : candidate,
                                    ),
                                  }))
                                }
                                placeholder='Raw override: [["draft","Draft"],["published","Published"]]'
                              />
                            </div>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label
                              htmlFor={`schema-field-custom-tabs-${field.id}`}
                            >
                              tabs (JSON)
                            </Label>
                            <Textarea
                              id={`schema-field-custom-tabs-${field.id}`}
                              rows={2}
                              value={customDataTabs}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            customDataJson: setJsonEntryValue(
                                              candidate.customDataJson,
                                              'tabs',
                                              event.target.value,
                                            ),
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder='[{"id":"overview","label":"Overview"}]'
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label
                              htmlFor={`schema-field-custom-on-value-change-${field.id}`}
                            >
                              onValueChange plan (JSON)
                            </Label>
                            <Textarea
                              id={`schema-field-custom-on-value-change-${field.id}`}
                              rows={4}
                              value={customDataOnValueChange}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === fieldIndex
                                        ? {
                                            ...candidate,
                                            customDataJson: setJsonEntryValue(
                                              candidate.customDataJson,
                                              'onValueChange',
                                              event.target.value,
                                            ),
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder='{"actions":[{"type":"form.setValue","field":"status","value":{"kind":"ref","source":"payload","path":[]}}]}'
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-custom-disable-values-${field.id}`}
                            >
                              disableWhenValueIn
                            </Label>
                            <div
                              id={`schema-field-custom-disable-values-${field.id}`}
                            >
                              <StringListEditor
                                values={customDataDisableWhenValueIn}
                                onChange={(nextValues) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              customDataJson:
                                                setJsonStringArrayEntry(
                                                  candidate.customDataJson,
                                                  'disableWhenValueIn',
                                                  nextValues,
                                                ),
                                            }
                                          : candidate,
                                    ),
                                  }))
                                }
                                addLabel="Add Value"
                                emptyLabel="Disable values"
                                itemPlaceholder="Value"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`schema-field-custom-only-allow-${field.id}`}
                            >
                              onlyAllow
                            </Label>
                            <div
                              id={`schema-field-custom-only-allow-${field.id}`}
                            >
                              <StringListEditor
                                values={customDataOnlyAllow}
                                onChange={(nextValues) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              customDataJson:
                                                setJsonStringArrayEntry(
                                                  candidate.customDataJson,
                                                  'onlyAllow',
                                                  nextValues,
                                                ),
                                            }
                                          : candidate,
                                    ),
                                  }))
                                }
                                addLabel="Add Value"
                                emptyLabel="Allowed values"
                                itemPlaceholder="Value"
                              />
                            </div>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label className="flex items-center gap-2 text-sm font-normal">
                              <Checkbox
                                checked={customDataConfigDisabled}
                                onCheckedChange={(checked) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (candidate, candidateIndex) =>
                                        candidateIndex === fieldIndex
                                          ? {
                                              ...candidate,
                                              customDataJson:
                                                setJsonBooleanEntry(
                                                  candidate.customDataJson,
                                                  'configDisabled',
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
                              configDisabled
                            </Label>
                          </div>
                        </div>
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
                    <Label htmlFor={logicComposerFieldId}>
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
                        id={logicComposerFieldId}
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
                        <div className="text-sm font-medium">
                          Workflow Library
                        </div>
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
                        <Label htmlFor={workflowEditorSelectorId}>
                          Workflow
                        </Label>
                        <Select
                          value={workspaceWorkflow.workflowId}
                          onValueChange={(value) => setActiveWorkflowId(value)}
                        >
                          <SelectTrigger id={workflowEditorSelectorId}>
                            <SelectValue placeholder="Select workflow" />
                          </SelectTrigger>
                          <SelectContent>
                            {workflowEditorScopedWorkflows.map((workflow) => (
                              <SelectItem
                                key={workflow.workflowId}
                                value={workflow.workflowId}
                              >
                                {workflow.workflowId} ({workflow.table} ·{' '}
                                {workflow.hook})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddWorkflow}
                        >
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
                          onClick={() =>
                            handleRemoveWorkflow(workspaceWorkflow.workflowId)
                          }
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
                      <Label htmlFor={workflowEditorWorkflowIdInputId}>
                        Workflow ID
                      </Label>
                      <Input
                        id={workflowEditorWorkflowIdInputId}
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
                      <Label htmlFor={workflowEditorTableInputId}>
                        Connected Schema ID
                      </Label>
                      <Input
                        id={workflowEditorTableInputId}
                        value={workflowEditorTable}
                        readOnly
                        placeholder="Connected schema ID"
                        disabled
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={workflowEditorHookId}>Hook</Label>
                      <Select
                        value={workspaceWorkflow.hook}
                        onValueChange={(value) =>
                          updateActiveWorkflow((current) => ({
                            ...current,
                            hook: value as WorkflowDoc['hook'],
                          }))
                        }
                      >
                        <SelectTrigger id={workflowEditorHookId}>
                          <SelectValue placeholder="Hook" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beforeCreate">
                            beforeCreate
                          </SelectItem>
                          <SelectItem value="afterCreate">
                            afterCreate
                          </SelectItem>
                          <SelectItem value="beforeUpdate">
                            beforeUpdate
                          </SelectItem>
                          <SelectItem value="afterUpdate">
                            afterUpdate
                          </SelectItem>
                          <SelectItem value="beforeDelete">
                            beforeDelete
                          </SelectItem>
                          <SelectItem value="afterDelete">
                            afterDelete
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-2">
                    <WorkflowGraphEditor
                      workflow={workspaceWorkflow}
                      onWorkflowChange={(nextWorkflow) =>
                        updateActiveWorkflow(() => nextWorkflow)
                      }
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
                      {selectedBlocklyField.type}` field. Literal blocks can
                      still be used right now.
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
    <div className="min-h-screen w-full bg-background text-foreground py-6">
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
                  <Skeleton
                    key={skeletonId}
                    className="h-14 w-full rounded-lg"
                  />
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
