import { describe, expect, it } from 'vitest';
import { getItemsTotalForPaymentStatus, getPaymentStatusFromTotals } from './payment-status-derivation';

describe('payment status derivation', () => {
  it('uses quantity x unitPrice when available', () => {
    expect(
      getItemsTotalForPaymentStatus([
        { quantity: 2, unitPrice: 100, totalAmount: 350 },
        { quantity: 1, unitPrice: 50 },
      ]),
    ).toBe(250);
  });

  it('falls back to quantity * unitPrice when totalAmount is missing', () => {
    expect(
      getItemsTotalForPaymentStatus([
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ]),
    ).toBe(250);
  });

  it('respects explicit totalAmount even when it is zero', () => {
    expect(
      getItemsTotalForPaymentStatus([
        { totalAmount: 0 },
        { quantity: 1, unitPrice: 50 },
      ]),
    ).toBe(50);
  });

  it('falls back to explicit totalAmount when quantity/unitPrice are missing', () => {
    expect(
      getItemsTotalForPaymentStatus([
        { totalAmount: 120 },
        { quantity: 1, unitPrice: 50 },
      ]),
    ).toBe(170);
  });

  it('returns paid when paid amount equals total', () => {
    expect(getPaymentStatusFromTotals({ paidAmount: 250, totalAmount: 250 })).toBe('paid');
  });

  it('returns pending when paid amount is zero', () => {
    expect(getPaymentStatusFromTotals({ paidAmount: 0, totalAmount: 250 })).toBe('pending');
  });
});
