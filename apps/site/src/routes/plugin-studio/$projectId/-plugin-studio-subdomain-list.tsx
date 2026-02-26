import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { GripVertical, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { PluginStudioEditableAutoAdmin } from '@/components/auto-admin/auto-admin-plugin-studio-editable';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { Textarea } from '@/components/ui/textarea';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { api } from '@/lib/api';
import type {
  AdminTabDoc,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
} from '@/lib/plugins/types';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { shouldCreatePluginDraft } from '../-draft-creation-guard';
import { toProjectScopedDraftId } from '../-plugin-studio-project-draft-id';

type PluginStudioSubdomainListProps = {
  projectId: string;
  pluginId: string;
};

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
      schema: 'example.table',
      title: 'Example Table',
    },
  ],
  orderedGroups: [],
  systemTabs: DEFAULT_SYSTEM_TABS,
  subdomains: DEFAULT_SUBDOMAIN_PIPELINE,
  cloudflareDnsAutoConfigured: true,
});

const baseSubdomainComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};

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

function formatUserHandle(userId: string): string {
  const segments = userId.split('/');
  const lastSegment = segments[segments.length - 1] ?? userId;
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
  if (slashTail) aliases.add(slashTail);
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

function toDraftRevisionRecencyKey(
  revision: Pick<PluginDraftRevisionDoc, 'createdAt' | 'revisionId'>,
) {
  return `${revision.createdAt ?? ''}:${revision.revisionId ?? ''}`;
}

function toDisplayPluginTitle(input: string | undefined, pluginId: string) {
  const fallback = pluginId;
  const normalizedInput = input?.trim() ?? '';
  if (!normalizedInput) return fallback;
  const withoutSuffix = normalizedInput.replace(
    /(?:\s*\([^)]*\)\s*$)|(?:\s*\[[^\]]*]\s*$)/,
    '',
  );
  if (!withoutSuffix.trim()) return fallback;
  return withoutSuffix;
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

