import type { ParsedField } from '@autoform/core';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { AutoFormField } from '../react/AutoFormField';
import { BillLineItemsTable } from './BillLineItemsTable';
import { BillTotalsBar } from './BillTotalsBar';
import type {
  BillLayoutProps,
  NormalizedBillArraySection,
  NormalizedBillColumn,
} from './bill-types';
import {
  formatBillNumber,
  normalizeBillConfig,
  resolveBillSchemaFields,
} from './bill-utils';

const DEFAULT_ARRAY_COLUMN_WIDTH = 'minmax(120px, 1fr)';

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

function toTitleCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

function resolveFieldsByKeys(
  keys: string[],
  fieldMap: Map<string, ParsedField>,
) {
  const seen = new Set<string>();
  return keys
    .map((key) => fieldMap.get(key))
    .filter((field): field is ParsedField => {
      if (!field) return false;
      if (seen.has(field.key)) return false;
      seen.add(field.key);
      return true;
    });
}

function resolveArraySectionColumns({
  section,
  rowObjectField,
}: {
  section: NormalizedBillArraySection;
  rowObjectField: ParsedField;
}): NormalizedBillColumn[] {
  const rowFieldMap = new Map(
    (rowObjectField.schema ?? []).map((field) => [field.key, field]),
  );

  if (section.columns.length > 0) {
    return section.columns.filter((column) => rowFieldMap.has(column.key));
  }

  return (rowObjectField.schema ?? [])
    .filter((field) => !field.fieldConfig?.inputProps?.hidden)
    .map((field) => ({
      key: field.key,
      label: field.description ?? toTitleCase(field.key),
      width: DEFAULT_ARRAY_COLUMN_WIDTH,
      align: field.type === 'number' ? 'right' : 'left',
      readOnly: Boolean(
        field.fieldConfig?.inputProps?.readOnly ||
          field.fieldConfig?.inputProps?.disabled,
      ),
    }));
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return formatBillNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `${value.length} items`;
  return String(value);
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
  const values = useWatch({ control: form.control });
  const valuesRecord = (values ?? {}) as Record<string, unknown>;
  const renderCtx = {
    values: valuesRecord,
    form,
  };
  const normalized = normalizeBillConfig(billConfig);
  const resolvedSchema = resolveBillSchemaFields(
    parsedSchema,
    normalized.lineItemsField,
  );
  const topLevelNonLineItemFields = parsedSchema.fields.filter(
    (field) => field.key !== normalized.lineItemsField,
  );
  const fieldsByKey = new Map(
    topLevelNonLineItemFields.map((field) => [field.key, field]),
  );
  const headerFields = resolveFieldsByKeys(
    normalized.headerFields,
    fieldsByKey,
  );
  const footerFields = resolveFieldsByKeys(
    normalized.footerFields,
    fieldsByKey,
  );

  const headerFieldSet = new Set(headerFields.map((field) => field.key));
  const footerFieldSet = new Set(footerFields.map((field) => field.key));
  const hiddenFieldSet = new Set(normalized.hiddenFields);

  const resolvedArraySections = normalized.arraySections
    .map((section) => {
      const arrayField = fieldsByKey.get(section.field);
      if (!arrayField || arrayField.type !== 'array') return null;
      const rowObjectField = arrayField.schema?.[0];
      if (!rowObjectField || rowObjectField.type !== 'object') return null;

      const columns = resolveArraySectionColumns({ section, rowObjectField });
      if (columns.length === 0) return null;

      return {
        ...section,
        title:
          section.title ?? arrayField.description ?? toTitleCase(section.field),
        columns,
        rowObjectField,
      };
    })
    .filter(
      (
        section,
      ): section is NormalizedBillArraySection & {
        title?: string;
        rowObjectField: ParsedField;
      } => Boolean(section),
    );

  const arraySectionFieldSet = new Set(
    resolvedArraySections.map((section) => section.field),
  );
  const blockedDetailFieldSet = new Set([
    ...headerFieldSet,
    ...footerFieldSet,
    ...hiddenFieldSet,
    ...arraySectionFieldSet,
  ]);
  const detailFields =
    normalized.detailFields.length > 0
      ? resolveFieldsByKeys(normalized.detailFields, fieldsByKey).filter(
          (field) => !blockedDetailFieldSet.has(field.key),
        )
      : topLevelNonLineItemFields.filter(
          (field) => !blockedDetailFieldSet.has(field.key),
        );

  if (!resolvedSchema) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Bill mode config is invalid. `lineItemsField` must point to an array of
        objects in the schema.
      </div>
    );
  }

  return (
    <div className="min-w-0 h-full min-h-0 overflow-x-hidden">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="shrink-0 space-y-4">
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
        </div>

        <div className="min-h-0 flex-1">
          <BillLineItemsTable
            lineItemsField={normalized.lineItemsField}
            lineItemObjectField={resolvedSchema.lineItemObjectField}
            columns={normalized.columns}
            minRows={normalized.minRows}
            fillHeight
          />
        </div>

        <div className="shrink-0 space-y-4">
          <BillTotalsBar
            lineItemsField={normalized.lineItemsField}
            grandTotalField={normalized.grandTotalField}
            lineTotalField={normalized.lineTotalField}
            lineItemObjectField={resolvedSchema.lineItemObjectField}
            columns={normalized.columns}
          />

          {detailFields.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {detailFields.map((field) => (
                <div
                  key={`bill-detail-${field.key}`}
                  className={getDetailFieldSpanClass(field)}
                >
                  <AutoFormField field={field} path={[field.key]} />
                </div>
              ))}
            </div>
          )}

          {resolvedArraySections.map((section) => (
            <section
              key={`bill-array-section-${section.field}`}
              className="space-y-3 rounded-md border bg-muted/10 p-3"
            >
              {(section.title || section.summaryFields.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {section.title ? (
                    <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      {section.title}
                    </h3>
                  ) : (
                    <div />
                  )}
                  {section.summaryFields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {section.summaryFields.map((summaryField) => {
                        const summaryValue = valuesRecord[summaryField.key];
                        const content = summaryField.format
                          ? summaryField.format(summaryValue, renderCtx)
                          : formatSummaryValue(summaryValue);
                        return (
                          <span
                            key={`bill-array-summary-${section.field}-${summaryField.key}`}
                            className="text-muted-foreground"
                          >
                            {summaryField.label}:{' '}
                            <span className="font-medium text-foreground">
                              {content}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <BillLineItemsTable
                lineItemsField={section.field}
                lineItemObjectField={section.rowObjectField}
                columns={section.columns}
                minRows={section.minRows}
              />
            </section>
          ))}

          {footerFields.length > 0 && (
            <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/5 p-3 md:grid-cols-2">
              {footerFields.map((field) => (
                <div
                  key={`bill-footer-field-${field.key}`}
                  className={getDetailFieldSpanClass(field)}
                >
                  <AutoFormField field={field} path={[field.key]} />
                </div>
              ))}
            </div>
          )}

          {normalized.footer?.(renderCtx)}

          {withSubmit ? submitButton : null}
          {children}
        </div>
      </div>
    </div>
  );
}
