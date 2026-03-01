type CounterpartyInput = {
  partyName?: string;
  customerName?: string;
};

type StockBookEntryLike = {
  counterpartyId?: string;
  entryDate?: string;
  particulars?: string;
  productId?: string;
  quantityIn?: number;
  quantityOut?: number;
  sourceCode?: string;
  totalAmount?: number;
  transactionType?: 'purchase' | 'sale' | 'stock';
};

type CounterpartyEntity = {
  name?: string;
  phone?: string;
  panNumber?: string;
};

export type StockBookLedgerEntry = {
  counterpartyId?: string;
  date?: string;
  particulars: string;
  productId?: string;
  quantityIn?: number;
  quantityOut?: number;
  sourceCode?: string;
  totalAmount?: number;
};

export type StockBookCounterpartyLedger = {
  id: string;
  name: string;
  group: 'Purchase Party' | 'Sale Party' | 'Mixed' | undefined;
  phone?: string;
  panNumber?: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: StockBookLedgerEntry[];
};

export function getStockBookCounterpartyMeta(
  entry: StockBookEntryLike,
  names: CounterpartyInput,
) {
  const name = names.partyName || names.customerName || 'Unknown Party';
  const group =
    entry.transactionType === 'purchase'
      ? 'Purchase Party'
      : entry.transactionType === 'sale'
        ? 'Sale Party'
        : undefined;

  return {
    name,
    group,
  };
}

export function buildStockBookCounterpartyLedgers(
  rows: StockBookEntryLike[],
  partiesById: Map<string, CounterpartyEntity>,
  customersById: Map<string, CounterpartyEntity>,
): StockBookCounterpartyLedger[] {
  const grouped = new Map<string, StockBookEntryLike[]>();

  for (const row of rows) {
    const key =
      row.counterpartyId ||
      `unknown-${row.sourceCode || ''}-${row.entryDate || ''}-${row.particulars || ''}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.entries())
    .map(([id, entries]) => {
      const party = partiesById.get(id);
      const customer = customersById.get(id);
      const identity = party || customer;

      let totalDebit = 0;
      let totalCredit = 0;
      const groups = new Set<string>();

      const normalizedEntries = [...entries]
        .sort((a, b) => {
          const at = a.entryDate ? new Date(a.entryDate).getTime() : 0;
          const bt = b.entryDate ? new Date(b.entryDate).getTime() : 0;
          return at - bt;
        })
        .map((entry) => {
          const amount = Number(entry.totalAmount || 0);
          if (entry.transactionType === 'sale') totalDebit += amount;
          if (entry.transactionType === 'purchase') totalCredit += amount;
          const group = getStockBookCounterpartyMeta(entry, {
            partyName: party?.name,
            customerName: customer?.name,
          }).group;
          if (group) groups.add(group);

          return {
            counterpartyId: entry.counterpartyId,
            date: entry.entryDate,
            particulars:
              entry.particulars ||
              `${entry.transactionType === 'purchase' ? 'Purchase' : 'Sale'} Invoice${entry.sourceCode ? ` #${entry.sourceCode}` : ''}`,
            productId: entry.productId,
            quantityIn: entry.quantityIn,
            quantityOut: entry.quantityOut,
            sourceCode: entry.sourceCode,
            totalAmount: entry.totalAmount,
          };
        });

      const group =
        groups.size === 1
          ? (Array.from(groups)[0] as 'Purchase Party' | 'Sale Party')
          : groups.size > 1
            ? 'Mixed'
            : undefined;

      return {
        id,
        name: identity?.name || 'Unknown Party',
        group,
        phone: identity?.phone,
        panNumber: identity?.panNumber,
        totalDebit,
        totalCredit,
        closingBalance: totalDebit - totalCredit,
        entries: normalizedEntries,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
