import { describe, expect, it } from 'vitest';
import { lineTotal, toFiniteNumber } from './business-analytics-number-utils';

describe('business analytics numeric parsing', () => {
  it('parses valid number-like values', () => {
    expect(toFiniteNumber(123.45)).toBe(123.45);
    expect(toFiniteNumber(' 1,234.50 ')).toBe(1234.5);
    expect(toFiniteNumber('42')).toBe(42);
  });

  it('returns 0 for faulty values', () => {
    expect(toFiniteNumber(NaN)).toBe(0);
    expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toFiniteNumber('abc')).toBe(0);
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber(null)).toBe(0);
  });

  it('ignores faulty line values in totals', () => {
    const rows = [
      { quantity: 2, unitPrice: 100 },
      { quantity: '3', unitPrice: 'bad' },
      { quantity: 'oops', unitPrice: 10 },
    ];

    const total = rows.reduce(
      (sum, row) => sum + lineTotal(row.quantity, row.unitPrice),
      0,
    );

    expect(total).toBe(200);
  });
});
