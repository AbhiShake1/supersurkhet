import type { ColumnSort, SortDirection, Table } from '@tanstack/react-table';
import {
  ArrowDownUp,
  ChevronsUpDown,
  GripVertical,
  Trash2,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  type ShortcutDefinition,
  ShortcutKbd,
  useRegisterShortcut,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';

const OPEN_MENU_SHORTCUT = 's';
const REMOVE_SORT_SHORTCUTS = ['backspace', 'delete'];
const DATA_TABLE_SORT_SHORTCUTS = {
  openSort: {
    id: 'dataTable.openSort',
    label: 'Open sorting',
    description: 'Open the sort list popover.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: OPEN_MENU_SHORTCUT,
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  addSort: {
    id: 'dataTable.addSort',
    label: 'Add sort',
    description: 'Add a new sort row.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: 'a',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  resetSort: {
    id: 'dataTable.resetSort',
    label: 'Reset sorting',
    description: 'Reset current sorting back to defaults.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  sortField: {
    id: 'dataTable.sortFieldSelector',
    label: 'Open sort field selector',
    description: 'Open the field selector for a sort row.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: 'ArrowDown',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  removeSort: {
    id: 'dataTable.removeSort',
    label: 'Remove sort',
    description: 'Remove a sort row.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: 'Delete',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  reorderSort: {
    id: 'dataTable.reorderSort',
    label: 'Reorder sort',
    description: 'Move a sort row.',
    scope: 'DataTable Sorting',
    defaultBinding: {
      key: 'r',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const satisfies Record<string, ShortcutDefinition>;

interface DataTableSortListProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
}

export function DataTableSortList<TData>({
  table,
  ...props
}: DataTableSortListProps<TData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  const sorting = table.getState().sorting;
  const onSortingChange = table.setSorting;

  const { columnLabels, columns } = React.useMemo(() => {
    const labels = new Map<string, string>();
    const sortingIds = new Set(sorting.map((s) => s.id));
    const availableColumns: { id: string; label: string }[] = [];

    for (const column of table.getAllColumns()) {
      if (!column.getCanSort()) continue;

      const label = column.columnDef.meta?.label ?? column.id;
      labels.set(column.id, label);

      if (!sortingIds.has(column.id)) {
        availableColumns.push({ id: column.id, label });
      }
    }

    return {
      columnLabels: labels,
      columns: availableColumns,
    };
  }, [sorting, table]);

  const onSortAdd = () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;

    onSortingChange((prevSorting) => [
      ...prevSorting,
      { id: firstColumn.id, desc: false },
    ]);
  };

  const onSortUpdate = (sortId: string, updates: Partial<ColumnSort>) => {
    onSortingChange((prevSorting) => {
      if (!prevSorting) return prevSorting;
      return prevSorting.map((sort) =>
        sort.id === sortId ? { ...sort, ...updates } : sort,
      );
    });
  };

  const onSortRemove = (sortId: string) => {
    onSortingChange((prevSorting) =>
      prevSorting.filter((item) => item.id !== sortId),
    );
  };

  const onSortingReset = () => onSortingChange(table.initialState.sorting);

  useRegisterShortcut(DATA_TABLE_SORT_SHORTCUTS.addSort);
  useRegisterShortcut(DATA_TABLE_SORT_SHORTCUTS.resetSort);
  useRegisterShortcut(DATA_TABLE_SORT_SHORTCUTS.sortField);
  useRegisterShortcut(DATA_TABLE_SORT_SHORTCUTS.removeSort);
  useRegisterShortcut(DATA_TABLE_SORT_SHORTCUTS.reorderSort);
  useShortcutAction(
    DATA_TABLE_SORT_SHORTCUTS.openSort,
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
        sorting.length > 0
      ) {
        event.preventDefault();
        onSortingReset();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  }, [sorting.length, onSortingReset]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase()) &&
      sorting.length > 0
    ) {
      event.preventDefault();
      onSortingReset();
    }
  };

  return (
    <Sortable
      value={sorting}
      onValueChange={onSortingChange}
      getItemValue={(item) => item.id}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onKeyDown={onTriggerKeyDown}
                className="gap-2"
              >
                <ArrowDownUp className="size-4" />
                Sort
                {sorting.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
                  >
                    {sorting.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Open sorting</span>
            <ShortcutKbd
              actionId={DATA_TABLE_SORT_SHORTCUTS.openSort.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className="flex w-full max-w-[var(--radix-popover-content-available-width)] origin-[var(--radix-popover-content-transform-origin)] flex-col gap-3.5 p-4 sm:min-w-[380px]"
          {...props}
        >
          <div className="flex flex-col gap-1">
            <h4 id={labelId} className="font-medium leading-none">
              {sorting.length > 0 ? 'Sort by' : 'No sorting applied'}
            </h4>
            <p
              id={descriptionId}
              className={cn(
                'text-muted-foreground text-sm',
                sorting.length > 0 && 'sr-only',
              )}
            >
              {sorting.length > 0
                ? 'Modify sorting to organize your rows.'
                : 'Add sorting to organize your rows.'}
            </p>
          </div>
          {sorting.length > 0 && (
            <SortableContent asChild>
              {/** biome-ignore lint/a11y/useSemanticElements: lint debt cleanup */}
              <div
                role="list"
                className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1"
              >
                {sorting.map((sort) => (
                  <DataTableSortItem
                    key={sort.id}
                    sort={sort}
                    sortItemId={`${id}-sort-${sort.id}`}
                    shortcuts={DATA_TABLE_SORT_SHORTCUTS}
                    columns={columns}
                    columnLabels={columnLabels}
                    onSortUpdate={onSortUpdate}
                    onSortRemove={onSortRemove}
                  />
                ))}
              </div>
            </SortableContent>
          )}
          <div className="flex w-full items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="rounded gap-2"
                  ref={addButtonRef}
                  onClick={onSortAdd}
                  disabled={columns.length === 0}
                >
                  Add sort
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Add sort</span>
                <ShortcutKbd
                  actionId={DATA_TABLE_SORT_SHORTCUTS.addSort.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            {sorting.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded gap-2"
                    onClick={onSortingReset}
                  >
                    Reset sorting
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>Reset sorting</span>
                  <ShortcutKbd
                    actionId={DATA_TABLE_SORT_SHORTCUTS.resetSort.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className="flex items-center gap-2">
          <div className="h-8 w-[180px] rounded-sm bg-primary/10" />
          <div className="h-8 w-24 rounded-sm bg-primary/10" />
          <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
          <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
        </div>
      </SortableOverlay>
    </Sortable>
  );
}

interface DataTableSortItemProps {
  sort: ColumnSort;
  sortItemId: string;
  shortcuts: typeof DATA_TABLE_SORT_SHORTCUTS;
  columns: { id: string; label: string }[];
  columnLabels: Map<string, string>;
  onSortUpdate: (sortId: string, updates: Partial<ColumnSort>) => void;
  onSortRemove: (sortId: string) => void;
}

function DataTableSortItem({
  sort,
  sortItemId,
  shortcuts,
  columns,
  columnLabels,
  onSortUpdate,
  onSortRemove,
}: DataTableSortItemProps) {
  const fieldListboxId = `${sortItemId}-field-listbox`;
  const fieldTriggerId = `${sortItemId}-field-trigger`;
  const directionListboxId = `${sortItemId}-direction-listbox`;

  const [showFieldSelector, setShowFieldSelector] = React.useState(false);
  const [showDirectionSelector, setShowDirectionSelector] =
    React.useState(false);

  const onItemKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (showFieldSelector || showDirectionSelector) {
      return;
    }

    if (REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase())) {
      event.preventDefault();
      onSortRemove(sort.id);
    }
  };

  return (
    <SortableItem value={sort.id} asChild>
      {/** biome-ignore lint/a11y/useSemanticElements: lint debt cleanup */}
      <div
        role="listitem"
        id={sortItemId}
        tabIndex={-1}
        className="flex items-center gap-2"
        onKeyDown={onItemKeyDown}
      >
        <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  id={fieldTriggerId}
                  role="combobox"
                  aria-controls={fieldListboxId}
                  variant="outline"
                  size="sm"
                  className="w-44 justify-between gap-1 rounded font-normal"
                >
                  <span className="truncate">{columnLabels.get(sort.id)}</span>
                  <ChevronsUpDown className="opacity-50 size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Sort field</span>
              <ShortcutKbd
                actionId={shortcuts.sortField.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            id={fieldListboxId}
            className="w-[var(--radix-popover-trigger-width)] origin-[var(--radix-popover-content-transform-origin)] p-0"
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
                      onSelect={(value) => onSortUpdate(sort.id, { id: value })}
                    >
                      <span className="truncate">{column.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          open={showDirectionSelector}
          onOpenChange={setShowDirectionSelector}
          value={sort.desc ? 'desc' : 'asc'}
          onValueChange={(value: SortDirection) =>
            onSortUpdate(sort.id, { desc: value === 'desc' })
          }
        >
          <SelectTrigger
            aria-controls={directionListboxId}
            className="h-8 w-24 rounded [&[data-size]]:h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            id={directionListboxId}
            className="min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)]"
          >
            {dataTableConfig.sortOrders.map((order) => (
              <SelectItem key={order.value} value={order.value}>
                {order.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-controls={sortItemId}
              aria-label="Remove sort"
              variant="outline"
              size="icon"
              className="size-8 shrink-0 rounded"
              onClick={() => onSortRemove(sort.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Remove sort</span>
            <ShortcutKbd
              actionId={shortcuts.removeSort.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <SortableItemHandle asChild>
            <TooltipTrigger asChild>
              <Button
                aria-label="Reorder sort"
                variant="outline"
                size="icon"
                className="size-8 shrink-0 rounded"
              >
                <GripVertical className="size-4" />
              </Button>
            </TooltipTrigger>
          </SortableItemHandle>
          <TooltipContent className="flex items-center gap-2">
            <span>Reorder sort</span>
            <ShortcutKbd
              actionId={shortcuts.reorderSort.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
      </div>
    </SortableItem>
  );
}
