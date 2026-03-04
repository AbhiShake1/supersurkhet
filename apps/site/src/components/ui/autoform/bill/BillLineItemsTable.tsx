import type { ParsedField } from '@autoform/core';
import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldWrapperWithoutLabel } from '../components/FieldWrapper';
import { AutoFormField } from '../react/AutoFormField';
import type { NormalizedBillColumn } from './bill-types';
import { getColumnTextAlignClass, getLineItemFieldByKey } from './bill-utils';

const AUTO_SEED_ROW_COUNT = 5;

type LineItemColumn = {
  column: NormalizedBillColumn;
  field: ParsedField;
};

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(
      hasMeaningfulValue,
    );
  }
  return true;
}

function getFocusableElement(cell: HTMLElement | null): HTMLElement | null {
  if (!cell) return null;
  return cell.querySelector<HTMLElement>(
    'input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])',
  );
}

export function BillLineItemsTable({
  lineItemsField,
  lineItemObjectField,
  columns,
  minRows,
  fillHeight = false,
}: {
  lineItemsField: string;
  lineItemObjectField: ParsedField;
  columns: NormalizedBillColumn[];
  minRows: number;
  fillHeight?: boolean;
}) {
  const { control } = useFormContext();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const hasSeededRowsRef = useRef(false);
  const { fields, append, remove } = useFieldArray({
    control,
    name: lineItemsField,
  });
  const watchedLineItems = useWatch({
    control,
    name: lineItemsField,
  });

  const resolvedColumns = useMemo<LineItemColumn[]>(() => {
    return columns
      .map((column) => {
        const field = getLineItemFieldByKey(lineItemObjectField, column.key);
        return field ? { column, field } : null;
      })
      .filter((entry): entry is LineItemColumn => Boolean(entry));
  }, [columns, lineItemObjectField]);

  const editableColumns = useMemo(() => {
    return resolvedColumns.flatMap((entry, index) => {
      if (entry.column.readOnly) return [];
      const inputProps = entry.field.fieldConfig?.inputProps;
      const isReadOnly = Boolean(inputProps?.readOnly || inputProps?.disabled);
      const isHidden = Boolean(inputProps?.hidden);
      return !isReadOnly && !isHidden ? [{ key: entry.field.key, index }] : [];
    });
  }, [resolvedColumns]);
  const editableColumnIndexes = useMemo(
    () => editableColumns.map((column) => column.index),
    [editableColumns],
  );
  const editableColumnKeys = useMemo(
    () => editableColumns.map((column) => column.key),
    [editableColumns],
  );

  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    const cell = tableRef.current?.querySelector<HTMLElement>(
      `[data-bill-cell="${rowIndex}:${columnIndex}"]`,
    );
    const focusable = getFocusableElement(cell ?? null);
    focusable?.focus();
  }, []);

  useEffect(() => {
    if (hasSeededRowsRef.current) return;
    const initialRows = Math.max(minRows, AUTO_SEED_ROW_COUNT);
    const missingRows = initialRows - fields.length;
    if (missingRows <= 0) {
      hasSeededRowsRef.current = true;
      return;
    }
    append(Array.from({ length: missingRows }, () => ({})));
    hasSeededRowsRef.current = true;
  }, [append, fields.length, minRows]);

  useEffect(() => {
    if (!Array.isArray(watchedLineItems) || watchedLineItems.length === 0)
      return;
    const targetEmptyRows = Math.max(minRows, AUTO_SEED_ROW_COUNT);
    const emptyRows = watchedLineItems.reduce((count, row) => {
      if (!row || typeof row !== 'object') return count + 1;
      const record = row as Record<string, unknown>;
      const hasValue = editableColumnKeys.some((key) =>
        hasMeaningfulValue(record[key]),
      );
      return hasValue ? count : count + 1;
    }, 0);
    const missingEmptyRows = targetEmptyRows - emptyRows;
    if (missingEmptyRows <= 0) return;
    append(Array.from({ length: missingEmptyRows }, () => ({})));
  }, [append, editableColumnKeys, minRows, watchedLineItems]);

  const appendRow = useCallback(() => {
    append({});
  }, [append]);

  const onCellKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLElement>,
      rowIndex: number,
      columnIndex: number,
    ) => {
      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }
      const lastEditableColumn =
        editableColumnIndexes[editableColumnIndexes.length - 1];
      const firstEditableColumn = editableColumnIndexes[0];
      const isLastRow = rowIndex === fields.length - 1;
      const isLastEditableCell = columnIndex === lastEditableColumn;
      if (
        !isLastRow ||
        !isLastEditableCell ||
        firstEditableColumn === undefined
      )
        return;

      event.preventDefault();
      appendRow();
      requestAnimationFrame(() => {
        focusCell(rowIndex + 1, firstEditableColumn);
      });
    },
    [appendRow, editableColumnIndexes, fields.length, focusCell],
  );

  const onRemoveRow = useCallback(
    (rowIndex: number) => {
      const nextRowIndex =
        rowIndex < fields.length - 1 ? rowIndex : rowIndex - 1;
      const firstEditableColumn = editableColumnIndexes[0] ?? 0;
      remove(rowIndex);
      requestAnimationFrame(() => {
        if (nextRowIndex < 0) return;
        focusCell(nextRowIndex, firstEditableColumn);
      });
    },
    [editableColumnIndexes, fields.length, focusCell, remove],
  );

  if (resolvedColumns.length === 0) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Bill mode is enabled, but no valid columns were found for the configured
        line item object.
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', fillHeight && 'h-full min-h-0')}>
      <div
        className={cn(
          'min-w-0 overflow-auto rounded-md border',
          fillHeight ? 'h-full min-h-[240px]' : 'max-h-[60vh]',
        )}
        data-testid="af-bill-table"
      >
        <table
          className="min-w-full w-max border-separate border-spacing-0"
          ref={tableRef}
        >
          <colgroup>
            {resolvedColumns.map((entry) => (
              <col
                key={entry.column.key}
                style={{ width: entry.column.width }}
              />
            ))}
            <col style={{ width: '72px' }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            <tr>
              {resolvedColumns.map((entry, index) => (
                <th
                  key={entry.column.key}
                  className={`px-3 py-2 text-xs font-semibold tracking-wide uppercase border-b border-border ${index < resolvedColumns.length - 1 ? 'border-r' : ''} ${getColumnTextAlignClass(entry.column.align)}`}
                >
                  {entry.column.label}
                </th>
              ))}
              <th className="border-b border-border px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Row
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((item, rowIndex) => (
              <tr
                key={item.id}
                className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                data-testid={`af-bill-row-${rowIndex}`}
              >
                {resolvedColumns.map((entry, columnIndex) => {
                  const effectiveField: ParsedField = entry.column.readOnly
                    ? {
                        ...entry.field,
                        fieldConfig: {
                          ...entry.field.fieldConfig,
                          fieldWrapper: FieldWrapperWithoutLabel,
                          inputProps: {
                            ...entry.field.fieldConfig?.inputProps,
                            className: cn(
                              entry.field.fieldConfig?.inputProps?.className,
                              'border-none',
                            ),
                            readOnly: true,
                            disabled: true,
                          },
                        },
                      }
                    : {
                        ...entry.field,
                        fieldConfig: {
                          ...entry.field.fieldConfig,
                          fieldWrapper: FieldWrapperWithoutLabel,
                          inputProps: {
                            ...entry.field.fieldConfig?.inputProps,
                            className: cn(
                              entry.field.fieldConfig?.inputProps?.className,
                              'border-none',
                            ),
                          },
                        },
                      };

                  return (
                    <td
                      key={`${item.id}-${entry.column.key}`}
                      className={`px-2 py-1 align-top border-b border-border ${columnIndex < resolvedColumns.length - 1 ? 'border-r' : ''} ${getColumnTextAlignClass(entry.column.align)}`}
                    >
                      <div
                        data-bill-cell={`${rowIndex}:${columnIndex}`}
                        onKeyDownCapture={(event) =>
                          onCellKeyDown(event, rowIndex, columnIndex)
                        }
                      >
                        <AutoFormField
                          field={effectiveField}
                          path={[
                            lineItemsField,
                            String(rowIndex),
                            entry.field.key,
                          ]}
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="border-b border-border px-2 py-1 align-top text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemoveRow(rowIndex)}
                    disabled={fields.length <= minRows}
                    aria-label={`Remove row ${rowIndex + 1}`}
                    title="Remove row"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
