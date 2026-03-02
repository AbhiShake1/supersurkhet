import type {
  NestedSchemaType,
  SchemaKeys,
  UpdaterParams,
} from '@gta/react-hooks';
import { getNestedZodShape } from '@gta/react-hooks';
import type { MutationFunctionContext } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import type { GunMessagePut } from 'gun';
import _ from 'lodash';
import {
  BarChart3,
  GripVertical,
  type LucideIcon,
  QrCodeIcon,
  Sigma,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ZodEffects } from 'zod';
import { useAuth } from '@/components/auth-provider';
import CollapsibleSidebar from '@/components/ui/collapsible-sidebar';
import * as Kanban from '@/components/ui/kanban';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { api } from '@/lib/api';
import {
  canAccessBusiness,
  canAccessFeature,
  canPerformFeatureAction,
  isBusinessPrivilegedUser,
  type PermissionAction,
} from '@/lib/permissions/business-permissions';
import { appSchema } from '@/lib/schema';
import { cn, getSoulFromUnknown } from '@/lib/utils';
import { AdminDashboard } from '../admin-dashboard';
import { AutoTable, type AutoTableProps } from '../auto-table';
import { LanguageSelector } from '../language-selector';
import { PermissionGate } from '../permission-gate/permission-gate';
import { QRCodePage } from '../qr-code-page';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import Card from '../ui/minimal-card';
import { NotFound } from '../ui/not-found';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Unauthorized } from '../ui/unauthorized';
import { CustomUiBuilderPage } from '../ui-builder';

export interface AutoAdminProps {
  tabs: AutoAdminTabInput[];
}

export type PossibleTabConfig = {
  [K in SchemaKeys]: AutoTableTab<K>;
}[SchemaKeys];

export type AutoTableTab<K extends SchemaKeys = SchemaKeys> = {
  group?: string;
  title: string;
  permissionFeatures?: Array<{
    feature: string;
    actions?: PermissionAction[];
  }>;
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
      children: ReactNode;
      permissionFeatures?: Array<{
        feature: string;
        actions?: PermissionAction[];
      }>;
    }
  | (AutoTableProps<K extends SchemaKeys ? K : never> & {
      title?: string;
      group?: string;
      icon?: LucideIcon;
      permissionFeatures?: Array<{
        feature: string;
        actions?: PermissionAction[];
      }>;
    });

type AutoTableItem = AutoTableProps<SchemaKeys>;

function isRenderableAutoTableTab(tab: unknown): tab is AutoTableItem {
  if (!tab || typeof tab !== 'object') return false;
  return 'schema' in tab || 'parsedSchema' in tab;
}

function normalizeTableTab(
  tab: AutoTableTab & AutoTableItem,
  basePath: string,
): AutoTableItem {
  if ('data' in tab && tab.data !== undefined) {
    return tab;
  }

  return {
    ...tab,
    slug: tab.slug ?? basePath,
  };
}

