import { applyFilters } from '@/lib/filter';
import type { DataTableRowAction, FilterVariant } from '@/types/data-table';
import * as React from 'react';

import { DataTable } from '@/components/data-table';
import { useDataTable } from '@/hooks/use-data-table';

import { AddRowDialog } from '@/components/auto-admin/add-row-dialog';
import { AutoFormWithoutLabel } from '@/components/ui/autoform';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as Editable from '@/components/ui/editable';
import { api } from '@/lib/api';
import { appSchema } from '@/lib/schema';
import { applySorting } from '@/lib/sort';
import { parseSchema, type ZodObjectOrWrapped } from '@autoform/zod';
import {
  type NestedSchema,
  type NestedSchemaType,
  type SchemaKeys,
  type UpdaterParams,
  getNestedZodShape,
  getSchema,
  getShape,
  useDelete,
  useGet,
  useUpdate,
} from '@gta/react-hooks';
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu';
import { useQuery, type MutationFunctionContext } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import type { GunMessagePut } from 'gun';
import {
  ArrowUpDown,
  CalendarIcon,
  CircleDashed,
  DatabaseZap,
  Ellipsis,
  Text,
} from 'lucide-react';
import { z, ZodEffects } from 'zod';
import { AutoPreview } from '../auto-preview';
import { DataTableAdvancedToolbar } from '../data-table/data-table-advanced-toolbar';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableFilterList } from '../data-table/data-table-filter-list';
import { DataTableSortList } from '../data-table/data-table-sort-list';
import { DeleteRowDialog } from '../data-table/delete-row-dialog';
import { EditRowDialog } from '../data-table/edit-row-dialog';
import SkeletonTableOneWrapper from '../mvpblocks/skeleton-table-1';
import { BadgeMarquee } from '../ui/badge-marquee';
import { AutoTableActionBar } from './auto-table-action-bar';

type AggregationType =
  | 'sum'
  | 'avg'
  | 'count '
  | 'min'
  | 'max'
  | 'distinct'
  | 'regex'
  | 'group';

type PreviewOverrides<T extends SchemaKeys> = Partial<
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  Record<keyof NestedSchema<T>['shape'], (v: any) => any>
>;