function normalizeSubdomainAccessRule(
  value: string | undefined,
): SubdomainAccessRule | null {
  if (value === 'authenticated-user' || value === 'organization-member') {
    return value;
  }
  return null;
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

function isGroupSentinelSchemaId(schemaId: unknown): boolean {
  return (
    typeof schemaId === 'string' &&
    schemaId.startsWith(DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX)
  );
}

function toGroupSentinelSchemaId(index: number): string {
  return `${DRAFT_GROUP_SENTINEL_SCHEMA_PREFIX}${index}`;
}

function isSystemSentinelSchemaId(schemaId: unknown): schemaId is string {
  return (
    typeof schemaId === 'string' &&
    schemaId.startsWith(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX)
  );
}

function toSystemSentinelSchemaId(key: SystemTabKey): string {
  return `${DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX}${key}`;
}

function parseSystemSentinelSchemaId(schemaId: unknown): SystemTabKey | null {
  if (!isSystemSentinelSchemaId(schemaId)) return null;
  const key = schemaId.slice(DRAFT_SYSTEM_SENTINEL_SCHEMA_PREFIX.length);
  if (key === 'dashboard' || key === 'qr') {
    return key;
  }
  return null;
}

function isSubdomainSentinelSchemaId(schemaId: unknown): schemaId is string {
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

function toSubdomainGuardSentinelSchemaId(subdomain: string): string {
  return `${DRAFT_SUBDOMAIN_GUARD_SENTINEL_SCHEMA_PREFIX}${subdomain}`;
}

function toSubdomainUiSentinelSchemaId(subdomain: string): string {
  return `${DRAFT_SUBDOMAIN_UI_SENTINEL_SCHEMA_PREFIX}${subdomain}`;
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

  const schemaById = new Map(schemaTabs.map((tab) => [tab.schema, tab]));
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
        accessRule: null,
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

export function PluginStudioSubdomainList({
  projectId,
  pluginId,
}: PluginStudioSubdomainListProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

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

  const draftId = useMemo(
    () =>
      toProjectScopedDraftId({
        projectId,
        pluginId: pluginId || 'example.plugin',
      }),
    [projectId, pluginId],
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
  const { data: draftRevisionRows = [], isLoading: isDraftRevisionLoading } =
    api.pluginDraftRevision.useGet({
      keys: [draftId],
    });
  const { data: routesTabsConfigRows = [], refetch: refetchRoutesTabsConfig } =
    api.pluginRoutesTabsConfig.useGet({
      keys: [draftId],
    });

  const createRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useCreate({
    keys: [draftId],
  });
  const updateRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useUpdate({
    keys: [draftId],
  });
  const deleteRoutesTabsConfigMutation = api.pluginRoutesTabsConfig.useDelete({
    keys: [draftId],
  });

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

  const activeDraftRevisions = useMemo(
    () =>
      [...(draftRevisionRows as PluginDraftRevisionDoc[])].sort((left, right) =>
        toDraftRevisionRecencyKey(right).localeCompare(
          toDraftRevisionRecencyKey(left),
        ),
      ),
    [draftRevisionRows],
  );

  const latestActiveDraftRevision = activeDraftRevisions[0] ?? null;

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
    draftId,
    legacyRoutesTabsConfigId,
    routesTabsConfigRows,
  ]);

  const sourceAdminTabs = useMemo(
    () =>
      activeRoutesTabsConfigRow
        ? toAdminTabsFromDraftRoutes(activeRoutesTabsConfigRow.routes)
        : (latestActiveDraftRevision?.adminTabs ?? DEFAULT_DRAFT_ADMIN_TABS),
    [activeRoutesTabsConfigRow, latestActiveDraftRevision?.adminTabs],
  );

  const [draftAdminTabs, setDraftAdminTabs] =
    useState<AdminTabDoc[]>(sourceAdminTabs);
  const previousSourceAdminTabsRef = useRef(sourceAdminTabs);

  if (previousSourceAdminTabsRef.current !== sourceAdminTabs) {
    previousSourceAdminTabsRef.current = sourceAdminTabs;
    if (draftAdminTabs !== sourceAdminTabs) {
      setDraftAdminTabs(sourceAdminTabs);
    }
  }

  const parsedAdminTabs = useMemo(
    () => deserializeDraftAdminTabs(draftAdminTabs),
    [draftAdminTabs],
  );

  const subdomains = parsedAdminTabs.subdomains;
  const subdomainUiLayers = parsedAdminTabs.subdomainUiLayers;
  const livePreviewTabs = useMemo(
    () =>
      parsedAdminTabs.schemaTabs.map((tab) => ({
        tabId: tab.schema,
        title: tab.title ?? tab.schema,
        group: tab.group,
        iconName: tab.icon,
        children: (
          <div className="flex min-h-[40vh] items-center justify-center text-xs text-muted-foreground">
            {tab.title ?? tab.schema}
          </div>
        ),
      })),
    [parsedAdminTabs.schemaTabs],
  );
  const PreviewAutoAdminLayer = useCallback(
    () => (
      <PluginStudioEditableAutoAdmin
        tabs={livePreviewTabs}
        tabOrder={parsedAdminTabs.tabOrder}
        systemTabs={parsedAdminTabs.systemTabs}
        groups={parsedAdminTabs.orderedGroups}
      />
    ),
    [
      livePreviewTabs,
      parsedAdminTabs.orderedGroups,
      parsedAdminTabs.systemTabs,
      parsedAdminTabs.tabOrder,
    ],
  );
  const subdomainComponentRegistry = useMemo(
    () => ({
      ...baseSubdomainComponentRegistry,
      AutoAdmin: {
        component: PreviewAutoAdminLayer,
        schema: z.object({}),
        from: '@/components/auto-admin/auto-admin-plugin-studio-editable',
      },
      AutoAdminRoot: {
        component: PreviewAutoAdminLayer,
        schema: z.object({}),
        from: '@/components/auto-admin/auto-admin-plugin-studio-editable',
      },
    }),
    [PreviewAutoAdminLayer],
  );

  const isSidebarTabPersistInFlightRef = useRef(false);
  const pendingSidebarTabPersistRef = useRef<readonly AdminTabDoc[] | null>(
    null,
  );
  const hasAttemptedDraftCreationRef = useRef<Set<string>>(new Set());

  const resolvedPluginId =
    pluginId || activeDraft?.pluginId || 'example.plugin';
  const activeDraftTitle = toDisplayPluginTitle(
    activeDraft?.title,
    resolvedPluginId,
  );
  const activeDraftDescription = activeDraft?.description?.trim() || '';

  const [editingMetadataField, setEditingMetadataField] = useState<
    'title' | 'description' | null
  >(null);
  const [editingMetadataValue, setEditingMetadataValue] = useState('');

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
  const [focusedSubdomain, setFocusedSubdomain] = useState<string | null>(null);
  if (subdomains.length === 0) {
    if (focusedSubdomain !== null) {
      setFocusedSubdomain(null);
    }
  } else {
    const hasCurrent =
      focusedSubdomain &&
      subdomains.some(
        (entry) => normalizeSubdomainName(entry.subdomain) === focusedSubdomain,
      );
    if (!hasCurrent) {
      setFocusedSubdomain(normalizeSubdomainName(subdomains[0]?.subdomain));
    }
  }

  const persistDraftMetadata = useCallback(
    (nextMetadata: { title: string; description: string }) => {
      if (!activeDraft) return;
      if (!isActorIdentityReady) return;

      const nextTitle = toDisplayPluginTitle(
        nextMetadata.title,
        resolvedPluginId,
      );
      const nextDescription = nextMetadata.description.trim();
      const currentTitle = toDisplayPluginTitle(
        activeDraft.title,
        resolvedPluginId,
      );
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
      refetchDrafts,
      resolvedPluginId,
      updateDraftMutation,
    ],
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

  const { mutateAsync: createDraft } = useMutation({
    mutationKey: ['plugin-studio', 'create-draft', draftId],
    mutationFn: async () => {
      const userHandle = formatUserHandle(actorUserId || 'user');
      const draftTitle = `${resolvedPluginId} (${userHandle})`;
      const now = new Date().toISOString();
      const nextTitle = activeDraftTitle || draftTitle;
      const nextDescription = activeDraftDescription || undefined;
      const nextDraft: PluginDraftDoc = {
        draftId,
        projectId,
        pluginId: resolvedPluginId,
        ownerUserId: actorUserId,
        status: 'active',
        title: nextTitle,
        description: nextDescription,
        createdAt: now,
        updatedAt: now,
      };

      if (activeDraft) {
        await updateDraftMutation.mutateAsync({
          ...activeDraft,
          projectId,
          pluginId: resolvedPluginId,
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

  const shouldCreateDraft = shouldCreatePluginDraft({
    pluginId: resolvedPluginId,
    isDraftLoading,
    isActorIdentityReady,
    activeDraftPluginId: activeDraft?.pluginId,
    hasAttemptedDraftCreation:
      hasAttemptedDraftCreationRef.current.has(draftId),
  });
  if (shouldCreateDraft) {
    hasAttemptedDraftCreationRef.current.add(draftId);
    void createDraft();
  }

  const isInitialLoading = isDraftLoading || isDraftRevisionLoading;

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
          draftId,
          revisionId: 'live',
          pluginId: resolvedPluginId,
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

        if (
          activeRoutesTabsConfigRow?.id &&
          activeRoutesTabsConfigRow.id !== canonicalRoutesTabsConfigId
        ) {
          try {
            await deleteRoutesTabsConfigMutation.mutateAsync(
              activeRoutesTabsConfigRow.id,
            );
          } catch {
            // best effort cleanup only
          }
        }
      }

      await refetchRoutesTabsConfig();
    })()
      .catch((error) => {
        console.error(error);
        toast.error(`Sidebar tab persistence failed: ${toErrorMessage(error)}`);
      })
      .finally(() => {
        isSidebarTabPersistInFlightRef.current = false;
        if (pendingSidebarTabPersistRef.current) {
          persistSidebarAdminTabs(pendingSidebarTabPersistRef.current);
        }
      });
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
  ) {
    setDraftAdminTabs((currentTabs) => {
      const state = deserializeDraftAdminTabs(currentTabs);
      updater(state);

      const nextAdminTabs = serializeDraftAdminTabs({
        schemaTabs: state.schemaTabs,
        orderedGroups: state.orderedGroups,
        systemTabs: state.systemTabs,
        subdomains: state.subdomains,
        subdomainUiLayers: state.subdomainUiLayers,
        cloudflareDnsAutoConfigured: state.cloudflareDnsAutoConfigured,
        tabOrder: state.tabOrder,
      });

      persistSidebarAdminTabs(nextAdminTabs);
      return nextAdminTabs;
    });
  }

  function handleSubdomainChange(
    previousSubdomain: string,
    patch: Partial<SubdomainPipelineState[number]>,
  ) {
    const normalizedPrevious = normalizeSubdomainName(previousSubdomain);
    let renamedTo: string | null = null;

    updateSidebarAdminTabs((state) => {
      state.subdomains = state.subdomains.map((entry) => {
        if (normalizeSubdomainName(entry.subdomain) !== normalizedPrevious) {
          return entry;
        }
        const nextSubdomain = normalizeSubdomainName(
          patch.subdomain ?? entry.subdomain,
        );
        renamedTo = nextSubdomain;
        return {
          ...entry,
          ...patch,
          subdomain: nextSubdomain,
          basePath:
            nextSubdomain === 'index'
              ? '/'
              : normalizeSubdomainBasePath(
                  patch.basePath ?? entry.basePath ?? `/${nextSubdomain}`,
                ),
          uiProject:
            patch.uiProject ??
            (nextSubdomain === 'index'
              ? 'index'
              : nextSubdomain === 'admin'
                ? 'admin'
                : entry.uiProject),
          autoAdminInjected:
            patch.autoAdminInjected ??
            (nextSubdomain === 'admin' ? true : entry.autoAdminInjected),
          accessRule: patch.accessRule ?? entry.accessRule ?? null,
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

    if (renamedTo) {
      setFocusedSubdomain(renamedTo);
    }
  }

  function handleAddSubdomain() {
    let created: string | null = null;
    updateSidebarAdminTabs((state) => {
      const existing = new Set(
        state.subdomains.map((entry) =>
          normalizeSubdomainName(entry.subdomain),
        ),
      );
      let counter = state.subdomains.length + 1;
      let candidate = `subdomain-${counter}`;
      while (existing.has(candidate)) {
        counter += 1;
        candidate = `subdomain-${counter}`;
      }
      created = candidate;
      state.subdomains = [
        ...state.subdomains,
        {
          subdomain: candidate,
          basePath: `/${candidate}`,
          uiProject: 'custom',
          autoAdminInjected: false,
          accessRule: null,
        },
      ];
      state.subdomainUiLayers[candidate] = JSON.stringify(
        toBlankSubdomainUiLayers(candidate),
      );
    });

    if (created) {
      setFocusedSubdomain(created);
    }
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

    if (focusedSubdomain === normalized) {
      const fallback = subdomains.find(
        (entry) => normalizeSubdomainName(entry.subdomain) !== normalized,
      );
      setFocusedSubdomain(
        fallback ? normalizeSubdomainName(fallback.subdomain) : null,
      );
    }
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

  const selectedSubdomain = normalizeSubdomainName(
    focusedSubdomain ??
      subdomains[0]?.subdomain ??
      DEFAULT_SUBDOMAIN_PIPELINE[0]?.subdomain,
  );

  function openSubdomainBuilder(subdomain: string) {
    const normalized = normalizeSubdomainName(subdomain);
    setFocusedSubdomain(normalized);
    void navigate({
      to: '/plugin-studio/$projectId/$pluginId/subdomain/$subdomain',
      params: {
        projectId,
        pluginId,
        subdomain: normalized,
      },
    });
  }

  function handleSubdomainOrderChange(nextSubdomains: SubdomainPipelineState) {
    updateSidebarAdminTabs((state) => {
      state.subdomains = [...nextSubdomains];
    });
  }

  const subdomainContextData = useMemo(
    () => ({
      plugin: {
        draftId,
        projectId,
        pluginId: resolvedPluginId,
      },
      subdomain: selectedSubdomain,
      date: {
        currentTime: new Date().toISOString(),
        locale: 'en-US',
      },
    }),
    [draftId, projectId, resolvedPluginId, selectedSubdomain],
  );

  const buildAdminInjectedLayers = useCallback(
    (subdomain: string): ComponentLayer[] =>
      toAdminInjectedSubdomainUiLayers(subdomain),
    [],
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

  if (isAuthLoading) {
    return <PluginStudioSubdomainListSkeleton />;
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

  if (isInitialLoading) {
    return <PluginStudioSubdomainListSkeleton />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-background via-background to-accent/10">
      <div className="pointer-events-none absolute -top-24 right-[-8%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-[-6%] h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
        <div className="relative space-y-6">
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
            getItemValue={(entry) => normalizeSubdomainName(entry.subdomain)}
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
                  editingSubdomainTitle?.originalSubdomain === entry.subdomain;

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
                                onClick={(event) => event.stopPropagation()}
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
                                    beginSubdomainTitleEdit(entry.subdomain);
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
                                      nextOpen ? normalizedSubdomain : null,
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
                                            {
                                              accessRule: null,
                                            },
                                          );
                                          setOpenRouteGuardSubdomain(null);
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
                                              accessRule: 'authenticated-user',
                                            },
                                          );
                                          setOpenRouteGuardSubdomain(null);
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
                                              accessRule: 'organization-member',
                                            },
                                          );
                                          setOpenRouteGuardSubdomain(null);
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
                                    setPendingDeleteSubdomain(entry.subdomain);
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

                        <button
                          type="button"
                          className="relative h-[calc(100%-2.25rem)] w-full overflow-hidden rounded-xl border border-border/70 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setFocusedSubdomain(normalizedSubdomain);
                            openSubdomainBuilder(normalizedSubdomain);
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
                                  componentRegistry={subdomainComponentRegistry}
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
                        </button>
                      </div>
                    </div>
                  </SortableItem>
                );
              })}
            </SortableContent>
          </Sortable>

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

function PluginStudioSubdomainListSkeleton() {
  const cardSkeletonIds = ['subdomain-a', 'subdomain-b', 'subdomain-c'];

  return (
    <div className="min-h-screen w-full bg-background text-foreground py-6">
      <div className="mx-auto w-full max-w-7xl px-4 space-y-6">
        <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/15 p-5 md:p-7">
          <div className="space-y-2 max-w-2xl w-full">
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </section>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cardSkeletonIds.map((skeletonId) => (
            <div key={skeletonId} className="h-72 rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
              <Skeleton className="h-[calc(100%-2.25rem)] w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
