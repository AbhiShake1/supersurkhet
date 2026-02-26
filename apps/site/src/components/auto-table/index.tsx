import type { ParsedSchema } from '@autoform/core';
import {
  type NestedSchema,
  type NestedSchemaType,
  type SchemaKeys,
  type UpdaterParams,
  useCreate,
  useDelete,
  useGet,
  useUpdate,
} from '@gta/react-hooks';
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
  Pencil,
  Text,
  Trash2,
} from 'lucide-react';
import * as React from 'react';
import { z } from 'zod';
import { AddRowDialog } from '@/components/auto-admin/add-row-dialog';
import { DataTable } from '@/components/data-table';
import { AutoFormWithoutLabel } from '@/components/ui/autoform';
import type { ZodObjectOrWrapped } from '@/components/ui/autoform/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as Editable from '@/components/ui/editable';
import {
  KeyboardShortcutsBoundary,
  ShortcutKbd,
  useRegisterShortcut,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataTable } from '@/hooks/use-data-table';
import { api } from '@/lib/api';
import {
  collectDerivedFieldFns,
  getFieldSchemaByKey,
  isDerivedFieldKey,
  resolveRuntimeSchema,
} from '@/lib/auto-runtime/schema-runtime';
import { applyFilters } from '@/lib/filter';
import { appSchema } from '@/lib/schema';
import { applySorting } from '@/lib/sort';
import type { DataTableRowAction, FilterVariant } from '@/types/data-table';
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
import { applyDerivedValuesToRow } from './derive-row';
import { getAutoTableInitialState } from './initial-state';

