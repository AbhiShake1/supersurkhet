import * as Kanban from "@/components/ui/kanban";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import CollapsibleSidebar, { type SidebarItems } from "@/components/ui/collapsible-sidebar";
import { api } from "@/lib/api";
import { appSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import type { NestedSchemaType, SchemaKeys } from "@gta/react-hooks";
import { getNestedZodShape } from "@gta/react-hooks";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import _ from "lodash";
import { GripVertical, QrCodeIcon, Settings, Search, BarChart3, Bell, type LucideIcon, X, Sigma } from "lucide-react";
import type { ReactNode } from "react";
import { AutoTable, type AutoTableProps } from "../auto-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AdminDashboard } from "../admin-dashboard";
import { QRCodePage } from "../qr-code-page";
import { Input } from "../ui/input";
import Card from "../ui/minimal-card";
import { useState, useEffect, useMemo } from "react";
import type { z } from "zod";
import { NotFound } from "../ui/not-found";
import { CustomUiBuilderPage } from "../ui-builder";
import { LanguageSelector } from "../language-selector";

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
  transformer?: (data: any[]) => NestedSchemaType<K>[];
  extender?: (shape: NestedSchemaType<K>) => z.ZodObject<any>;
} & (
    | {
      children: ReactNode;
    }
    | AutoTableProps<K extends SchemaKeys ? K : never>
  );

