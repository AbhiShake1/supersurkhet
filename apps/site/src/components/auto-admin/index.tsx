import { AppSidebar, type SidebarItems } from "@/components/app-sidebar";
import * as Kanban from "@/components/ui/kanban";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { appSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import type { NestedSchemaType, SchemaKeys } from "@gta/react-hooks";
import { getNestedZodShape } from "@gta/react-hooks";
import { useQuery } from "@tanstack/react-query";
import { notFound, useLocation } from "@tanstack/react-router";
import _ from "lodash";
import { GripVertical, Home, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AutoTable, type AutoTableProps } from "../auto-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AdminDashboard } from "../admin-dashboard";

export interface AutoAdminProps {
	tabs: PossibleTabConfig[];
}

type PossibleTabConfig = {
	[K in SchemaKeys]: AutoTableTab<K>;
}[SchemaKeys];

export type AutoTableTab<K extends SchemaKeys = SchemaKeys> = {
	title: string;
	icon?: LucideIcon;
} & (
		| {
			children: ReactNode;
		}
		| AutoTableProps<K extends SchemaKeys ? K : never>
	);

export function AutoAdmin({ tabs }: AutoAdminProps) {
	const tabsWithHome = [
		{
			title: "Home",
			icon: Home,
			children: <AdminDashboard />,
		},
		...tabs,
	];

	const data: SidebarItems = {
		items: tabsWithHome,
	};
	const { search, pathname: currentPathname } = useLocation();
	// @ts-expect-error
	const tab = (search.tab as string) ?? tabsWithHome[0].title;

	const currentItem = tabsWithHome.find((t) => t.title === tab);

	const [basePath] = currentPathname.split("/").filter((i) => !!i.length);

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
		throw notFound();
	}

	return (
		<SidebarProvider>
			<AppSidebar data={data} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
					</div>
				</header>
				<section
					className={cn(
						"mx-6 items-start justify-center",
						"min-w-[85%] max-w-[85%]",
					)}
				>
					{"children" in currentItem ? (
						currentItem.children
					) : "parsedSchema" in currentItem ? (
						<AutoTable
							parsedSchema={currentItem.parsedSchema}
							slug={currentItem.slug ?? basePath}
						/>
					) : !components?.length ? (
						<AutoTable
							schema={currentItem.schema}
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
							className="flex flex-1 flex-col"
							onValueChange={(value) => {
								localStorage.setItem(`tab-#${basePath}-${tab}`, value);
							}}
						>
							<TabsList>
								<TabsTrigger value="table">Table</TabsTrigger>
								{components.map(({ name }) => (
									<TabsTrigger value={name} key={name}>
										{name}
									</TabsTrigger>
								))}
							</TabsList>
							<TabsContent value="table" className="flex-1">
								<AutoTable
									schema={currentItem.schema}
									slug={currentItem.slug ?? basePath}
								/>
							</TabsContent>
							{components.map(({ component, name }) => (
								<TabsContent value={name} key={name} className="flex-1">
									{component}
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
