import { describe, expect, it } from 'vitest';
import { deriveUnitPrice } from './unit-price-derivation';

describe('deriveUnitPrice', () => {
  it('returns base price when product unit has no piece conversion', () => {
    expect(
      deriveUnitPrice({
        basePrice: 120,
        productUnit: 'kg',
        selectedUnit: 'kg',
      }),
    ).toBe(120);
  });

  it('returns base price when selected unit is the configured packed unit', () => {
    expect(
      deriveUnitPrice({
        basePrice: 1200,
        productUnit: 'cartoon:12',
        selectedUnit: 'cartoon:12',
      }),
    ).toBe(1200);
  });

  it('returns per-piece price when selected unit is piece', () => {
    expect(
      deriveUnitPrice({
        basePrice: 1200,
        productUnit: 'cartoon:12',
        selectedUnit: 'piece',
      }),
    ).toBe(100);
  });

  it('falls back to packed-unit price when selected unit is not provided', () => {
    expect(
      deriveUnitPrice({
        basePrice: 1200,
        productUnit: 'cartoon:12',
      }),
    ).toBe(1200);
  });
});