export function AutoAdmin({ tabs }: AutoAdminProps) {
  const { search, pathname: currentPathname } = useLocation();
  const [basePath] = currentPathname.split("/").filter((i) => !!i.length);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcuts
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: allBusinesses = [] } = api.business.useGet({
    keys: [basePath],
    single: true,
  });
  const business = allBusinesses[0];

  const tabsWithHome = useMemo(() => [
    {
      title: "Dashboard",
      icon: BarChart3,
      children: <AdminDashboard slug={basePath} businessType={business.businessType} />,
    },
    ...tabs,
    {
      title: "QR Management",
      icon: QrCodeIcon,
      children: <QRCodePage slug={basePath} />,
      group: "System Configuration"
    },
    {
      title: "Website UI",
      icon: Sigma,
      children: <CustomUiBuilderPage slug={basePath} />,
      group: "System Configuration"
    }
  ], [tabs]);

  // @ts-expect-error
  const tab = (search.tab as string) ?? tabsWithHome[0].title;

  const currentItem = tabsWithHome.find((t) => t.title === tab) ?? tabsWithHome?.[0];

  function _canGetComponents() {
    return !!currentItem;
  }

  const canGetComponents = _canGetComponents();

  async function getComponents() {
    if (!canGetComponents) return null;
    if (!!currentItem && "schema" in currentItem) {
      const currentSchema = appSchema[currentItem.schema];
      if ("components" in currentSchema) {
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
      "schema",
      (!!currentItem && "slug" in currentItem && currentItem.slug) ?? basePath,
      !!currentItem && "schema" in currentItem && currentItem.schema,
    ],
  });

  if (!currentItem) {
    return <NotFound />
  }

  return (
    <SidebarProvider>
      <CollapsibleSidebar tabs={tabsWithHome} businessName={business?.name} slug={business?.basePath} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 bg-background/95 backdrop-blur z-50 flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <h1 className="font-bold text-lg px-4">{currentItem.title}</h1>

          {/* Search and Action Bar */}
          <div className="ml-auto flex items-center gap-2 px-4">
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-background pl-8 md:w-[200px] lg:w-[300px]"
              leadingIcon={<Search className="h-4 w-4" />}
            />

            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">3</span>
            </Button>

            <Button variant="outline" size="icon" className="">
              <Settings className="h-4 w-4" />
            </Button>

            {/* Language Selector */}
            <div className="mr-2">
              <LanguageSelector />
            </div>

            {/* Keyboard shortcuts indicator */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeyboardShortcuts(true)}
              className="hidden md:flex items-center gap-1 text-xs"
            >
              <span className="hidden sm:inline">Help</span>
              <span className="flex gap-1">
                <kbd className="kbd kbd-xs">⌘</kbd>
                <kbd className="kbd kbd-xs">K</kbd>
              </span>
            </Button>
          </div>
        </header>

        <section
          className={cn(
            "mx-6 items-start justify-center mt-6",
            "min-w-[95%] max-w-[95%]",
          )}
        >
          {"children" in currentItem ? (
            currentItem.children
          ) : "parsedSchema" in currentItem ? (
            <AutoTable
              {...currentItem}
              slug={currentItem.slug ?? basePath}
            />
          ) : !components?.length ? (
            <AutoTable
              {...currentItem}
              slug={currentItem.slug ?? basePath}
            />
          ) : (
            <Tabs
              key={tab}
              defaultValue={
                localStorage.getItem(`tab-#${basePath}-${tab}`) ??
                components[0]?.name ??
                "table"
              }
              className={cn(
                "flex flex-1 flex-col",
              )}
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
              <TabsContent value="table" className={cn(
                "flex-1 mt-4",
              )}>
                <Card className="border rounded-lg shadow-sm">
                  <div className="p-4">
                    <AutoTable
                      {...currentItem}
                      slug={currentItem.slug ?? basePath}
                    />
                  </div>
                </Card>
              </TabsContent>
              {components.map(({ component, name }) => (
                <TabsContent value={name} key={name} className="flex-1 mt-4">
                  <Card className="border rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <h2 className="text-xl font-semibold">{name}</h2>
                    </div>
                    <div className="p-4">
                      {component}
                    </div>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-md border rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKeyboardShortcuts(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Open search</span>
                  <span className="flex gap-1">
                    <kbd className="kbd kbd-xs">⌘</kbd>
                    <kbd className="kbd kbd-xs">K</kbd>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Global search</span>
                  <span className="flex gap-1">
                    <kbd className="kbd kbd-xs">⌘</kbd>
                    <kbd className="kbd kbd-xs">P</kbd>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quick add</span>
                  <span className="flex gap-1">
                    <kbd className="kbd kbd-xs">⌘</kbd>
                    <kbd className="kbd kbd-xs">N</kbd>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Close modal</span>
                  <span className="flex gap-1">
                    <kbd className="kbd kbd-xs">ESC</kbd>
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

// We need to define PlusIcon separately since it's used but not imported

export type AutoKanbanProps<K extends SchemaKeys> = {
  slug: string;
  groupKey: keyof NestedSchemaType<K>;
  cardBuilder: (data: NestedSchemaType<K>) => ReactNode;
  schema: K;
};

export function AutoKanban<K extends SchemaKeys>({
  slug,
  schema: schemaName,
  groupKey,
  cardBuilder,
}: AutoKanbanProps<K>) {
  const { data: orders = [], isLoading } = api[schemaName].useGet({
    keys: [slug],
  });
  const { mutate: update } = api[schemaName].useUpdate({ keys: [slug] });
  const columns = _.groupBy(orders, (o) => o[groupKey]);
  const schema = getNestedZodShape(schemaName, appSchema.schemaShape);

  return (
    // @ts-expect-error
    <Kanban.Root
      loading={isLoading}
      value={columns}
      onValueChange={(columns) => {
        for (const [status, orders] of Object.entries(columns)) {
          for (const order of orders) {
            if (!order._?.soul) continue;
            // @ts-expect-error
            update({ id: order._?.soul, [groupKey]: status });
          }
        }
      }}
      // @ts-expect-error
      getItemValue={(item) => item._?.soul ?? ""}
    >
      <Kanban.Board className="grid auto-rows-fr grid-cols-3">
        {Object.keys(schema.shape[groupKey].Values).map((status) => (
          <KanbanColumn
            key={status}
            value={status}
            orders={columns?.[status] ?? []}
            cardBuilder={cardBuilder}
          />
        ))}
      </Kanban.Board>
      <Kanban.Overlay>
        {({ value, variant }) => {
          if (variant === "column") {
            const orders = columns[value] ?? [];

            // @ts-expect-error
            return <KanbanColumn value={value} orders={orders} />;
          }

          const order = Object.values(columns)
            .flat()
            .find((o) => o._?.soul === value);

          if (!order) return null;

          return <KanbanCard order={order} cardBuilder={cardBuilder} />;
        }}
      </Kanban.Overlay>
    </Kanban.Root>
  );
}

interface KanbanCardProps<K extends SchemaKeys>
  extends Omit<React.ComponentProps<typeof Kanban.Item>, "value"> {
  order: NestedSchemaType<K>;
  cardBuilder: AutoKanbanProps<K>["cardBuilder"];
}

function KanbanCard<K extends SchemaKeys>({
  order,
  cardBuilder,
  ...props
}: KanbanCardProps<K>) {
  return (
    <Kanban.Item
      key={order._?.soul}
      value={order._?.soul ?? ""}
      // asChild
      {...props}
    >
      {cardBuilder?.(order)}
    </Kanban.Item>
  );
}

interface KanbanColumnProps<K extends SchemaKeys>
  extends Omit<React.ComponentProps<typeof Kanban.Column>, "children"> {
  orders: NestedSchemaType<K>[];
  cardBuilder: AutoKanbanProps<K>["cardBuilder"];
}

function KanbanColumn<K extends SchemaKeys>({
  value,
  orders,
  cardBuilder,
  ...props
}: KanbanColumnProps<K>) {
  const context = Kanban.useKanbanContext("KanbanColumn");
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
              className={cn("pointer-events-none rounded-sm")}
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
            <Skeleton key={i} className="w-full h-12" />
          ))
          : orders.map((order) => (
            <KanbanCard
              key={order._?.soul}
              order={order}
              cardBuilder={cardBuilder}
              asHandle
            />
          ))}
      </div>
    </Kanban.Column>
  );
}
