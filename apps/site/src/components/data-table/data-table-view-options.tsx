'use client';

import type { Table } from '@tanstack/react-table';
import { ChevronsUpDown, GripVertical, Settings2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

type ReorderableColumn<TData> = {
  id: string;
  label: string;
  column: ReturnType<Table<TData>['getAllLeafColumns']>[number];
};

function getColumnLabel<TData>(
  column: ReturnType<Table<TData>['getAllLeafColumns']>[number],
) {
  const metaLabel = column.columnDef.meta?.label;
  if (typeof metaLabel === 'string' && metaLabel.trim().length > 0) {
    return metaLabel;
  }

  const header = column.columnDef.header;
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }

  return column.id;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const reorderableColumns: ReorderableColumn<TData>[] = table
    .getAllLeafColumns()
    .filter(
      (column) => typeof column.accessorFn !== 'undefined' && column.getCanHide(),
    )
    .map((column) => ({
      id: column.id,
      label: getColumnLabel(column),
      column,
    }));

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredColumns =
    normalizedQuery.length === 0
      ? reorderableColumns
      : reorderableColumns.filter(({ id, label }) => {
          const normalizedLabel = label.toLowerCase();
          const normalizedId = id.toLowerCase();
          return (
            normalizedLabel.includes(normalizedQuery) ||
            normalizedId.includes(normalizedQuery)
          );
        });

  const onReorderColumns = React.useCallback(
    (nextReorderableOrder: string[]) => {
      const reorderableColumnIdSet = new Set(
        reorderableColumns.map((column) => column.id),
      );
      const currentLeafColumnOrder = table
        .getAllLeafColumns()
        .map((column) => column.id);
      let reorderableIndex = 0;

      const nextFullColumnOrder = currentLeafColumnOrder.map((columnId) => {
        if (!reorderableColumnIdSet.has(columnId)) return columnId;
        const nextColumnId = nextReorderableOrder[reorderableIndex];
        reorderableIndex += 1;
        return nextColumnId ?? columnId;
      });

      table.setColumnOrder(nextFullColumnOrder);
    },
    [reorderableColumns, table],
  );

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          role="combobox"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 gap-2 lg:flex"
        >
          <Settings2 className="size-4" />
          View
          <ChevronsUpDown className="ml-auto size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-medium">Columns</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => table.resetColumnOrder()}
            disabled={reorderableColumns.length === 0}
          >
            Reset order
          </Button>
        </div>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search columns..."
          className="mb-2 h-8"
        />
        {isSearching && (
          <p className="mb-2 px-1 text-muted-foreground text-xs">
            Clear search to reorder.
          </p>
        )}
        {filteredColumns.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No columns found.
          </p>
        ) : isSearching ? (
          <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {filteredColumns.map((column) => (
              <ColumnRow key={column.id} column={column} draggable={false} />
            ))}
          </div>
        ) : (
          <Sortable
            value={reorderableColumns.map((column) => column.id)}
            onValueChange={onReorderColumns}
          >
            <SortableContent asChild>
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {reorderableColumns.map((column) => (
                  <SortableItem key={column.id} value={column.id} asChild>
                    <div>
                      <ColumnRow column={column} draggable />
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContent>
            <SortableOverlay>
              <div className="h-9 rounded-md border bg-primary/10" />
            </SortableOverlay>
          </Sortable>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ColumnRowProps<TData> {
  column: ReorderableColumn<TData>;
  draggable: boolean;
}

function ColumnRow<TData>({ column, draggable }: ColumnRowProps<TData>) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
      <Checkbox
        checked={column.column.getIsVisible()}
        onCheckedChange={(checked) =>
          column.column.toggleVisibility(Boolean(checked))
        }
        aria-label={`Toggle ${column.label}`}
      />
      <span className="flex-1 truncate text-sm">{column.label}</span>
      {draggable && (
        <SortableItemHandle asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Reorder ${column.label}`}
            className="size-7"
            onClick={(event) => event.preventDefault()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </Button>
        </SortableItemHandle>
      )}
    </div>
  );
}
