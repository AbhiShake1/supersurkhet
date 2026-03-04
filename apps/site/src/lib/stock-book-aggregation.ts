import { getNextFiscalYear } from './nepali-fiscal';

export const UNASSIGNED_STOCK_BUCKET = '__UNASSIGNED__';

type StockBucketKey = string;

type StockBookAggregationEntry = {
  _?: { soul?: string };
  entryDate?: string;
  fiscalYear?: string;
  movementType?: string;
  direction?: 'in' | 'out';
  productId?: string;
  quantity?: number;
  quantityIn?: number;
  quantityOut?: number;
  counterpartyId?: string;
  originPartyId?: string;
};

type StockAggregation = {
  productTotalAvailable: Record<string, number>;
  productPartyAvailable: Record<string, Record<StockBucketKey, number>>;
};

type StockOpeningClosingRow = {
  key: string;
  productId: string;
  partyId: string;
  openingQty: number;
  closingQty: number;
};

type StockOpeningClosingSnapshot = {
  startDate: Date;
  endDate: Date;
  openingTotalQty: number;
  closingTotalQty: number;
  rows: StockOpeningClosingRow[];
};

function toFiniteNumber(input: unknown) {
  const value = Number(input ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function normalizeDayStart(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeDayEnd(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getEntryTimestamp(entry: StockBookAggregationEntry) {
  if (!entry.entryDate) return 0;
  const parsed = new Date(entry.entryDate).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function resolveInboundBucket(
  entry: StockBookAggregationEntry,
): StockBucketKey {
  if (entry.movementType === 'purchase') {
    return entry.counterpartyId || UNASSIGNED_STOCK_BUCKET;
  }
  return entry.originPartyId || entry.counterpartyId || UNASSIGNED_STOCK_BUCKET;
}

function resolveOutboundBucket(
  entry: StockBookAggregationEntry,
): StockBucketKey {
  return entry.originPartyId || UNASSIGNED_STOCK_BUCKET;
}

export function aggregateStockBookEntries(
  entries: StockBookAggregationEntry[] | undefined,
): StockAggregation {
  const productTotalAvailable: Record<string, number> = {};
  const productPartyAvailable: Record<
    string,
    Record<StockBucketKey, number>
  > = {};

  for (const entry of entries ?? []) {
    const productId = entry.productId;
    if (!productId) continue;

    const direction = entry.direction;
    if (!direction) continue;

    const qty =
      direction === 'in'
        ? toFiniteNumber(entry.quantityIn ?? entry.quantity)
        : toFiniteNumber(entry.quantityOut ?? entry.quantity);
    if (!qty) continue;

    const bucket =
      direction === 'in'
        ? resolveInboundBucket(entry)
        : resolveOutboundBucket(entry);

    productPartyAvailable[productId] ||= {};
    productPartyAvailable[productId][bucket] ||= 0;
    productTotalAvailable[productId] ||= 0;

    const delta = direction === 'in' ? qty : -qty;
    productPartyAvailable[productId][bucket] += delta;
    productTotalAvailable[productId] += delta;
  }

  return {
    productTotalAvailable,
    productPartyAvailable,
  };
}

export function getProductPartyAvailability(
  aggregate: StockAggregation,
  productId: string | undefined,
  partyId: string | undefined,
) {
  if (!productId || !partyId) return 0;
  return Number(aggregate.productPartyAvailable[productId]?.[partyId] || 0);
}

export function buildStockOpeningClosingSnapshot({
  entries,
  startDate,
  endDate,
}: {
  entries: StockBookAggregationEntry[] | undefined;
  startDate: Date;
  endDate: Date;
}): StockOpeningClosingSnapshot {
  const normalizedStart = normalizeDayStart(startDate);
  const normalizedEnd = normalizeDayEnd(endDate);
  const startTimestamp = normalizedStart.getTime();
  const endTimestamp = normalizedEnd.getTime();

  const safeEntries = entries ?? [];
  const openingAggregate = aggregateStockBookEntries(
    safeEntries.filter((entry) => getEntryTimestamp(entry) < startTimestamp),
  );
  const closingAggregate = aggregateStockBookEntries(
    safeEntries.filter((entry) => getEntryTimestamp(entry) <= endTimestamp),
  );

  const productIds = new Set<string>([
    ...Object.keys(openingAggregate.productPartyAvailable),
    ...Object.keys(closingAggregate.productPartyAvailable),
  ]);

  const rows: StockOpeningClosingRow[] = [];
  for (const productId of productIds) {
    const openingBuckets =
      openingAggregate.productPartyAvailable[productId] || {};
    const closingBuckets =
      closingAggregate.productPartyAvailable[productId] || {};
    const bucketIds = new Set<string>([
      ...Object.keys(openingBuckets),
      ...Object.keys(closingBuckets),
    ]);

    for (const partyId of bucketIds) {
      const openingQty = Number(openingBuckets[partyId] || 0);
      const closingQty = Number(closingBuckets[partyId] || 0);
      if (!openingQty && !closingQty) continue;
      rows.push({
        key: `${productId}::${partyId}`,
        productId,
        partyId,
        openingQty,
        closingQty,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.productId !== b.productId)
      return a.productId.localeCompare(b.productId);
    return a.partyId.localeCompare(b.partyId);
  });

  const openingTotalQty = rows.reduce((sum, row) => sum + row.openingQty, 0);
  const closingTotalQty = rows.reduce((sum, row) => sum + row.closingQty, 0);

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    openingTotalQty,
    closingTotalQty,
    rows,
  };
}

type FiscalCloseRow = {
  entryDate: string;
  transactionType: 'stock';
  movementType: 'closing' | 'opening';
  direction: 'in' | 'out';
  productId: string;
  quantityIn: number;
  quantityOut: number;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  particulars: string;
  sourceTable: 'fiscalClose';
  sourceId: string;
  sourceCode: string;
  fiscalYear: string;
  counterpartyId?: string;
  originPartyId?: string;
};

export function buildFiscalCloseRows({
  fiscalYear,
  closeDate,
  openingDate,
  entries,
}: {
  fiscalYear: string;
  closeDate: string;
  openingDate?: string;
  entries: StockBookAggregationEntry[] | undefined;
}) {
  const nextFiscalYear = getNextFiscalYear(fiscalYear);
  const openingEntryDate = openingDate || closeDate;
  const closingEntries = (entries ?? []).filter((entry) => {
    if (entry.fiscalYear !== fiscalYear) return false;
    if (!entry.entryDate) return true;
    return new Date(entry.entryDate).getTime() <= new Date(closeDate).getTime();
  });
  const aggregate = aggregateStockBookEntries(closingEntries);
  const rows: FiscalCloseRow[] = [];
  const datePrefix = closeDate.slice(0, 10);

  for (const [productId, partyBuckets] of Object.entries(
    aggregate.productPartyAvailable,
  )) {
    for (const [partyId, qty] of Object.entries(partyBuckets)) {
      const quantity = Number(qty || 0);
      if (quantity <= 0) continue;
      const deterministicKey = `${fiscalYear}:${datePrefix}:${productId}:${partyId}`;
      const sourceId = `fiscal-close:${deterministicKey}`;
      const sourceCode = deterministicKey;
      const party = partyId === UNASSIGNED_STOCK_BUCKET ? undefined : partyId;

      rows.push({
        entryDate: closeDate,
        transactionType: 'stock',
        movementType: 'closing',
        direction: 'out',
        productId,
        quantityIn: 0,
        quantityOut: quantity,
        quantity,
        unitRate: 0,
        totalAmount: 0,
        particulars: `Fiscal closing ${fiscalYear}`,
        sourceTable: 'fiscalClose',
        sourceId: `${sourceId}:close`,
        sourceCode,
        fiscalYear,
        counterpartyId: party,
        originPartyId: partyId,
      });

      rows.push({
        entryDate: openingEntryDate,
        transactionType: 'stock',
        movementType: 'opening',
        direction: 'in',
        productId,
        quantityIn: quantity,
        quantityOut: 0,
        quantity,
        unitRate: 0,
        totalAmount: 0,
        particulars: `Carry forward ${nextFiscalYear}`,
        sourceTable: 'fiscalClose',
        sourceId: `${sourceId}:carry`,
        sourceCode,
        fiscalYear: nextFiscalYear,
        counterpartyId: party,
        originPartyId: partyId,
      });
    }
  }

  return {
    nextFiscalYear,
    rows,
  };
}
