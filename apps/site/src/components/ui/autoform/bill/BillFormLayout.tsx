import type { ParsedField } from '@autoform/core';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { AutoFormField } from '../react/AutoFormField';
import { BillLineItemsTable } from './BillLineItemsTable';
import { BillTotalsBar } from './BillTotalsBar';
import type { BillLayoutProps, NormalizedBillColumn } from './bill-types';
import {
  formatBillNumber,
  normalizeBillConfig,
  resolveBillSchemaFields,
} from './bill-utils';

function getDetailFieldSpanClass(field: ParsedField): string {
  if (
    field.type === 'array' ||
    field.type === 'object' ||
    field.type === 'record' ||
    field.type === 'richText' ||
    field.type === 'editor' ||
    field.type === 'map' ||
    field.type === 'permissions'
  ) {
    return 'md:col-span-2';
  }
  return '';
}

const BILL_HIDDEN_DETAIL_FIELDS = new Set([
  'totalAmount',
  'paidAmount',
  'paymentStatus',
]);

function isPaymentsArrayField(field: ParsedField): boolean {
  const row = field.schema?.[0];
  return (
    field.key === 'payments' && field.type === 'array' && row?.type === 'object'
  );
}

function getPaymentColumns(
  rowObjectField: ParsedField,
): NormalizedBillColumn[] {
  return (rowObjectField.schema ?? [])
    .filter((field) => !field.fieldConfig?.inputProps?.hidden)
    .map((field) => ({
      key: field.key,
      label: field.description ?? field.key,
      width:
        field.key === 'paidAmount'
          ? '1.25fr'
          : field.key === 'paymentMethod'
            ? '1.25fr'
            : '1.6fr',
      align: field.type === 'number' ? 'right' : 'left',
      readOnly: Boolean(
        field.fieldConfig?.inputProps?.readOnly ||
          field.fieldConfig?.inputProps?.disabled,
      ),
    }));
}

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
  const headerFieldKeys = new Set(normalized.headerFields);
  const topLevelNonLineItemFields = parsedSchema.fields.filter(
    (field) => field.key !== normalized.lineItemsField,
  );
  const visibleNonLineItemFields = topLevelNonLineItemFields.filter(
    (field) => !BILL_HIDDEN_DETAIL_FIELDS.has(field.key),
  );
  const headerFields = topLevelNonLineItemFields.filter((field) =>
    headerFieldKeys.has(field.key),
  );
  const detailFields = visibleNonLineItemFields.filter(
    (field) => !headerFieldKeys.has(field.key),
  );
  const paymentsField = detailFields.find(isPaymentsArrayField);
  const paymentRowObjectField =
    paymentsField?.type === 'array' ? paymentsField.schema?.[0] : undefined;
  const paymentColumns =
    paymentRowObjectField?.type === 'object'
      ? getPaymentColumns(paymentRowObjectField)
      : [];
  const notesField = detailFields.find(
    (field) => field.key === 'notes' && field.type !== 'array',
  );
  const miscDetailFields = detailFields.filter((field) => {
    if (field.key === notesField?.key) return false;
    if (field.key === paymentsField?.key) return false;
    if (paymentsField && field.key === 'paymentMethod') return false;
    return true;
  });
  const values = useWatch({ control: form.control });
  const valuesRecord = (values ?? {}) as Record<string, unknown>;
  const paidAmount = Number(valuesRecord.paidAmount ?? 0);
  const paymentStatus = String(valuesRecord.paymentStatus ?? 'pending');
  const renderCtx = {
    values: valuesRecord,
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
      {headerFields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {headerFields.map((field) => (
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

      {miscDetailFields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {miscDetailFields.map((field) => (
            <div
              key={`bill-detail-${field.key}`}
              className={getDetailFieldSpanClass(field)}
            >
              <AutoFormField field={field} path={[field.key]} />
            </div>
          ))}
        </div>
      )}

      {paymentsField && paymentRowObjectField?.type === 'object' && (
        <section className="space-y-3 rounded-md border bg-muted/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Payments
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                Status:{' '}
                <span className="font-medium text-foreground">
                  {paymentStatus}
                </span>
              </span>
              <span className="text-muted-foreground">
                Paid:{' '}
                <span className="font-semibold text-foreground">
                  {formatBillNumber(paidAmount)}
                </span>
              </span>
            </div>
          </div>

          <BillLineItemsTable
            lineItemsField={paymentsField.key}
            lineItemObjectField={paymentRowObjectField}
            columns={paymentColumns}
            minRows={0}
          />
        </section>
      )}

      {!paymentsField ? normalized.footer?.(renderCtx) : null}

      {notesField && (
        <section className="rounded-md border bg-muted/5 p-3">
          <AutoFormField field={notesField} path={[notesField.key]} />
        </section>
      )}

      {withSubmit ? submitButton : null}
      {children}
    </div>
  );
}
