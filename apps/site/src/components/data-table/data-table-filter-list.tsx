import type { Column, ColumnMeta, Table } from '@tanstack/react-table';
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  GripVertical,
  ListFilter,
  Trash2,
} from 'lucide-react';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import * as React from 'react';

import { useSearch } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from '@/components/ui/faceted';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ShortcutKbd,
  useRegisterShortcut,
  useShortcutAction,
  type ShortcutDefinition,
} from '@/components/ui/keyboard-shortcuts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { dataTableConfig } from '@/config/data-table';

import { getDefaultFilterOperator, getFilterOperators } from '@/lib/data-table';
import { formatDate } from '@/lib/format';
import { generateId } from '@/lib/id';
import { getFiltersStateParser } from '@/lib/parsers';
import { cn } from '@/lib/utils';
import type {
  ExtendedColumnFilter,
  FilterOperator,
  JoinOperator,
} from '@/types/data-table';
import { DataTableRangeFilter } from './data-table-range-filter';

const FILTERS_KEY = 'filters';
const JOIN_OPERATOR_KEY = 'joinOperator';
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const OPEN_MENU_SHORTCUT = 'f';
const REMOVE_FILTER_SHORTCUTS = ['backspace', 'delete'];
const DATA_TABLE_FILTER_SHORTCUTS = {
  openFilters: {
    id: 'dataTable.openFilters',
    label: 'Open filters',
    description: 'Open the filter list popover.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: OPEN_MENU_SHORTCUT,
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  addFilter: {
    id: 'dataTable.addFilter',
    label: 'Add filter',
    description: 'Add a new filter row.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'a',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  resetFilters: {
    id: 'dataTable.resetFilters',
    label: 'Reset filters',
    description: 'Clear all active filters.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  filterField: {
    id: 'dataTable.filterFieldSelector',
    label: 'Open filter field selector',
    description: 'Open the field selector for a filter row.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'ArrowDown',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  removeFilter: {
    id: 'dataTable.removeFilter',
    label: 'Remove filter',
    description: 'Remove the focused filter row.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'Delete',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  reorderFilter: {
    id: 'dataTable.reorderFilter',
    label: 'Reorder filter',
    description: 'Move a filter row.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'r',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  filterFacetedValue: {
    id: 'dataTable.openFilterFacetedValue',
    label: 'Open faceted filter options',
    description: 'Open selectable options for faceted filters.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'o',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  filterDateValue: {
    id: 'dataTable.openFilterDateValue',
    label: 'Open date filter picker',
    description: 'Open the date or date-range picker for a filter.',
    scope: 'DataTable Filters',
    defaultBinding: {
      key: 'd',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const satisfies Record<string, ShortcutDefinition>;

interface DataTableFilterListProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  debounceMs?: number;
  throttleMs?: number;
  shallow?: boolean;
}

function parseFiltersFromUrl() {
  const parsedUrl = new URL(window.location.href);
  const rawFilters = parsedUrl.searchParams.get('filters');

  if (!rawFilters) return [];

  try {
    const filters = JSON.parse(decodeURIComponent(rawFilters));
    return filters;
  } catch (e) {
    console.error('Failed to parse filters:', e);
    return [];
  }
}

export function DataTableFilterList<TData>({
  table,
  debounceMs = DEBOUNCE_MS,
  throttleMs = THROTTLE_MS,
  shallow = true,
  ...props
}: DataTableFilterListProps<TData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);
  const _search = useSearch({ from: '__root__' });

  const columns = React.useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.columnDef.enableColumnFilter);
  }, [table]);

  const filters = React.useMemo(() => parseFiltersFromUrl(), []);

  const [, setFilters] = useQueryState(
    FILTERS_KEY,
    getFiltersStateParser<TData>(columns.map((field) => field.id))
      // temporary workaround until the nuqs adapter for tanstack router is fixed
      .withDefault(filters)
      .withOptions({
        clearOnDefault: true,
        shallow,
        throttleMs,
      }),
  );

  const [joinOperator, setJoinOperator] = useQueryState(
    JOIN_OPERATOR_KEY,
    parseAsStringEnum(['and', 'or']).withDefault('and').withOptions({
      clearOnDefault: true,
      shallow,
    }),
  );

  const onFilterAdd = () => {
    const column = columns[0];

    if (!column) return;

    setFilters([
      ...filters,
      {
        id: column.id as Extract<keyof TData, string>,
        value: '',
        variant: column.columnDef.meta?.variant ?? 'text',
        operator: getDefaultFilterOperator(
          column.columnDef.meta?.variant ?? 'text',
        ),
        filterId: generateId({ length: 8 }),
      },
    ]);
  };

  const onFilterUpdate = (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>,
  ) => {
    setFilters((prevFilters) => {
      const updatedFilters = prevFilters.map((filter) => {
        if (filter.filterId === filterId) {
          return { ...filter, ...updates } as ExtendedColumnFilter<TData>;
        }
        return filter;
      });
      return updatedFilters;
    });
  };

  const onFilterRemove = (filterId: string) => {
    const updatedFilters = filters.filter(
      (filter) => filter.filterId !== filterId,
    );
    void setFilters(updatedFilters);
    requestAnimationFrame(() => {
      addButtonRef.current?.focus();
    });
  };

  const onFiltersReset = () => {
    void setFilters(null);
    void setJoinOperator('and');
  };

  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.addFilter);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.resetFilters);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.filterField);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.removeFilter);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.reorderFilter);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.filterFacetedValue);
  useRegisterShortcut(DATA_TABLE_FILTER_SHORTCUTS.filterDateValue);
  useShortcutAction(
    DATA_TABLE_FILTER_SHORTCUTS.openFilters,
    () => {
      setOpen(true);
    },
    {
      guard: (event) => !event.shiftKey,
    },
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === OPEN_MENU_SHORTCUT &&
        event.shiftKey &&
        filters.length > 0
      ) {
        event.preventDefault();
        onFilterRemove(filters[filters.length - 1]?.filterId ?? '');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  }, [filters, onFilterRemove]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
      filters.length > 0
    ) {
      event.preventDefault();
      onFilterRemove(filters[filters.length - 1]?.filterId ?? '');
    }
  };

  return (
    <Sortable
      value={filters}
      onValueChange={setFilters}
      getItemValue={(item) => item.filterId}
    >
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onKeyDown={onTriggerKeyDown}
            className="gap-2"
          >
            <ListFilter className="size-4" />
            Filter
            <ShortcutKbd
              actionId={DATA_TABLE_FILTER_SHORTCUTS.openFilters.id}
              interactive={false}
              className="pointer-events-none hidden xl:inline-flex"
            />
            {filters.length > 0 && (
              <Badge
                variant="secondary"
                className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
              >
                {filters.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-describedby={descriptionId}
          aria-labelledby={labelId}
          className="flex w-full max-w-[var(--radix-popover-content-available-width)] origin-[var(--radix-popover-content-transform-origin)] flex-col gap-3.5 p-4 sm:min-w-[380px]"
          {...props}
        >
          <div className="flex flex-col gap-1">
            <h4 id={labelId} className="font-medium leading-none">
              {filters.length > 0 ? 'Filters' : 'No filters applied'}
            </h4>
            <p
              id={descriptionId}
              className={cn(
                'text-muted-foreground text-sm',
                filters.length > 0 && 'sr-only',
              )}
            >
              {filters.length > 0
                ? 'Modify filters to refine your rows.'
                : 'Add filters to refine your rows.'}
            </p>
          </div>
          {filters.length > 0 ? (
            <SortableContent asChild>
              {/** biome-ignore lint/a11y/useSemanticElements: lint debt cleanup */}
              <div
                role="list"
                className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1"
              >
                {filters.map((filter, index) => (
                  <DataTableFilterItem<TData>
                    key={filter.filterId}
                    filter={filter}
                    index={index}
                    filterItemId={`${id}-filter-${filter.filterId}`}
                    shortcuts={DATA_TABLE_FILTER_SHORTCUTS}
                    joinOperator={joinOperator}
                    setJoinOperator={setJoinOperator}
                    columns={columns}
                    onFilterUpdate={onFilterUpdate}
                    onFilterRemove={onFilterRemove}
                  />
                ))}
              </div>
            </SortableContent>
          ) : null}
          <div className="flex w-full items-center gap-2">
            <Button
              size="sm"
              className="rounded gap-2"
              ref={addButtonRef}
              onClick={onFilterAdd}
            >
              Add filter
              <ShortcutKbd
                actionId={DATA_TABLE_FILTER_SHORTCUTS.addFilter.id}
                interactive={false}
                className="pointer-events-none hidden xl:inline-flex"
              />
            </Button>
            {filters.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded gap-2"
                onClick={onFiltersReset}
              >
                Reset filters
                <ShortcutKbd
                  actionId={DATA_TABLE_FILTER_SHORTCUTS.resetFilters.id}
                  interactive={false}
                  className="pointer-events-none hidden xl:inline-flex"
                />
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className="flex items-center gap-2">
          <div className="h-8 min-w-[72px] rounded-sm bg-primary/10" />
          <div className="h-8 w-32 rounded-sm bg-primary/10" />
          <div className="h-8 w-32 rounded-sm bg-primary/10" />
          <div className="h-8 min-w-36 flex-1 rounded-sm bg-primary/10" />
          <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
          <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
        </div>
      </SortableOverlay>
    </Sortable>
  );
}

interface DataTableFilterItemProps<TData> {
  filter: ExtendedColumnFilter<TData>;
  index: number;
  filterItemId: string;
  shortcuts: typeof DATA_TABLE_FILTER_SHORTCUTS;
  joinOperator: JoinOperator;
  setJoinOperator: (value: JoinOperator) => void;
  columns: Column<TData>[];
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>,
  ) => void;
  onFilterRemove: (filterId: string) => void;
}

function DataTableFilterItem<TData>({
  filter,
  index,
  filterItemId,
  shortcuts,
  joinOperator,
  setJoinOperator,
  columns,
  onFilterUpdate,
  onFilterRemove,
}: DataTableFilterItemProps<TData>) {
  const [showFieldSelector, setShowFieldSelector] = React.useState(false);
  const [showOperatorSelector, setShowOperatorSelector] = React.useState(false);
  const [showValueSelector, setShowValueSelector] = React.useState(false);

  const column = columns.find((column) => column.id === filter.id);
  if (!column) return null;

  const joinOperatorListboxId = `${filterItemId}-join-operator-listbox`;
  const fieldListboxId = `${filterItemId}-field-listbox`;
  const operatorListboxId = `${filterItemId}-operator-listbox`;
  const inputId = `${filterItemId}-input`;

  const columnMeta = column.columnDef.meta;
  const filterOperators = getFilterOperators(filter.variant);

  const onItemKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (showFieldSelector || showOperatorSelector || showValueSelector) {
      return;
    }

    if (REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase())) {
      event.preventDefault();
      onFilterRemove(filter.filterId);
    }
  };

  return (
    <SortableItem value={filter.filterId} asChild>
      {/** biome-ignore lint/a11y/useSemanticElements: lint debt cleanup */}
      <div
        role="listitem"
        id={filterItemId}
        tabIndex={-1}
        className="flex items-center gap-2"
        onKeyDown={onItemKeyDown}
      >
        <div className="min-w-[72px] text-center">
          {index === 0 ? (
            <span className="text-muted-foreground text-sm">Where</span>
          ) : index === 1 ? (
            <Select
              value={joinOperator}
              onValueChange={(value: JoinOperator) => setJoinOperator(value)}
            >
              <SelectTrigger
                aria-label="Select join operator"
                aria-controls={joinOperatorListboxId}
                className="h-8 rounded lowercase [&[data-size]]:h-8"
              >
                <SelectValue placeholder={joinOperator} />
              </SelectTrigger>
              <SelectContent
                id={joinOperatorListboxId}
                position="popper"
                className="min-w-(--radix-select-trigger-width) lowercase"
              >
                {dataTableConfig.joinOperators.map((joinOperator) => (
                  <SelectItem key={joinOperator} value={joinOperator}>
                    {joinOperator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground text-sm">
              {joinOperator}
            </span>
          )}
        </div>
        <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
          <PopoverTrigger asChild>
            <Button
              role="combobox"
              aria-controls={fieldListboxId}
              variant="outline"
              size="sm"
              className="w-32 justify-between gap-1 rounded font-normal"
            >
              <span className="truncate">
                {columns.find((column) => column.id === filter.id)?.columnDef
                  .meta?.label ?? 'Select field'}
              </span>
              <ShortcutKbd
                actionId={shortcuts.filterField.id}
                interactive={false}
                className="pointer-events-none hidden xl:inline-flex"
              />
              <ChevronsUpDown className="opacity-50 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={fieldListboxId}
            align="start"
            className="w-40 origin-[var(--radix-popover-content-transform-origin)] p-0"
          >
            <Command>
              <CommandInput placeholder="Search fields..." />
              <CommandList>
                <CommandEmpty>No fields found.</CommandEmpty>
                <CommandGroup>
                  {columns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={column.id}
                      onSelect={(value) => {
                        onFilterUpdate(filter.filterId, {
                          id: value as Extract<keyof TData, string>,
                          variant: column.columnDef.meta?.variant ?? 'text',
                          operator: getDefaultFilterOperator(
                            column.columnDef.meta?.variant ?? 'text',
                          ),
                          value: '',
                        });

                        setShowFieldSelector(false);
                      }}
                    >
                      <span className="truncate">
                        {column.columnDef.meta?.label}
                      </span>
                      <Check
                        className={cn(
                          'w-4 h-4',
                          'ml-auto',
                          column.id === filter.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          open={showOperatorSelector}
          onOpenChange={setShowOperatorSelector}
          value={filter.operator}
          onValueChange={(value: FilterOperator) =>
            onFilterUpdate(filter.filterId, {
              operator: value,
              value:
                value === 'isEmpty' || value === 'isNotEmpty'
                  ? ''
                  : filter.value,
            })
          }
        >
          <SelectTrigger
            aria-controls={operatorListboxId}
            className="h-8 w-32 rounded lowercase [&[data-size]]:h-8"
          >
            <div className="truncate">
              <SelectValue placeholder={filter.operator} />
            </div>
          </SelectTrigger>
          <SelectContent
            id={operatorListboxId}
            className="origin-[var(--radix-select-content-transform-origin)]"
          >
            {filterOperators.map((operator) => (
              <SelectItem
                key={operator.value}
                value={operator.value}
                className="lowercase"
              >
                {operator.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-36 flex-1">
          {onFilterInputRender({
            filter,
            inputId,
            column,
            columnMeta,
            onFilterUpdate,
            showValueSelector,
            setShowValueSelector,
            shortcuts,
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-controls={filterItemId}
              aria-label="Remove filter"
              variant="outline"
              size="icon"
              className="size-8 rounded"
              onClick={() => onFilterRemove(filter.filterId)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Remove filter</span>
            <ShortcutKbd
              actionId={shortcuts.removeFilter.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <SortableItemHandle asChild>
            <TooltipTrigger asChild>
              <Button
                aria-label="Reorder filter"
                variant="outline"
                size="icon"
                className="size-8 rounded"
              >
                <GripVertical className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
          </SortableItemHandle>
          <TooltipContent className="flex items-center gap-2">
            <span>Reorder filter</span>
            <ShortcutKbd
              actionId={shortcuts.reorderFilter.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
      </div>
    </SortableItem>
  );
}

function onFilterInputRender<TData>({
  filter,
  inputId,
  column,
  columnMeta,
  onFilterUpdate,
  showValueSelector,
  setShowValueSelector,
  shortcuts,
}: {
  filter: ExtendedColumnFilter<TData>;
  inputId: string;
  column: Column<TData>;
  columnMeta?: ColumnMeta<TData, unknown>;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>,
  ) => void;
  showValueSelector: boolean;
  setShowValueSelector: (value: boolean) => void;
  shortcuts: typeof DATA_TABLE_FILTER_SHORTCUTS;
}) {
  if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
    return (
      // biome-ignore lint/a11y/useSemanticElements: lint debt cleanup
      <div
        id={inputId}
        role="status"
        aria-label={`${columnMeta?.label} filter is ${
          filter.operator === 'isEmpty' ? 'empty' : 'not empty'
        }`}
        aria-live="polite"
        className="h-8 w-full rounded border bg-transparent dark:bg-input/30"
      />
    );
  }

  switch (filter.variant) {
    case 'text':
    case 'number':
    case 'range': {
      if (
        (filter.variant === 'range' && filter.operator === 'isBetween') ||
        filter.operator === 'isBetween'
      ) {
        return (
          <DataTableRangeFilter
            filter={filter}
            column={column}
            inputId={inputId}
            onFilterUpdate={onFilterUpdate}
          />
        );
      }

      const isNumber =
        filter.variant === 'number' || filter.variant === 'range';

      return (
        <Input
          id={inputId}
          type={isNumber ? 'number' : filter.variant}
          aria-label={`${columnMeta?.label} filter value`}
          aria-describedby={`${inputId}-description`}
          inputMode={isNumber ? 'numeric' : undefined}
          placeholder={columnMeta?.placeholder ?? 'Enter a value...'}
          className="h-8 w-full rounded"
          value={typeof filter.value === 'string' ? filter.value : ''}
          onChange={(event) =>
            onFilterUpdate(filter.filterId, {
              value: event.target.value,
            })
          }
        />
      );
    }

    case 'boolean': {
      if (Array.isArray(filter.value)) return null;

      const inputListboxId = `${inputId}-listbox`;

      return (
        <Select
          open={showValueSelector}
          onOpenChange={setShowValueSelector}
          value={filter.value}
          onValueChange={(value) =>
            onFilterUpdate(filter.filterId, {
              value,
            })
          }
        >
          <SelectTrigger
            id={inputId}
            aria-controls={inputListboxId}
            aria-label={`${columnMeta?.label} boolean filter`}
            className="h-8 w-full rounded [&[data-size]]:h-8"
          >
            <SelectValue placeholder={filter.value ? 'True' : 'False'} />
          </SelectTrigger>
          <SelectContent id={inputListboxId}>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    case 'select':
    case 'multiSelect': {
      const inputListboxId = `${inputId}-listbox`;

      const multiple = filter.variant === 'multiSelect';
      const selectedValues = multiple
        ? Array.isArray(filter.value)
          ? filter.value
          : []
        : typeof filter.value === 'string'
          ? filter.value
          : undefined;

      return (
        <Faceted
          open={showValueSelector}
          onOpenChange={setShowValueSelector}
          value={selectedValues}
          onValueChange={(value) => {
            onFilterUpdate(filter.filterId, {
              value,
            });
          }}
          multiple={multiple}
        >
          <FacetedTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              aria-label={`${columnMeta?.label} filter value${multiple ? 's' : ''}`}
              variant="outline"
              size="sm"
              className="w-full rounded gap-2 font-normal"
            >
              <FacetedBadgeList
                options={columnMeta?.options}
                placeholder={
                  columnMeta?.placeholder ??
                  `Select option${multiple ? 's' : ''}...`
                }
              />
              <ShortcutKbd
                actionId={shortcuts.filterFacetedValue.id}
                interactive={false}
                className="pointer-events-none hidden xl:inline-flex"
              />
            </Button>
          </FacetedTrigger>
          <FacetedContent
            id={inputListboxId}
            className="w-[200px] origin-[var(--radix-popover-content-transform-origin)]"
          >
            <FacetedInput
              aria-label={`Search ${columnMeta?.label} options`}
              placeholder={columnMeta?.placeholder ?? 'Search options...'}
            />
            <FacetedList>
              <FacetedEmpty>No options found.</FacetedEmpty>
              <FacetedGroup>
                {columnMeta?.options?.map((option) => (
                  <FacetedItem key={option.value} value={option.value}>
                    {option.icon && <option.icon />}
                    <span>{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </FacetedItem>
                ))}
              </FacetedGroup>
            </FacetedList>
          </FacetedContent>
        </Faceted>
      );
    }

    case 'date':
    case 'dateRange': {
      const inputListboxId = `${inputId}-listbox`;

      const dateValue = Array.isArray(filter.value)
        ? filter.value.filter(Boolean)
        : [filter.value, filter.value].filter(Boolean);

      const displayValue =
        filter.operator === 'isBetween' && dateValue.length === 2
          ? `${formatDate(new Date(Number(dateValue[0])))} - ${formatDate(
              new Date(Number(dateValue[1])),
            )}`
          : dateValue[0]
            ? formatDate(new Date(Number(dateValue[0])))
            : 'Pick a date';

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              aria-label={`${columnMeta?.label} date filter`}
              variant="outline"
              size="sm"
              className={cn(
                'w-full justify-start rounded gap-2 text-left font-normal',
                !filter.value && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="truncate">{displayValue}</span>
              <ShortcutKbd
                actionId={shortcuts.filterDateValue.id}
                interactive={false}
                className="pointer-events-none hidden xl:inline-flex"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={inputListboxId}
            align="start"
            className="w-auto origin-[var(--radix-popover-content-transform-origin)] p-0"
          >
            {filter.operator === 'isBetween' ? (
              <Calendar
                aria-label={`Select ${columnMeta?.label} date range`}
                mode="range"
                initialFocus
                selected={
                  dateValue.length === 2
                    ? {
                        from: new Date(Number(dateValue[0])),
                        to: new Date(Number(dateValue[1])),
                      }
                    : {
                        from: new Date(),
                        to: new Date(),
                      }
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.filterId, {
                    value: date
                      ? [
                          (date.from?.getTime() ?? '').toString(),
                          (date.to?.getTime() ?? '').toString(),
                        ]
                      : [],
                  });
                }}
              />
            ) : (
              <Calendar
                aria-label={`Select ${columnMeta?.label} date`}
                mode="single"
                initialFocus
                selected={
                  dateValue[0] ? new Date(Number(dateValue[0])) : undefined
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.filterId, {
                    value: (date?.getTime() ?? '').toString(),
                  });
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      );
    }

    default:
      return null;
  }
}
