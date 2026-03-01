import type { ParsedField, ParsedSchema } from '@autoform/core';
import type {
  NormalizedBillArraySection,
  NormalizedBillColumn,
  ResolvedBillSchema,
  RuntimeBillConfig,
} from './bill-types';

const DEFAULT_COLUMN_WIDTH = 'minmax(120px, 1fr)';
const DEFAULT_ARRAY_SECTION_MIN_ROWS = 0;

function normalizeColumns(
  columns: RuntimeBillConfig['columns'] | undefined,
): NormalizedBillColumn[] {
  return (columns ?? []).map((column) => ({
    key: String(column.key),
    label: column.label?.trim() || toTitleCase(String(column.key)),
    width: column.width?.trim() || DEFAULT_COLUMN_WIDTH,
    align: column.align ?? 'left',
    readOnly: Boolean(column.readOnly),
  }));
}

function normalizeArraySectionMinRows(value: unknown): number {
  const numeric = Number(value ?? DEFAULT_ARRAY_SECTION_MIN_ROWS);
  if (!Number.isFinite(numeric)) return DEFAULT_ARRAY_SECTION_MIN_ROWS;
  return Math.max(0, Math.floor(numeric));
}

export function normalizeBillConfig(config: RuntimeBillConfig): {
  lineItemsField: string;
  minRows: number;
  columns: NormalizedBillColumn[];
  headerFields: string[];
  detailFields: string[];
  footerFields: string[];
  hiddenFields: string[];
  arraySections: NormalizedBillArraySection[];
  lineTotalField?: string;
  grandTotalField?: string;
  header?: RuntimeBillConfig['header'];
  footer?: RuntimeBillConfig['footer'];
} {
  const minRowsRaw = Number(config.minRows ?? 1);
  const minRows = Number.isFinite(minRowsRaw)
    ? Math.max(1, Math.floor(minRowsRaw))
    : 1;

  const columns = normalizeColumns(config.columns);
  const arraySections: NormalizedBillArraySection[] = (
    config.arraySections ?? []
  ).map((section) => ({
    field: String(section.field),
    title: section.title?.trim() || undefined,
    columns: normalizeColumns(section.columns),
    minRows: normalizeArraySectionMinRows(section.minRows),
    summaryFields: (section.summaryFields ?? []).map((entry) => {
      if (typeof entry === 'string') {
        return {
          key: entry,
          label: toTitleCase(entry),
        };
      }
      return {
        key: String(entry.key),
        label: entry.label?.trim() || toTitleCase(String(entry.key)),
        format: entry.format,
      };
    }),
  }));

  return {
    lineItemsField: String(config.lineItemsField),
    minRows,
    columns,
    headerFields: (config.headerFields ?? []).map((field) => String(field)),
    detailFields: (config.detailFields ?? []).map((field) => String(field)),
    footerFields: (config.footerFields ?? []).map((field) => String(field)),
    hiddenFields: (config.hiddenFields ?? []).map((field) => String(field)),
    arraySections,
    lineTotalField: config.lineTotalField
      ? String(config.lineTotalField)
      : undefined,
    grandTotalField: config.grandTotalField
      ? String(config.grandTotalField)
      : undefined,
    header: config.header,
    footer: config.footer,
  };
}

export function resolveBillSchemaFields(
  parsedSchema: ParsedSchema,
  lineItemsField: string,
): ResolvedBillSchema | null {
  const arrayField = parsedSchema.fields.find(
    (field) => field.key === lineItemsField,
  );
  if (!arrayField || arrayField.type !== 'array') return null;

  const lineItemObjectField = arrayField.schema?.[0];
  if (!lineItemObjectField || lineItemObjectField.type !== 'object')
    return null;

  return { arrayField, lineItemObjectField };
}

export function getLineItemFieldByKey(
  lineItemObjectField: ParsedField,
  key: string,
): ParsedField | undefined {
  return lineItemObjectField.schema?.find((field) => field.key === key);
}

export function getColumnTextAlignClass(align: NormalizedBillColumn['align']) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export function getNumericLineTotal(
  lineItems: unknown,
  lineTotalField: string | undefined,
): number {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return 0;
  if (!lineTotalField) return 0;

  return lineItems.reduce((sum, row) => {
    if (!row || typeof row !== 'object') return sum;
    const value = toSafeNumber(
      (row as Record<string, unknown>)[lineTotalField],
    );
    return sum + value;
  }, 0);
}

export function inferLineTotalField(
  lineItemObjectField: ParsedField,
  fallbackColumns: NormalizedBillColumn[],
): string | undefined {
  const keys = new Set(
    (lineItemObjectField.schema ?? []).map((field) => field.key),
  );
  if (keys.has('totalAmount')) return 'totalAmount';
  if (keys.has('total')) return 'total';
  const last = fallbackColumns[fallbackColumns.length - 1];
  return last?.key;
}

export function toSafeNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatBillNumber(value: unknown): string {
  const numeric = toSafeNumber(value);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function resolveGrandTotal({
  lineTotal,
  grandTotal,
  hasGrandTotalField,
}: {
  lineTotal: number;
  grandTotal: unknown;
  hasGrandTotalField: boolean;
}): number {
  if (!hasGrandTotalField) return lineTotal;

  const explicitGrandTotal = toSafeNumber(grandTotal);
  if (explicitGrandTotal === 0 && lineTotal !== 0) {
    return lineTotal;
  }
  return explicitGrandTotal;
}

function toTitleCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}
