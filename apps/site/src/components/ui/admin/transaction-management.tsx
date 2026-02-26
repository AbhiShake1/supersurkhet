'use client';

import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Loader2,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/intl';
import {
  getInvoicePaidAmount,
  getInvoiceTotalAmount,
} from '@/lib/invoice-payments';
import type { AdminComponent } from '.';

interface TransactionManagementProps {
  slug: string;
}

type TransactionType = 'purchase' | 'sale';
type TransactionSource = 'invoice' | 'sale' | 'stockImport';

type TransactionRecord = {
  id: string;
  type: TransactionType;
  source: TransactionSource;
  referenceSoul?: string;
  issuedAt?: string;
  partyName: string;
  totalAmount: number;
  paidAmount: number;
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getIsoDateFromTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return new Date(value).toISOString();
}

function getDateTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateLabel(value?: string) {
  const timestamp = getDateTimestamp(value);
  if (!timestamp) return 'N/A';
  return format(new Date(timestamp), 'MMM dd, yyyy');
}

function getLegacyItemsTotal(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return sum;
    const item = rawItem as Record<string, unknown>;

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
      return sum + quantity * unitPrice;
    }

    const explicitTotal = Number(item.totalAmount);
    if (Number.isFinite(explicitTotal)) {
      return sum + explicitTotal;
    }

    return sum;
  }, 0);
}

function getLegacyPaidAmount(payments: unknown, fallbackPaidAmount: unknown) {
  if (Array.isArray(payments) && payments.length > 0) {
    const paidFromPayments = payments.reduce((sum, rawPayment) => {
      if (!rawPayment || typeof rawPayment !== 'object') return sum;
      const payment = rawPayment as Record<string, unknown>;
      const paidAmount = toFiniteNumber(payment.paidAmount);
      return paidAmount > 0 ? sum + paidAmount : sum;
    }, 0);

    if (paidFromPayments > 0) {
      return paidFromPayments;
    }
  }

  return toFiniteNumber(fallbackPaidAmount);
}

function getSourceLabel(source: TransactionSource) {
  switch (source) {
    case 'invoice':
      return 'Invoice';
    case 'stockImport':
      return 'Stock Import';
    default:
      return 'Sale';
  }
}

export const TransactionManagement: AdminComponent = ({ slug }) => {
  return <_TransactionManagement slug={slug} />;
};

