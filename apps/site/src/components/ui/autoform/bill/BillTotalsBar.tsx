import type { ParsedField } from '@autoform/core';
import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { NormalizedBillColumn } from './bill-types';
import {
  formatBillNumber,
  getNumericLineTotal,
  inferLineTotalField,
  resolveGrandTotal,
} from './bill-utils';

export function BillTotalsBar({
  lineItemsField,
  grandTotalField,
  lineTotalField,
  lineItemObjectField,
  columns,
}: {
  lineItemsField: string;
  grandTotalField?: string;
  lineTotalField?: string;
  lineItemObjectField: ParsedField;
  columns: NormalizedBillColumn[];
}) {
  const watchedLineItems = useWatch({ name: lineItemsField });
  const watchedGrandTotal = useWatch({ name: grandTotalField });

  const computedTotal = useMemo(() => {
    const effectiveLineTotalField =
      lineTotalField ?? inferLineTotalField(lineItemObjectField, columns);
    const lineTotal = getNumericLineTotal(
      watchedLineItems,
      effectiveLineTotalField,
    );
    return resolveGrandTotal({
      lineTotal,
      grandTotal: watchedGrandTotal,
      hasGrandTotalField: Boolean(grandTotalField),
    });
  }, [
    columns,
    grandTotalField,
    lineItemObjectField,
    lineTotalField,
    watchedGrandTotal,
    watchedLineItems,
  ]);

  return (
    <div className="border bg-background px-4 py-3 shadow-sm">
      <div
        className="flex items-center justify-end gap-2"
        data-testid="af-bill-total"
      >
        <span className="text-sm text-muted-foreground">Grand Total</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatBillNumber(computedTotal)}
        </span>
      </div>
    </div>
  );
}
