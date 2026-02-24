'use client';

import type { Table } from '@tanstack/react-table';
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import * as React from 'react';
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
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

const DATA_TABLE_VIEW_SHORTCUT = {
  id: 'dataTable.viewOptions',
  label: 'Open view options',
  description: 'Open the column visibility menu for the active table.',
  scope: 'DataTable',
  defaultBinding: {
    key: 'v',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  },
} as const;

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== 'undefined' && column.getCanHide(),
        ),
    [table],
  );

  useShortcutAction(DATA_TABLE_VIEW_SHORTCUT, () => {
    setOpen(true);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
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
              <ChevronsUpDown className="ml-auto opacity-50 size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>View options</span>
          <ShortcutKbd
            actionId={DATA_TABLE_VIEW_SHORTCUT.id}
            interactive={false}
          />
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-44 p-0">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      'ml-auto size-4 shrink-0',
                      column.getIsVisible() ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
