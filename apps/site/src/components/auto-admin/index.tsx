import * as Kanban from '@/components/ui/kanban';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CollapsibleSidebar from '@/components/ui/collapsible-sidebar';
import { api } from '@/lib/api';
import { appSchema } from '@/lib/schema';
import { cn, getSoulFromUnknown } from '@/lib/utils';
import type { NestedSchemaType, SchemaKeys } from '@gta/react-hooks';
import { getNestedZodShape } from '@gta/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import _ from 'lodash';
import { ZodEffects } from 'zod';
import {
  GripVertical,
  QrCodeIcon,
  BarChart3,
  type LucideIcon,
  Sigma,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AutoTable, type AutoTableProps } from '../auto-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AdminDashboard } from '../admin-dashboard';
import { QRCodePage } from '../qr-code-page';
import Card from '../ui/minimal-card';
import { NotFound } from '../ui/not-found';
import { CustomUiBuilderPage } from '../ui-builder';
import { LanguageSelector } from '../language-selector';

export interface AutoAdminProps {
  tabs: PossibleTabConfig[];
}

export type PossibleTabConfig = {
  [K in SchemaKeys]: AutoTableTab<K>;
}[SchemaKeys];

export type AutoTableTab<K extends SchemaKeys = SchemaKeys> = {
  group?: string;
  title: string;
  icon?: LucideIcon;
} & (
  | {
      children: ReactNode;
    }
  | AutoTableProps<K extends SchemaKeys ? K : never>
);

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

export function AutoAdmin({ tabs }: AutoAdminProps) {
  'use memo';
  const { search, pathname: currentPathname } = useLocation();
  const [basePath] = currentPathname.split('/').filter((i) => !!i.length);

  const { data: allBusinesses = [] } = api.business.useGet({
    keys: [basePath],
    single: true,
  });
  const business = allBusinesses[0];

  const tabsWithHome = [
    {
      title: 'Dashboard',
      icon: BarChart3,
      children: (
        <AdminDashboard slug={basePath} businessType={business.businessType} />
      ),
    },
    ...tabs,
    {
      title: 'QR Management',
      icon: QrCodeIcon,
      children: <QRCodePage slug={basePath} />,
      group: 'System Configuration',
    },
    {
      title: 'Website UI',
      icon: Sigma,
      children: <CustomUiBuilderPage slug={basePath} />,
      group: 'System Configuration',
    },
  ];

  // @ts-expect-error
  const tab = (search.tab as string) ?? tabsWithHome[0].title;

  const currentItem =
    tabsWithHome.find((t) => t.title === tab) ?? tabsWithHome?.[0];

  function _canGetComponents() {
    return !!currentItem;
  }

  const canGetComponents = _canGetComponents();

  async function getComponents() {
    if (!canGetComponents) return null;
    if (!!currentItem && 'schema' in currentItem) {
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
  }

  const { data: components } = useQuery({
    enabled: canGetComponents,
    queryFn: getComponents,
    queryKey: [
      'schema',
      (!!currentItem && 'slug' in currentItem && currentItem.slug) ?? basePath,
      !!currentItem && 'schema' in currentItem && currentItem.schema,
    ],
  });

  if (!currentItem) {
    return <NotFound />;
  }

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
  const schemaObject = schema instanceof ZodEffects ? schema.innerType() : schema;
  const groupField = schemaObject.shape[groupKey] as {
    Values?: Record<string, string>;
    _def?: { innerType?: { Values?: Record<string, string> } };
  };
  const statuses = Object.keys(
    groupField.Values ?? groupField._def?.innerType?.Values ?? {},
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
