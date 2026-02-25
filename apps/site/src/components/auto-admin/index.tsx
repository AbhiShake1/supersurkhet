import type { NestedSchemaType, SchemaKeys } from '@gta/react-hooks';
import { getNestedZodShape } from '@gta/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import _ from 'lodash';
import {
  BarChart3,
  GripVertical,
  type LucideIcon,
  QrCodeIcon,
  Sigma,
} from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ZodEffects } from 'zod';
import CollapsibleSidebar from '@/components/ui/collapsible-sidebar';
import * as Kanban from '@/components/ui/kanban';
import {
  KeyboardShortcutsBoundary,
  ShortcutKbd,
  useRegisterShortcut,
} from '@/components/ui/keyboard-shortcuts';
import { ManageOrganization } from '@/components/ui/organizations/manage-organization';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDialog } from '@/contexts/dialog-context';
import { api } from '@/lib/api';
import {
  dedupeAdminTabs,
  normalizeAutoTableTab,
  resolveAdminTabInput,
  resolveIconByName,
} from '@/lib/auto-runtime/tab-runtime';
import { get as gunGet } from '@/lib/gun/ssr/get';
import { getGunRef, mergeKeys } from '@/lib/gun/utils';
import { appSchema } from '@/lib/schema';
import { cn, getSoulFromUnknown } from '@/lib/utils';
import { AdminDashboard } from '../admin-dashboard';
import { AutoTable, type AutoTableProps } from '../auto-table';
import { LanguageSelector } from '../language-selector';
import { QRCodePage } from '../qr-code-page';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import Card from '../ui/minimal-card';
import { NotFound } from '../ui/not-found';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CustomUiBuilderPage } from '../ui-builder';
import { AutoAdminGlobalCommand } from './global-command';

const AUTO_ADMIN_SHORTCUTS = {
  kanbanColumnHandle: {
    id: 'autoAdmin.kanbanColumnHandle',
    label: 'Kanban column handle',
    description: 'Use the drag handle on a Kanban column header.',
    scope: 'AutoAdmin Kanban',
    defaultBinding: {
      key: 'd',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
} as const;

export interface AutoAdminProps {
  tabs: AutoAdminTabInput[];
  tabOrder?: readonly string[];
  includeSystemTabs?: boolean;
  editable?: boolean;
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (
    groupName?: string,
    options?: { relativeTo?: string; position?: 'above' | 'below' },
  ) => void;
  onReorderGroups?: (
    fromGroupName: string,
    toGroupName: string,
    position?: 'above' | 'below',
  ) => void;
  onMoveTabToGroup?: (tabTitle: string, groupName?: string) => void;
  onReorderTabs?: (
    fromTabTitle: string,
    toTabTitle: string,
    position?: 'above' | 'below',
  ) => void;
  onRenameGroup?: (previousGroupName: string, nextGroupName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onRenameTab?: (previousTabTitle: string, nextTabTitle: string) => void;
  onRenameTabIcon?: (tabTitle: string, iconName: string) => void;
  onOpenWorkflowEditorForTab?: (tabTitle: string) => void;
  onDeleteTableForTab?: (tabTitle: string) => void;
  systemTabs?: AutoAdminSystemTabs;
  onSystemTabChange?: (
    key: AutoAdminSystemTabKey,
    next: AutoAdminSystemTabState,
  ) => void;
  groups?: string[];
}

export type AutoAdminSystemTabKey = 'dashboard' | 'qr' | 'website';

export type AutoAdminSystemTabState = {
  title: string;
  group?: string;
  iconName?: string;
};

export type AutoAdminSystemTabs = Record<
  AutoAdminSystemTabKey,
  AutoAdminSystemTabState
>;

const DEFAULT_SYSTEM_TABS: AutoAdminSystemTabs = {
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

export type PossibleTabConfig = {
  [K in SchemaKeys]: AutoTableTab<K>;
}[SchemaKeys];

export type AutoTableTab<K extends SchemaKeys = SchemaKeys> = {
  tabId?: string;
  group?: string;
  title: string;
  iconName?: string;
} & (
  | {
      children: ReactNode;
      icon?: LucideIcon;
    }
  | AutoTableProps<K extends SchemaKeys ? K : never>
);

export type AutoAdminTabInput = {
  [K in SchemaKeys]: AutoTableTabInput<K>;
}[SchemaKeys];

export type AutoTableTabInput<K extends SchemaKeys = SchemaKeys> =
  | {
      tabId?: string;
      title: string;
      group?: string;
      icon?: LucideIcon;
      iconName?: string;
      children: ReactNode;
    }
  | (AutoTableProps<K extends SchemaKeys ? K : never> & {
      tabId?: string;
      title?: string;
      group?: string;
      icon?: LucideIcon;
      iconName?: string;
    });

type AutoTableItem = AutoTableProps<SchemaKeys>;

type GlobalSearchSource = {
  tabTitle: string;
  tabGroup?: string;
  mode: 'schema' | 'runtime';
  schema?: SchemaKeys;
  slug: string;
};

type GlobalSearchIndexedRow = {
  tabTitle: string;
  tabGroup?: string;
  schema: SchemaKeys;
  slug: string;
  rowId: string;
  label: string;
  description?: string;
  searchText: string;
};

function isRenderableAutoTableTab(tab: unknown): tab is AutoTableItem {
  if (!tab || typeof tab !== 'object') return false;
  return 'schema' in tab || 'parsedSchema' in tab;
}

function collectFullTextTokens(value: unknown, out: string[]) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value));
    return;
  }
  if (value instanceof Date) {
    out.push(value.toISOString());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFullTextTokens(item, out);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const [entryKey, entryValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (entryKey === '_' || entryKey === '#' || entryKey === '>') continue;
      collectFullTextTokens(entryValue, out);
    }
  }
}

