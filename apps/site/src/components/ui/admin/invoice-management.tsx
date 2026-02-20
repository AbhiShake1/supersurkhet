'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  DollarSign,
  Loader2,
  AlertCircle,
  Users,
  ShoppingCart,
  Package,
  CheckCircle2,
  HandCoins,
} from 'lucide-react';
import type { AdminComponent } from '.';
import { api } from '@/lib/api';
import _ from 'lodash';
import { format } from 'date-fns';
import type { Invoice } from '@/lib/schema';
import { formatCurrency } from '@/lib/intl';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  getInvoiceOutstandingAmount,
  getInvoicePaidAmount,
  getInvoicePaymentProgress,
  getInvoicePayments,
  getInvoiceTotalAmount,
} from '@/lib/invoice-payments';

interface InvoiceManagementProps {
  slug: string;
}

export const InvoiceManagement: AdminComponent = ({ slug }) => {
  return <_InvoiceManagement slug={slug} />;
};

function _InvoiceManagement({ slug }: InvoiceManagementProps) {
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
  const totalPaidAmount = invoices.reduce(
    (sum, inv) => sum + getInvoicePaidAmount(inv),
    0,
  );
  const totalOutstandingAmount = invoices.reduce(
    (sum, inv) => sum + Math.max(0, getInvoiceOutstandingAmount(inv)),
    0,
  );

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
          Error loading invoices
        </h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  // Separate invoices by type
  const purchaseInvoices = invoices.filter(
    (invoice) => invoice.type === 'purchase',
  );
  const saleInvoices = invoices.filter((invoice) => invoice.type === 'sale');

  // Group purchase invoices by party
  const groupedPurchaseInvoices = _.groupBy(purchaseInvoices, 'partyId');

  // Group sale invoices by customer
  const groupedSaleInvoices = _.groupBy(saleInvoices, 'partyId');

  // Filter parties based on search query
  const filteredParties = parties.filter((party) => {
    if (!searchQuery) return true;
    return (
      party.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.panNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    return (
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate stats for each party (only purchases)
  const partyStats = filteredParties.map((party) => {
    const partyInvoices = groupedPurchaseInvoices[party._?.soul || ''] || [];
    const totalAmount = partyInvoices.reduce(
      (sum, inv) => sum + getInvoiceTotalAmount(inv),
      0,
    );
    const purchaseCount = partyInvoices.length;

    return {
      party,
      invoices: partyInvoices,
      totalAmount,
      purchaseCount,
    };
  });

  // Calculate stats for each customer (only sales)
  const customerStats = filteredCustomers.map((customer) => {
    const customerInvoices = groupedSaleInvoices[customer._?.soul || ''] || [];
    const totalAmount = customerInvoices.reduce(
      (sum, inv) => sum + getInvoiceTotalAmount(inv),
      0,
    );
    const salesCount = customerInvoices.length;

    return {
      customer,
      invoices: customerInvoices,
      totalAmount,
      salesCount,
    };
  });

  const getInvoiceTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'secondary';
      case 'sale':
        return 'default';
      default:
        return 'outline';
    }
  };

  const InvoiceCard = ({
    invoice,
  }: {
    invoice: Invoice;
  }) => {
    // Determine if this is a party or customer invoice
    const party = parties.find((p) => p._?.soul === invoice.partyId);
    const customer = customers.find((c) => c._?.soul === invoice.partyId);
    const totalAmount = getInvoiceTotalAmount(invoice);
    const paidAmount = getInvoicePaidAmount(invoice);
    const outstandingAmount = getInvoiceOutstandingAmount(invoice);
    const paymentProgress = getInvoicePaymentProgress(invoice);
    const payments = getInvoicePayments(invoice)
      .filter((payment) => payment.paidAmount && payment.paidAmount > 0)
      .sort((a, b) => {
        const aDate = a.paidAt ? new Date(a.paidAt).getTime() : 0;
        const bDate = b.paidAt ? new Date(b.paidAt).getTime() : 0;
        return bDate - aDate;
      });
    const displayName = party?.name || customer?.name || 'Unknown party';
    const issuedOn = invoice.issuedAt
      ? format(new Date(invoice.issuedAt), 'dd MMM yyyy')
      : 'N/A';
    const dueOn = invoice.dueDate
      ? format(new Date(invoice.dueDate), 'dd MMM yyyy')
      : 'N/A';
    const lastPaymentOn = payments[0]?.paidAt
      ? format(new Date(payments[0].paidAt), 'dd MMM yyyy')
      : 'N/A';
    const isSettled = outstandingAmount <= 0;

    return (
      <Card className="group border-l-4 border-l-accent/60 transition-all duration-200 hover:shadow-lg">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-sm sm:text-base">
                  #{invoice._?.soul?.split('/').at(-1)}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {displayName}
                </p>
                <div className="tabular-nums text-lg font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </div>

              </div>
            </div>

            <div className="text-right">
              <div className="mt-1 flex flex-col items-end gap-1.5">
                <Badge
                  variant={getInvoiceTypeBadgeVariant(invoice.type)}
                  className={cn(
                    'text-[10px] uppercase tracking-wide',
                    invoice.type === 'purchase' &&
                    'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300'
                  )}  >
                  {invoice.type}
                </Badge>

                <Badge
                  variant={isSettled ? 'default' : 'secondary'}
                  className={cn(
                    'text-[10px] uppercase tracking-wide',
                    isSettled
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200',
                  )}
                >
                  {isSettled ? 'settled' : 'due'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Issued
              </p>
              <p className="mt-0.5 font-medium">{issuedOn}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Due
              </p>
              <p className="mt-0.5 font-medium">{dueOn}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Payments
              </p>
              <p className="mt-0.5 font-medium">{payments.length}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Last Paid
              </p>
              <p className="mt-0.5 font-medium">{lastPaymentOn}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-lg border bg-card/70 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums font-medium">
                {formatCurrency(invoice.subTotal)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums font-medium">
                {formatCurrency(invoice.tax)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              <span className="font-semibold">Invoice Total</span>
              <span className="tabular-nums text-base font-bold text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-card/70 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums font-semibold">
                {formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Outstanding</span>
              <span
                className={cn(
                  'tabular-nums font-semibold',
                  outstandingAmount > 0
                    ? 'text-amber-600 dark:text-amber-300'
                    : 'text-emerald-600 dark:text-emerald-300',
                )}
              >
                {formatCurrency(Math.max(outstandingAmount, 0))}
              </span>
            </div>
            <Progress className="mt-2 h-2" value={paymentProgress} />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{payments.length} payments logged</span>
              <span>{paymentProgress.toFixed(0)}% complete</span>
            </div>

            {payments.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Recent Payments
                </p>
                <div className="space-y-1">
                  {payments.slice(0, 2).map((payment, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                      key={`${payment.paidAt}-${index}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">
                        {payment.paidAt
                          ? format(new Date(payment.paidAt), 'dd MMM yyyy')
                          : 'Unknown date'}
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(payment.paidAmount ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Invoice Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View invoices grouped by parties (purchases) and customers (sales)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Package className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Total Parties
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 z-10">
              {parties.length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Users className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Total Customers
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 z-10">
              {customers.length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <FileText className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Total Invoices
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 z-10">
              {invoices.length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Sales
            </p>
            <p className="text-2xl font-bold text-green-600 z-10">
              {saleInvoices.length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <DollarSign className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Total Amount
            </p>
            <p className="text-2xl font-bold text-purple-600 z-10">
              {formatCurrency(
                invoices.reduce((sum, inv) => sum + getInvoiceTotalAmount(inv), 0),
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-200/60 dark:border-emerald-900/40">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Total Paid
            </p>
            <p className="text-2xl font-bold text-emerald-600 z-10 tabular-nums">
              {formatCurrency(totalPaidAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-200/60 dark:border-amber-900/40">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <HandCoins className="absolute inset-0 w-full h-full opacity-5 flex items-center justify-center" />
            <p className="text-sm text-gray-600 dark:text-gray-400 z-10">
              Outstanding
            </p>
            <p className="text-2xl font-bold text-amber-600 z-10 tabular-nums">
              {formatCurrency(totalOutstandingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search parties or customers by name, phone, or PAN..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leadingIcon={<Search className="h-4 w-4" />}
      />

      {/* Purchase Invoices by Party */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-500" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Purchase Invoices (Parties)
          </h3>
        </div>

        {partyStats.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No parties found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search
            </p>
          </div>
        ) : (
          partyStats.map(({ party, invoices, totalAmount, purchaseCount }) => (
            <Card
              key={party._?.soul}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-gray-500" />
                      {party.name}
                    </CardTitle>
                    <CardDescription>
                      {[party.phone, party.panNumber]
                        .filter(Boolean)
                        .join(' • ')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      Rs. {totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {purchaseCount} purchases
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {invoices.map((invoice) => (
                      <InvoiceCard key={invoice._?.soul} invoice={invoice} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No purchase invoices for this party
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sale Invoices by Customer */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Sale Invoices (Customers)
          </h3>
        </div>

        {customerStats.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No customers found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search
            </p>
          </div>
        ) : (
          customerStats.map(
            ({ customer, invoices, totalAmount, salesCount }) => (
              <Card
                key={customer._?.soul}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        {customer.name}
                      </CardTitle>
                      <CardDescription>{customer.phone}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        Rs. {totalAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {salesCount} sales
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoices.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {invoices.map((invoice) => (
                        <InvoiceCard key={invoice._?.soul} invoice={invoice} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No sale invoices for this customer
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          )
        )}
      </div>
    </div>
  );
}
