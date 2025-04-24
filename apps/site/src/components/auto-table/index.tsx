import type { DataTableRowAction, FilterVariant } from "@/types/data-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { useDataTable } from "@/hooks/use-data-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { useCreate, useDelete, useGet, useUpdate, type NestedSchemaType, type SchemaKeys } from "@/lib/gun/index";
import { getNestedZodShape } from "@/lib/gun/utils/parser";
import { appSchema } from "@/lib/schema";
import { useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowUpDown,
	CalendarIcon,
	CircleDashed,
	Ellipsis,
	Text,
} from "lucide-react";
import { z, type ZodObject } from "zod";
import { DataTableAdvancedToolbar } from "../data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { DataTableFilterList } from "../data-table/data-table-filter-list";
import { DataTableSortList } from "../data-table/data-table-sort-list";
import { DeleteRowDialog } from "../data-table/delete-row-dialog";
import { AutoTableActionBar } from "./auto-table-action-bar";

interface AutoTableProps<T> {
	schema: T,
	slug: string;
}

export function AutoTable<T extends SchemaKeys>({
	schema: schemaName,
	slug,
}: AutoTableProps<T>) {
	const data = useGet(schemaName, slug)
	const create = useCreate(schemaName, slug)
	const update = useUpdate(schemaName, slug)
	const onDelete = useDelete(schemaName, slug)
	const schema = getNestedZodShape(schemaName, appSchema);
	const [rowAction, setRowAction] =
		React.useState<DataTableRowAction<NestedSchemaType<T>> | null>(null);

	const columns = getAutoTableColumns({
		schema,
		setRowAction,
	});

	const search = useSearch({from: "__root__"})
	
	// @ts-expect-error
	const perPage = search.perPage ?? 10

	const { table, shallow, debounceMs, throttleMs } = useDataTable({
		data,
		columns,
		pageCount: Math.ceil(data.length / perPage) || 1,
		enableAdvancedFilter: true,
		initialState: {
			// sorting: [{ id: "createdAt", desc: true }],
			columnPinning: { right: ["actions"] },
		},
		// @ts-expect-error
		getRowId: (originalRow) => originalRow._?.soul,
		shallow: false,
		clearOnDefault: true,
	});

	return (
		<>
			<DataTable table={table} actionBar={<AutoTableActionBar table={table} onDelete={onDelete} />}>
				<DataTableAdvancedToolbar table={table}>
					<DataTableSortList table={table} align="start" />
					{/* {filterFlag === "advancedFilters" ? ( */}
					<DataTableFilterList
						table={table}
						shallow={shallow}
						debounceMs={debounceMs}
						throttleMs={throttleMs}
						align="start"
					/>
					{/* ) : ( */}
					{/* <DataTableFilterMenu
                            table={table}
                            shallow={shallow}
                            debounceMs={debounceMs}
                            throttleMs={throttleMs}
                        /> */}
				</DataTableAdvancedToolbar>
				{/* <DataTableToolbar table={table}>
             <DataTableSortList table={table} align="end" />
           </DataTableToolbar> */}
			</DataTable>
			{/* <UpdateTaskSheet
				open={rowAction?.variant === "update"}
				onOpenChange={() => setRowAction(null)}
				task={rowAction?.row.original ?? null}
			/> */}
			<DeleteRowDialog
				open={rowAction?.variant === "delete"}
				onOpenChange={() => setRowAction(null)}
				data={rowAction?.row.original ? [rowAction?.row.original] : []}
				showTrigger={false}
				onConfirm={() => rowAction?.row.toggleSelected(false)}
			/>
		</>
	);
}

interface GetTasksTableColumnsProps<T extends SchemaKeys, S> {
	// estimatedHoursRange: { min: number; max: number };
	setRowAction: React.Dispatch<
		React.SetStateAction<DataTableRowAction<NestedSchemaType<T>> | null>
	>;
	schema: S;
}

export function getAutoTableColumns<T extends SchemaKeys, S extends ZodObject<any>>({
	setRowAction,
	schema,
}: GetTasksTableColumnsProps<T, S>): ColumnDef<NestedSchemaType<T>>[] {
	const columns: ColumnDef<NestedSchemaType<T>>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
					className="translate-y-0.5"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
					className="translate-y-0.5"
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 40,
		},
	];

	const shape = schema.shape;

	for (const [key, field] of Object.entries(shape)) {
		if (["_"].includes(key)) continue;

		const column: ColumnDef<NestedSchemaType<T>> = {
			id: key,
			accessorKey: key,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					// @ts-expect-error
					title={field?._def?.description || key}
				/>
			),
			cell: ({ cell }) => {
				const value = cell.getValue();

				if (!value) return <div className="text-center">-</div>

				// Handle different field types
				if (field instanceof z.ZodDate) {
					return <div className="text-center">
						{formatDate(value as Date)}
					</div>
				}

				if (field instanceof z.ZodNumber) {
					return <div className="text-center">{value as number}</div>;
				}

				if (field instanceof z.ZodBoolean) {
					return <Badge variant="outline" className="text-center">{value ? "Yes" : "No"}</Badge>;
				}

				if (field instanceof z.ZodEnum) {
					return (
						<Badge variant="outline" className="capitalize text-center">
							{value as string}
						</Badge>
					);
				}

				// Default string/text display
				return <div className="truncate text-center">{String(value)}</div>;
			},
			meta: {
				// @ts-expect-error
				label: field?._def?.description || key,
				// @ts-expect-error
				variant: getFilterVariant(field),
				// @ts-expect-error
				icon: getFieldIcon(field),
			},
			enableColumnFilter: true,
		};

		columns.push(column);
	}

	columns.push({
		id: "actions",
		cell: function Cell({ row }) {
			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label="Open menu"
							variant="ghost"
							className="flex size-8 p-0 data-[state=open]:bg-muted"
						>
							<Ellipsis className="size-4" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem
							onSelect={() => setRowAction({ row, variant: "update" })}
						>
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={() => setRowAction({ row, variant: "delete" })}
						>
							Delete
							<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
		size: 40,
	});

	return columns;
}

// Helper function to determine filter variant based on field type
function getFilterVariant(field: z.ZodTypeAny): FilterVariant {
	if (field instanceof z.ZodString) return "text";
	if (field instanceof z.ZodNumber) return "range";
	if (field instanceof z.ZodEnum) return "multiSelect";
	if (field instanceof z.ZodBoolean) return "multiSelect";
	if (field instanceof z.ZodDate) return "dateRange";
	return "text";
}

// Helper function to get appropriate icon for field type
function getFieldIcon(field: z.ZodTypeAny) {
	if (field instanceof z.ZodDate) return CalendarIcon;
	if (field instanceof z.ZodNumber) return ArrowUpDown;
	if (field instanceof z.ZodBoolean) return CircleDashed;
	return Text;
}