function getRowDisplayLabel(
  row: Record<string, unknown>,
  fallbackIndex: number,
): { label: string; description?: string } {
  const labelCandidates = [
    row.title,
    row.name,
    row.label,
    row.email,
    row.orderNumber,
    row.invoiceNumber,
    row.id,
  ].filter(
    (value): value is string | number =>
      typeof value === 'string' || typeof value === 'number',
  );
  const descriptionCandidates = [
    row.description,
    row.text,
    row.phone,
    row.status,
    row.date,
    row.timestamp,
  ].filter(
    (value): value is string | number =>
      typeof value === 'string' || typeof value === 'number',
  );
  const label =
    labelCandidates.length > 0
      ? String(labelCandidates[0]).trim()
      : `Row ${fallbackIndex + 1}`;
  const description =
    descriptionCandidates.length > 0
      ? String(descriptionCandidates[0]).trim()
      : undefined;
  return { label, description };
}

async function fetchRuntimeRowsBySlug(slug: string) {
  const absolutePath = mergeKeys('', slug);
  const node = getGunRef(absolutePath);

  return new Promise<Array<Record<string, unknown>>>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve([]);
    }, 2000);

    node
      .load((data) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (!data || typeof data !== 'object') {
          resolve([]);
          return;
        }
        const rows: Array<Record<string, unknown>> = [];
        for (const [soul, value] of Object.entries(
          data as Record<string, unknown>,
        )) {
          if (soul === '_' || value === null || value === undefined) continue;
          if (typeof value === 'object') {
            rows.push({
              ...(value as Record<string, unknown>),
              _: { soul },
            });
            continue;
          }
          rows.push({
            value,
            _: { soul },
          });
        }
        resolve(rows);
      })
      .not(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve([]);
      });
  });
}