type EnhancedColumnDef<TData> = ColumnDef<TData> & {
  aggregations?: AggregationType[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  previewOverrides?: PreviewOverrides<any>;
  readOnly?: boolean;
};

export type AutoTableProps<T extends SchemaKeys> = {
  className?: string;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  transformer?: (data: any[]) => NestedSchemaType<T>[];
  enableAdvancedFiltering?: boolean;
  enableAdvancedSorting?: boolean;
  enableAggregations?: boolean;
  enableColumnPinning?: boolean;
  enableRowSelection?: boolean;
  enableGlobalFiltering?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
  extender?: (schema: NestedSchema<T>) => ZodObjectOrWrapped;
  previewOverrides?: PreviewOverrides<T>;
  onCreate?: (
    data: GunMessagePut,
    variables: Omit<NestedSchemaType<T>, '_'>,
    onMutateResult: unknown,
    context: MutationFunctionContext,
  ) => unknown;
  onDelete?: (
    data: GunMessagePut,
    variables: string,
    onMutateResult: unknown,
    context: MutationFunctionContext,
  ) => unknown;
  onUpdate?: (
    data: GunMessagePut,
    variables: UpdaterParams<T>,
    onMutateResult: unknown,
    context: MutationFunctionContext,
  ) => unknown;
  readOnly?: boolean;
  treatSlugAsAbsolute?: boolean;
  actions?: (
    ctx: CellContext<NestedSchemaType<T>, unknown>,
  ) => Promise<React.ReactNode>;
} & (
  | {
      schema: T;
    }
  | {
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      parsedSchema: z.ZodObject<any>;
    }
) &
  (
    | {
        slug: string;
        data?: undefined;
      }
    | {
        data: NestedSchemaType<T>[];
        slug?: undefined;
      }
  );

export function AutoTable<T extends SchemaKeys>({
  className,
  slug,
  data: defaultData,
  treatSlugAsAbsolute = false,
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
  const schemaName = 'schema' in props ? props.schema : ('' as SchemaKeys);
  const { data: __data = [], isLoading } = useGet(
    {
      key: schemaName,
      treatSlugAsAbsolute,
      queryOptions: {
        enabled: !!slug,
        initialData: defaultData,
      },
    },
    slug ?? '',
  );
  const _data = props.transformer?.(__data) ?? __data;
  const search = useSearch({ from: '__root__' });
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
  const data = getSorted(getFiltered());

  const updateMutation = useUpdate({
    keys: [schemaName, slug ?? ''],
    onSuccess(...args) {
      props?.onUpdate?.(...args);
    },
  });
  const { mutate: onDelete } = useDelete({
    keys: [schemaName, slug ?? ''],
    onSuccess(...args) {
      props?.onDelete?.(...args);
    },
  });
  const _schema = (() => {
    if ('parsedSchema' in props) {
      return props.parsedSchema;
    }

    const zodShape = getNestedZodShape(schemaName, appSchema.schemaShape);

    return getSchema(zodShape);
  })();

  function getFinalSchema() {
    let schema: ZodObjectOrWrapped = _schema;
    if (props.extender) {
      schema = props.extender(schema);
    }
    return schema;
  }

  const schema = getFinalSchema();
  const schemaObject =
    schema instanceof ZodEffects ? schema.innerType() : schema;

  const [rowAction, setRowAction] = React.useState<DataTableRowAction<
    NestedSchemaType<T>
  > | null>(null);

  const columns = getAutoTableColumns({
    schema: schemaObject,
    setRowAction,
    previewOverrides: props.previewOverrides,
    readOnly: props.readOnly,
    actions: props.actions,
  });

  // @ts-expect-error
  const perPage = search.perPage ?? 10;

  const { table, shallow, debounceMs, throttleMs } = useDataTable<
    NestedSchemaType<T>
  >({
    data,
    columns,
    pageCount: Math.ceil(data.length / perPage) || 1,
    enableAdvancedFilter: enableAdvancedFiltering,
    enableGlobalFilter: enableGlobalFiltering,
    enableRowSelection: enableRowSelection,
    enableColumnPinning: enableColumnPinning,
    initialState: {
      pagination: {
        pageIndex: search?.pageIndex ?? 0,
        pageSize: defaultPageSize,
      },
      columnPinning: enableColumnPinning ? { right: ['actions'] } : undefined,
      columnVisibility: {},
    },
    meta: {
      updateData(rowId: string, data: Record<string, unknown>) {
        updateMutation.mutate({ id: rowId, ...data });
      },
    },
    getRowId: (originalRow) =>
      originalRow?._?.soul ??
      originalRow?.['#']?.split('/').slice(2).join('/') ??
      '',
    shallow: false,
    clearOnDefault: true,
  });

  if (isLoading) return <SkeletonTableOneWrapper bodyClassName="px-0" />;

  return (
    <div className="py-6 space-y-4 flex flex-col items-end">
      {!props.readOnly && (
        <AddRowDialog<T> schema={schemaName} slug={slug} {...props} />
      )}
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
      {!props.readOnly && (
        <DeleteRowDialog
          open={rowAction?.variant === 'delete'}
          onOpenChange={() => setRowAction(null)}
          data={rowAction?.row.original ? [rowAction?.row.original] : []}
          showTrigger={false}
          onConfirm={() => {
            setRowAction(null);
            onDelete(rowAction?.row.id ?? '');
            rowAction?.row.toggleSelected(false);
          }}
        />
      )}
      {!props.readOnly && (
        <EditRowDialog
          open={rowAction?.variant === 'update'}
          onOpenChange={() => setRowAction(null)}
          data={rowAction?.row.original}
          schema={schema}
          onSubmit={(data) => {
            if (data) {
              updateMutation.mutate({ id: rowAction?.row.id ?? '', ...data });
            }
            setRowAction(null);
          }}
          showTrigger={false}
        />
      )}
    </div>
  );
}

interface GetAutoTableColumnsProps<T extends SchemaKeys, S> {
  // estimatedHoursRange: { min: number; max: number };
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<NestedSchemaType<T>> | null>
  >;
  schema: S;
  actions?: (
    ctx: CellContext<NestedSchemaType<T>, unknown>,
  ) => Promise<React.ReactNode>;
  readOnly?: boolean;
  previewOverrides?: PreviewOverrides<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getAutoTableColumns<T extends SchemaKeys, S extends z.ZodObject<any>>({
  setRowAction,
  schema,
  previewOverrides,
  actions,
  readOnly,
}: GetAutoTableColumnsProps<T, S>): EnhancedColumnDef<NestedSchemaType<T>>[] {
  'use memo';
  const columns: EnhancedColumnDef<NestedSchemaType<T>>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
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
    if (['_'].includes(key)) continue;

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

        if (readOnly) {
          return (
            <AutoPreview
              field={field}
              key={field.key}
              value={previewOverrides?.[field.key]?.(value) ?? value}
              baseSchema={schema.shape[field.key]}
            />
          );
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
                  value={previewOverrides?.[field.key]?.(value) ?? value}
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
                      if (e.code === 'Enter') {
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

  if (!readOnly || actions)
    columns.push({
      id: 'actions',
      cell: function Cell(props) {
        const { row } = props;
        const { data: actionNode } = useQuery({
          enabled: !!actions,
          queryFn: async () => {
            if (!actions) return null;
            return actions(props);
          },
          queryKey: ['auto-table-actions', row.id, row.original],
        });

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
              {!readOnly && (
                <>
                  <DropdownMenuItem
                    onSelect={() => setRowAction({ row, variant: 'update' })}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!readOnly && (
                <DropdownMenuItem
                  onSelect={() => setRowAction({ row, variant: 'delete' })}
                >
                  Delete
                  <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
              {actionNode}
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

  const data = allItems
    ?.flatMap((d) => {
      const business = d._?.soul;
      return Object.values(d).map((d) =>
        !d || typeof d !== 'object' ? null : { ...d, business },
      );
    })
    .filter((d) => !!d && typeof d === 'object' && !('soul' in d));

  return { data, ...rest };
}

export interface AddDataSuggestionsProps {
  slug: string;
  schemaName: SchemaKeys;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  onSelected: (item: any) => void;
}

export function AddDataSuggestions({
  schemaName,
  slug,
  onSelected,
}: AddDataSuggestionsProps) {
  const { data, isLoading } = useAllData(schemaName);

  if (isLoading) return 'loading suggestions...';

  function getTeansformedData() {
    if (!data?.length) return [];
    const othersData = data.filter((d) => d?.business !== slug);

    const uniqueData = Object.values(
      Object.fromEntries(
        othersData.map((d) => [
          d?.title ||
            d?.name ||
            d?.label ||
            d?.text ||
            d?.displayName ||
            d?.heading ||
            '',
          d,
        ]),
      ),
    );
    return uniqueData;
  }

  const transformedData = getTeansformedData();

  if (!transformedData?.length) return null;

  return <BadgeMarquee items={transformedData} onSelected={onSelected} />;
}

// Helper function to determine filter variant based on field type
function getFilterVariant(field: z.ZodTypeAny): FilterVariant {
  if (field instanceof z.ZodString) return 'text';
  if (field instanceof z.ZodNumber) return 'range';
  if (field instanceof z.ZodEnum) return 'multiSelect';
  if (field instanceof z.ZodBoolean) return 'multiSelect';
  if (field instanceof z.ZodDate) return 'dateRange';
  return 'text';
}

// Helper function to get appropriate icon for field type
function getFieldIcon(field: z.ZodTypeAny) {
  if (field instanceof z.ZodDate) return CalendarIcon;
  if (field instanceof z.ZodNumber) return ArrowUpDown;
  if (field instanceof z.ZodBoolean) return CircleDashed;
  return Text;
}
