import { describe, expect, it } from 'vitest';
import type { DeriveFn } from '../ui/autoform';
import { applyDerivedValuesToRow } from './derive-row';

describe('applyDerivedValuesToRow', () => {
  it('applies sync derived value to row data', () => {
    const deriveFns = new Map<string, DeriveFn>([
      [
        'isLegal',
        ({ formValues }) => ({
          value: Number(formValues.age ?? 0) >= 18,
        }),
      ],
    ]);

    const next = applyDerivedValuesToRow({ age: 20 }, deriveFns);

    expect(next).toEqual({
      age: 20,
      isLegal: true,
    });
  });

  it('ignores derive functions that do not return value', () => {
    const deriveFns = new Map<string, DeriveFn>([
      [
        'status',
        () => ({
          inputProps: {
            disabled: true,
          },
        }),
      ],
    ]);

    const next = applyDerivedValuesToRow({ age: 20 }, deriveFns);

    expect(next).toEqual({
      age: 20,
    });
  });

  it('uses derived inputProps.value and overrides stale persisted values', () => {
    const deriveFns = new Map<string, DeriveFn>([
      [
        'paymentStatus',
        ({ formValues }) => ({
          inputProps: {
            disabled: true,
            value:
              Number(formValues.paidAmount ?? 0) ===
              Number(formValues.totalAmount ?? 0)
                ? 'paid'
                : 'pending',
          },
        }),
      ],
    ]);

    const next = applyDerivedValuesToRow(
      {
        paidAmount: 100,
        totalAmount: 100,
        paymentStatus: 'pending',
      },
      deriveFns,
    );

    expect(next).toEqual({
      paidAmount: 100,
      totalAmount: 100,
      paymentStatus: 'paid',
    });
  });

  it('skips async derive functions for table recomputation', () => {
    const deriveFns = new Map<string, DeriveFn>([
      [
        'status',
        async () => ({
          value: 'adult',
        }),
      ],
    ]);

    const next = applyDerivedValuesToRow({ age: 20 }, deriveFns);

    expect(next).toEqual({
      age: 20,
    });
  });
});
