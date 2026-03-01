import { describe, expect, it } from 'vitest';
import {
  aggregateStockBookEntries,
  buildFiscalCloseRows,
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
    expect(aggregate.productPartyAvailable['p-1'][UNASSIGNED_STOCK_BUCKET]).toBe(
      5,
    );
  });
});

describe('buildFiscalCloseRows', () => {
  it('creates paired closing/out and next fiscal year opening/in rows', () => {
    const closeDate = '2026-04-13T00:00:00.000Z';
    const { nextFiscalYear, rows } = buildFiscalCloseRows({
      fiscalYear: '82/83',
      closeDate,
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
    });
    expect(rows[1]).toMatchObject({
      movementType: 'opening',
      direction: 'in',
      productId: 'p-1',
      quantity: 10,
      sourceTable: 'fiscalClose',
      fiscalYear: '83/84',
      originPartyId: 'supplier-a',
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
