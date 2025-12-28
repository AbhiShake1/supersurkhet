import { applyFilters } from "@/lib/filter";
import type { DataTableRowAction, FilterVariant } from "@/types/data-table";
import * as React from "react";
import { useMemo } from "react";

import { useAuth } from "@/components/auth-provider";

import { DataTable } from "@/components/data-table";
import { useDataTable } from "@/hooks/use-data-table";

import { AutoForm, AutoFormWithoutLabel } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Editable from "@/components/ui/editable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appSchema } from "@/lib/schema";
import { applySorting } from "@/lib/sort";
import { parseSchema } from "@autoform/zod";
import {
  type NestedSchemaType,
  type SchemaKeys,
  getNestedZodShape,
  getSchema,
  getShape,
  useCreate,
  useDelete,
  useGet,
  useUpdate,
} from "@gta/react-hooks";
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
  Filter,
  SortAsc,
  DatabaseZap,
  Download,
  Upload,
  Columns,
  MoreHorizontal,
  FileSpreadsheet,
  FileText,
  FileJson,
  File,
  ArrowBigUpDash,
  Sheet,
} from "lucide-react";
import { DataTableFilterList } from "../data-table/data-table-filter-list";
import { DataTableSortList } from "../data-table/data-table-sort-list";
import { DeleteRowDialog } from "../data-table/delete-row-dialog";
import { EditRowDialog } from "../data-table/edit-row-dialog";
import SkeletonTableOneWrapper from "../mvpblocks/skeleton-table-1";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "../ui/credenza";
import { AutoTableActionBar } from "./auto-table-action-bar";
import { z } from "zod";
import { DataTableAdvancedToolbar } from "../data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { AutoPreview } from "../auto-preview";
import { api } from "@/lib/api";
import { BadgeMarquee } from "../ui/badge-marquee";
import { parseCSVFile, parseExcelFile, parseJSONFile, validateDataAgainstSchema } from "@/lib/import";

type AggregationType =
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | 'distinct'
  | 'regex'
  | 'group';

