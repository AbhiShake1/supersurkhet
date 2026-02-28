import { type UseFormReturn, useWatch } from 'react-hook-form';
import { AutoFormField } from '../react/AutoFormField';
import { BillLineItemsTable } from './BillLineItemsTable';
import { BillTotalsBar } from './BillTotalsBar';
import type { BillLayoutProps } from './bill-types';
import { normalizeBillConfig, resolveBillSchemaFields } from './bill-utils';

export function BillFormLayout({
  parsedSchema,
  billConfig,
  withSubmit,
  children,
  submitButton,
  form,
}: BillLayoutProps & {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  form: UseFormReturn<any>;
}) {
  const normalized = normalizeBillConfig(billConfig);
  const resolvedSchema = resolveBillSchemaFields(
    parsedSchema,
    normalized.lineItemsField,
  );
  const values = useWatch({ control: form.control });
  const renderCtx = {
    values: (values ?? {}) as Record<string, unknown>,
    form,
  };

  if (!resolvedSchema) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Bill mode config is invalid. `lineItemsField` must point to an array of
        objects in the schema.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {normalized.headerFields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {parsedSchema.fields
            .filter(
              (field) =>
                normalized.headerFields.includes(field.key) &&
                field.key !== normalized.lineItemsField,
            )
            .map((field) => (
              <AutoFormField
                key={`bill-header-${field.key}`}
                field={field}
                path={[field.key]}
              />
            ))}
        </div>
      )}

      {normalized.header?.(renderCtx)}

      <BillLineItemsTable
        lineItemsField={normalized.lineItemsField}
        lineItemObjectField={resolvedSchema.lineItemObjectField}
        columns={normalized.columns}
        minRows={normalized.minRows}
      />

      <BillTotalsBar
        lineItemsField={normalized.lineItemsField}
        grandTotalField={normalized.grandTotalField}
        lineTotalField={normalized.lineTotalField}
        lineItemObjectField={resolvedSchema.lineItemObjectField}
        columns={normalized.columns}
      />

      {normalized.footer?.(renderCtx)}

      {withSubmit ? submitButton : null}
      {children}
    </div>
  );
}
