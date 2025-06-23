import { useGet, useUpdate, type NestedSchemaType, type SchemaKeys } from "@gta/react-hooks";
import { AutoTable, type AutoTableProps } from "../auto-table";

import { AppSidebar, type SidebarItems } from "@/components/app-sidebar";
import * as Kanban from "@/components/ui/kanban";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/use-profile";
import { appSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { MouseSensor, useSensor } from "@dnd-kit/core";
import { notFound, useLocation } from "@tanstack/react-router";
import _ from "lodash";
import {
    GripVertical,
    type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface AutoAdminProps {
    tabs: PossibleTabConfig[]
}

type PossibleTabConfig = {
    [K in SchemaKeys]: AutoTableTab<K>
}[SchemaKeys]

export type AutoTableTab<K extends SchemaKeys = SchemaKeys> = {
    title: string;
    icon?: LucideIcon;
} & (
        {
            children: ReactNode,
        } | (
            AutoTableProps<K extends SchemaKeys ? K : never> &
            NoInfer<({
                groupKey: K extends SchemaKeys ? keyof NestedSchemaType<K> : never,
                cardBuilder: K extends SchemaKeys ? (data: NestedSchemaType<K>) => ReactNode : never
            } | { groupKey?: never, cardBuilder?: never })>
        )
    )

export function AutoAdmin({ tabs }: AutoAdminProps) {
    const user = useProfile()
    const data: SidebarItems = {
        user: {
            name: user?.role ?? "admin",
            email: user?.email,
            avatar: user?.avatar ?? "",
        },
        items: tabs,
    };
    const { search, pathname: currentPathname } = useLocation()
    // @ts-expect-error
    const tab = search.tab as string ?? tabs[0].title;

    const currentItem = tabs.find(t => t.title === tab);

    if (!currentItem) {
        throw notFound()
    }

    const [basePath] = currentPathname
        .split("/")
        .filter((i) => !!i.length)

    return (
        <SidebarProvider>
            <AppSidebar data={data} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <section className={cn(
                    "mx-6 items-start justify-center",
                    "min-w-[85%] max-w-[85%]"
                )}>
                    {"children" in currentItem ? currentItem.children : (
                        ("groupKey" in currentItem && "cardBuilder" in currentItem && !!currentItem.cardBuilder && !!currentItem.groupKey) ? (
                            <Tabs defaultValue={localStorage.getItem(`tab-#${basePath}`) ?? "table"} className="flex flex-1 flex-col" onValueChange={(value) => {
                                localStorage.setItem(`tab-#${basePath}`, value)
                            }}>
                                <TabsList className="">
                                    <TabsTrigger value="table">Table</TabsTrigger>
                                    <TabsTrigger value="board">Board</TabsTrigger>
                                </TabsList>
                                <TabsContent value="table" className="flex-1">
                                    {
                                        "parsedSchema" in currentItem ?
                                            <AutoTable parsedSchema={currentItem.parsedSchema} slug={basePath} /> :
                                            <AutoTable schema={currentItem.schema} slug={basePath} />
                                    }
                                </TabsContent>
                                <TabsContent value="board" className="flex-1">
                                    {
                                        // @ts-expect-error
                                        <AutoKanban slug={basePath} cardBuilder={currentItem.cardBuilder} groupKey={currentItem.groupKey} schema={currentItem.schema} />
                                    }
                                </TabsContent>
                            </Tabs>
                        ) : (
                            "parsedSchema" in currentItem ?
                                <AutoTable parsedSchema={currentItem.parsedSchema} slug={basePath} /> :
                                <AutoTable schema={currentItem.schema} slug={basePath} />
                        )
                    )}
                </section>
            </SidebarInset>
        </SidebarProvider>
    );
}

export type AutoKanbanProps<K extends SchemaKeys> = {
    slug: string;
    groupKey: keyof NestedSchemaType<K>;
    cardBuilder: (data: NestedSchemaType<K>) => ReactNode
    schema: K;
    parsedSchema: NestedSchemaType<K>
}

function AutoKanban<K extends SchemaKeys>({ slug, schema: schemaName, groupKey, cardBuilder }: AutoKanbanProps<K>) {
    const orders = useGet(schemaName, slug)
    const update = useUpdate(schemaName, slug)
    const columns = _.groupBy(orders, o => o[groupKey])
    const orderSchema = appSchema.shape.order

    const sensors = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 8,
            // This ensures that the drag does not activate when clicking on a button
            // This is a common issue with dnd-kit and interactive elements inside draggable items
            // https://github.com/clauderic/dnd-kit/issues/355
            shouldPreventDefault: true,
        },
    });

    return (
        // @ts-expect-error
        <Kanban.Root
            value={columns}
            onValueChange={columns => {
                for (const [status, orders] of Object.entries(columns)) {
                    for (const order of orders) {
                        // @ts-expect-error
                        if (!order._?.soul) continue
                        // @ts-expect-error
                        update({ id: order._?.soul, [groupKey]: status as any })
                    }
                }
            }}
            // @ts-expect-error
            getItemValue={(item) => item._?.soul ?? ""}
        >
            <Kanban.Board className="grid auto-rows-fr grid-cols-3">
                {
                    Object.keys(orderSchema.shape.orderStatus.Values).map(status => (
                        // @ts-expect-error
                        <KanbanColumn key={status} value={status} orders={columns?.[status] ?? []} cardBuilder={cardBuilder} />
                    ))
                }
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
                        // @ts-expect-error
                        .find((o) => o._?.soul === value);

                    if (!order) return null;

                    // @ts-expect-error
                    return <KanbanCard order={order} cardBuilder={cardBuilder} />
                }}
            </Kanban.Overlay>
        </Kanban.Root>
    );
}

type Order = NestedSchemaType<"order">

interface KanbanCardProps<K extends SchemaKeys>
    extends Omit<React.ComponentProps<typeof Kanban.Item>, "value"> {
    order: Order;
    cardBuilder: AutoKanbanProps<K>["cardBuilder"]
}

function KanbanCard<K extends SchemaKeys>({ order, cardBuilder, ...props }: KanbanCardProps<K>) {
    return (
        <Kanban.Item key={order._?.soul} value={order._?.soul ?? ""} asChild {...props}>
            {cardBuilder(order)}
        </Kanban.Item>
    );
}

interface KanbanColumnProps<K extends SchemaKeys>
    extends Omit<React.ComponentProps<typeof Kanban.Column>, "children"> {
    orders: Order[];
    cardBuilder: AutoKanbanProps<K>["cardBuilder"]
}

function KanbanColumn<K extends SchemaKeys>({ value, orders, cardBuilder, ...props }: KanbanColumnProps<K>) {
    return (
        <Kanban.Column value={value} {...props}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm capitalize">{value}</span>
                    <Badge variant="secondary" className="pointer-events-none rounded-sm">
                        {orders.length}
                    </Badge>
                </div>
                <Kanban.ColumnHandle asChild>
                    <Button variant="ghost" size="icon">
                        <GripVertical className="h-4 w-4" />
                    </Button>
                </Kanban.ColumnHandle>
            </div>
            <div className="flex flex-col gap-2 p-0.5">
                {orders.map((order) => (
                    <KanbanCard key={order._?.soul} order={order} cardBuilder={cardBuilder} asHandle />
                ))}
            </div>
        </Kanban.Column>
    );
}