// Enhanced column definition with aggregation capabilities
type EnhancedColumnDef<TData> = ColumnDef<TData> & {
  aggregations?: AggregationType[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
}

export type AutoTableProps<T extends SchemaKeys> = {
  className?: string;
  slug: string;
  transformer?: (data: any[]) => NestedSchemaType<T>[];
  extender?: <E extends (shape: z.ZodObject<any>) => NestedSchemaType<T>>(shape: Parameters<E>[0]) => ReturnType<E>;
  enableAdvancedFiltering?: boolean;
  enableAdvancedSorting?: boolean;
  enableAggregations?: boolean;
  enableColumnPinning?: boolean;
  enableRowSelection?: boolean;
  enableGlobalFiltering?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
} & (
    {
      schema: T;
    }
    | {
      parsedSchema: z.ZodObject<any>;
    }
  );

export function AutoTable<T extends SchemaKeys>({
  className,
  slug,
  enableAdvancedFiltering = true,
  enableAdvancedSorting = true,
  enableAggregations = false,
  enableColumnPinning = true,
  enableRowSelection = true,
  enableGlobalFiltering = true,
  enablePagination = true,
  defaultPageSize = 10,
  ...props
}: AutoTableProps<T>) {
  const [formValues, setFormValues] = React.useState<Record<string, any>>({});
  const schemaName = "schema" in props ? props.schema : ("" as SchemaKeys);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: __data = [], isLoading } = useGet(schemaName, slug);
  const _data = props.transformer?.(__data) ?? __data;
  const search = useSearch({ from: "__root__" });
  const { user } = useAuth()
  const data = useMemo(() => {
    // @ts-expect-error
    const filters = search.filters;
    // @ts-expect-error
    const sorting = search.sort;
    function getFiltered() {
      if (filters) {
        return applyFilters(_data, filters);
      }
      return _data;
    }
    function getSorted(data: typeof _data) {
      if (sorting) {
        return applySorting(data, sorting);
      }
      return data;
    }
    return getSorted(getFiltered());
  }, [_data, search]);

  const createMutation = useCreate({
    keys: [schemaName, slug], onSuccess() {
      setDialogOpen(false)
    }
  });
  const updateMutation = useUpdate({
    keys: [schemaName, slug],
    onSuccess() {
      setDialogOpen(false)
    }
  });
  const { mutate: onDelete } = useDelete({ keys: [schemaName, slug] });
  const _schema =
    "parsedSchema" in props
      ? props.parsedSchema
      : getNestedZodShape(schemaName, appSchema.schemaShape);
  const schema = props.extender?.(_schema) ?? _schema;
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<
    NestedSchemaType<T>
  > | null>(null);

  const columns = getAutoTableColumns({
    schema,
    setRowAction,
  });

  // @ts-expect-error
  const perPage = search.perPage ?? 10;

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    tpageCount: Math.ceil(data.length / perPage) || 1,
    enableAdvancedFilter: enableAdvancedFiltering,
    enableGlobalFilter: enableGlobalFiltering,
    enableRowSelection: enableRowSelection,
    enableColumnPinning: enableColumnPinning,
    initialState: {
      pagination: {
        // pageIndex: search.pageIndex ?? 0,
        pageSize: defaultPageSize
      },
      columnPinning: enableColumnPinning ? { right: ["actions"] } : undefined, columnVisibility: {}
    },
    meta: {
      updateData(rowId: string, data: Record<string, unknown>) {
        updateMutation.mutate({ id: rowId, ...data });
      }
    },
    getRowId: (originalRow) => originalRow?._?.soul ?? originalRow["#"]?.split("/").slice(2).join("/") ?? "", shallow: false, nttclearOnDefault: true,
  });

  const [file, setFile] = React.useState<File | null>(null);
  const [isImportPending, setIsImportPending] = React.useState(false);

  if (isLoading) return <SkeletonTableOneWrapper bodyClassName="px-0" />;

  const handleFileUpload = async (e: Event, format: 'csv' | 'excel' | 'json') => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsImportPending(true);

    try {
      let parsedData: any[] = [];

      if (format === 'csv') {
        parsedData = await parseCSVFile(selectedFile);
      } else if (format === 'excel') {
        parsedData = await parseExcelFile(selectedFile);
      } else if (format === 'json') {
        parsedData = await parseJSONFile(selectedFile);
      }

      // Validate the parsed data against the schema
      const { validData, errors } = validateDataAgainstSchema(parsedData, schema as z.ZodObject<any>);

      if (errors.length > 0) {
        // Show validation errors to user
        console.error("Validation errors:", errors);
        alert(`Validation errors found in ${errors.length} records. Please check console for details.`);
        return;
      }

      // Create all records
      for (const record of validData) {
        createMutation.mutate({
          ...record,
          // created_by: user?._?.soul ?? "anon",
          timestamp: Date.now(),
        });
      }

      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    } catch (error) {
      console.error(`Error parsing ${format} file:`, error);
      alert(`Error parsing ${format} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImportPending(false);
    }
  };

  function handleFileImport(acceptedFormats: string, fileType: 'csv' | 'excel' | 'json') {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = acceptedFormats
    input.onchange = e => {
      handleFileUpload(e, fileType)
    }
    input.click()
  }

  return (
    <div className="py-6 space-y-4 flex flex-col items-end">
      <ButtonGroup>
        <Credenza open={dialogOpen} onOpenChange={setDialogOpen}>
          <CredenzaTrigger asChild>
            <Button className="gap-2 rounded-r-none border-r">
              <Plus className="size-4" />
              Add New
            </Button>
          </CredenzaTrigger>
          <CredenzaContent>
            <CredenzaHeader className="min-w-0">
              <CredenzaTitle className="capitalize">Add new {schemaName}</CredenzaTitle>
              <CredenzaDescription asChild>
                <AddDataSuggestions schemaName={schemaName} slug={slug} onSelected={setFormValues} />
              </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody asChild>
              <ScrollArea className="h-[50vh]">
                <AutoForm
                  values={formValues}

                  schema={schema}
                  onSubmit={(b) => createMutation.mutate({ ...b, created_by: user?._?.soul ?? "anon", timestamp: Date.now() })}
                  formProps={{ id: "auto-table-add-form" }}
                />
              </ScrollArea>
            </CredenzaBody>
            <CredenzaFooter className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton
                form="auto-table-add-form"
                className="gap-2 w-full"
                loading={updateMutation.isPending || createMutation.isPending}
              >
                <Save className="size-4" />
                Save
              </SubmitButton>
            </CredenzaFooter>
          </CredenzaContent>
        </Credenza>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="Import Options" className="rounded-l-none border-l-0" disabled={isImportPending}>
              <ArrowBigUpDash className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleFileImport(".csv", "csv")} className="gap-2">
              <FileText className="h-4 w-4" />
              Import from CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFileImport(".json", "json")} className="gap-2">
              <FileJson className="h-4 w-4" />
              Import from JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFileImport(".xlsx,.xls", "excel")} className="gap-2">
              <Sheet className="h-4 w-4" />
              Import from Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <DataTable
        table={table}
        actionBar={<AutoTableActionBar table={table} onDelete={onDelete} />}
        className={className}
      >
        <DataTableAdvancedToolbar table={table}>
          {enableAdvancedFiltering && (
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              align="start"
            >
              <DataTableSortList table={table} align="start" />
            </DataTableFilterList>
          )}
          {enableAggregations && (
            <Button variant="outline" size="sm" className="gap-2">
              <DatabaseZap className="size-4" />
              Aggregations
            </Button>
          )}
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
          console.log("confirne");
          setRowAction(null);
          onDelete(rowAction?.row.id ?? "");
          rowAction?.row.toggleSelected(false);
        }}
      />
      <EditRowDialog
        open={rowAction?.variant === "update"}
        onOpenChange={() => setRowAction(null)}
        data={rowAction?.row.original}
        schema={schema}
        onSubmit={(data) => {
          setRowAction(null);
          if (data) {
            updateMutation.mutate({ id: rowAction?.row.id ?? "", ...data });
          }
        }}
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

function getAutoTableColumns<T extends SchemaKeys, S extends z.ZodObject<any>>({
  setRowAction,
  schema,
}: GetAutoTableColumnsProps<T, S>): EnhancedColumnDef<NestedSchemaType<T>>[] {
  const columns: EnhancedColumnDef<NestedSchemaType<T>>[] = [
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

  const parsedSchema = parseSchema(getSchema(schema));

  for (const field of parsedSchema.fields) {
    const { key, description } = field;
    const childSchema = z.object({ [key]: getShape(schema)[key] });
    if (["_"].includes(key)) continue;

    const column: ColumnDef<NestedSchemaType<T>> = {
      id: key,
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="capitalize text-center"
          column={column}
          title={description || key}
        />
      ),
      cell: ({ cell, table, row }) => {
        const value = cell.getValue();

        function update(value: Record<string, unknown>) {
          // @ts-expect-error
          table.options.meta?.updateData(row.id, value);
        }

        return (
          <Editable.Root
            defaultValue={value as string}
            placeholder="-"
            className="text-center"
            triggerMode="dblclick"
            onSubmit={(newValue) => {
              update({ [key]: newValue });
            }}
          >
            <Editable.Area>
              <Editable.Preview className="max-w-56">
                <AutoPreview
                  field={field}
                  key={field.key}
                  value={value}
                  baseSchema={schema.shape[field.key]}
                />
              </Editable.Preview>
              <Editable.Input asChild>
                <AutoFormWithoutLabel
                  formProps={{
                    // onBlur: (e) => {
                    //   e.currentTarget.requestSubmit()
                    // },
                    onKeyDown: (e) => {
                      if (e.code === "Enter") {
                        e.currentTarget.requestSubmit();
                      }
                    },
                    // autoSave: "onUpload",
                  }}
                  defaultValues={{ [key]: value as string }}
                  schema={childSchema}
                  onSubmit={(data) => {
                    update(data);
                  }}
                />
              </Editable.Input>
            </Editable.Area>
          </Editable.Root>
        );
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
              variant="secondary"
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


function useAllData(tableName: SchemaKeys) {
  const { data: allItems, ...rest } = api[tableName].useGet();

  const data = allItems?.flatMap(d => {
    const business = d._?.soul;
    return Object.values(d).map(d =>
      !d || typeof d !== "object" ? null : ({ ...d, business })
    );
  }).filter(d => !!d && typeof d === "object" && !("soul" in d))

  return { data, ...rest };
}

export interface AddDataSuggestionsProps {
  slug: string;
  schemaName: SchemaKeys;
  onSelected: (item: any) => void;
}

export function AddDataSuggestions({ schemaName, slug, onSelected }: AddDataSuggestionsProps) {
  const { data, isLoading } = useAllData(schemaName);

  if (isLoading) return "loading suggestions..."

  function getTeansformedData() {
    if (!data?.length) return []
    const othersData = data.filter(d => d?.business !== slug)

    const uniqueData = Object.values(Object.fromEntries(othersData.map(d => [d?.title || d?.name || d?.label || d?.text || d?.displayName || d?.heading || "", d])))
    return uniqueData
  }

  const transformedData = getTeansformedData()

  if (!transformedData?.length) return null

  return <BadgeMarquee items={transformedData} onSelected={onSelected} />
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