const AUTO_TABLE_SHORTCUTS = {
  focusActiveRow: {
    id: 'autoTable.focusActiveRow',
    label: 'Focus active row',
    description: 'Focus the active row in the table.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'f',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  nextRow: {
    id: 'autoTable.nextRow',
    label: 'Next row',
    description: 'Move focus to the next row in the active table.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'ArrowDown',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  previousRow: {
    id: 'autoTable.previousRow',
    label: 'Previous row',
    description: 'Move focus to the previous row in the active table.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'ArrowUp',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  toggleSelection: {
    id: 'autoTable.toggleRowSelection',
    label: 'Toggle row selection',
    description: 'Select or deselect the focused table row.',
    scope: 'AutoTable',
    defaultBinding: {
      key: ' ',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openRowActions: {
    id: 'autoTable.openRowActions',
    label: 'Open row actions',
    description: 'Open action menu for the focused row.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'a',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  editRow: {
    id: 'autoTable.editRow',
    label: 'Edit row',
    description: 'Open edit dialog for the focused row.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'e',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  deleteRow: {
    id: 'autoTable.deleteRow',
    label: 'Delete row',
    description: 'Open delete dialog for the focused row.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  nextFocusable: {
    id: 'autoTable.nextFocusable',
    label: 'Next table element',
    description: 'Move focus to next actionable table element.',
    scope: 'AutoTable',
    defaultBinding: {
      key: ']',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  previousFocusable: {
    id: 'autoTable.previousFocusable',
    label: 'Previous table element',
    description: 'Move focus to previous actionable table element.',
    scope: 'AutoTable',
    defaultBinding: {
      key: '[',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  activateFocused: {
    id: 'autoTable.activateFocused',
    label: 'Activate focused table element',
    description: 'Click the currently focused table element.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  addColumn: {
    id: 'autoTable.addColumn',
    label: 'Add column',
    description: 'Add a new column to the table schema.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'c',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openAggregations: {
    id: 'autoTable.openAggregations',
    label: 'Open aggregations',
    description: 'Open the table aggregations panel.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'g',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
} as const;

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
  previewOverrides?: PreviewOverrides<SchemaKeys>;
  readOnly?: boolean;
};

export type AutoTableProps<T extends SchemaKeys> = {
  className?: string;
  transformer?: (data: NestedSchemaType<T>[]) => NestedSchemaType<T>[];
  enableAdvancedFiltering?: boolean;
  enableAdvancedSorting?: boolean;
  enableAggregations?: boolean;
  enableColumnPinning?: boolean;
  enableRowSelection?: boolean;
  enableGlobalFiltering?: boolean;
  enablePagination?: boolean;
  showViewOptions?: boolean;
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
  editable?: boolean;
  onAddColumn?: () => void;
  onEditColumn?: (columnKey: string) => void;
  onDeleteColumn?: (columnKey: string) => void;
  onReorderColumns?: (sourceColumnKey: string, targetColumnKey: string) => void;
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
  showViewOptions = true,
  defaultPageSize = 10,
  ...props
}: AutoTableProps<T>) {
  const hasSchemaKey = 'schema' in props;
  const isRuntimeSchemaMode = !hasSchemaKey && 'parsedSchema' in props;
  const schemaName = hasSchemaKey ? props.schema : ('' as SchemaKeys);
  const { schema, schemaObject, parsedSchema } = resolveRuntimeSchema({
    schemaKey: 'schema' in props ? props.schema : undefined,
    schemaShape: appSchema.schemaShape,
    runtimeSchema: 'parsedSchema' in props ? props.parsedSchema : undefined,
    extender: props.extender as
      | ((schema: ZodObjectOrWrapped) => ZodObjectOrWrapped)
      | undefined,
  });

  const derivedFieldKeys = React.useMemo(
    () =>
      new Set(
        parsedSchema.fields
          .filter((field) => isDerivedFieldKey(schemaObject, field.key))
          .map((field) => field.key),
      ),
    [parsedSchema, schemaObject],
  );
  const deriveFns = React.useMemo(() => {
    return collectDerivedFieldFns({
      schema: schemaObject,
      parsedSchema,
    });
  }, [schemaObject, parsedSchema]);

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
  const filters = search.filters;
  const sorting = search.sort;
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
  const runtimeHookKeys = React.useMemo(() => {
    if (!slug || !isRuntimeSchemaMode) return null;
    const segments = slug.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    return [segments[0] as SchemaKeys, ...segments.slice(1)] as [
      SchemaKeys,
      ...string[],
    ];
  }, [isRuntimeSchemaMode, slug]);
  const runtimeCreateMutation = useCreate({
    keys: runtimeHookKeys ?? (['business'] as [SchemaKeys, ...string[]]),
  });
  const runtimeUpdateMutation = useUpdate({
    keys: runtimeHookKeys ?? (['business'] as [SchemaKeys, ...string[]]),
  });
  const runtimeDeleteMutation = useDelete({
    keys: runtimeHookKeys ?? (['business'] as [SchemaKeys, ...string[]]),
  });
  const canUseRuntimeCrud = Boolean(runtimeHookKeys);
  const handleRuntimeCreate = React.useCallback(
    async (payload: Record<string, unknown>) => {
      await runtimeCreateMutation.mutateAsync(payload as never);
    },
    [runtimeCreateMutation],
  );
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<
    NestedSchemaType<T>
  > | null>(null);

  const columns = getAutoTableColumns({
    schema: schemaObject,
    parsedSchema,
    setRowAction,
    derivedFieldKeys,
    previewOverrides: props.previewOverrides,
    readOnly: props.readOnly,
    actions: props.actions,
    onEditColumn:
      props.editable && !props.readOnly ? props.onEditColumn : undefined,
    onDeleteColumn:
      props.editable && !props.readOnly ? props.onDeleteColumn : undefined,
    onReorderColumns:
      props.editable && !props.readOnly ? props.onReorderColumns : undefined,
  });
  const reorderableColumnIds = React.useMemo(
    () =>
      parsedSchema.fields
        .map((field) => field.key)
        .filter((key) => key !== '_'),
    [parsedSchema.fields],
  );

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
    initialState: getAutoTableInitialState({
      pageIndex: search?.pageIndex ?? 0,
      defaultPageSize,
      enableColumnPinning,
    }),
    meta: {
      updateData(rowId: string, data: Record<string, unknown>) {
        if (canUseRuntimeCrud) {
          runtimeUpdateMutation.mutate({ id: rowId, ...data } as never);
          return;
        }
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

  const [activeRowId, setActiveRowId] = React.useState<string | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;
  const resolvedActiveRowId = React.useMemo(() => {
    if (!rows.length) return null;
    if (activeRowId && rows.some((row) => row.id === activeRowId)) {
      return activeRowId;
    }
    return rows[0]?.id ?? null;
  }, [activeRowId, rows]);

  const focusActiveRow = React.useCallback((rowId: string | null) => {
    if (!rowId) return;
    const element = tableContainerRef.current?.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(rowId)}"]`,
    );
    element?.focus();
  }, []);

  const resolveActiveRow = React.useCallback(() => {
    if (!resolvedActiveRowId) return null;
    return rows.find((row) => row.id === resolvedActiveRowId) ?? null;
  }, [resolvedActiveRowId, rows]);

  const moveActiveRow = React.useCallback(
    (offset: number) => {
      if (!rows.length) return;
      const currentIndex = rows.findIndex(
        (row) => row.id === resolvedActiveRowId,
      );
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + offset + rows.length) % rows.length
          : offset > 0
            ? 0
            : rows.length - 1;
      const row = rows[nextIndex];
      if (!row) return;
      setActiveRowId(row.id);
      focusActiveRow(row.id);
    },
    [focusActiveRow, resolvedActiveRowId, rows],
  );

  const isTableShortcutTarget = React.useCallback((event: KeyboardEvent) => {
    if (!tableContainerRef.current) return false;
    const target = event.target as Node | null;
    const active = document.activeElement as Node | null;
    if (target && tableContainerRef.current.contains(target)) return true;
    if (active && tableContainerRef.current.contains(active)) return true;
    return false;
  }, []);

  const isPlainArrowRowNavigationTarget = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      const editable =
        active.isContentEditable ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      if (editable) return false;
      const activeRow = active.closest<HTMLElement>('[data-row-id]');
      if (!activeRow || !tableContainerRef.current) return false;
      return tableContainerRef.current.contains(activeRow);
    },
    [],
  );

  const getVisibleTableFocusables = React.useCallback((): HTMLElement[] => {
    const root = tableContainerRef.current;
    if (!root) return [];
    const nodes = [
      ...root.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      ),
    ];
    return nodes.filter((node) => {
      if (node.offsetParent === null) return false;
      if (node.getAttribute('aria-hidden') === 'true') return false;
      if (
        node.hasAttribute('disabled') ||
        node.getAttribute('aria-disabled') === 'true'
      ) {
        return false;
      }
      return true;
    });
  }, []);

  const focusTableElementByOffset = React.useCallback(
    (offset: number) => {
      const elements = getVisibleTableFocusables();
      if (!elements.length) return;
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = elements.indexOf(active as HTMLElement);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + offset + elements.length) % elements.length
          : offset > 0
            ? 0
            : elements.length - 1;
      elements[nextIndex]?.focus();
    },
    [getVisibleTableFocusables],
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!isPlainArrowRowNavigationTarget(event)) return;
      event.preventDefault();
      moveActiveRow(event.key === 'ArrowDown' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlainArrowRowNavigationTarget, moveActiveRow]);

  useShortcutAction(AUTO_TABLE_SHORTCUTS.focusActiveRow, () =>
    focusActiveRow(resolveActiveRow()?.id ?? rows[0]?.id ?? null),
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.nextRow,
    () => {
      moveActiveRow(1);
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.previousRow,
    () => {
      moveActiveRow(-1);
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.toggleSelection,
    () => {
      const row = resolveActiveRow();
      if (!row) return;
      row.toggleSelected(!row.getIsSelected());
      focusActiveRow(row.id);
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.openRowActions,
    () => {
      const row = resolveActiveRow();
      if (!row) return;
      const trigger =
        tableContainerRef.current?.querySelector<HTMLButtonElement>(
          `[data-row-action-trigger="${CSS.escape(row.id)}"]`,
        );
      trigger?.click();
      focusActiveRow(row.id);
    },
    { enabled: rows.length > 0 },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.editRow,
    () => {
      if (props.readOnly) return;
      const row = resolveActiveRow();
      if (!row) return;
      setRowAction({ row, variant: 'update' });
    },
    { enabled: rows.length > 0 },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.deleteRow,
    () => {
      if (props.readOnly) return;
      const row = resolveActiveRow();
      if (!row) return;
      setRowAction({ row, variant: 'delete' });
    },
    { enabled: rows.length > 0 },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.nextFocusable,
    () => {
      focusTableElementByOffset(1);
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.previousFocusable,
    () => {
      focusTableElementByOffset(-1);
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.activateFocused,
    () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !tableContainerRef.current?.contains(active)) return;
      active.click();
    },
    { guard: isTableShortcutTarget },
  );
  useShortcutAction(
    AUTO_TABLE_SHORTCUTS.addColumn,
    () => {
      if (props.readOnly || !props.editable) return;
      props.onAddColumn?.();
    },
    {
      enabled: Boolean(props.editable && !props.readOnly && props.onAddColumn),
    },
  );
  useRegisterShortcut(
    enableAggregations ? AUTO_TABLE_SHORTCUTS.openAggregations : undefined,
  );

  if (isLoading) return <SkeletonTableOneWrapper bodyClassName="px-0" />;

  return (
    <KeyboardShortcutsBoundary>
      <div
        ref={tableContainerRef}
        className="py-6 space-y-4 flex flex-col items-end"
      >
        {!props.readOnly && (
          <AddRowDialog<T>
            schema={hasSchemaKey ? schemaName : undefined}
            runtimeSchema={
              'parsedSchema' in props ? props.parsedSchema : undefined
            }
            onCreateRow={canUseRuntimeCrud ? handleRuntimeCreate : undefined}
            slug={slug}
            {...props}
          />
        )}
        <DataTable
          table={table}
          activeRowId={resolvedActiveRowId}
          onActiveRowChange={setActiveRowId}
          onReorderColumns={
            props.editable && !props.readOnly
              ? props.onReorderColumns
              : undefined
          }
          reorderableColumnIds={reorderableColumnIds}
          actionBar={
            <AutoTableActionBar
              table={table}
              onDelete={
                canUseRuntimeCrud ? runtimeDeleteMutation.mutate : onDelete
              }
            />
          }
          className={className}
        >
          <DataTableAdvancedToolbar
            table={table}
            showViewOptions={showViewOptions}
            endSlot={
              props.editable && !props.readOnly && props.onAddColumn ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={props.onAddColumn}
                    >
                      Add Column
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>Add column</span>
                    <ShortcutKbd
                      actionId={AUTO_TABLE_SHORTCUTS.addColumn.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
              ) : null
            }
          >
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <DatabaseZap className="size-4" />
                    Aggregations
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>Open aggregations</span>
                  <ShortcutKbd
                    actionId={AUTO_TABLE_SHORTCUTS.openAggregations.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
            )}
          </DataTableAdvancedToolbar>
        </DataTable>
        {!props.readOnly && (
          <DeleteRowDialog
            open={rowAction?.variant === 'delete'}
            onOpenChange={() => setRowAction(null)}
            data={rowAction?.row.original ? [rowAction?.row.original] : []}
            showTrigger={false}
            onConfirm={() => {
              setRowAction(null);
              if (canUseRuntimeCrud) {
                runtimeDeleteMutation.mutate(
                  (rowAction?.row.id ?? '') as never,
                );
              } else {
                onDelete(rowAction?.row.id ?? '');
              }
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
                if (canUseRuntimeCrud) {
                  runtimeUpdateMutation.mutate({
                    id: rowAction?.row.id ?? '',
                    ...data,
                  } as never);
                } else {
                  updateMutation.mutate({
                    id: rowAction?.row.id ?? '',
                    ...data,
                  });
                }
              }
              setRowAction(null);
            }}
            showTrigger={false}
          />
        )}
      </div>
    </KeyboardShortcutsBoundary>
  );
}

