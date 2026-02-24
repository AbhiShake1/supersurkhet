import { Save } from 'lucide-react';
import * as React from 'react';
import type { ZodObject } from 'zod';
import { AutoForm } from '@/components/ui/autoform';
import { SubmitButton } from '@/components/ui/autoform/components/SubmitButton';
import { Button } from '@/components/ui/button';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const EDIT_ROW_DIALOG_SHORTCUTS = {
  cancelEditRow: {
    id: 'autoTable.cancelEditRow',
    label: 'Cancel edit row',
    description: 'Close the edit row dialog without saving changes.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
} as const;

interface EditRowDialogProps<T, S> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: T | null;
  schema: S;
  onSubmit: (data: T) => void;
  showTrigger?: boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function EditRowDialog<T, S extends ZodObject<any>>({
  open,
  onOpenChange,
  data,
  schema,
  onSubmit,
  showTrigger: _showTrigger = false,
}: EditRowDialogProps<T, S>) {
  const isShortcutInScope = React.useCallback((event: KeyboardEvent) => {
    const target = event.target as Node | null;
    const active = document.activeElement as Node | null;
    const dialogContent = document.querySelector(
      '[data-auto-table-edit-dialog-content="true"]',
    );
    if (!dialogContent) return false;
    if (target && dialogContent.contains(target)) return true;
    if (active && dialogContent.contains(active)) return true;
    return false;
  }, []);

  useShortcutAction(
    EDIT_ROW_DIALOG_SHORTCUTS.cancelEditRow,
    () => {
      onOpenChange(false);
    },
    {
      enabled: open,
      guard: isShortcutInScope,
    },
  );

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent data-auto-table-edit-dialog-content="true">
        <CredenzaHeader>
          <CredenzaTitle>Edit</CredenzaTitle>
          <CredenzaDescription>Edit details</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody asChild>
          <ScrollArea className="h-[50vh] max-h-[60vh]">
            <AutoForm
              formProps={{ id: 'edit-row-form' }}
              schema={schema}
              defaultValues={data || {}}
              onSubmit={(values, _form) => {
                onSubmit(values as T);
                onOpenChange(false);
              }}
            />
          </ScrollArea>
        </CredenzaBody>
        <CredenzaFooter className="flex flex-col gap-2 pt-2 pb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Cancel edit</span>
              <ShortcutKbd
                actionId={EDIT_ROW_DIALOG_SHORTCUTS.cancelEditRow.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
          <SubmitButton form="edit-row-form" className="gap-2 w-full">
            <Save className="size-4" />
            Save
          </SubmitButton>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