function toTitleCase(schema: string) {
  return schema
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function resolveTabMetadata(tab: AutoAdminTabInput): PossibleTabConfig {
  if (!('schema' in tab)) {
    return {
      ...tab,
      title: tab.title ?? 'Untitled',
    };
  }

  const schemaKey = tab.schema as SchemaKeys;
  const schemaMeta = appSchema[schemaKey];
  const permissionFeatures = tab.permissionFeatures ?? [
    {
      feature: String(tab.schema),
      actions: ['read', 'create', 'update', 'delete'],
    },
  ];
  const resolved = {
    ...tab,
    title: tab.title ?? schemaMeta.title ?? toTitleCase(String(tab.schema)),
    group: tab.group ?? schemaMeta.group,
    icon: 'icon' in tab && tab.icon ? tab.icon : schemaMeta.icon,
    permissionFeatures,
  };
  return resolved as unknown as PossibleTabConfig;
}

export function AutoAdmin({ tabs }: AutoAdminProps) {
  'use memo';
  const { user } = useAuth();
  const { search, pathname: currentPathname } = useLocation();
  const [basePath] = currentPathname.split('/').filter((i) => !!i.length);
  const userSoul = getSoulFromUnknown(user);

  const { data: allBusinesses = [] } = api.business.useGet({
    keys: [basePath],
    single: true,
  });
  const business = allBusinesses[0];

  if (!business?.basePath) {
    return <NotFound />;
  }

  const hasAccess = canAccessBusiness({ business, user, userSoul });
  if (!hasAccess) {
    return (
      <Unauthorized description="You are not authorized to view this admin panel." />
    );
  }

  const isPrivileged = isBusinessPrivilegedUser({ business, user, userSoul });
  const configuredTabs = tabs.map(resolveTabMetadata);
  function canAccessTab(tab: PossibleTabConfig) {
    if (isPrivileged) return true;
    const permissionFeatures = tab.permissionFeatures ?? [];
    if (!permissionFeatures.length) return false;
    return permissionFeatures.some(({ feature }) =>
      canAccessFeature({
        business,
        user,
        userSoul,
        feature,
      }),
    );
  }

  const authorizedConfiguredTabs = configuredTabs.filter((tab) => {
    return canAccessTab(tab);
  });

  const tabsWithHome: PossibleTabConfig[] = [
    ...(isPrivileged
      ? [
          {
            title: 'Dashboard',
            icon: BarChart3,
            children: (
              <AdminDashboard
                slug={basePath}
                businessType={business.businessType}
              />
            ),
          } as PossibleTabConfig,
        ]
      : []),
    ...authorizedConfiguredTabs,
    ...(canAccessTab({
      title: 'QR Management',
      icon: QrCodeIcon,
      children: <QRCodePage slug={basePath} />,
      group: 'System Configuration',
      permissionFeatures: [
        {
          feature: 'dataMatrixAction',
          actions: ['read', 'create', 'update', 'delete'],
        },
        {
          feature: 'qrFlowConfig',
          actions: ['read', 'create', 'update', 'delete'],
        },
      ],
    })
      ? [
          {
            title: 'QR Management',
            icon: QrCodeIcon,
            children: <QRCodePage slug={basePath} />,
            group: 'System Configuration',
            permissionFeatures: [
              {
                feature: 'dataMatrixAction',
                actions: ['read', 'create', 'update', 'delete'],
              },
              {
                feature: 'qrFlowConfig',
                actions: ['read', 'create', 'update', 'delete'],
              },
            ],
          } as PossibleTabConfig,
        ]
      : []),
    ...(canAccessTab({
      title: 'Website UI',
      icon: Sigma,
      children: <CustomUiBuilderPage slug={basePath} />,
      group: 'System Configuration',
      permissionFeatures: [
        {
          feature: 'business',
          actions: ['read', 'create', 'update', 'delete'],
        },
      ],
    })
      ? [
          {
            title: 'Website UI',
            icon: Sigma,
            children: <CustomUiBuilderPage slug={basePath} />,
            group: 'System Configuration',
            permissionFeatures: [
              {
                feature: 'business',
                actions: ['read', 'create', 'update', 'delete'],
              },
            ],
          } as PossibleTabConfig,
        ]
      : []),
  ];

  if (!tabsWithHome.length) {
    return (
      <Unauthorized description="No authorized modules are available for your account." />
    );
  }

  // @ts-expect-error
  const tab = (search.tab as string) ?? tabsWithHome[0].title;

  const currentItem =
    tabsWithHome.find((t) => t.title === tab) ?? tabsWithHome?.[0];

  if (!currentItem) {
    return <NotFound />;
  }

  function getCurrentPermissions() {
    if (!('schema' in currentItem)) {
      return {
        canCreate: isPrivileged,
        canUpdate: isPrivileged,
        canDelete: isPrivileged,
      };
    }

    const feature = String(currentItem.schema);
    return {
      canCreate: canPerformFeatureAction({
        business,
        user,
        userSoul,
        feature,
        action: 'create',
      }),
      canUpdate: canPerformFeatureAction({
        business,
        user,
        userSoul,
        feature,
        action: 'update',
      }),
      canDelete: canPerformFeatureAction({
        business,
        user,
        userSoul,
        feature,
        action: 'delete',
      }),
    };
  }

  function getComponents() {
    if ('schema' in currentItem) {
      const feature = String(currentItem.schema);
      if (
        !canAccessFeature({
          business,
          user,
          userSoul,
          feature,
        })
      ) {
        return [];
      }

      const currentSchema = appSchema[currentItem.schema as SchemaKeys];
      if ('components' in currentSchema) {
        return currentSchema.components?.() ?? [];
      }
    }
    return [];
  }

  const components = getComponents();
  const currentPermissions = getCurrentPermissions();

  const currentTableItem = isRenderableAutoTableTab(currentItem)
    ? normalizeTableTab(currentItem, basePath)
    : null;

  return (
    <SidebarProvider>
      <CollapsibleSidebar
        tabs={tabsWithHome}
        businessName={business?.name}
        slug={business?.basePath}
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
            <AutoTable<SchemaKeys>
              {...currentTableItem}
              key={tab}
              canCreate={currentPermissions.canCreate}
              canUpdate={currentPermissions.canUpdate}
              canDelete={currentPermissions.canDelete}
            />
          ) : !components?.length ? (
            currentTableItem ? (
              <AutoTable<SchemaKeys>
                {...currentTableItem}
                key={tab}
                canCreate={currentPermissions.canCreate}
                canUpdate={currentPermissions.canUpdate}
                canDelete={currentPermissions.canDelete}
              />
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
                      <AutoTable<SchemaKeys>
                        {...currentTableItem}
                        key={tab}
                        canCreate={currentPermissions.canCreate}
                        canUpdate={currentPermissions.canUpdate}
                        canDelete={currentPermissions.canDelete}
                      />
                    ) : null}
                  </div>
                </Card>
              </TabsContent>
              {components.map(({ component: Component, name }) => (
                <TabsContent
                  value={name}
                  key={name}
                  className="flex-1 mt-1 sm:mt-4"
                >
                  <Card className="border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-0.5 sm:p-4">
                      {'schema' in currentItem ? (
                        <PermissionGate feature={String(currentItem.schema)}>
                          <Component slug={business.basePath} />
                        </PermissionGate>
                      ) : null}
                    </div>
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
  canUpdate?: boolean;
  isItemLocked?: (item: NestedSchemaType<K>) => boolean;
  onUpdate?: (
    data: GunMessagePut,
    variables: UpdaterParams<K>,
    updateContext: UpdateContext<K>,
    context: MutationFunctionContext,
  ) => Promise<unknown> | unknown;
};

export type UpdateContext<K extends SchemaKeys> = {
  previousData?: NestedSchemaType<K>;
  newData?: NestedSchemaType<K>;
};

type WrappedEnumField = {
  Values?: Record<string, string>;
  options?: readonly string[];
  enum?: Record<string, string | number>;
  _def?: {
    innerType?: WrappedEnumField;
    schema?: WrappedEnumField;
    type?: WrappedEnumField;
    out?: WrappedEnumField;
    in?: WrappedEnumField;
  };
};

function getWrappedEnumValues(field: WrappedEnumField | undefined): string[] {
  if (!field) return [];

  const queue: WrappedEnumField[] = [field];
  const visited = new Set<WrappedEnumField>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const values = current.Values;
    if (values) {
      const keys = Object.keys(values);
      if (keys.length > 0) return keys;
    }

    const options = current.options;
    if (Array.isArray(options) && options.length > 0) {
      return [...options];
    }

    const nativeEnumValues = current.enum
      ? [
          ...new Set(
            Object.values(current.enum).filter(
              (value): value is string => typeof value === 'string',
            ),
          ),
        ]
      : [];
    if (nativeEnumValues.length > 0) {
      return nativeEnumValues;
    }

    for (const candidate of [
      current._def?.innerType,
      current._def?.schema,
      current._def?.type,
      current._def?.out,
      current._def?.in,
    ]) {
      if (candidate && !visited.has(candidate)) {
        queue.push(candidate);
      }
    }
  }

  return [];
}

export function AutoKanban<K extends SchemaKeys>({
  slug,
  schema: schemaName,
  groupKey,
  cardBuilder,
  canUpdate = true,
  isItemLocked,
  onUpdate,
}: AutoKanbanProps<K>) {
  const { data: orders = [], isLoading } = api[schemaName].useGet({
    keys: [slug],
  });
  const { mutate: update } = api[schemaName].useUpdate({
    keys: [slug],
    onMutate(variables) {
      const previousData = orders.find(
        (order) => getSoulFromUnknown(order) === variables.id,
      );
      if (!previousData) return {};

      return {
        previousData,
        newData: {
          ...previousData,
          ...variables,
        } as NestedSchemaType<K>,
      } satisfies UpdateContext<K>;
    },
    onSuccess(data, variables, updateContext, context) {
      onUpdate?.(
        data,
        variables,
        (updateContext ?? {}) as UpdateContext<K>,
        context,
      );
    },
  });
  const columns = _.groupBy(orders, (o) => o[groupKey]);
  const schema = getNestedZodShape(schemaName, appSchema.schemaShape);
  const schemaObject =
    schema instanceof ZodEffects ? schema.innerType() : schema;
  const groupField = schemaObject.shape[groupKey] as WrappedEnumField;
  const statuses = getWrappedEnumValues(groupField);

  return (
    // @ts-expect-error
    <Kanban.Root
      loading={isLoading}
      value={columns}
      onValueChange={(columns) => {
        if (!canUpdate) return;
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
      getItemValue={(item) => getSoulFromUnknown(item) ?? ''}
    >
      <Kanban.Board className="grid auto-rows-fr grid-cols-3">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            value={status}
            orders={columns?.[status] ?? []}
            cardBuilder={cardBuilder}
            canUpdate={canUpdate}
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
  canUpdate: boolean;
  isItemLocked?: AutoKanbanProps<K>['isItemLocked'];
}

function KanbanColumn<K extends SchemaKeys>({
  value,
  orders,
  cardBuilder,
  canUpdate,
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
                asHandle={canUpdate && !(isItemLocked?.(order) ?? false)}
              />
            ))}
      </div>
    </Kanban.Column>
  );
}
