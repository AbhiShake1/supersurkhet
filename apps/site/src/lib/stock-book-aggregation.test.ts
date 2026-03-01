import { describe, expect, it } from 'vitest';
import {
  aggregateStockBookEntries,
  buildFiscalCloseRows,
  buildStockOpeningClosingSnapshot,
  UNASSIGNED_STOCK_BUCKET,
} from './stock-book-aggregation';

describe('aggregateStockBookEntries', () => {
  it('aggregates product total and party buckets from mixed in/out rows', () => {
    const aggregate = aggregateStockBookEntries([
      {
        productId: 'p-1',
        direction: 'in',
        movementType: 'purchase',
        quantityIn: 10,
        counterpartyId: 'supplier-a',
      },
      {
        productId: 'p-1',
        direction: 'in',
        movementType: 'opening',
        quantityIn: 5,
      },
      {
        productId: 'p-1',
        direction: 'out',
        movementType: 'sale',
        quantityOut: 3,
        originPartyId: 'supplier-a',
      },
    ]);

    expect(aggregate.productTotalAvailable['p-1']).toBe(12);
    expect(aggregate.productPartyAvailable['p-1']['supplier-a']).toBe(7);
    expect(
      aggregate.productPartyAvailable['p-1'][UNASSIGNED_STOCK_BUCKET],
    ).toBe(5);
  });
});

describe('buildFiscalCloseRows', () => {
  it('creates paired closing/out and next fiscal year opening/in rows', () => {
    const closeDate = '2026-04-13T00:00:00.000Z';
    const openingDate = '2026-04-14T00:00:00.000Z';
    const { nextFiscalYear, rows } = buildFiscalCloseRows({
      fiscalYear: '82/83',
      closeDate,
      openingDate,
      entries: [
        {
          fiscalYear: '82/83',
          entryDate: '2026-04-10T00:00:00.000Z',
          productId: 'p-1',
          direction: 'in',
          movementType: 'purchase',
          quantityIn: 10,
          counterpartyId: 'supplier-a',
        },
      ],
    });

    expect(nextFiscalYear).toBe('83/84');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      movementType: 'closing',
      direction: 'out',
      productId: 'p-1',
      quantity: 10,
      sourceTable: 'fiscalClose',
      fiscalYear: '82/83',
      originPartyId: 'supplier-a',
      entryDate: closeDate,
    });
    expect(rows[1]).toMatchObject({
      movementType: 'opening',
      direction: 'in',
      productId: 'p-1',
      quantity: 10,
      sourceTable: 'fiscalClose',
      fiscalYear: '83/84',
      originPartyId: 'supplier-a',
      entryDate: openingDate,
    });
  });

  it('is idempotent for deterministic source ids', () => {
    const params = {
      fiscalYear: '82/83',
      closeDate: '2026-04-13T00:00:00.000Z',
      entries: [
        {
          fiscalYear: '82/83',
          entryDate: '2026-04-10T00:00:00.000Z',
          productId: 'p-1',
          direction: 'in' as const,
          movementType: 'purchase',
          quantityIn: 6,
          counterpartyId: 'supplier-a',
        },
      ],
    };
    const first = buildFiscalCloseRows(params);
    const second = buildFiscalCloseRows(params);

    expect(first.rows.map((row) => row.sourceId)).toEqual(
      second.rows.map((row) => row.sourceId),
    );
  });
});

describe('buildStockOpeningClosingSnapshot', () => {
  it('computes opening and closing balances for a selected date range', () => {
    const snapshot = buildStockOpeningClosingSnapshot({
      startDate: new Date('2026-07-10T00:00:00.000Z'),
      endDate: new Date('2026-07-20T00:00:00.000Z'),
      entries: [
        {
          entryDate: '2026-07-05T00:00:00.000Z',
          productId: 'p-1',
          direction: 'in',
          movementType: 'purchase',
          quantityIn: 10,
          counterpartyId: 'supplier-a',
        },
        {
          entryDate: '2026-07-12T00:00:00.000Z',
          productId: 'p-1',
          direction: 'out',
          movementType: 'sale',
          quantityOut: 3,
          originPartyId: 'supplier-a',
        },
        {
          entryDate: '2026-07-18T00:00:00.000Z',
          productId: 'p-1',
          direction: 'in',
          movementType: 'purchase',
          quantityIn: 4,
          counterpartyId: 'supplier-b',
        },
      ],
    });

    expect(snapshot.openingTotalQty).toBe(10);
    expect(snapshot.closingTotalQty).toBe(11);
    expect(snapshot.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'p-1',
          partyId: 'supplier-a',
          openingQty: 10,
          closingQty: 7,
        }),
        expect.objectContaining({
          productId: 'p-1',
          partyId: 'supplier-b',
          openingQty: 0,
          closingQty: 4,
        }),
      ]),
    );
  });
});
