'use client';

import { format } from 'date-fns';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  SearchIcon,
} from 'lucide-react';
import NepaliDate from 'nepali-datetime';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/intl';
import {
  aggregateStockBookEntries,
  buildFiscalCloseRows,
  UNASSIGNED_STOCK_BUCKET,
} from '@/lib/stock-book-aggregation';
import type { AdminComponent } from '.';
import { buildStockBookCounterpartyLedgers } from './stock-book-utils';

interface StockBookManagementProps {
  slug: string;
}

type StockEntry = {
  _?: { soul?: string };
  entryDate?: string;
  transactionType?: 'purchase' | 'sale' | 'stock';
  movementType?: string;
  direction?: 'in' | 'out';
  productId?: string;
  quantityIn?: number;
  quantityOut?: number;
  quantity?: number;
  totalAmount?: number;
  particulars?: string;
  sourceId?: string;
  sourceCode?: string;
  sourceTable?: string;
  fiscalYear?: string;
  counterpartyId?: string;
  originPartyId?: string;
};

type StockNeedPartyRow = {
  productId: string;
  product: string;
  available: number;
  reorderLevel: number;
  need: number;
};

type StockNeedPartyLedger = {
  id: string;
  name: string;
  totalAvailable: number;
  totalNeed: number;
  items: StockNeedPartyRow[];
};

type FiscalYearStockRow = {
  key: string;
  productId: string;
  partyId: string;
  openingQty: number;
  closingQty: number;
};

type FiscalCloseStatus = {
  fiscalYear: string;
  closed: boolean;
  closedAt?: string;
  openingQty: number;
  closingQty: number;
  rows: FiscalYearStockRow[];
};

export const StockBookManagement: AdminComponent = ({ slug }) => {
  return <_StockBookManagement slug={slug} />;
};

