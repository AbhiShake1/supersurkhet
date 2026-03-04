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
        productUnit: 'bag:8',
        selectedUnit: 'bag:8',
      }),
    ).toBe(1200);
  });

  it('returns per-piece price when selected unit is piece', () => {
    expect(
      deriveUnitPrice({
        basePrice: 1200,
        productUnit: 'bag:8',
        selectedUnit: 'piece',
      }),
    ).toBe(150);
  });

  it('falls back to packed-unit price when selected unit is not provided', () => {
    expect(
      deriveUnitPrice({
        basePrice: 1200,
        productUnit: 'bag:8',
      }),
    ).toBe(1200);
  });

  it('supports legacy cartoon packed units for backwards compatibility', () => {
    expect(
      deriveUnitPrice({
        basePrice: 900,
        productUnit: 'cartoon:9',
        selectedUnit: 'piece',
      }),
    ).toBe(100);
  });
});
