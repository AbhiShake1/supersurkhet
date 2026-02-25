import { Button } from '@/components/ui/button';
import {
  ShortcutKbd,
  useRegisterShortcut,
  useShortcutAction,
  type ShortcutDefinition,
} from '@/components/ui/keyboard-shortcuts';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Table } from '@tanstack/react-table';
import { Loader, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

interface DataTableActionBarProps<TData>
  extends React.ComponentProps<typeof motion.div> {
  table: Table<TData>;
  visible?: boolean;
  container?: Element | DocumentFragment | null;
}

const DATA_TABLE_ACTION_SHORTCUTS = {
  clearSelection: {
    id: 'dataTable.clearSelection',
    label: 'Clear selection',
    description: 'Clear all selected rows in the active table.',
    scope: 'DataTable Actions',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
} as const satisfies Record<string, ShortcutDefinition>;

function DataTableActionBar<TData>({
  table,
  visible: visibleProp,
  container: containerProp,
  children,
  className,
  ...props
}: DataTableActionBarProps<TData>) {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        table.toggleAllRowsSelected(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [table]);

  const container =
    containerProp ?? (mounted ? globalThis.document?.body : null);

  if (!container) return null;

  const visible =
    visibleProp ?? table.getFilteredSelectedRowModel().rows.length > 0;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          role="toolbar"
          aria-orientation="horizontal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={cn(
            'fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit flex-wrap items-center justify-center gap-2 rounded-md border bg-background p-2 text-foreground shadow-sm',
            className,
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}

interface DataTableActionBarActionProps
  extends React.ComponentProps<typeof Button> {
  tooltip?: string;
  isPending?: boolean;
  shortcut?: ShortcutDefinition;
}

function DataTableActionBarAction({
  size = 'sm',
  tooltip,
  isPending,
  shortcut,
  disabled,
  className,
  children,
  ...props
}: DataTableActionBarActionProps) {
  useRegisterShortcut(shortcut);

  const trigger = (
    <Button
      variant="secondary"
      size={size}
      className={cn(
        'gap-1.5 border border-secondary bg-secondary/50 hover:bg-secondary/70 [&>svg]:size-3.5',
        size === 'icon' ? 'size-7' : 'h-7',
        className,
      )}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending ? <Loader className="animate-spin" /> : children}
    </Button>
  );

  if (!tooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="flex items-center gap-2 border bg-accent font-semibold text-foreground dark:bg-zinc-900 [&>span]:hidden"
      >
        <p>{tooltip}</p>
        {shortcut ? <ShortcutKbd actionId={shortcut.id} interactive={false} /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

interface DataTableActionBarSelectionProps<TData> {
  table: Table<TData>;
}

function DataTableActionBarSelection<TData>({
  table,
}: DataTableActionBarSelectionProps<TData>) {
  const onClearSelection = () => {
    table.toggleAllRowsSelected(false);
  };

  useShortcutAction(
    DATA_TABLE_ACTION_SHORTCUTS.clearSelection,
    () => {
      onClearSelection();
    },
    {
      guard: () => table.getFilteredSelectedRowModel().rows.length > 0,
    },
  );

  return (
    <div className="flex h-7 items-center rounded-md border pr-1 pl-2.5">
      <span className="whitespace-nowrap text-xs">
        {table.getFilteredSelectedRowModel().rows.length} selected
      </span>
      <Separator
        orientation="vertical"
        className="mr-1 ml-2 data-[orientation=vertical]:h-4"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={onClearSelection}
          >
            <X className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          className="flex items-center gap-2 border bg-accent px-2 py-1 font-semibold text-foreground dark:bg-zinc-900 [&>span]:hidden"
        >
          <p>Clear selection</p>
          <ShortcutKbd
            actionId={DATA_TABLE_ACTION_SHORTCUTS.clearSelection.id}
            interactive={false}
          />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
};