function _StockBookManagement({ slug }: StockBookManagementProps) {
  const [search, setSearch] = useState('');
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<
    string | null
  >(null);
  const [selectedFiscalHistoryYear, setSelectedFiscalHistoryYear] =
    useState('');
  const [autoCloseMessage, setAutoCloseMessage] = useState<string | null>(null);
  const [isAutoClosing, setIsAutoClosing] = useState(false);
  const autoCloseRunRef = useRef('');
  const { data: stockBook = [] } = api.stockBook.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });
  const createStockBookMutation = api.stockBook.useCreate({ keys: [slug] });
  const deleteStockBookMutation = api.stockBook.useDelete({ keys: [slug] });
  const currentFiscalYear = useMemo(calculateFiscalYear, []);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product._?.soul, product])),
    [products],
  );
  const partiesById = useMemo(
    () => new Map(parties.map((party) => [party._?.soul, party])),
    [parties],
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer._?.soul, customer])),
    [customers],
  );

  const normalized = useMemo(() => {
    const entries = [...(stockBook as StockEntry[])];
    entries.sort((a, b) => {
      const at = a.entryDate ? new Date(a.entryDate).getTime() : 0;
      const bt = b.entryDate ? new Date(b.entryDate).getTime() : 0;
      return bt - at;
    });
    return entries;
  }, [stockBook]);

  const sourceCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of normalized) {
      if (!entry.sourceId || !entry.sourceCode) continue;
      map.set(entry.sourceId, entry.sourceCode);
    }
    return map;
  }, [normalized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalized;

    return normalized.filter((entry) => {
      const product = productsById.get(entry.productId);
      const counterparty =
        partiesById.get(entry.counterpartyId) ||
        customersById.get(entry.counterpartyId);
      const haystack = [
        product?.title,
        counterparty?.name,
        entry.particulars,
        entry.sourceCode,
        entry.transactionType,
        entry.movementType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customersById, normalized, partiesById, productsById, search]);

  const purchases = filtered.filter(
    (entry) => entry.transactionType === 'purchase',
  );
  const sales = filtered.filter((entry) => entry.transactionType === 'sale');

  const stats = useMemo(() => {
    const purchaseAmount = purchases.reduce(
      (sum, entry) => sum + Number(entry.totalAmount || 0),
      0,
    );
    const saleAmount = sales.reduce(
      (sum, entry) => sum + Number(entry.totalAmount || 0),
      0,
    );
    const quantityIn = filtered.reduce(
      (sum, entry) => sum + Number(entry.quantityIn || 0),
      0,
    );
    const quantityOut = filtered.reduce(
      (sum, entry) => sum + Number(entry.quantityOut || 0),
      0,
    );
    return {
      purchaseAmount,
      saleAmount,
      quantityIn,
      quantityOut,
    };
  }, [filtered, purchases, sales]);

  const stockAggregate = useMemo(
    () => aggregateStockBookEntries(stockBook as StockEntry[]),
    [stockBook],
  );

  const stockNeedByParty = useMemo(() => {
    const byParty = new Map<string, StockNeedPartyLedger>();
    const query = search.trim().toLowerCase();

    for (const product of products) {
      const productId = product._?.soul;
      if (!productId) continue;

      const productBuckets = Object.entries(
        stockAggregate.productPartyAvailable[productId] || {},
      );
      if (!productBuckets.length) {
        productBuckets.push([UNASSIGNED_STOCK_BUCKET, 0]);
      }

      const reorderLevel = Number(product.reorderLevel || 0);
      const productTitle = product.title || '-';

      for (const [partyId, rawQty] of productBuckets) {
        const available = Number(rawQty || 0);
        const need = Math.max(reorderLevel - available, 0);
        const partyName =
          partyId === UNASSIGNED_STOCK_BUCKET
            ? 'Unassigned'
            : partiesById.get(partyId)?.name ||
              customersById.get(partyId)?.name ||
              partyId;

        if (
          query &&
          !`${productTitle} ${partyName}`.toLowerCase().includes(query)
        ) {
          continue;
        }
        if (!available && !reorderLevel) continue;

        const ledger = byParty.get(partyId) || {
          id: partyId,
          name: partyName,
          totalAvailable: 0,
          totalNeed: 0,
          items: [],
        };

        ledger.items.push({
          productId,
          product: productTitle,
          available,
          reorderLevel,
          need,
        });
        ledger.totalAvailable += available;
        ledger.totalNeed += need;
        byParty.set(partyId, ledger);
      }
    }

    return Array.from(byParty.values())
      .map((ledger) => ({
        ...ledger,
        items: [...ledger.items].sort((a, b) => {
          if (a.need === b.need) return a.product.localeCompare(b.product);
          return b.need - a.need;
        }),
      }))
      .sort((a, b) => {
        if (a.totalNeed === b.totalNeed) return a.name.localeCompare(b.name);
        return b.totalNeed - a.totalNeed;
      });
  }, [
    customersById,
    partiesById,
    products,
    search,
    stockAggregate.productPartyAvailable,
  ]);

  const fiscalYears = useMemo(() => {
    const years = new Set<string>();
    for (const entry of normalized) {
      if (!entry.fiscalYear) continue;
      years.add(entry.fiscalYear);
    }
    return Array.from(years).sort(sortFiscalYearsDesc);
  }, [normalized]);

  useEffect(() => {
    if (!fiscalYears.length) return;
    if (
      selectedFiscalHistoryYear &&
      fiscalYears.includes(selectedFiscalHistoryYear)
    ) {
      return;
    }
    setSelectedFiscalHistoryYear(fiscalYears[0]);
  }, [fiscalYears, selectedFiscalHistoryYear]);

  const fiscalCloseStatuses = useMemo<FiscalCloseStatus[]>(() => {
    const byYear = new Map<
      string,
      {
        fiscalYear: string;
        closed: boolean;
        closedAt?: string;
        openingQty: number;
        closingQty: number;
        rowsByBucket: Map<string, FiscalYearStockRow>;
      }
    >();

    for (const year of fiscalYears) {
      byYear.set(year, {
        fiscalYear: year,
        closed: false,
        openingQty: 0,
        closingQty: 0,
        rowsByBucket: new Map(),
      });
    }

    for (const entry of normalized) {
      const fiscalYear = entry.fiscalYear;
      if (!fiscalYear) continue;
      if (entry.sourceTable !== 'fiscalClose') continue;
      if (
        entry.movementType !== 'opening' &&
        entry.movementType !== 'closing'
      ) {
        continue;
      }

      const row = byYear.get(fiscalYear) || {
        fiscalYear,
        closed: false,
        openingQty: 0,
        closingQty: 0,
        rowsByBucket: new Map<string, FiscalYearStockRow>(),
      };
      byYear.set(fiscalYear, row);

      const productId = entry.productId || '-';
      const partyId =
        entry.originPartyId || entry.counterpartyId || UNASSIGNED_STOCK_BUCKET;
      const key = `${productId}::${partyId}`;
      const bucket = row.rowsByBucket.get(key) || {
        key,
        productId,
        partyId,
        openingQty: 0,
        closingQty: 0,
      };

      if (entry.movementType === 'opening') {
        const qty = Number(entry.quantityIn ?? entry.quantity ?? 0);
        row.openingQty += qty;
        bucket.openingQty += qty;
      } else {
        const qty = Number(entry.quantityOut ?? entry.quantity ?? 0);
        row.closingQty += qty;
        bucket.closingQty += qty;
        row.closed = true;
        if (entry.entryDate) {
          if (
            !row.closedAt ||
            new Date(entry.entryDate).getTime() >
              new Date(row.closedAt).getTime()
          ) {
            row.closedAt = entry.entryDate;
          }
        }
      }
      row.rowsByBucket.set(key, bucket);
    }

    return Array.from(byYear.values())
      .map((row) => ({
        fiscalYear: row.fiscalYear,
        closed: row.closed,
        closedAt: row.closedAt,
        openingQty: row.openingQty,
        closingQty: row.closingQty,
        rows: Array.from(row.rowsByBucket.values()).sort((a, b) => {
          const productA = productsById.get(a.productId)?.title || a.productId;
          const productB = productsById.get(b.productId)?.title || b.productId;
          return productA.localeCompare(productB);
        }),
      }))
      .sort((a, b) => sortFiscalYearsDesc(a.fiscalYear, b.fiscalYear));
  }, [fiscalYears, normalized, productsById]);

  const selectedFiscalYearStatus = useMemo(
    () =>
      fiscalCloseStatuses.find(
        (status) => status.fiscalYear === selectedFiscalHistoryYear,
      ) || null,
    [fiscalCloseStatuses, selectedFiscalHistoryYear],
  );

  const pendingFiscalCloseYears = useMemo(() => {
    const closedYears = new Set(
      normalized
        .filter(
          (entry) =>
            entry.sourceTable === 'fiscalClose' &&
            entry.movementType === 'closing' &&
            Boolean(entry.fiscalYear),
        )
        .map((entry) => entry.fiscalYear as string),
    );

    return fiscalYears
      .filter(
        (fiscalYear) => compareFiscalYears(fiscalYear, currentFiscalYear) < 0,
      )
      .filter((fiscalYear) => !closedYears.has(fiscalYear))
      .sort(compareFiscalYears);
  }, [currentFiscalYear, fiscalYears, normalized]);

  useEffect(() => {
    if (!pendingFiscalCloseYears.length) return;
    const runKey = `${slug}:${pendingFiscalCloseYears.join(',')}:${normalized.length}`;
    if (autoCloseRunRef.current === runKey) return;
    autoCloseRunRef.current = runKey;

    let isCancelled = false;
    const closeDate = new Date().toISOString();

    async function runAutoClose() {
      setIsAutoClosing(true);
      setAutoCloseMessage(
        `Running fiscal close for ${pendingFiscalCloseYears.join(', ')}...`,
      );

      try {
        const yearsToClose = [...pendingFiscalCloseYears].sort(
          compareFiscalYears,
        );
        let workingEntries = [...normalized];
        let generatedRows = 0;

        for (const fiscalYear of yearsToClose) {
          const sourcePrefix = getFiscalCloseSourcePrefix(fiscalYear);
          const staleRows = workingEntries.filter(
            (entry) =>
              entry.sourceTable === 'fiscalClose' &&
              typeof entry.sourceId === 'string' &&
              entry.sourceId.startsWith(sourcePrefix),
          );

          for (const row of staleRows) {
            if (!row._?.soul) continue;
            await deleteStockBookMutation.mutateAsync(row._.soul);
          }

          workingEntries = workingEntries.filter(
            (entry) =>
              !(
                entry.sourceTable === 'fiscalClose' &&
                typeof entry.sourceId === 'string' &&
                entry.sourceId.startsWith(sourcePrefix)
              ),
          );

          const generated = buildFiscalCloseRows({
            fiscalYear,
            closeDate,
            entries: workingEntries,
          });

          for (const row of generated.rows) {
            await createStockBookMutation.mutateAsync({ ...row });
            workingEntries.unshift(row);
            generatedRows += 1;
          }
        }

        if (isCancelled) return;
        setAutoCloseMessage(
          generatedRows
            ? `Auto fiscal close completed. Generated ${generatedRows.toLocaleString()} stock-book rows.`
            : 'No fiscal close rows were generated from the pending years.',
        );
      } catch (error) {
        if (isCancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Automatic fiscal close failed unexpectedly.';
        setAutoCloseMessage(message);
      } finally {
        if (!isCancelled) {
          setIsAutoClosing(false);
        }
      }
    }

    void runAutoClose();

    return () => {
      isCancelled = true;
    };
  }, [
    createStockBookMutation,
    deleteStockBookMutation,
    normalized,
    pendingFiscalCloseYears,
    slug,
  ]);

  function renderLedgerLikeView(rows: StockEntry[]) {
    const ledgers = buildStockBookCounterpartyLedgers(
      rows,
      partiesById,
      customersById,
    );
    const activeLedger =
      ledgers.find((ledger) => ledger.id === selectedCounterpartyId) ||
      ledgers[0] ||
      null;

    if (!ledgers.length) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No entries found for this view.
        </div>
      );
    }

    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parties</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a party to view full ledger
            </p>
          </CardHeader>
          <CardContent className="max-h-[min(65vh,42rem)] space-y-2 overflow-y-auto pr-1">
            {ledgers.map((ledger) => {
              const isActive = activeLedger?.id === ledger.id;
              return (
                <button
                  key={ledger.id}
                  type="button"
                  onClick={() => setSelectedCounterpartyId(ledger.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <p className="font-medium">{ledger.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ledger.group || 'No group'}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Closing</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(ledger.closingBalance)}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {activeLedger && (
          <Card className="min-h-0 min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{activeLedger.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {activeLedger.group || 'No group'}
                  </p>
                </div>
                <Badge variant="outline">
                  {activeLedger.closingBalance > 0
                    ? 'Receivable'
                    : activeLedger.closingBalance < 0
                      ? 'Payable'
                      : 'Settled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Debit</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.totalDebit)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Credit</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.totalCredit)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Closing Balance
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.closingBalance)}
                  </p>
                </div>
              </div>

              <div className="max-h-[min(65vh,42rem)] overflow-auto rounded-md border">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Particulars</th>
                      <th className="px-3 py-2 text-right">In</th>
                      <th className="px-3 py-2 text-right">Out</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLedger.entries.map((entry, index) => (
                      <tr
                        key={`${entry.date || 'na'}-${entry.particulars}-${index}`}
                        className="border-t"
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-3 py-2">
                          {productsById.get(entry.productId)?.title || '-'}
                        </td>
                        <td className="px-3 py-2">{entry.particulars}</td>
                        <td className="px-3 py-2 text-right">
                          {Number(entry.quantityIn || 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(entry.quantityOut || 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(entry.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">{entry.sourceCode || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderStockNeedByPartyView() {
    const activeLedger =
      stockNeedByParty.find((ledger) => ledger.id === selectedCounterpartyId) ||
      stockNeedByParty[0] ||
      null;

    if (!stockNeedByParty.length) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No stock buckets found for the current search.
        </div>
      );
    }

    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parties</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a party to view stock need by product
            </p>
          </CardHeader>
          <CardContent className="max-h-[min(65vh,42rem)] space-y-2 overflow-y-auto pr-1">
            {stockNeedByParty.map((ledger) => {
              const isActive = activeLedger?.id === ledger.id;
              return (
                <button
                  key={ledger.id}
                  type="button"
                  onClick={() => setSelectedCounterpartyId(ledger.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <p className="font-medium">{ledger.name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Available</span>
                    <span className="font-semibold tabular-nums">
                      {ledger.totalAvailable.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Need</span>
                    <span className="font-semibold tabular-nums">
                      {ledger.totalNeed.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {activeLedger && (
          <Card className="min-h-0 min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{activeLedger.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Stock need grouped by product
                  </p>
                </div>
                <Badge
                  variant={
                    activeLedger.totalNeed > 0 ? 'destructive' : 'outline'
                  }
                >
                  {activeLedger.totalNeed > 0 ? 'Needs Restock' : 'Sufficient'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="font-semibold tabular-nums">
                    {activeLedger.items.length.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-semibold tabular-nums">
                    {activeLedger.totalAvailable.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Need</p>
                  <p className="font-semibold tabular-nums">
                    {activeLedger.totalNeed.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="max-h-[min(65vh,42rem)] overflow-auto rounded-md border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Available</th>
                      <th className="px-3 py-2 text-right">Reorder Level</th>
                      <th className="px-3 py-2 text-right">Need</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLedger.items.map((item) => (
                      <tr
                        key={`${activeLedger.id}-${item.productId}`}
                        className="border-t"
                      >
                        <td className="px-3 py-2">{item.product}</td>
                        <td className="px-3 py-2 text-right">
                          {item.available}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.reorderLevel || '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {item.need.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderFiscalCloseView() {
    if (!fiscalYears.length) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No fiscal-year entries found in stock book yet.
        </div>
      );
    }

    const activeYear =
      selectedFiscalYearStatus || fiscalCloseStatuses[0] || null;

    function getPartyLabel(partyId: string) {
      if (partyId === UNASSIGNED_STOCK_BUCKET) return 'Unassigned';
      return (
        partiesById.get(partyId)?.name ||
        customersById.get(partyId)?.name ||
        partyId
      );
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Automatic Fiscal Rollover
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fiscal close runs automatically when a new fiscal year is
                  detected.
                </p>
              </div>
              <Badge variant={isAutoClosing ? 'secondary' : 'outline'}>
                {isAutoClosing ? 'Running' : 'Up to date'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <p>
                Current Fiscal Year:{' '}
                <span className="font-medium">{currentFiscalYear}</span>
              </p>
              <p>
                Pending Close Years:{' '}
                <span className="font-medium">
                  {pendingFiscalCloseYears.length
                    ? pendingFiscalCloseYears.join(', ')
                    : 'None'}
                </span>
              </p>
            </div>
            {autoCloseMessage && (
              <div className="rounded-md border px-3 py-2 text-sm">
                {autoCloseMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fiscal Years</CardTitle>
              <p className="text-sm text-muted-foreground">
                Historical opening and closing balances
              </p>
            </CardHeader>
            <CardContent className="max-h-[min(65vh,42rem)] space-y-2 overflow-y-auto pr-1">
              {fiscalCloseStatuses.map((status) => {
                const isActive =
                  selectedFiscalHistoryYear === status.fiscalYear;
                return (
                  <button
                    key={status.fiscalYear}
                    type="button"
                    onClick={() => {
                      setSelectedFiscalHistoryYear(status.fiscalYear);
                    }}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{status.fiscalYear}</p>
                      <Badge variant={status.closed ? 'default' : 'outline'}>
                        {status.closed ? 'Closed' : 'Open'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {status.closedAt
                        ? `Closed on ${formatDate(status.closedAt)}`
                        : 'Not closed yet'}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-sm border px-2 py-1">
                        Open: {status.openingQty.toLocaleString()}
                      </div>
                      <div className="rounded-sm border px-2 py-1">
                        Close: {status.closingQty.toLocaleString()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {activeYear && (
            <Card className="min-h-0 min-w-0">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Fiscal Year {activeYear.fiscalYear}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Stock opening/closing buckets generated in stock book
                    </p>
                  </div>
                  <Badge variant={activeYear.closed ? 'default' : 'outline'}>
                    {activeYear.closed ? 'Closed' : 'Open'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Opening Qty</p>
                    <p className="font-semibold tabular-nums">
                      {activeYear.openingQty.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Closing Qty</p>
                    <p className="font-semibold tabular-nums">
                      {activeYear.closingQty.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      Stock Buckets
                    </p>
                    <p className="font-semibold tabular-nums">
                      {activeYear.rows.length.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="max-h-[min(56vh,36rem)] overflow-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Party Bucket</th>
                          <th className="px-3 py-2 text-right">Opening Qty</th>
                          <th className="px-3 py-2 text-right">Closing Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeYear.rows.length ? (
                          activeYear.rows.map((row) => (
                            <tr key={row.key} className="border-t">
                              <td className="px-3 py-2">
                                {productsById.get(row.productId)?.title ||
                                  row.productId}
                              </td>
                              <td className="px-3 py-2">
                                {getPartyLabel(row.partyId)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.openingQty.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.closingQty.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              className="px-3 py-4 text-center text-muted-foreground"
                              colSpan={4}
                            >
                              No fiscal close opening/closing rows found for
                              this year.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Stock Book</h2>
        <p className="text-sm text-muted-foreground">
          Read-only stock movement ledger with purchases (you owe suppliers) and
          sales (customers owe you).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowDownCircle className="h-4 w-4" />
              Purchase Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {stats.purchaseAmount.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowUpCircle className="h-4 w-4" />
              Sales Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {stats.saleAmount.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total In / Out</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {stats.quantityIn} / {stats.quantityOut}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Boxes className="h-4 w-4" />
              Net Quantity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {stats.quantityIn - stats.quantityOut}
          </CardContent>
        </Card>
      </div>

      <Input
        leadingIcon={<SearchIcon className="h-4 w-4" />}
        className="pl-9"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search product, counterparty, particulars, or reference..."
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Entries</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="stock">Stock Need</TabsTrigger>
          <TabsTrigger value="fiscal-close">Fiscal Close</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderLedgerLikeView(filtered)}</TabsContent>
        <TabsContent value="purchases">
          <div className="mb-2">
            <Badge variant="secondary">
              Purchases: amount you owe suppliers
            </Badge>
          </div>
          {renderLedgerLikeView(purchases)}
        </TabsContent>
        <TabsContent value="sales">
          <div className="mb-2">
            <Badge variant="secondary">Sales: amount customers owe you</Badge>
          </div>
          {renderLedgerLikeView(sales)}
        </TabsContent>
        <TabsContent value="stock">{renderStockNeedByPartyView()}</TabsContent>
        <TabsContent value="fiscal-close">
          {renderFiscalCloseView()}
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <h3 className="text-base font-medium">Raw Table</h3>
        <AutoTable
          schema="stockBook"
          slug={slug}
          readOnly
          previewOverrides={{
            productId: (id) => productsById.get(id)?.title ?? '-',
            counterpartyId: (id) => {
              if (typeof id !== 'string' || !id) return '-';
              return (
                partiesById.get(id)?.name ||
                customersById.get(id)?.name ||
                id.split('/').at(-1) ||
                id
              );
            },
            originPartyId: (id) => {
              if (typeof id !== 'string' || !id) return '-';
              if (id === UNASSIGNED_STOCK_BUCKET) return 'Unassigned';
              return partiesById.get(id)?.name || id.split('/').at(-1) || id;
            },
            sourceId: (id) => {
              if (typeof id !== 'string' || !id) return '-';
              return sourceCodeById.get(id) || id.split('/').at(-1) || id;
            },
          }}
        />
      </div>
    </div>
  );
}

export default StockBookManagement;

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM yyyy');
}

function sortFiscalYearsDesc(a: string, b: string) {
  return compareFiscalYears(b, a);
}

function getFiscalCloseSourcePrefix(fiscalYear: string) {
  return `fiscal-close:${fiscalYear}:`;
}

function compareFiscalYears(a: string, b: string) {
  const [aStart, aEnd] = parseFiscalYear(a);
  const [bStart, bEnd] = parseFiscalYear(b);
  if (aStart !== bStart) return aStart - bStart;
  if (aEnd !== bEnd) return aEnd - bEnd;
  return a.localeCompare(b);
}

function parseFiscalYear(fiscalYear: string): [number, number] {
  const [startRaw, endRaw] = fiscalYear.split('/');
  const start = Number(startRaw);
  const end = Number(endRaw);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return [0, 0];
  }
  return [start, end];
}

function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year
    .toString()
    .slice(2)}/${(year + 1).toString().slice(2)}`;
}
