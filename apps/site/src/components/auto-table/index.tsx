import {
  getNestedZodShape,
  getSchema,
  getShape,
  type NestedSchema,
  type NestedSchemaType,
  type SchemaKeys,
  type UpdaterParams,
  useDelete,
  useGet,
  useUpdate,
} from '@gta/react-hooks';
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu';
import { type MutationFunctionContext, useQuery } from '@tanstack/react-query';
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
import * as React from 'react';
import { ZodEffects, z } from 'zod';
import { AddRowDialog } from '@/components/auto-admin/add-row-dialog';
import { DataTable } from '@/components/data-table';
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
import { useDataTable } from '@/hooks/use-data-table';
import { api } from '@/lib/api';
import { applyFilters } from '@/lib/filter';
import { appSchema } from '@/lib/schema';
import { applySorting } from '@/lib/sort';
import { getSchemaDerivations } from '@/lib/zod/with-derivations';
import type { DataTableRowAction, FilterVariant } from '@/types/data-table';
import { AutoPreview } from '../auto-preview';
import { DataTableAdvancedToolbar } from '../data-table/data-table-advanced-toolbar';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableFilterList } from '../data-table/data-table-filter-list';
import { DataTableSortList } from '../data-table/data-table-sort-list';
import { DeleteRowDialog } from '../data-table/delete-row-dialog';
import { EditRowDialog } from '../data-table/edit-row-dialog';
import SkeletonTableOneWrapper from '../mvpblocks/skeleton-table-1';
import type { DeriveFn, FieldConfigCustomData } from '../ui/autoform';
import { parseSchema, type ZodObjectOrWrapped } from '../ui/autoform/zod';
import { BadgeMarquee } from '../ui/badge-marquee';
import { AutoTableActionBar } from './auto-table-action-bar';
import { applyDerivedValuesToRow, getDeriveFn } from './derive-row';
import {
  getHiddenOptionalFieldKeys,
  getOrderedSchemaFieldKeys,
} from './form-schema-visibility';

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
  title?: string;
  className?: string;
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
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
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
  title,
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
  const canCreate = !props.readOnly && (props.canCreate ?? true);
  const canUpdate = !props.readOnly && (props.canUpdate ?? true);
  const canDelete = !props.readOnly && (props.canDelete ?? true);

  const schemaName = 'schema' in props ? props.schema : ('' as SchemaKeys);
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

  const derivationSchemas = getSchemaDerivations(schemaObject);
  const derivedFieldKeys = React.useMemo(
    () => new Set(Object.keys(derivationSchemas)),
    [derivationSchemas],
  );
  const deriveFns = React.useMemo(() => {
    const parsedSchema = parseSchema(schemaObject);
    const fnMap = new Map<string, DeriveFn>();

    for (const field of parsedSchema.fields) {
      if (!derivedFieldKeys.has(field.key)) continue;
      const customData = field.fieldConfig?.customData as
        | FieldConfigCustomData
        | undefined;
      const deriveFn = getDeriveFn(customData);
      if (deriveFn) {
        fnMap.set(field.key, deriveFn);
      }
    }

    return fnMap;
  }, [derivedFieldKeys, schemaObject]);

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
  const dataWithDerived = React.useMemo(() => {
    if (!deriveFns.size) return _data;
    return _data.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return applyDerivedValuesToRow(
        item as unknown as Record<string, unknown>,
        deriveFns,
      );
    });
  }, [_data, deriveFns]);
  const search = useSearch({ from: '__root__' });
  // @ts-expect-error
  const filters = search.filters;
  // @ts-expect-error
  const sorting = search.sort;
  const currentTab =
    typeof search === 'object' && search !== null && 'tab' in search
      ? (search as { tab?: unknown }).tab
      : undefined;
  const columnVisibilityStorageKey = React.useMemo(() => {
    const slugScope =
      typeof slug === 'string' && slug.length > 0 ? slug : 'global';
    const schemaScope =
      typeof schemaName === 'string' && schemaName.length > 0
        ? schemaName
        : 'custom';
    const tabScope =
      typeof currentTab === 'string' && currentTab.length > 0
        ? currentTab
        : 'default';
    return `autotable:column-visibility:${slugScope}:${schemaScope}:${tabScope}`;
  }, [currentTab, schemaName, slug]);
  const columnOrderStorageKey = React.useMemo(() => {
    const slugScope =
      typeof slug === 'string' && slug.length > 0 ? slug : 'global';
    const schemaScope =
      typeof schemaName === 'string' && schemaName.length > 0
        ? schemaName
        : 'custom';
    const tabScope =
      typeof currentTab === 'string' && currentTab.length > 0
        ? currentTab
        : 'default';
    return `autotable:column-order:${slugScope}:${schemaScope}:${tabScope}`;
  }, [currentTab, schemaName, slug]);
  function getFiltered() {
    if (filters) {
      return applyFilters(dataWithDerived, filters);
    }
    return dataWithDerived;
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
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<
    NestedSchemaType<T>
  > | null>(null);

  const columns = getAutoTableColumns({
    schema: schemaObject,
    setRowAction,
    derivedFieldKeys,
    previewOverrides: props.previewOverrides,
    canUpdate,
    canDelete,
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
    columnVisibilityStorageKey,
    columnOrderStorageKey,
  });
  const columnVisibility = table.getState().columnVisibility;
  const columnOrder = table.getState().columnOrder;
  const hiddenOptionalFieldKeys = React.useMemo(
    () => getHiddenOptionalFieldKeys(schema, columnVisibility),
    [schema, columnVisibility],
  );
  const orderedFormFieldKeys = React.useMemo(
    () => getOrderedSchemaFieldKeys(schema, columnOrder),
    [schema, columnOrder],
  );

  if (isLoading) return <SkeletonTableOneWrapper bodyClassName="px-0" />;

  return (
    <div className="py-6 space-y-4 flex flex-col items-end">
      {canCreate && (
        <AddRowDialog<T>
          schema={schemaName}
          slug={slug}
          {...props}
          hiddenOptionalFieldKeys={hiddenOptionalFieldKeys}
          orderedFieldKeys={orderedFormFieldKeys}
          buttonLabel={`Add new ${title ?? ''}`}
        />
      )}
      <DataTable
        table={table}
        actionBar={
          <AutoTableActionBar
            table={table}
            onDelete={onDelete}
            readOnly={!canDelete}
          />
        }
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
      {canDelete && (
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
      {canUpdate && (
        <EditRowDialog
          open={rowAction?.variant === 'update'}
          onOpenChange={() => setRowAction(null)}
          data={rowAction?.row.original}
          schema={schema}
          hiddenOptionalFieldKeys={hiddenOptionalFieldKeys}
          orderedFieldKeys={orderedFormFieldKeys}
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
  canUpdate: boolean;
  canDelete: boolean;
  derivedFieldKeys: Set<string>;
  previewOverrides?: PreviewOverrides<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getAutoTableColumns<T extends SchemaKeys, S extends z.ZodObject<any>>({
  setRowAction,
  schema,
  derivedFieldKeys,
  previewOverrides,
  actions,
  canUpdate,
  canDelete,
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

  const { data: users } = api.user.useGet();

  const usersById = new Map(users?.map((u) => [u._?.soul, u]));

  const parsedSchema = parseSchema(getSchema(schema));

  for (const field of parsedSchema.fields) {
    const { key, description } = field;
    const childSchema = z.object({ [key]: getShape(schema)?.[key] });
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

        if (field.key === 'created_by' && typeof value === 'string') {
          return (
            <AutoPreview
              field={field}
              key={field.key}
              value={usersById?.get(value?.substring(1))?.name ?? '-'}
              baseSchema={schema.shape[field.key]}
            />
          );
        }

        if (!canUpdate || derivedFieldKeys.has(key)) {
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
        label: description || key,
        // @ts-expect-error
        variant: getFilterVariant(field),
        // @ts-expect-error
        icon: getFieldIcon(field),
      },
      enableColumnFilter: true,
    };

    columns.push(column);
  }

  if (canUpdate || canDelete || actions)
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
              {canUpdate && (
                <>
                  <DropdownMenuItem
                    onSelect={() => setRowAction({ row, variant: 'update' })}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canDelete && (
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