function _TransactionManagement({ slug }: TransactionManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: invoices = [],
    isLoading,
    error,
  } = api.invoice.useGet({
    keys: [slug],
  });
  const { data: parties = [] } = api.party.useGet({
    keys: [slug],
  });
  const { data: customers = [] } = api.customer.useGet({
    keys: [slug],
  });
  const { data: sales = [] } = api.sale.useGet({
    keys: [slug],
  });
  const { data: stockImports = [] } = api.stockImport.useGet({
    keys: [slug],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Error loading transactions
        </h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  const partiesBySoul = new Map(
    parties.flatMap((party) =>
      party._?.soul ? ([[party._.soul, party]] as const) : [],
    ),
  );
  const customersBySoul = new Map(
    customers.flatMap((customer) =>
      customer._?.soul ? ([[customer._.soul, customer]] as const) : [],
    ),
  );

  const invoiceRecords: TransactionRecord[] = invoices.map(
    (invoice, index) => ({
      id: invoice._?.soul ?? `invoice:${index}`,
      type: invoice.type === 'purchase' ? 'purchase' : 'sale',
      source: 'invoice',
      referenceSoul: invoice._?.soul,
      issuedAt: invoice.issuedAt ?? getIsoDateFromTimestamp(invoice.timestamp),
      partyName:
        partiesBySoul.get(invoice.partyId ?? '')?.name ||
        customersBySoul.get(invoice.partyId ?? '')?.name ||
        'Unknown party',
      totalAmount: getInvoiceTotalAmount(invoice),
      paidAmount: getInvoicePaidAmount(invoice),
    }),
  );

  const legacySaleRecords: TransactionRecord[] = sales.map((sale, index) => ({
    id: sale._?.soul ?? `sale:${index}`,
    type: 'sale',
    source: 'sale',
    referenceSoul: sale._?.soul,
    issuedAt: sale.saleDate ?? getIsoDateFromTimestamp(sale.timestamp),
    partyName:
      customersBySoul.get(sale.customerId ?? '')?.name ||
      sale.customerName ||
      'Unknown customer',
    totalAmount: getLegacyItemsTotal(sale.items),
    paidAmount: getLegacyPaidAmount(sale.payments, sale.paidAmount),
  }));

  const legacyStockImportRecords: TransactionRecord[] = stockImports.map(
    (stockImport, index) => ({
      id: stockImport._?.soul ?? `stock-import:${index}`,
      type: 'purchase',
      source: 'stockImport',
      referenceSoul: stockImport._?.soul,
      issuedAt:
        stockImport.importDate ??
        getIsoDateFromTimestamp(stockImport.timestamp),
      partyName:
        partiesBySoul.get(stockImport.party ?? '')?.name || 'Unknown party',
      totalAmount: getLegacyItemsTotal(stockImport.items),
      paidAmount: getLegacyPaidAmount(
        stockImport.payments,
        stockImport.paidAmount,
      ),
    }),
  );

  const transactionRecords = [
    ...invoiceRecords,
    ...legacySaleRecords,
    ...legacyStockImportRecords,
  ].sort((a, b) => {
    const aTimestamp = getDateTimestamp(a.issuedAt);
    const bTimestamp = getDateTimestamp(b.issuedAt);
    return bTimestamp - aTimestamp;
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredTransactions = transactionRecords.filter((record) => {
    if (!normalizedSearchQuery) return true;
    const referenceId = record.referenceSoul?.split('/').at(-1);
    return (
      record.partyName.toLowerCase().includes(normalizedSearchQuery) ||
      record.type.toLowerCase().includes(normalizedSearchQuery) ||
      getSourceLabel(record.source)
        .toLowerCase()
        .includes(normalizedSearchQuery) ||
      referenceId?.toLowerCase().includes(normalizedSearchQuery)
    );
  });

  const totalPaidAmount = transactionRecords.reduce(
    (sum, record) => sum + record.paidAmount,
    0,
  );
  const totalPurchaseAmount = transactionRecords
    .filter((record) => record.type === 'purchase')
    .reduce((sum, record) => sum + record.totalAmount, 0);
  const totalSaleAmount = transactionRecords
    .filter((record) => record.type === 'sale')
    .reduce((sum, record) => sum + record.totalAmount, 0);
  const paymentCount = transactionRecords.filter(
    (record) => record.type === 'purchase',
  ).length;
  const receiptCount = transactionRecords.filter(
    (record) => record.type === 'sale',
  ).length;
  const legacyRecordCount = transactionRecords.length - invoices.length;

  const getTransactionTypeIcon = (type: TransactionType | undefined) => {
    switch (type) {
      case 'purchase':
        return <ArrowDown className="w-4 h-4" />;
      case 'sale':
        return <ArrowUp className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTransactionTypeBadgeVariant = (
    type: TransactionType | undefined,
  ) => {
    switch (type) {
      case 'purchase':
        return 'destructive';
      case 'sale':
        return 'default';
      default:
        return 'outline';
    }
  };

  const renderTransactionCard = (
    transaction: (typeof filteredTransactions)[number],
  ) => {
    const referenceId = transaction.referenceSoul?.split('/').at(-1) ?? 'N/A';
    const issuedOn = formatDateLabel(transaction.issuedAt);

    return (
      <div
        key={transaction.id}
        className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              {getTransactionTypeIcon(transaction.type)}
            </div>
            <div>
              <h3 className="font-semibold text-sm capitalize">
                {transaction.type}
              </h3>
              <Badge
                variant={getTransactionTypeBadgeVariant(transaction.type)}
                className="mt-1 text-xs"
              >
                {transaction.type}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">
              {formatCurrency(transaction.totalAmount)}
            </div>
            <div className="text-xs text-gray-500">{issuedOn}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Party:</span>
            <span>{transaction.partyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Reference:</span>
            <span>
              {getSourceLabel(transaction.source)} #{referenceId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Paid:</span>
            <span>{formatCurrency(transaction.paidAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{issuedOn}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Transaction Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage purchase and sale invoice flows
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            // Add transaction functionality would go here
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {transactionRecords.length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Payments
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {paymentCount}
                </p>
              </div>
              <ArrowDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receipts
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {receiptCount}
                </p>
              </div>
              <ArrowUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Paid
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalPaidAmount)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search transactions by party, reference, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="cards">Cards View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          {invoices.length === 0 && legacyRecordCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Table View lists invoices only. Legacy sale and stock import
              transactions are shown in Cards and Summary.
            </p>
          )}
          <AutoTable schema="invoice" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransactions.map((transaction) =>
              renderTransactionCard(transaction),
            )}
          </div>
          {filteredTransactions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No transactions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No invoice, sale, or stock import transactions matched your
                filters
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Transaction
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Summary</CardTitle>
              <CardDescription>
                Overview of transactions and financial metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Transaction Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Payments</span>
                      <span className="font-medium">{paymentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipts</span>
                      <span className="font-medium">{receiptCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Legacy Records</span>
                      <span className="font-medium">
                        {Math.max(0, legacyRecordCount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Financial Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Payments</span>
                      <span className="font-medium">
                        {formatCurrency(totalPurchaseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Receipts</span>
                      <span className="font-medium">
                        {formatCurrency(totalSaleAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net</span>
                      <span>
                        {formatCurrency(totalSaleAmount - totalPurchaseAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
