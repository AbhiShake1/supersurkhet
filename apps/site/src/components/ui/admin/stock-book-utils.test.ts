import { describe, expect, it } from 'vitest';
import {
  buildStockBookCounterpartyLedgers,
  getStockBookCounterpartyMeta,
} from './stock-book-utils';

describe('getStockBookCounterpartyMeta', () => {
  it('returns purchase party group for purchase entries', () => {
    const result = getStockBookCounterpartyMeta(
      { transactionType: 'purchase' },
      {
        partyName: 'Acme Traders',
      },
    );

    expect(result).toEqual({
      name: 'Acme Traders',
      group: 'Purchase Party',
    });
  });

  it('returns sale party group for sale entries', () => {
    const result = getStockBookCounterpartyMeta(
      { transactionType: 'sale' },
      {
        customerName: 'Sunrise Mart',
      },
    );

    expect(result).toEqual({
      name: 'Sunrise Mart',
      group: 'Sale Party',
    });
  });

  it('falls back to unknown party when no counterparty is available', () => {
    const result = getStockBookCounterpartyMeta(
      { transactionType: 'stock' },
      {},
    );

    expect(result).toEqual({
      name: 'Unknown Party',
      group: undefined,
    });
  });
});

describe('buildStockBookCounterpartyLedgers', () => {
  it('groups purchase and sale rows by counterparty with debit/credit totals', () => {
    const ledgers = buildStockBookCounterpartyLedgers(
      [
        {
          counterpartyId: 'p1',
          transactionType: 'purchase',
          totalAmount: 1200,
          entryDate: '2026-02-01T00:00:00.000Z',
          sourceCode: 'PINV-001',
        },
        {
          counterpartyId: 'c1',
          transactionType: 'sale',
          totalAmount: 600,
          entryDate: '2026-02-02T00:00:00.000Z',
          sourceCode: 'INV-001',
        },
      ],
      new Map([['p1', { name: 'Abhishek' }]]),
      new Map([['c1', { name: 'Asmita' }]]),
    );

    expect(ledgers).toEqual([
      expect.objectContaining({
        id: 'p1',
        name: 'Abhishek',
        group: 'Purchase Party',
        totalDebit: 0,
        totalCredit: 1200,
        closingBalance: -1200,
        entries: [
          expect.objectContaining({
            date: '2026-02-01T00:00:00.000Z',
            sourceCode: 'PINV-001',
            totalAmount: 1200,
          }),
        ],
      }),
      expect.objectContaining({
        id: 'c1',
        name: 'Asmita',
        group: 'Sale Party',
        totalDebit: 600,
        totalCredit: 0,
        closingBalance: 600,
        entries: [
          expect.objectContaining({
            date: '2026-02-02T00:00:00.000Z',
            sourceCode: 'INV-001',
            totalAmount: 600,
          }),
        ],
      }),
    ]);
  });

  it('keeps unresolved counterparties as unknown party', () => {
    const ledgers = buildStockBookCounterpartyLedgers(
      [
        {
          counterpartyId: 'x-1',
          transactionType: 'purchase',
          totalAmount: 100,
          entryDate: '2026-02-01T00:00:00.000Z',
        },
      ],
      new Map(),
      new Map(),
    );

    expect(ledgers).toEqual([
      expect.objectContaining({
        id: 'x-1',
        name: 'Unknown Party',
        group: 'Purchase Party',
        totalCredit: 100,
      }),
    ]);
  });
});
