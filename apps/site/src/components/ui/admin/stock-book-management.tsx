'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Boxes, SearchIcon } from 'lucide-react';
import type { AdminComponent } from '.';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/intl';
import {
  buildStockBookCounterpartyLedgers,
} from './stock-book-utils';

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
  sourceCode?: string;
  fiscalYear?: string;
  counterpartyId?: string;
};

export const StockBookManagement: AdminComponent = ({ slug }) => {
  return <_StockBookManagement slug={slug} />;
};

function _StockBookManagement({ slug }: StockBookManagementProps) {
  const [search, setSearch] = useState('');
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | null>(
    null,
  );
  const { data: stockBook = [] } = api.stockBook.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });

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

  const purchases = filtered.filter((entry) => entry.transactionType === 'purchase');
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

  const productMovement = useMemo(() => {
    const movement = new Map<
      string,
      {
        title: string;
        inQty: number;
        outQty: number;
        currentStock: number;
        reorderLevel: number;
      }
    >();

    for (const product of products) {
      const productId = product._?.soul;
      if (!productId) continue;
      movement.set(productId, {
        title: product.title,
        inQty: 0,
        outQty: 0,
        currentStock: Number(product.stockQuantity || 0),
        reorderLevel: Number(product.reorderLevel || 0),
      });
    }

    for (const entry of filtered) {
      if (!entry.productId) continue;
      const row = movement.get(entry.productId);
      if (!row) continue;
      row.inQty += Number(entry.quantityIn || 0);
      row.outQty += Number(entry.quantityOut || 0);
    }

    return Array.from(movement.values())
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 10);
  }, [filtered, products]);

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
                    isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
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
            <Badge variant="secondary">
              Sales: amount customers owe you
            </Badge>
          </div>
          {renderLedgerLikeView(sales)}
        </TabsContent>
        <TabsContent value="stock">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">In</th>
                  <th className="px-3 py-2 text-right">Out</th>
                  <th className="px-3 py-2 text-right">Current Stock</th>
                  <th className="px-3 py-2 text-right">Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {productMovement.map((item) => (
                  <tr key={item.title} className="border-t">
                    <td className="px-3 py-2">{item.title}</td>
                    <td className="px-3 py-2 text-right">{item.inQty}</td>
                    <td className="px-3 py-2 text-right">{item.outQty}</td>
                    <td className="px-3 py-2 text-right">{item.currentStock}</td>
                    <td className="px-3 py-2 text-right">
                      {item.reorderLevel || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
