import { Save } from 'lucide-react';
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
  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent
        className="flex flex-col"
        dialogMaxWidth="min(1320px, 94vw)"
      >
        <CredenzaHeader className="min-w-0">
          <CredenzaTitle>Edit</CredenzaTitle>
          <CredenzaDescription>Edit details</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody asChild>
          <div className="min-h-0 w-full max-h-[72dvh] overflow-auto pr-1">
            <AutoForm
              formProps={{ id: 'edit-row-form' }}
              schema={schema}
              defaultValues={data || {}}
              onSubmit={(values, _form) => {
                onSubmit(values as T);
                onOpenChange(false);
              }}
            />
          </div>
        </CredenzaBody>
        <CredenzaFooter className="flex flex-col gap-2 pt-2 pb-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <SubmitButton form="edit-row-form" className="gap-2 w-full">
            <Save className="size-4" />
            Save
          </SubmitButton>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
