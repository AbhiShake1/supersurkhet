'use client';

import { format } from 'date-fns';
import {
  CheckCircle,
  Clock,
  RotateCcw,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { AutoKanban } from '@/components/auto-admin';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
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
  getInvoicePayments,
  getInvoiceTotalAmount,
} from '@/lib/invoice-payments';
import type { AdminComponent } from '.';

interface PaymentManagementProps {
  slug: string;
}

type PaymentSource = 'invoice' | 'sale' | 'stockImport';
type PaymentType = 'purchase' | 'sale';

type PaymentRecord = {
  id: string;
  source: PaymentSource;
  type: PaymentType;
  paymentStatus?: string;
  paidAmount: number;
  totalAmount: number;
  issuedAt?: string;
  referenceSoul?: string;
  referenceLabel: string;
  payments: Array<{
    paidAt?: string;
    paidAmount: number;
  }>;
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

function getLegacyPayments(
  payments: unknown,
  fallbackPaidAmount: unknown,
  fallbackPaidAt?: string,
) {
  if (Array.isArray(payments) && payments.length > 0) {
    const parsedPayments = payments.flatMap((rawPayment) => {
      if (!rawPayment || typeof rawPayment !== 'object') return [];
      const payment = rawPayment as Record<string, unknown>;
      const paidAmount = toFiniteNumber(payment.paidAmount);
      if (paidAmount <= 0) return [];
      return [
        {
          paidAt:
            typeof payment.paidAt === 'string'
              ? payment.paidAt
              : fallbackPaidAt,
          paidAmount,
        },
      ];
    });
    if (parsedPayments.length > 0) {
      return parsedPayments;
    }
  }

  const fallbackAmount = toFiniteNumber(fallbackPaidAmount);
  if (fallbackAmount <= 0) return [];
  return [{ paidAt: fallbackPaidAt, paidAmount: fallbackAmount }];
}

function normalizePaymentStatus({
  rawStatus,
  paidAmount,
  totalAmount,
}: {
  rawStatus: unknown;
  paidAmount: number;
  totalAmount: number;
}) {
  if (typeof rawStatus === 'string' && rawStatus.trim().length > 0) {
    return rawStatus;
  }
  if (paidAmount <= 0) return 'pending';
  if (totalAmount <= 0 || paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

export const PaymentManagement: AdminComponent = ({ slug }) => {
  return <_PaymentManagement slug={slug} />;
};

function _PaymentManagement({ slug }: PaymentManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: invoices = [] } = api.invoice.useGet({
    keys: [slug],
  });
  const { data: sales = [] } = api.sale.useGet({
    keys: [slug],
  });
  const { data: stockImports = [] } = api.stockImport.useGet({
    keys: [slug],
  });

  const invoicePaymentRecords: PaymentRecord[] = invoices.map(
    (invoice, index) => {
      const payments = getInvoicePayments(invoice)
        .map((payment) => ({
          paidAt: payment.paidAt,
          paidAmount: toFiniteNumber(payment.paidAmount),
        }))
        .filter((payment) => payment.paidAmount > 0);

      return {
        id: invoice._?.soul ?? `invoice:${index}`,
        source: 'invoice',
        type: invoice.type === 'purchase' ? 'purchase' : 'sale',
        paymentStatus: normalizePaymentStatus({
          rawStatus: invoice.paymentStatus,
          paidAmount: getInvoicePaidAmount(invoice),
          totalAmount: getInvoiceTotalAmount(invoice),
        }),
        paidAmount: getInvoicePaidAmount(invoice),
        totalAmount: getInvoiceTotalAmount(invoice),
        issuedAt:
          invoice.issuedAt ?? getIsoDateFromTimestamp(invoice.timestamp),
        referenceSoul: invoice._?.soul,
        referenceLabel: 'Invoice',
        payments,
      };
    },
  );

  const legacySalePaymentRecords: PaymentRecord[] = sales.map((sale, index) => {
    const issuedAt = sale.saleDate ?? getIsoDateFromTimestamp(sale.timestamp);
    const payments = getLegacyPayments(
      sale.payments,
      sale.paidAmount,
      issuedAt,
    );
    const paidAmount = payments.reduce(
      (sum, payment) => sum + payment.paidAmount,
      0,
    );
    const totalAmount = getLegacyItemsTotal(sale.items);

    return {
      id: sale._?.soul ?? `sale:${index}`,
      source: 'sale',
      type: 'sale',
      paymentStatus: normalizePaymentStatus({
        rawStatus: sale.paymentStatus,
        paidAmount,
        totalAmount,
      }),
      paidAmount,
      totalAmount,
      issuedAt,
      referenceSoul: sale._?.soul,
      referenceLabel: 'Sale',
      payments,
    };
  });

  const legacyStockImportPaymentRecords: PaymentRecord[] = stockImports.map(
    (stockImport, index) => {
      const issuedAt =
        stockImport.importDate ??
        getIsoDateFromTimestamp(stockImport.timestamp);
      const payments = getLegacyPayments(
        stockImport.payments,
        stockImport.paidAmount,
        issuedAt,
      );
      const paidAmount = payments.reduce(
        (sum, payment) => sum + payment.paidAmount,
        0,
      );
      const totalAmount = getLegacyItemsTotal(stockImport.items);

      return {
        id: stockImport._?.soul ?? `stock-import:${index}`,
        source: 'stockImport',
        type: 'purchase',
        paymentStatus: normalizePaymentStatus({
          rawStatus: stockImport.paymentStatus,
          paidAmount,
          totalAmount,
        }),
        paidAmount,
        totalAmount,
        issuedAt,
        referenceSoul: stockImport._?.soul,
        referenceLabel: 'Stock Import',
        payments,
      };
    },
  );

  const paymentRecords = [
    ...invoicePaymentRecords,
    ...legacySalePaymentRecords,
    ...legacyStockImportPaymentRecords,
  ];

  const paymentEntries = paymentRecords
    .flatMap((record) =>
      record.payments.map((payment, index) => ({
        id: `${record.id}:payment:${index}`,
        record,
        payment,
      })),
    )
    .sort((a, b) => {
      const aTimestamp = getDateTimestamp(a.payment.paidAt);
      const bTimestamp = getDateTimestamp(b.payment.paidAt);
      return bTimestamp - aTimestamp;
    });

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPaymentEntries = paymentEntries.filter((entry) => {
    if (!normalizedSearch) return true;
    const referenceId = entry.record.referenceSoul?.split('/').at(-1);
    const paidAt = formatDateLabel(entry.payment.paidAt);
    return (
      referenceId?.toLowerCase().includes(normalizedSearch) ||
      paidAt.toLowerCase().includes(normalizedSearch) ||
      entry.record.paymentStatus?.toLowerCase().includes(normalizedSearch) ||
      entry.record.type?.toLowerCase().includes(normalizedSearch) ||
      entry.record.referenceLabel.toLowerCase().includes(normalizedSearch)
    );
  });

  const getStatusBadgeVariant = (status: string | undefined) => {
    if (!status || status === 'pending') return 'secondary';
    if (status === 'paid') return 'default';
    if (status.startsWith('partial')) return 'outline';
    if (status.startsWith('overpaid')) return 'destructive';
    return 'secondary';
  };

  const getStatusIcon = (status: string | undefined) => {
    if (status === 'paid') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status?.startsWith('partial')) {
      return <RotateCcw className="w-4 h-4" />;
    }
    if (status?.startsWith('overpaid')) {
      return <XCircle className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const completedCount = paymentRecords.filter(
    (record) => record.paymentStatus === 'paid',
  ).length;
  const pendingCount = paymentRecords.filter(
    (record) => record.paymentStatus === 'pending',
  ).length;
  const partialCount = paymentRecords.filter((record) =>
    record.paymentStatus?.startsWith('partial'),
  ).length;

  const totalPaidAmount = paymentRecords.reduce(
    (sum, record) => sum + record.paidAmount,
    0,
  );
  const totalOutstandingAmount = paymentRecords.reduce(
    (sum, record) => sum + Math.max(0, record.totalAmount - record.paidAmount),
    0,
  );
  const legacyRecordCount = paymentRecords.length - invoices.length;

  const renderPaymentCard = (invoice: (typeof invoices)[number]) => {
    const invoiceId = invoice._?.soul?.split('/').at(-1) ?? 'N/A';
    const totalAmount = getInvoiceTotalAmount(invoice);
    const paidAmount = getInvoicePaidAmount(invoice);
    return (
      <div className="rounded-md border bg-card p-3 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">Invoice #{invoiceId}</span>
          <Badge
            variant={getStatusBadgeVariant(invoice.paymentStatus)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(invoice.paymentStatus)}
            <span className="capitalize">
              {invoice.paymentStatus || 'pending'}
            </span>
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">
            {formatCurrency(paidAmount)}
          </span>
          <span className="text-xs text-gray-500">
            {formatDateLabel(invoice.issuedAt)}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          Total: {formatCurrency(totalAmount)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Payment Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage invoice payments and settlement status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Payments
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {paymentEntries.length}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Completed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {completedCount}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Partial
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {partialCount}
                </p>
              </div>
              <RotateCcw className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search payments by invoice, status, date, or type..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          {invoices.length === 0 && legacyRecordCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Table View lists invoices only. Legacy sale and stock import
              payment records are shown in Summary.
            </p>
          )}
          <AutoTable schema="invoice" slug={slug} />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          {invoices.length === 0 && legacyRecordCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kanban View groups invoice records. Use Summary to review legacy
              payment data.
            </p>
          )}
          <AutoKanban
            slug={slug}
            cardBuilder={(invoice) => renderPaymentCard(invoice)}
            groupKey="paymentStatus"
            schema="invoice"
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>
                Overview of payment activity and settlement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Recent Payments</h3>
                  <div className="space-y-2">
                    {filteredPaymentEntries.slice(0, 8).map((entry) => {
                      const referenceId =
                        entry.record.referenceSoul?.split('/').at(-1) ?? 'N/A';
                      const paidAt = formatDateLabel(entry.payment.paidAt);
                      return (
                        <div
                          key={entry.id}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {entry.record.referenceLabel} #{referenceId} •{' '}
                            {paidAt}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(entry.payment.paidAmount ?? 0)}
                          </span>
                        </div>
                      );
                    })}
                    {filteredPaymentEntries.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No payment entries matched your filters.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Totals</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Invoices</span>
                      <span>{invoices.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Legacy Records</span>
                      <span>{Math.max(0, legacyRecordCount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Paid</span>
                      <span className="font-medium">
                        {formatCurrency(totalPaidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Outstanding</span>
                      <span className="font-medium">
                        {formatCurrency(totalOutstandingAmount)}
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
