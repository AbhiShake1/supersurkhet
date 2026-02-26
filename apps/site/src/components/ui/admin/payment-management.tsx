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

export const PaymentManagement: AdminComponent = ({ slug }) => {
  return <_PaymentManagement slug={slug} />;
};

function _PaymentManagement({ slug }: PaymentManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: invoices = [] } = api.invoice.useGet({
    keys: [slug],
  });

  const paymentEntries = invoices.flatMap((invoice) =>
    getInvoicePayments(invoice).map((payment, index) => ({
      id: `${invoice._?.soul ?? 'invoice'}:${index}`,
      invoice,
      payment,
    })),
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPaymentEntries = paymentEntries.filter((entry) => {
    if (!normalizedSearch) return true;
    const invoiceId = entry.invoice._?.soul?.split('/').at(-1);
    const paidAt = entry.payment.paidAt
      ? format(new Date(entry.payment.paidAt), 'MMM dd, yyyy')
      : '';
    return (
      invoiceId?.toLowerCase().includes(normalizedSearch) ||
      paidAt.toLowerCase().includes(normalizedSearch) ||
      entry.invoice.paymentStatus?.toLowerCase().includes(normalizedSearch) ||
      entry.invoice.type?.toLowerCase().includes(normalizedSearch)
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

  const completedCount = invoices.filter(
    (invoice) => invoice.paymentStatus === 'paid',
  ).length;
  const pendingCount = invoices.filter(
    (invoice) => invoice.paymentStatus === 'pending',
  ).length;
  const partialCount = invoices.filter((invoice) =>
    invoice.paymentStatus?.startsWith('partial'),
  ).length;

  const totalPaidAmount = invoices.reduce(
    (sum, invoice) => sum + getInvoicePaidAmount(invoice),
    0,
  );

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
            {invoice.issuedAt
              ? format(new Date(invoice.issuedAt), 'MMM dd, yyyy')
              : 'N/A'}
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
          <AutoTable schema="invoice" slug={slug} />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
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
                      const paidAt = entry.payment.paidAt
                        ? format(new Date(entry.payment.paidAt), 'MMM dd, yyyy')
                        : 'N/A';
                      return (
                        <div
                          key={entry.id}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            #{entry.invoice._?.soul?.split('/').at(-1)} •{' '}
                            {paidAt}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(entry.payment.paidAmount ?? 0)}
                          </span>
                        </div>
                      );
                    })}
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
                      <span>Total Paid</span>
                      <span className="font-medium">
                        {formatCurrency(totalPaidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Outstanding</span>
                      <span className="font-medium">
                        {formatCurrency(
                          invoices.reduce(
                            (sum, invoice) =>
                              sum +
                              Math.max(
                                0,
                                getInvoiceTotalAmount(invoice) -
                                  getInvoicePaidAmount(invoice),
                              ),
                            0,
                          ),
                        )}
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
