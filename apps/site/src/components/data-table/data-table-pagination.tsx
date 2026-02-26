import type { Table } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

const DATA_TABLE_PAGINATION_SHORTCUTS = {
  pageFirst: {
    id: 'dataTable.pageFirst',
    label: 'Go to first page',
    description: 'Navigate to the first table page.',
    scope: 'DataTable Pagination',
    defaultBinding: {
      key: 'ArrowLeft',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  pagePrevious: {
    id: 'dataTable.pagePrevious',
    label: 'Go to previous page',
    description: 'Navigate to the previous table page.',
    scope: 'DataTable Pagination',
    defaultBinding: {
      key: 'ArrowLeft',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  pageNext: {
    id: 'dataTable.pageNext',
    label: 'Go to next page',
    description: 'Navigate to the next table page.',
    scope: 'DataTable Pagination',
    defaultBinding: {
      key: 'ArrowRight',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  pageLast: {
    id: 'dataTable.pageLast',
    label: 'Go to last page',
    description: 'Navigate to the last table page.',
    scope: 'DataTable Pagination',
    defaultBinding: {
      key: 'ArrowRight',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const;

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  useShortcutAction(
    DATA_TABLE_PAGINATION_SHORTCUTS.pageFirst,
    () => {
      if (!table.getCanPreviousPage()) return;
      table.setPageIndex(0);
    },
    { guard: () => table.getCanPreviousPage() },
  );
  useShortcutAction(
    DATA_TABLE_PAGINATION_SHORTCUTS.pagePrevious,
    () => {
      if (!table.getCanPreviousPage()) return;
      table.previousPage();
    },
    { guard: () => table.getCanPreviousPage() },
  );
  useShortcutAction(
    DATA_TABLE_PAGINATION_SHORTCUTS.pageNext,
    () => {
      if (!table.getCanNextPage()) return;
      table.nextPage();
    },
    { guard: () => table.getCanNextPage() },
  );
  useShortcutAction(
    DATA_TABLE_PAGINATION_SHORTCUTS.pageLast,
    () => {
      if (!table.getCanNextPage()) return;
      table.setPageIndex(Math.max(table.getPageCount() - 1, 0));
    },
    { guard: () => table.getCanNextPage() },
  );

  return (
    <div
      className={cn(
        'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
        className,
      )}
      {...props}
    >
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of{' '}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem] [&[data-size]]:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Go to first page"
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>First page</span>
              <ShortcutKbd
                actionId={DATA_TABLE_PAGINATION_SHORTCUTS.pageFirst.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Go to previous page"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Previous page</span>
              <ShortcutKbd
                actionId={DATA_TABLE_PAGINATION_SHORTCUTS.pagePrevious.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Go to next page"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Next page</span>
              <ShortcutKbd
                actionId={DATA_TABLE_PAGINATION_SHORTCUTS.pageNext.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Go to last page"
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Last page</span>
              <ShortcutKbd
                actionId={DATA_TABLE_PAGINATION_SHORTCUTS.pageLast.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
