import type { ParsedField } from '@autoform/core';
import { Plus, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FieldWrapperWithoutLabel } from '../components/FieldWrapper';
import { AutoFormField } from '../react/AutoFormField';
import type { NormalizedBillColumn } from './bill-types';
import { getColumnTextAlignClass, getLineItemFieldByKey } from './bill-utils';

type LineItemColumn = {
  column: NormalizedBillColumn;
  field: ParsedField;
};

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
}: {
  lineItemsField: string;
  lineItemObjectField: ParsedField;
  columns: NormalizedBillColumn[];
  minRows: number;
}) {
  const { control } = useFormContext();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const { fields, append, remove } = useFieldArray({
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

  const editableColumnIndexes = useMemo(() => {
    return resolvedColumns
      .map((entry, index) => {
        if (entry.column.readOnly) return null;
        const inputProps = entry.field.fieldConfig?.inputProps;
        const isReadOnly = Boolean(
          inputProps?.readOnly || inputProps?.disabled,
        );
        const isHidden = Boolean(inputProps?.hidden);
        return !isReadOnly && !isHidden ? index : null;
      })
      .filter((index): index is number => index !== null);
  }, [resolvedColumns]);

  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    const cell = tableRef.current?.querySelector<HTMLElement>(
      `[data-bill-cell="${rowIndex}:${columnIndex}"]`,
    );
    const focusable = getFocusableElement(cell ?? null);
    focusable?.focus();
  }, []);

  useEffect(() => {
    const missingRows = minRows - fields.length;
    if (missingRows <= 0) return;
    for (let index = 0; index < missingRows; index += 1) {
      append({});
    }
  }, [append, fields.length, minRows]);

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
    <div className="space-y-3">
      <div
        className="min-w-0 overflow-x-auto rounded-md border"
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
          <thead>
            <tr className="bg-muted/50">
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

      <div className="flex justify-end">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={appendRow}
                data-testid={`af-add-${lineItemsField}`}
                aria-label="Add row"
                title="Add row"
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Add Row</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
