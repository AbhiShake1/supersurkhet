import type { Row } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import * as React from 'react';

import { DataTableActionBarAction } from '@/components/data-table/data-table-action-bar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMediaQuery } from '@/hooks/use-media-query';

const DELETE_ROW_DIALOG_SHORTCUTS = {
  openDeleteRows: {
    id: 'autoTable.openDeleteRows',
    label: 'Open delete rows dialog',
    description: 'Open the delete rows confirmation dialog.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  cancelDeleteRows: {
    id: 'autoTable.cancelDeleteRows',
    label: 'Cancel delete rows',
    description: 'Close the delete rows confirmation dialog.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  confirmDeleteRows: {
    id: 'autoTable.confirmDeleteRows',
    label: 'Confirm delete rows',
    description: 'Confirm deleting the selected rows.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const;

interface DeleteRowDialogProps<T>
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  data: Row<T>['original'][];
  showTrigger?: boolean;
  onConfirm: () => void;
}

export function DeleteRowDialog<T>({
  data,
  showTrigger = true,
  onConfirm,
  ...props
}: DeleteRowDialogProps<T>) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const {
    open: controlledOpen,
    onOpenChange,
    defaultOpen,
    ...dialogProps
  } = props;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    Boolean(defaultOpen),
  );
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const shortcutScopeRef = React.useRef<HTMLDivElement | null>(null);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const isShortcutInScope = React.useCallback((event: KeyboardEvent) => {
    const target = event.target as Node | null;
    const active = document.activeElement as Node | null;
    const dialogContent = document.querySelector(
      '[data-auto-table-delete-dialog-content="true"]',
    );

    if (
      shortcutScopeRef.current &&
      ((target && shortcutScopeRef.current.contains(target)) ||
        (active && shortcutScopeRef.current.contains(active)))
    ) {
      return true;
    }

    if (!dialogContent) return false;
    if (target && dialogContent.contains(target)) return true;
    if (active && dialogContent.contains(active)) return true;
    return false;
  }, []);

  useShortcutAction(
    DELETE_ROW_DIALOG_SHORTCUTS.openDeleteRows,
    () => {
      if (!showTrigger || open) return;
      const triggerSelector = isDesktop
        ? '[data-auto-table-delete-trigger-desktop="true"]'
        : '[data-auto-table-delete-trigger-mobile="true"]';
      const trigger =
        shortcutScopeRef.current?.querySelector<HTMLButtonElement>(
          triggerSelector,
        );
      trigger?.click();
    },
    {
      enabled: showTrigger && !open,
      guard: isShortcutInScope,
    },
  );
  useShortcutAction(
    DELETE_ROW_DIALOG_SHORTCUTS.cancelDeleteRows,
    () => {
      handleOpenChange(false);
    },
    {
      enabled: open,
      guard: isShortcutInScope,
    },
  );
  useShortcutAction(
    DELETE_ROW_DIALOG_SHORTCUTS.confirmDeleteRows,
    () => {
      onConfirm();
      if (!isControlled) {
        handleOpenChange(false);
      }
    },
    {
      enabled: open,
      guard: isShortcutInScope,
    },
  );

  if (isDesktop) {
    return (
      <div ref={shortcutScopeRef}>
        <Dialog open={open} onOpenChange={handleOpenChange} {...dialogProps}>
          {showTrigger ? (
            <DialogTrigger asChild>
              <DataTableActionBarAction
                size="icon"
                tooltip="Delete selected"
                shortcut={DELETE_ROW_DIALOG_SHORTCUTS.openDeleteRows}
                data-auto-table-delete-trigger-desktop="true"
                className="lg:w-auto lg:px-2"
              >
                <Trash2 />
              </DataTableActionBarAction>
            </DialogTrigger>
          ) : null}
          <DialogContent data-auto-table-delete-dialog-content="true">
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your{' '}
                <span className="font-medium">{data.length}</span>
                {data.length === 1 ? ' row' : ' rows'} from our network.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogClose asChild>
                    <Button variant="outline" className="gap-2">
                      Cancel
                    </Button>
                  </DialogClose>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>Cancel delete</span>
                  <ShortcutKbd
                    actionId={DELETE_ROW_DIALOG_SHORTCUTS.cancelDeleteRows.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Delete selected rows"
                    variant="destructive"
                    className="gap-2"
                    onClick={onConfirm}
                    // disabled={isDeletePending}
                  >
                    {/* {isDeletePending && (
                    <Loader
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )} */}
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>Confirm delete</span>
                  <ShortcutKbd
                    actionId={DELETE_ROW_DIALOG_SHORTCUTS.confirmDeleteRows.id}
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div ref={shortcutScopeRef}>
      <Drawer open={open} onOpenChange={handleOpenChange} {...dialogProps}>
        {showTrigger ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-auto-table-delete-trigger-mobile="true"
                  className="gap-2"
                >
                  <Trash2 className="mr-2 size-4" aria-hidden="true" />
                  Delete
                </Button>
              </DrawerTrigger>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Open delete dialog</span>
              <ShortcutKbd
                actionId={DELETE_ROW_DIALOG_SHORTCUTS.openDeleteRows.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
        ) : null}
        <DrawerContent data-auto-table-delete-dialog-content="true">
          <DrawerHeader>
            <DrawerTitle>Are you absolutely sure?</DrawerTitle>
            <DrawerDescription>
              This action cannot be undone. This will permanently delete your{' '}
              <span className="font-medium">{data.length}</span>
              {data.length === 1 ? ' row' : ' rows'} from our network.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-2 sm:space-x-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <DrawerClose asChild>
                  <Button variant="outline" className="gap-2">
                    Cancel
                  </Button>
                </DrawerClose>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Cancel delete</span>
                <ShortcutKbd
                  actionId={DELETE_ROW_DIALOG_SHORTCUTS.cancelDeleteRows.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Delete selected rows"
                  variant="destructive"
                  className="gap-2"
                  onClick={onConfirm}
                  // disabled={isDeletePending}
                >
                  {/* {isDeletePending && (
                  <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" />
                )} */}
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Confirm delete</span>
                <ShortcutKbd
                  actionId={DELETE_ROW_DIALOG_SHORTCUTS.confirmDeleteRows.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
