import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import * as React from 'react';

import {
  Sortable,
  SortableContent,
  SortableItem,
} from '@/components/ui/sortable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCommonPinningStyles } from '@/lib/data-table';
import { cn } from '@/lib/utils';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  onReorderColumns?: (sourceColumnKey: string, targetColumnKey: string) => void;
  reorderableColumnIds?: readonly string[];
  activeRowId?: string | null;
  onActiveRowChange?: (rowId: string) => void;
}

export function DataTable<TData>({
  table,
  actionBar,
  onReorderColumns,
  reorderableColumnIds = [],
  activeRowId = null,
  onActiveRowChange,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const reorderableColumnIdSet = React.useMemo(
    () => new Set(reorderableColumnIds),
    [reorderableColumnIds],
  );

  return (
    <div className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table
          className="min-w-max"
          containerClassName="relative max-h-[70vh] overflow-auto"
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              const reorderableHeaders = headerGroup.headers.filter(
                (header) => {
                  if (header.isPlaceholder) return false;
                  return reorderableColumnIdSet.has(String(header.column.id));
                },
              );

              if (!onReorderColumns || reorderableHeaders.length === 0) {
                return (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          ...getCommonPinningStyles({ column: header.column }),
                          position: 'sticky',
                          top: 0,
                          zIndex: header.column.getIsPinned() ? 30 : 20,
                          backgroundColor: 'var(--color-card)',
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                );
              }

              return (
                <Sortable
                  key={headerGroup.id}
                  value={reorderableHeaders}
                  getItemValue={(header) => String(header.column.id)}
                  orientation="horizontal"
                  onMove={({ active, over, activeIndex, overIndex }) => {
                    if (!over) return;
                    const fromColumnKey = String(active.id);
                    const toColumnKey = String(over.id);
                    if (!fromColumnKey || !toColumnKey) return;
                    if (fromColumnKey === toColumnKey) return;
                    if (activeIndex === overIndex) return;
                    onReorderColumns(fromColumnKey, toColumnKey);
                  }}
                >
                  <SortableContent asChild>
                    <TableRow>
                      {headerGroup.headers.map((header) => {
                        const isReorderable =
                          !header.isPlaceholder &&
                          reorderableColumnIdSet.has(String(header.column.id));
                        const content = (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{
                              ...getCommonPinningStyles({
                                column: header.column,
                              }),
                              position: 'sticky',
                              top: 0,
                              zIndex: header.column.getIsPinned() ? 30 : 20,
                              backgroundColor: 'var(--color-card)',
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                        if (!isReorderable) return content;
                        return (
                          <SortableItem
                            key={header.id}
                            value={String(header.column.id)}
                            asChild
                          >
                            {content}
                          </SortableItem>
                        );
                      })}
                    </TableRow>
                  </SortableContent>
                </Sortable>
              );
            })}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-row-id={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  tabIndex={activeRowId === row.id ? 0 : -1}
                  className={cn(
                    'outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset',
                    activeRowId === row.id ? 'bg-muted/40' : '',
                  )}
                  onFocus={() => onActiveRowChange?.(row.id)}
                  onClick={() => onActiveRowChange?.(row.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getCommonPinningStyles({ column: cell.column }),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
