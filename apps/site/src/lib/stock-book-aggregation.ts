export const UNASSIGNED_STOCK_BUCKET = '__UNASSIGNED__';

export type StockBucketKey = string;

export type StockBookAggregationEntry = {
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

export type StockAggregation = {
  productTotalAvailable: Record<string, number>;
  productPartyAvailable: Record<string, Record<StockBucketKey, number>>;
};

function toFiniteNumber(input: unknown) {
  const value = Number(input ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function resolveInboundBucket(entry: StockBookAggregationEntry): StockBucketKey {
  if (entry.movementType === 'purchase') {
    return entry.counterpartyId || UNASSIGNED_STOCK_BUCKET;
  }
  return (
    entry.originPartyId ||
    entry.counterpartyId ||
    UNASSIGNED_STOCK_BUCKET
  );
}

function resolveOutboundBucket(entry: StockBookAggregationEntry): StockBucketKey {
  return entry.originPartyId || UNASSIGNED_STOCK_BUCKET;
}

export function aggregateStockBookEntries(
  entries: StockBookAggregationEntry[] | undefined,
): StockAggregation {
  const productTotalAvailable: Record<string, number> = {};
  const productPartyAvailable: Record<string, Record<StockBucketKey, number>> = {};

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

export type FiscalCloseRow = {
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

export function getNextFiscalYear(fiscalYear: string) {
  const [startRaw, endRaw] = fiscalYear.split('/');
  const start = Number(startRaw);
  const end = Number(endRaw);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return fiscalYear;
  const nextStart = String((start + 1) % 100).padStart(2, '0');
  const nextEnd = String((end + 1) % 100).padStart(2, '0');
  return `${nextStart}/${nextEnd}`;
}

export function buildFiscalCloseRows({
  fiscalYear,
  closeDate,
  entries,
}: {
  fiscalYear: string;
  closeDate: string;
  entries: StockBookAggregationEntry[] | undefined;
}) {
  const nextFiscalYear = getNextFiscalYear(fiscalYear);
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
        particulars: `Fiscal close ${fiscalYear}`,
        sourceTable: 'fiscalClose',
        sourceId: `${sourceId}:close`,
        sourceCode,
        fiscalYear,
        counterpartyId: party,
        originPartyId: partyId,
      });

      rows.push({
        entryDate: closeDate,
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
