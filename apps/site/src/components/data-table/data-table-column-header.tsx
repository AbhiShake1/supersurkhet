'use client';

import type { Renderable } from '@autoform/core';
import type { Column } from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  EyeOff,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue>
  extends Omit<React.ComponentProps<typeof DropdownMenuTrigger>, 'title'> {
  column: Column<TData, TValue>;
  title: Renderable;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onMoveColumn?: (sourceColumnKey: string, targetColumnKey: string) => void;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  onEditColumn,
  onDeleteColumn,
  onMoveColumn,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (
    !column.getCanSort() &&
    !column.getCanHide() &&
    !onEditColumn &&
    !onDeleteColumn &&
    !onMoveColumn
  ) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sortIcon = column.getCanSort() ? (
    column.getIsSorted() === 'desc' ? (
      <ChevronDown className="size-4" />
    ) : column.getIsSorted() === 'asc' ? (
      <ChevronUp className="size-4" />
    ) : (
      <ChevronsUpDown className="size-4" />
    )
  ) : null;

  if (onMoveColumn) {
    return (
      <div className={cn('flex min-w-0 items-center gap-1', className)}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="-ml-0.5 flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
            {...props}
          >
            <h3 className="truncate">{title}</h3>
            {sortIcon}
            <span className="sr-only">Column actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {column.getCanSort() && (
              <>
                <DropdownMenuCheckboxItem
                  className="relative pr-8 gap-2 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
                  checked={column.getIsSorted() === 'asc'}
                  onClick={() => column.toggleSorting(false)}
                >
                  <ChevronUp className="size-4" />
                  Asc
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="relative pr-8 pl-2 gap-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
                  checked={column.getIsSorted() === 'desc'}
                  onClick={() => column.toggleSorting(true)}
                >
                  <ChevronDown className="size-4" />
                  Desc
                </DropdownMenuCheckboxItem>
                {column.getIsSorted() && (
                  <DropdownMenuItem
                    className="pl-2 [&_svg]:text-muted-foreground"
                    onClick={() => column.clearSorting()}
                  >
                    <X />
                    Reset
                  </DropdownMenuItem>
                )}
              </>
            )}
            {column.getCanHide() && (
              <DropdownMenuCheckboxItem
                className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground gap-2"
                checked={!column.getIsVisible()}
                onClick={() => column.toggleVisibility(false)}
              >
                <EyeOff className="size-4" />
                Hide
              </DropdownMenuCheckboxItem>
            )}
            {(onEditColumn || onDeleteColumn) && <DropdownMenuSeparator />}
            {onEditColumn && (
              <DropdownMenuItem
                className="pl-2 gap-2 [&_svg]:text-muted-foreground"
                onSelect={onEditColumn}
              >
                <Pencil className="size-4" />
                Edit Column
              </DropdownMenuItem>
            )}
            {onDeleteColumn && (
              <DropdownMenuItem
                className="pl-2 gap-2 text-destructive focus:text-destructive [&_svg]:text-destructive"
                onSelect={onDeleteColumn}
              >
                <Trash2 className="size-4" />
                Delete Column
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          '-ml-1.5 flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
          className,
        )}
        {...props}
      >
        <h3>{title}</h3>
        {sortIcon}
        <span className="sr-only">Column actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {column.getCanSort() && (
          <>
            <DropdownMenuCheckboxItem
              className="relative pr-8 gap-2 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === 'asc'}
              onClick={() => column.toggleSorting(false)}
            >
              <ChevronUp className="size-4" />
              Asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 gap-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === 'desc'}
              onClick={() => column.toggleSorting(true)}
            >
              <ChevronDown className="size-4" />
              Desc
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() && (
              <DropdownMenuItem
                className="pl-2 [&_svg]:text-muted-foreground"
                onClick={() => column.clearSorting()}
              >
                <X />
                Reset
              </DropdownMenuItem>
            )}
          </>
        )}
        {column.getCanHide() && (
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground gap-2"
            checked={!column.getIsVisible()}
            onClick={() => column.toggleVisibility(false)}
          >
            <EyeOff className="size-4" />
            Hide
          </DropdownMenuCheckboxItem>
        )}
        {(onEditColumn || onDeleteColumn) && <DropdownMenuSeparator />}
        {onEditColumn && (
          <DropdownMenuItem
            className="pl-2 gap-2 [&_svg]:text-muted-foreground"
            onSelect={onEditColumn}
          >
            <Pencil className="size-4" />
            Edit Column
          </DropdownMenuItem>
        )}
        {onDeleteColumn && (
          <DropdownMenuItem
            className="pl-2 gap-2 text-destructive focus:text-destructive [&_svg]:text-destructive"
            onSelect={onDeleteColumn}
          >
            <Trash2 className="size-4" />
            Delete Column
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