export function AutoAdmin({
  tabs,
  tabOrder,
  includeSystemTabs = true,
  editable = false,
  onAddTable,
  onAddGroup,
  onReorderGroups,
  onMoveTabToGroup,
  onReorderTabs,
  onRenameGroup,
  onDeleteGroup,
  onRenameTab,
  onRenameTabIcon,
  onOpenWorkflowEditorForTab,
  onDeleteTableForTab,
  systemTabs,
  onSystemTabChange,
  groups,
}: AutoAdminProps) {
  'use memo';
  const navigate = useNavigate();
  const { openDialog } = useDialog();
  const { search, pathname: currentPathname } = useLocation();
  const [basePath] = currentPathname.split('/').filter((i) => !!i.length);
  const [uncontrolledSystemTabs, setUncontrolledSystemTabs] =
    useState<AutoAdminSystemTabs>(DEFAULT_SYSTEM_TABS);
  const resolvedSystemTabs = systemTabs ?? uncontrolledSystemTabs;
  const resolvedSystemTabsRef = useRef(resolvedSystemTabs);
  useEffect(() => {
    resolvedSystemTabsRef.current = resolvedSystemTabs;
  }, [resolvedSystemTabs]);
  const dashboardTab = resolvedSystemTabs.dashboard;
  const qrTab = resolvedSystemTabs.qr;
  const websiteTab = resolvedSystemTabs.website;

  const updateSystemTab = useCallback(
    (key: AutoAdminSystemTabKey, patch: Partial<AutoAdminSystemTabState>) => {
      const currentTabs = resolvedSystemTabsRef.current;
      const current = currentTabs[key];
      const next: AutoAdminSystemTabState = {
        title: (patch.title ?? current.title).trim() || current.title,
        group: (() => {
          const value = patch.group ?? current.group;
          const normalized = value?.trim();
          return normalized ? normalized : undefined;
        })(),
        iconName: (() => {
          const value = patch.iconName ?? current.iconName;
          const normalized = value?.trim();
          return normalized ? normalized : undefined;
        })(),
      };

      if (!systemTabs) {
        setUncontrolledSystemTabs((currentTabs) => ({
          ...currentTabs,
          [key]: next,
        }));
      }
      onSystemTabChange?.(key, next);
    },
    [onSystemTabChange, systemTabs],
  );

  const { data: allBusinesses = [] } = api.business.useGet({
    keys: [basePath],
    single: true,
  });
  const business = allBusinesses[0];

  const tabsWithHome: PossibleTabConfig[] = useMemo(() => {
    const runtimeTabs = tabs.map(
      (tab) => resolveAdminTabInput(tab) as PossibleTabConfig,
    );
    if (!includeSystemTabs) {
      return dedupeAdminTabs<PossibleTabConfig>(runtimeTabs);
    }
    const dashboardTabConfig = resolveAdminTabInput({
      tabId: 'dashboard',
      title: dashboardTab.title,
      group: dashboardTab.group,
      iconName: dashboardTab.iconName,
      icon: resolveIconByName(dashboardTab.iconName) ?? BarChart3,
      children: business ? <AdminDashboard slug={basePath} /> : null,
    }) as PossibleTabConfig;
    const qrTabConfig = resolveAdminTabInput({
      tabId: 'qr',
      title: qrTab.title,
      group: qrTab.group,
      iconName: qrTab.iconName,
      icon: resolveIconByName(qrTab.iconName) ?? QrCodeIcon,
      children: <QRCodePage slug={basePath} />,
    }) as PossibleTabConfig;
    const websiteTabConfig = resolveAdminTabInput({
      tabId: 'website',
      title: websiteTab.title,
      group: websiteTab.group,
      iconName: websiteTab.iconName,
      icon: resolveIconByName(websiteTab.iconName) ?? Sigma,
      children: <CustomUiBuilderPage slug={basePath} />,
    }) as PossibleTabConfig;

    const systemTabsByToken: Record<string, PossibleTabConfig> = {
      'system:dashboard': dashboardTabConfig,
      'system:qr': qrTabConfig,
      'system:website': websiteTabConfig,
    };
    const runtimeTabsByToken = new Map<string, PossibleTabConfig>();
    for (const tab of runtimeTabs) {
      const runtimeTabId =
        'tabId' in tab &&
        typeof tab.tabId === 'string' &&
        tab.tabId.trim().length > 0
          ? tab.tabId.trim()
          : 'schema' in tab && typeof tab.schema === 'string'
            ? tab.schema
            : tab.title;
      runtimeTabsByToken.set(`schema:${runtimeTabId}`, tab);
    }

    const orderedTabs: PossibleTabConfig[] = [];
    const usedRuntimeTokens = new Set<string>();
    const usedSystemTokens = new Set<string>();
    for (const token of tabOrder ?? []) {
      const normalized = token.trim();
      const systemTab = systemTabsByToken[normalized];
      if (systemTab && !usedSystemTokens.has(normalized)) {
        orderedTabs.push(systemTab);
        usedSystemTokens.add(normalized);
        continue;
      }
      const runtimeTab = runtimeTabsByToken.get(normalized);
      if (runtimeTab && !usedRuntimeTokens.has(normalized)) {
        orderedTabs.push(runtimeTab);
        usedRuntimeTokens.add(normalized);
      }
    }

    const defaultOrder: PossibleTabConfig[] = [
      dashboardTabConfig,
      ...runtimeTabs,
      qrTabConfig,
      websiteTabConfig,
    ];
    for (const candidate of defaultOrder) {
      const token =
        candidate === dashboardTabConfig
          ? 'system:dashboard'
          : candidate === qrTabConfig
            ? 'system:qr'
            : candidate === websiteTabConfig
              ? 'system:website'
              : (() => {
                  const runtimeTabId =
                    'tabId' in candidate &&
                    typeof candidate.tabId === 'string' &&
                    candidate.tabId.trim().length > 0
                      ? candidate.tabId.trim()
                      : 'schema' in candidate &&
                          typeof candidate.schema === 'string'
                        ? candidate.schema
                        : candidate.title;
                  return `schema:${runtimeTabId}`;
                })();
      if (
        token.startsWith('system:')
          ? usedSystemTokens.has(token)
          : usedRuntimeTokens.has(token)
      ) {
        continue;
      }
      orderedTabs.push(candidate);
      if (token.startsWith('system:')) {
        usedSystemTokens.add(token);
      } else {
        usedRuntimeTokens.add(token);
      }
    }

    return dedupeAdminTabs<PossibleTabConfig>(orderedTabs);
  }, [
    tabOrder,
    includeSystemTabs,
    dashboardTab.group,
    dashboardTab.iconName,
    dashboardTab.title,
    qrTab.group,
    qrTab.iconName,
    qrTab.title,
    websiteTab.group,
    websiteTab.iconName,
    websiteTab.title,
    business,
    basePath,
    tabs,
  ]);

  const systemGroups = useMemo(() => {
    if (!includeSystemTabs) return [];
    return [dashboardTab.group, qrTab.group, websiteTab.group].filter(
      (groupName): groupName is string => Boolean(groupName),
    );
  }, [includeSystemTabs, dashboardTab.group, qrTab.group, websiteTab.group]);
  const mergedGroups = useMemo(() => {
    const next = new Set<string>(groups ?? []);
    for (const groupName of systemGroups) next.add(groupName);
    return [...next];
  }, [groups, systemGroups]);

  const renameSystemTab = useCallback(
    (previousTabTitle: string, nextTabTitle: string): boolean => {
      const matchedEntry = (
        Object.entries(resolvedSystemTabsRef.current) as Array<
          [AutoAdminSystemTabKey, AutoAdminSystemTabState]
        >
      ).find(([, value]) => value.title === previousTabTitle);
      if (!matchedEntry) {
        return false;
      }
      updateSystemTab(matchedEntry[0], {
        title: nextTabTitle,
      });
      return true;
    },
    [updateSystemTab],
  );

  const renameSystemTabIcon = useCallback(
    (tabTitle: string, iconName: string): boolean => {
      const matchedEntry = (
        Object.entries(resolvedSystemTabsRef.current) as Array<
          [AutoAdminSystemTabKey, AutoAdminSystemTabState]
        >
      ).find(([, value]) => value.title === tabTitle);
      if (!matchedEntry) {
        return false;
      }
      updateSystemTab(matchedEntry[0], {
        iconName,
      });
      return true;
    },
    [updateSystemTab],
  );

  const moveSystemTabToGroup = useCallback(
    (tabTitle: string, groupName?: string): boolean => {
      const matchedEntry = (
        Object.entries(resolvedSystemTabsRef.current) as Array<
          [AutoAdminSystemTabKey, AutoAdminSystemTabState]
        >
      ).find(([, value]) => value.title === tabTitle);
      if (!matchedEntry) {
        return false;
      }
      updateSystemTab(matchedEntry[0], {
        group: groupName,
      });
      return true;
    },
    [updateSystemTab],
  );

  const renameSystemGroup = useCallback(
    (previousGroupName: string, nextGroupName: string): boolean => {
      let changed = false;
      for (const [key, value] of Object.entries(
        resolvedSystemTabsRef.current,
      ) as Array<[AutoAdminSystemTabKey, AutoAdminSystemTabState]>) {
        if (value.group !== previousGroupName) continue;
        updateSystemTab(key, {
          group: nextGroupName,
        });
        changed = true;
      }
      return changed;
    },
    [updateSystemTab],
  );

  const deleteSystemGroup = useCallback(
    (groupName: string): boolean => {
      let changed = false;
      for (const [key, value] of Object.entries(
        resolvedSystemTabsRef.current,
      ) as Array<[AutoAdminSystemTabKey, AutoAdminSystemTabState]>) {
        if (value.group !== groupName) continue;
        updateSystemTab(key, {
          group: undefined,
        });
        changed = true;
      }
      return changed;
    },
    [updateSystemTab],
  );

  const tab = (search.tab as string) ?? tabsWithHome[0]?.title;

  const currentItem = useMemo(
    () => tabsWithHome.find((t) => t.title === tab) ?? tabsWithHome?.[0],
    [tab, tabsWithHome],
  );

  const canGetComponents = Boolean(currentItem);
  const getComponents = useCallback(async () => {
    if (!currentItem) return null;
    if ('schema' in currentItem) {
      const currentSchema = appSchema[currentItem.schema as SchemaKeys];
      if ('components' in currentSchema) {
        const components = await currentSchema.components();
        const mappedNodes = components.map(async (c) => ({
          ...c,
          component: await c.component({ slug: currentItem.slug ?? basePath }),
        }));
        return Promise.all(mappedNodes);
      }
    }
    return null;
  }, [basePath, currentItem]);

  const handleMoveTabToGroup = useCallback(
    (tabTitle: string, groupName?: string) => {
      const handled = moveSystemTabToGroup(tabTitle, groupName);
      if (!handled) onMoveTabToGroup?.(tabTitle, groupName);
    },
    [moveSystemTabToGroup, onMoveTabToGroup],
  );
  const handleRenameGroup = useCallback(
    (previousGroupName: string, nextGroupName: string) => {
      renameSystemGroup(previousGroupName, nextGroupName);
      onRenameGroup?.(previousGroupName, nextGroupName);
    },
    [onRenameGroup, renameSystemGroup],
  );
  const handleDeleteGroup = useCallback(
    (groupName: string) => {
      deleteSystemGroup(groupName);
      onDeleteGroup?.(groupName);
    },
    [deleteSystemGroup, onDeleteGroup],
  );
  const handleRenameTab = useCallback(
    (previousTabTitle: string, nextTabTitle: string) => {
      const handled = renameSystemTab(previousTabTitle, nextTabTitle);
      if (!handled) onRenameTab?.(previousTabTitle, nextTabTitle);
    },
    [onRenameTab, renameSystemTab],
  );
  const handleRenameTabIcon = useCallback(
    (tabTitle: string, iconName: string) => {
      const handled = renameSystemTabIcon(tabTitle, iconName);
      if (!handled) onRenameTabIcon?.(tabTitle, iconName);
    },
    [onRenameTabIcon, renameSystemTabIcon],
  );

  const { data: components } = useQuery({
    enabled: canGetComponents,
    queryFn: getComponents,
    queryKey: [
      'schema',
      (!!currentItem && 'slug' in currentItem && currentItem.slug) ?? basePath,
      !!currentItem && 'schema' in currentItem && currentItem.schema,
    ],
  });

  const currentTableItem = useMemo(
    () =>
      currentItem && isRenderableAutoTableTab(currentItem)
        ? normalizeAutoTableTab(currentItem, basePath)
        : null,
    [currentItem, basePath],
  );
  const [isGlobalCommandOpen, setIsGlobalCommandOpen] = useState(false);
  const { data: organizationMembers = [] } = api.user.useGet();

  const selectTab = useCallback(
    (nextTab: string) => {
      void navigate({
        to: '.',
        search: (current) => ({
          ...(current as Record<string, unknown>),
          tab: nextTab,
        }),
      });
    },
    [navigate],
  );

  const commandTabs = useMemo(
    () =>
      tabsWithHome.map((item, index) => ({
        id: `tab-${item.title}-${index}`,
        title: item.title,
        group: item.group,
        active: item.title === tab,
        keywords: [
          'table',
          'page',
          'sidebar',
          'autoadmin',
          'organization',
          item.group ?? '',
        ].join(' '),
        onSelect: () => {
          selectTab(item.title);
        },
      })),
    [selectTab, tab, tabsWithHome],
  );

  const focusRowById = useCallback((rowId: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    const intervalId = window.setInterval(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-row-id="${CSS.escape(rowId)}"]`,
      );
      if (target) {
        window.clearInterval(intervalId);
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        window.clearInterval(intervalId);
      }
    }, 100);
  }, []);

  const searchableSources = useMemo(() => {
    const schemaShape = appSchema.schemaShape as unknown as Record<
      string,
      unknown
    >;
    const out: GlobalSearchSource[] = [];
    for (const tab of tabsWithHome) {
      if (!isRenderableAutoTableTab(tab)) continue;
      const normalized = normalizeAutoTableTab(
        tab as PossibleTabConfig & { slug?: string; data?: unknown },
        basePath,
      );
      const slug = normalized.slug?.trim();
      if (!slug) continue;
      if ('schema' in normalized && typeof normalized.schema === 'string') {
        if (!schemaShape[normalized.schema]) continue;
        out.push({
          tabTitle: normalized.title,
          tabGroup: normalized.group,
          mode: 'schema',
          schema: normalized.schema as SchemaKeys,
          slug,
        });
        continue;
      }
      if ('parsedSchema' in normalized) {
        out.push({
          tabTitle: normalized.title,
          tabGroup: normalized.group,
          mode: 'runtime',
          slug,
        });
      }
    }
    return out;
  }, [basePath, tabsWithHome]);

  const { data: globalSearchRows = [], isFetching: isIndexingGlobalSearch } =
    useQuery({
      enabled: isGlobalCommandOpen && searchableSources.length > 0,
      queryFn: async () => {
        const allBySource = await Promise.all(
          searchableSources.map(async (source) => {
            const rows =
              source.mode === 'schema' && source.schema
                ? await gunGet({ key: source.schema }, source.slug)
                : await fetchRuntimeRowsBySlug(source.slug);
            const indexedRows: GlobalSearchIndexedRow[] = [];
            rows.forEach((row, index) => {
              const rowRecord = row as Record<string, unknown>;
              const rowMeta =
                rowRecord._ && typeof rowRecord._ === 'object'
                  ? (rowRecord._ as Record<string, unknown>)
                  : null;
              const rowId =
                getSoulFromUnknown(row) ??
                (typeof rowMeta?.soul === 'string' ? rowMeta.soul : null) ??
                (typeof rowRecord.id === 'string' ? rowRecord.id : null) ??
                (typeof rowRecord.id === 'number'
                  ? String(rowRecord.id)
                  : null);
              if (!rowId) return;

              const { label, description } = getRowDisplayLabel(
                rowRecord,
                index,
              );
              const fullTextTokens: string[] = [];
              collectFullTextTokens(rowRecord, fullTextTokens);

              indexedRows.push({
                tabTitle: source.tabTitle,
                tabGroup: source.tabGroup,
                schema: source.schema ?? 'business',
                slug: source.slug,
                rowId,
                label,
                description,
                searchText: fullTextTokens.join(' '),
              });
            });
            return indexedRows;
          }),
        );

        return allBySource.flat();
      },
      queryKey: [
        'auto-admin-global-full-text-search',
        searchableSources.map((source) => [
          source.mode,
          source.schema ?? 'runtime',
          source.slug,
          source.tabTitle,
        ]),
      ],
      staleTime: 0,
      refetchInterval: isGlobalCommandOpen ? 5_000 : false,
    });

  const commandMembers = useMemo(() => {
    const likelyMembersTab = tabsWithHome.find((item) =>
      /member|members|user|users|team|people|staff/i.test(item.title),
    );

    return organizationMembers
      .map((member) => {
        const id = member?._?.soul ?? member?.email ?? member?.name;
        if (!id) return null;
        const label = member?.name?.trim() || member?.email?.trim() || id;
        const description =
          member?.email?.trim() && member.email !== label
            ? member.email.trim()
            : undefined;
        return {
          id: `member-${id}`,
          label,
          description,
          keywords: `${member?.name ?? ''} ${member?.email ?? ''} member user organization`,
          onSelect: () => {
            if (likelyMembersTab) {
              selectTab(likelyMembersTab.title);
              return;
            }
            window.location.assign('/apps');
          },
        };
      })
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .slice(0, 150);
  }, [organizationMembers, selectTab, tabsWithHome]);

  const commandRecords = useMemo(
    () =>
      globalSearchRows.slice(0, 4000).map((row) => ({
        id: `record-${row.schema}-${row.rowId}`,
        label: row.label,
        description: row.description,
        scopeLabel: row.tabTitle,
        keywords: `${row.searchText} ${row.tabTitle} ${row.tabGroup ?? ''} ${row.schema} ${row.slug}`,
        onSelect: () => {
          selectTab(row.tabTitle);
          focusRowById(row.rowId);
        },
      })),
    [focusRowById, globalSearchRows, selectTab],
  );

  const commandActions = useMemo(() => {
    const actions: Array<{
      id: string;
      label: string;
      keywords?: string;
      shortcut?: string;
      onSelect: () => void;
    }> = [];

    const businessSlug = business?.basePath;
    if (businessSlug) {
      actions.push({
        id: 'go-organizations',
        label: 'Manage organization',
        keywords: 'organization business settings manage',
        shortcut: 'Go',
        onSelect: () => {
          openDialog({
            children: (
              <ManageOrganization slug={businessSlug} tabs={tabsWithHome} />
            ),
            className: 'sm:max-w-[70%] h-[80%] p-0 overflow-clip',
          });
        },
      });
    }

    actions.push({
      id: 'toggle-sidebar',
      label: 'Toggle sidebar',
      keywords: 'sidebar collapse expand hide show',
      shortcut: 'UI',
      onSelect: () => {
        const toggle = document.querySelector<HTMLButtonElement>(
          '[data-auto-admin-sidebar-toggle="true"]',
        );
        if (!toggle) return;
        toggle.click();
      },
    });

    actions.push({
      id: 'focus-sidebar-search',
      label: 'Focus sidebar filter',
      keywords: 'sidebar search filter',
      shortcut: 'UI',
      onSelect: () => {
        const input = document.querySelector<HTMLInputElement>(
          '[data-auto-admin-sidebar-search="true"]',
        );
        input?.focus();
      },
    });

    actions.push({
      id: 'add-row',
      label: 'Add new row',
      keywords: 'create insert row record data table',
      shortcut: 'Table',
      onSelect: () => {
        const trigger = document.querySelector<HTMLButtonElement>(
          '[data-auto-table-add-row-trigger="true"]',
        );
        trigger?.click();
      },
    });

    if (businessSlug) {
      actions.push({
        id: 'go-plugins',
        label: 'Go to plugins',
        keywords: 'plugin integrations extensions',
        shortcut: 'Go',
        onSelect: () => {
          void navigate({
            to: '/$businessName/admin/plugins',
            params: { businessName: businessSlug },
          });
        },
      });
    }

    if (editable && onAddTable) {
      actions.push({
        id: 'add-table',
        label: 'Add table',
        keywords: 'new table schema editable',
        shortcut: 'Edit',
        onSelect: () => {
          onAddTable();
        },
      });
    }

    if (editable && onAddGroup) {
      actions.push({
        id: 'add-group',
        label: 'Add group',
        keywords: 'new group sidebar editable',
        shortcut: 'Edit',
        onSelect: () => {
          onAddGroup();
        },
      });
    }

    return actions;
  }, [
    business?.basePath,
    editable,
    navigate,
    onAddGroup,
    onAddTable,
    openDialog,
    tabsWithHome,
  ]);

  if (!currentItem) {
    return <NotFound />;
  }

  return (
    <KeyboardShortcutsBoundary>
      <SidebarProvider>
        <CollapsibleSidebar
          tabs={tabsWithHome}
          businessName={business?.name}
          slug={business?.basePath}
          editable={editable}
          onAddTable={onAddTable}
          onAddGroup={onAddGroup}
          onReorderGroups={onReorderGroups}
          onMoveTabToGroup={handleMoveTabToGroup}
          onReorderTabs={onReorderTabs}
          onRenameGroup={handleRenameGroup}
          onDeleteGroup={handleDeleteGroup}
          onRenameTab={handleRenameTab}
          onRenameTabIcon={handleRenameTabIcon}
          onOpenWorkflowEditorForTab={onOpenWorkflowEditorForTab}
          onDeleteTableForTab={onDeleteTableForTab}
          groups={mergedGroups}
        />
        <SidebarInset className="min-w-0 flex flex-col">
          <header className="sticky top-0 bg-background/95 backdrop-blur z-50 flex h-12 sm:h-16 shrink-0 items-center gap-0.5 sm:gap-2 border-b transition-[width,height] ease-linear px-0.5 sm:px-4">
            <h1 className="font-bold text-sm sm:text-lg truncate px-0.5 sm:px-4">
              {currentItem.title}
            </h1>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-2 px-2">
              <AutoAdminGlobalCommand
                actions={commandActions}
                tabs={commandTabs}
                members={commandMembers}
                records={commandRecords}
                isSearchingData={isIndexingGlobalSearch}
                onOpenChange={setIsGlobalCommandOpen}
              />
              <LanguageSelector />
            </div>
          </header>

          <section
            className={cn(
              'min-w-0 flex-1 overflow-x-auto overflow-y-auto mx-0.5 sm:mx-6 items-start justify-center mt-4 sm:mt-6',
            )}
          >
            {'children' in currentItem ? (
              currentItem.children
            ) : 'parsedSchema' in currentItem && currentTableItem ? (
              <AutoTable<SchemaKeys> {...currentTableItem} key={tab} />
            ) : !components?.length ? (
              currentTableItem ? (
                <AutoTable<SchemaKeys> {...currentTableItem} key={tab} />
              ) : null
            ) : (
              <Tabs
                key={tab}
                defaultValue={
                  localStorage.getItem(`tab-#${basePath}-${tab}`) ??
                  components[0]?.name ??
                  'table'
                }
                className={cn('flex flex-1 flex-col')}
                onValueChange={(value) => {
                  localStorage.setItem(`tab-#${basePath}-${tab}`, value);
                }}
              >
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  {components.map(({ name }) => (
                    <TabsTrigger value={name} key={name}>
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent
                  value="table"
                  className={cn('flex-1 mt-1 sm:mt-4')}
                >
                  <Card className="border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-0.5 sm:p-4">
                      {currentTableItem ? (
                        <AutoTable<SchemaKeys>
                          {...currentTableItem}
                          key={tab}
                        />
                      ) : null}
                    </div>
                  </Card>
                </TabsContent>
                {components.map(({ component, name }) => (
                  <TabsContent
                    value={name}
                    key={name}
                    className="flex-1 mt-1 sm:mt-4"
                  >
                    <Card className="border rounded-lg shadow-sm overflow-hidden">
                      <div className="p-0.5 sm:p-4">{component}</div>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </section>
        </SidebarInset>
      </SidebarProvider>
    </KeyboardShortcutsBoundary>
  );
}

export type AutoKanbanProps<K extends SchemaKeys> = {
  slug: string;
  groupKey: keyof NestedSchemaType<K>;
  cardBuilder: (data: NestedSchemaType<K>) => ReactNode;
  schema: K;
  isItemLocked?: (item: NestedSchemaType<K>) => boolean;
};

export function AutoKanban<K extends SchemaKeys>({
  slug,
  schema: schemaName,
  groupKey,
  cardBuilder,
  isItemLocked,
}: AutoKanbanProps<K>) {
  const { data: orders = [], isLoading } = api[schemaName].useGet({
    keys: [slug],
  });
  const { mutate: update } = api[schemaName].useUpdate({ keys: [slug] });
  const columns = _.groupBy(orders, (o) => o[groupKey]);
  const schema = getNestedZodShape(schemaName, appSchema.schemaShape);
  const schemaObject =
    schema instanceof ZodEffects ? schema.innerType() : schema;
  const groupField = schemaObject.shape[groupKey] as {
    Values?: Record<string, string>;
    _def?: { innerType?: { Values?: Record<string, string> } };
  };
  const statuses = Object.keys(
    groupField.Values ??
      groupField._def?.innerType?.Values ??
      groupField._def?.schema?._def?.innerType?.Values ??
      {},
  );

  return (
    // @ts-expect-error
    <Kanban.Root
      loading={isLoading}
      value={columns}
      onValueChange={(columns) => {
        for (const [status, orders] of Object.entries(columns)) {
          for (const order of orders) {
            const soul = getSoulFromUnknown(order);
            if (!soul) continue;
            if (isItemLocked?.(order)) continue;
            // @ts-expect-error
            update({ id: soul, [groupKey]: status });
          }
        }
      }}
      // @ts-expect-error
      getItemValue={(item) => getSoulFromUnknown(item) ?? ''}
    >
      <Kanban.Board className="grid auto-rows-fr grid-cols-3">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            value={status}
            orders={columns?.[status] ?? []}
            cardBuilder={cardBuilder}
            isItemLocked={isItemLocked}
          />
        ))}
      </Kanban.Board>
      <Kanban.Overlay>
        {({ value, variant }) => {
          if (variant === 'column') {
            const orders = columns[value] ?? [];

            // @ts-expect-error
            return <KanbanColumn value={value} orders={orders} />;
          }

          const order = Object.values(columns)
            .flat()
            .find((o) => getSoulFromUnknown(o) === value);

          if (!order) return null;

          return <KanbanCard order={order} cardBuilder={cardBuilder} />;
        }}
      </Kanban.Overlay>
    </Kanban.Root>
  );
}

interface KanbanCardProps<K extends SchemaKeys>
  extends Omit<React.ComponentProps<typeof Kanban.Item>, 'value'> {
  order: NestedSchemaType<K>;
  cardBuilder: AutoKanbanProps<K>['cardBuilder'];
}

function KanbanCard<K extends SchemaKeys>({
  order,
  cardBuilder,
  ...props
}: KanbanCardProps<K>) {
  return (
    <Kanban.Item
      key={getSoulFromUnknown(order)}
      value={getSoulFromUnknown(order) ?? ''}
      // asChild
      {...props}
    >
      {cardBuilder?.(order)}
    </Kanban.Item>
  );
}

interface KanbanColumnProps<K extends SchemaKeys>
  extends Omit<React.ComponentProps<typeof Kanban.Column>, 'children'> {
  orders: NestedSchemaType<K>[];
  cardBuilder: AutoKanbanProps<K>['cardBuilder'];
  isItemLocked?: AutoKanbanProps<K>['isItemLocked'];
}

function KanbanColumn<K extends SchemaKeys>({
  value,
  orders,
  cardBuilder,
  isItemLocked,
  ...props
}: KanbanColumnProps<K>) {
  useRegisterShortcut(AUTO_ADMIN_SHORTCUTS.kanbanColumnHandle);
  const context = Kanban.useKanbanContext('KanbanColumn');
  return (
    <Kanban.Column value={value} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm capitalize">{value}</span>
          {context.loading ? (
            <Skeleton className="w-6 h-5 rounded-sm" />
          ) : (
            <Badge
              variant="secondary"
              className={cn('pointer-events-none rounded-sm')}
            >
              {orders.length}
            </Badge>
          )}
        </div>
        <Kanban.ColumnHandle asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <GripVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Reorder column</span>
              <ShortcutKbd
                actionId={AUTO_ADMIN_SHORTCUTS.kanbanColumnHandle.id}
                defaultBinding={
                  AUTO_ADMIN_SHORTCUTS.kanbanColumnHandle.defaultBinding
                }
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
        </Kanban.ColumnHandle>
      </div>
      <div className="flex flex-col gap-2 p-0.5">
        {context.loading
          ? Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
              <Skeleton key={i} className="w-full h-12" />
            ))
          : orders.map((order) => (
              <KanbanCard
                key={getSoulFromUnknown(order)}
                order={order}
                cardBuilder={cardBuilder}
                asHandle={!(isItemLocked?.(order) ?? false)}
              />
            ))}
      </div>
    </Kanban.Column>
  );
}
