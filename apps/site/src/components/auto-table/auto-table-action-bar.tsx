import type { Table } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import * as React from 'react';

import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from '@/components/data-table/data-table-action-bar';
import { useShortcutAction } from '@/components/ui/keyboard-shortcuts';
import { Separator } from '@/components/ui/separator';
import { exportTableToCSV } from '@/lib/export';
import { DeleteRowDialog } from '../data-table/delete-row-dialog';

const actions = ['export', 'delete'] as const;

type Action = (typeof actions)[number];

interface AutoTableActionBarProps<T> {
  table: Table<T>;
  onDelete?: (id: string) => void;
}

const AUTO_TABLE_ACTION_BAR_SHORTCUTS = {
  exportSelected: {
    id: 'autoTable.exportSelected',
    label: 'Export selected rows',
    description: 'Export currently selected rows as CSV.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'x',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const;

export function AutoTableActionBar<T>({
  table,
  onDelete,
}: AutoTableActionBarProps<T>) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);
  const shortcutScopeRef = React.useRef<HTMLDivElement | null>(null);

  const getIsActionPending = (action: Action) =>
    isPending && currentAction === action;

  const onExport = () => {
    setCurrentAction('export');
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ['select', 'actions'],
        onlySelected: true,
      });
    });
  };

  const deleteSelected = () => {
    setCurrentAction('delete');
    startTransition(() => {
      for (const row of rows) {
        onDelete?.(row.id);
      }
      table.toggleAllRowsSelected(false);
    });
  };

  const isActionBarShortcutTarget = React.useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as Node | null;
      const active = document.activeElement as Node | null;
      if (!shortcutScopeRef.current) return false;
      if (target && shortcutScopeRef.current.contains(target)) return true;
      if (active && shortcutScopeRef.current.contains(active)) return true;
      return false;
    },
    [],
  );

  useShortcutAction(
    AUTO_TABLE_ACTION_BAR_SHORTCUTS.exportSelected,
    () => {
      onExport();
    },
    {
      enabled: rows.length > 0,
      guard: isActionBarShortcutTarget,
    },
  );

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div ref={shortcutScopeRef} className="flex items-center gap-1.5">
        <DataTableActionBarAction
          size="icon"
          tooltip="Export as excel"
          shortcut={AUTO_TABLE_ACTION_BAR_SHORTCUTS.exportSelected}
          className="lg:w-auto lg:px-2"
          isPending={getIsActionPending('export')}
          onClick={onExport}
        >
          <Download />
        </DataTableActionBarAction>
        <DeleteRowDialog data={rows} onConfirm={deleteSelected} />
        {/* <DataTableActionBarAction
					size="icon"
					tooltip="Delete selected"
					isPending={getIsActionPending("delete")}
					onClick={deleteSelected}
				>
					<Trash2 />
				</DataTableActionBarAction> */}
      </div>
    </DataTableActionBar>
  );
}
