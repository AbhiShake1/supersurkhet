import type { DataTableRowAction, FilterVariant } from "@/types/data-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { useDataTable } from "@/hooks/use-data-table";

import { AutoForm, AutoFormWithoutLabel } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Editable from "@/components/ui/editable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreate, useDelete, useGet, useUpdate, type NestedSchemaType, type SchemaKeys } from "@/lib/gun/index";
import { getNestedZodShape } from "@/lib/gun/utils/parser";
import { appSchema } from "@/lib/schema";
import { parseSchema } from "@autoform/zod";
import { useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowUpDown,
	CalendarIcon,
	CircleDashed,
	Ellipsis,
	Plus,
	Save,
	Text,
} from "lucide-react";
import { useState } from "react";
import { z, type ZodObject } from "zod";
import { AutoPreview } from "../auto-preview";
import { DataTableAdvancedToolbar } from "../data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { DataTableFilterList } from "../data-table/data-table-filter-list";
import { DataTableSortList } from "../data-table/data-table-sort-list";
import { DeleteRowDialog } from "../data-table/delete-row-dialog";
import { EditRowDialog } from "../data-table/edit-row-dialog";
import { AutoTableActionBar } from "./auto-table-action-bar";

export interface AutoTableProps<T extends SchemaKeys> {
	schema: T,
	slug: string;
}

export function AutoTable<T extends SchemaKeys>({
	schema: schemaName,
	slug,
}: AutoTableProps<T>) {
	const [dialogOpen, setDialogOpen] = useState(false);
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

	const search = useSearch({ from: "__root__" })

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
		meta: {
			updateData(rowId: string, data: Record<string, any>) {
				// @ts-expect-error
				update(rowId, data)
			},
		},
		// @ts-expect-error
		getRowId: (originalRow) => originalRow._?.soul,
		shallow: false,
		clearOnDefault: true,
	});

	return (
		<div className="container mx-auto py-6 space-y-4 flex flex-col items-end">
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTrigger asChild>
					<Button className="gap-2">
						<Plus className="size-4" />
						Add New
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Add</DialogTitle>
						<DialogDescription>Add new</DialogDescription>
					</DialogHeader>
					<ScrollArea className="relative max-h-[70vh]">
						<AutoForm
							schema={schema}
							// @ts-expect-error
							onSubmit={(b) => (setDialogOpen(false), create(b))}
						>
							<DialogFooter className="absolute bottom-0 right-2">
								<SubmitButton className="gap-2">
									<Save className="size-4" />
									Save
								</SubmitButton>
							</DialogFooter>
						</AutoForm>
					</ScrollArea>
				</DialogContent>
			</Dialog>
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
			<DeleteRowDialog
				open={rowAction?.variant === "delete"}
				onOpenChange={() => setRowAction(null)}
				data={rowAction?.row.original ? [rowAction?.row.original] : []}
				showTrigger={false}
				onConfirm={() => {
					console.log('confirne')
					setRowAction(null)
					onDelete(rowAction?.row.id ?? "")
					rowAction?.row.toggleSelected(false)
				}}
			/>
			<EditRowDialog
				open={rowAction?.variant === "update"}
				onOpenChange={() => setRowAction(null)}
				data={rowAction?.row.original}
				schema={schema}
				onSubmit={(data) => (setRowAction(null), data && update(rowAction?.row.id ?? "", data))}
				showTrigger={false}
			/>
		</div>
	);
}

interface GetAutoTableColumnsProps<T extends SchemaKeys, S> {
	// estimatedHoursRange: { min: number; max: number };
	setRowAction: React.Dispatch<
		React.SetStateAction<DataTableRowAction<NestedSchemaType<T>> | null>
	>;
	schema: S;
}

function getAutoTableColumns<T extends SchemaKeys, S extends ZodObject<any>>({
	setRowAction,
	schema,
}: GetAutoTableColumnsProps<T, S>): ColumnDef<NestedSchemaType<T>>[] {
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

	const parsedSchema = parseSchema(schema)

	for (const field of parsedSchema.fields) {
		const { key, description } = field;
		const childSchema = z.object({ [key]: schema.shape[key] })
		if (["_"].includes(key)) continue;

		const column: ColumnDef<NestedSchemaType<T>> = {
			id: key,
			accessorKey: key,
			header: ({ column }) => (
				<DataTableColumnHeader
					className="capitalize text-center w-full items-center justify-center"
					column={column}
					// @ts-expect-error
					title={description || key}
				/>
			),
			cell: ({ cell, table, row }) => {
				const value = cell.getValue();

				function update(value: Record<string, any>) {
					// @ts-expect-error
					table.options.meta?.updateData(row.id, value)
				}

				return <Editable.Root
					defaultValue={value as string}
					placeholder="-"
					className="text-center"
					triggerMode="dblclick"
				>
					<Editable.Area>
						<Editable.Preview className="max-w-56">
							<AutoPreview field={field} key={field.key} value={value} />
						</Editable.Preview>
						<Editable.Input asChild>
							<AutoFormWithoutLabel
								formProps={{
									onBlur: (e) => {
										const newValue = new FormData(e.currentTarget).get(key)
										update({ [key]: newValue })
									},
								}}
								defaultValues={{ [key]: value as string }}
								schema={childSchema}
								onSubmit={update}
							/>
						</Editable.Input>
					</Editable.Area>
				</Editable.Root>
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
