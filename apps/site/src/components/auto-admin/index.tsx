import type { NestedSchemaType, SchemaKeys } from '@gta/react-hooks';
import { getNestedZodShape } from '@gta/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
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
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { api } from '@/lib/api';
import {
  dedupeAdminTabs,
  normalizeAutoTableTab,
  resolveAdminTabInput,
  resolveIconByName,
} from '@/lib/auto-runtime/tab-runtime';
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

export interface AutoAdminProps {
  tabs: AutoAdminTabInput[];
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
      title: string;
      group?: string;
      icon?: LucideIcon;
      iconName?: string;
      children: ReactNode;
    }
  | (AutoTableProps<K extends SchemaKeys ? K : never> & {
      title?: string;
      group?: string;
      icon?: LucideIcon;
      iconName?: string;
    });

type AutoTableItem = AutoTableProps<SchemaKeys>;

function isRenderableAutoTableTab(tab: unknown): tab is AutoTableItem {
  if (!tab || typeof tab !== 'object') return false;
  return 'schema' in tab || 'parsedSchema' in tab;
}

export function AutoAdmin({
  tabs,
  includeSystemTabs = true,
  editable = false,
  onAddTable,
  onAddGroup,
  onReorderGroups,
  onMoveTabToGroup,
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

    return dedupeAdminTabs<PossibleTabConfig>([
      resolveAdminTabInput({
        title: dashboardTab.title,
        group: dashboardTab.group,
        iconName: dashboardTab.iconName,
        icon: resolveIconByName(dashboardTab.iconName) ?? BarChart3,
        children: business ? <AdminDashboard slug={basePath} /> : null,
      }),
      ...runtimeTabs,
      resolveAdminTabInput({
        title: qrTab.title,
        group: qrTab.group,
        iconName: qrTab.iconName,
        icon: resolveIconByName(qrTab.iconName) ?? QrCodeIcon,
        children: <QRCodePage slug={basePath} />,
      }),
      resolveAdminTabInput({
        title: websiteTab.title,
        group: websiteTab.group,
        iconName: websiteTab.iconName,
        icon: resolveIconByName(websiteTab.iconName) ?? Sigma,
        children: <CustomUiBuilderPage slug={basePath} />,
      }),
    ]);
  }, [
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

  if (!currentItem) {
    return <NotFound />;
  }

  return (
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

          {/* Search and Action Bar */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2 px-2">
            {/* Language Selector */}
            <LanguageSelector />
          </div>
        </header>

        <section
          className={cn(
            'flex-1 overflow-y-auto mx-0.5 sm:mx-6 items-start justify-center mt-4 sm:mt-6',
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
              <TabsContent value="table" className={cn('flex-1 mt-1 sm:mt-4')}>
                <Card className="border rounded-lg shadow-sm overflow-hidden">
                  <div className="p-0.5 sm:p-4">
                    {currentTableItem ? (
                      <AutoTable<SchemaKeys> {...currentTableItem} key={tab} />
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
          <Button variant="ghost" size="icon">
            <GripVertical className="h-4 w-4" />
          </Button>
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