interface GetAutoTableColumnsProps<T extends SchemaKeys, S> {
  // estimatedHoursRange: { min: number; max: number };
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<NestedSchemaType<T>> | null>
  >;
  schema: S;
  parsedSchema: ParsedSchema;
  actions?: (
    ctx: CellContext<NestedSchemaType<T>, unknown>,
  ) => Promise<React.ReactNode>;
  readOnly?: boolean;
  derivedFieldKeys: Set<string>;
  previewOverrides?: PreviewOverrides<T>;
  onEditColumn?: (columnKey: string) => void;
  onDeleteColumn?: (columnKey: string) => void;
  onReorderColumns?: (sourceColumnKey: string, targetColumnKey: string) => void;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getAutoTableColumns<T extends SchemaKeys, S extends z.ZodObject<any>>({
  setRowAction,
  schema,
  parsedSchema,
  derivedFieldKeys,
  previewOverrides,
  actions,
  readOnly,
  onEditColumn,
  onDeleteColumn,
  onReorderColumns,
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

  for (const field of parsedSchema.fields) {
    const { key, description } = field;
    const fieldSchema = getFieldSchemaByKey(schema, key);
    if (!fieldSchema) continue;
    const childSchema = z.object({ [key]: fieldSchema });
    if (['_'].includes(key)) continue;

    const column: ColumnDef<NestedSchemaType<T>> = {
      id: key,
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="capitalize text-center"
          column={column}
          title={description || key}
          onEditColumn={onEditColumn ? () => onEditColumn(key) : undefined}
          onDeleteColumn={
            onDeleteColumn ? () => onDeleteColumn(key) : undefined
          }
          onMoveColumn={onReorderColumns}
          showReorderHandle={Boolean(onReorderColumns)}
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
              baseSchema={fieldSchema}
            />
          );
        }

        if (readOnly || derivedFieldKeys.has(key)) {
          return (
            <AutoPreview
              field={field}
              key={field.key}
              value={previewOverrides?.[field.key]?.(value) ?? value}
              baseSchema={fieldSchema}
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
                  baseSchema={fieldSchema}
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
        const [isMenuOpen, setIsMenuOpen] = React.useState(false);
        const { data: actionNode } = useQuery({
          enabled: !!actions,
          queryFn: async () => {
            if (!actions) return null;
            return actions(props);
          },
          queryKey: ['auto-table-actions', row.id, row.original],
        });

        return (
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Open menu"
                    data-row-action-trigger={row.id}
                    variant="secondary"
                    className="flex size-8 rounded-md border border-transparent p-0 text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground data-[state=open]:border-border data-[state=open]:bg-muted data-[state=open]:text-foreground lg:h-8 lg:w-auto lg:px-2"
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Row actions</span>
                <ShortcutKbd
                  actionId={AUTO_TABLE_SHORTCUTS.openRowActions.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              {!readOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      className="gap-2"
                      onSelect={() => setRowAction({ row, variant: 'update' })}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="flex items-center gap-2"
                  >
                    <span>Edit row</span>
                    <ShortcutKbd
                      actionId={AUTO_TABLE_SHORTCUTS.editRow.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
              )}
              {!readOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onSelect={() => setRowAction({ row, variant: 'delete' })}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="flex items-center gap-2"
                  >
                    <span>Delete row</span>
                    <ShortcutKbd
                      actionId={AUTO_TABLE_SHORTCUTS.deleteRow.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
              )}
              {!readOnly && actionNode ? <DropdownMenuSeparator /> : null}
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
