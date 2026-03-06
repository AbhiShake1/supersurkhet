import * as React from 'react';
import { Save } from 'lucide-react';
import {
  omitOptionalFieldsFromSchema,
  reorderSchemaFields,
} from '@/components/auto-table/form-schema-visibility';
import { AutoForm } from '@/components/ui/autoform';
import type { ZodObjectOrWrapped } from '@/components/ui/autoform/zod';
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
import { cn } from '@/lib/utils';
import { getSchemaBillConfig } from '@/lib/zod/with-bill';

interface EditRowDialogProps<T, S> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: T | null;
  schema: S;
  hiddenOptionalFieldKeys?: string[];
  orderedFieldKeys?: string[];
  onSubmit: (data: T) => void;
  showTrigger?: boolean;
}

export function EditRowDialog<T, S extends ZodObjectOrWrapped>({
  open,
  onOpenChange,
  data,
  schema,
  hiddenOptionalFieldKeys = [],
  orderedFieldKeys = [],
  onSubmit,
  showTrigger: _showTrigger = false,
}: EditRowDialogProps<T, S>) {
  const formSchema = React.useMemo(() => {
    const schemaWithoutHiddenOptionalFields = omitOptionalFieldsFromSchema(
      schema,
      hiddenOptionalFieldKeys,
    );
    return reorderSchemaFields(schemaWithoutHiddenOptionalFields, orderedFieldKeys);
  }, [schema, hiddenOptionalFieldKeys, orderedFieldKeys]);
  const isBillSchema = Boolean(getSchemaBillConfig(schema as never));

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent
        className="flex h-[90vh] max-h-[90vh] flex-col"
        dialogMaxWidth="min(1320px, 94vw)"
      >
        <CredenzaHeader className="min-w-0">
          <CredenzaTitle>Edit</CredenzaTitle>
          <CredenzaDescription>Edit details</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody asChild>
          <div
            className={cn(
              'h-full min-h-0 w-full pr-1',
              isBillSchema ? 'overflow-hidden' : 'overflow-y-auto',
            )}
          >
            <AutoForm
              formProps={{
                id: 'edit-row-form',
                className: isBillSchema ? 'h-full min-h-0' : undefined,
              }}
              schema={formSchema}
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
