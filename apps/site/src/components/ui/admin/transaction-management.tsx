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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredInvoices = invoices.filter((invoice) => {
    if (!normalizedSearchQuery) return true;
    const party = parties.find((row) => row._?.soul === invoice.partyId);
    const customer = customers.find((row) => row._?.soul === invoice.partyId);
    const invoiceId = invoice._?.soul?.split('/').at(-1);
    const matchesSearch =
      party?.name?.toLowerCase().includes(normalizedSearchQuery) ||
      customer?.name?.toLowerCase().includes(normalizedSearchQuery) ||
      invoice.type?.toLowerCase().includes(normalizedSearchQuery) ||
      invoiceId?.toLowerCase().includes(normalizedSearchQuery);
    return matchesSearch;
  });

  const totalPaidAmount = invoices.reduce(
    (sum, invoice) => sum + getInvoicePaidAmount(invoice),
    0,
  );
  const totalPurchaseAmount = invoices
    .filter((invoice) => invoice.type === 'purchase')
    .reduce((sum, invoice) => sum + getInvoiceTotalAmount(invoice), 0);
  const totalSaleAmount = invoices
    .filter((invoice) => invoice.type === 'sale')
    .reduce((sum, invoice) => sum + getInvoiceTotalAmount(invoice), 0);

  const getTransactionTypeIcon = (
    type: (typeof invoices)[number]['type'] | undefined,
  ) => {
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
    type: (typeof invoices)[number]['type'] | undefined,
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
    invoice: (typeof filteredInvoices)[number],
  ) => {
    const party = parties.find((row) => row._?.soul === invoice.partyId);
    const customer = customers.find((row) => row._?.soul === invoice.partyId);
    const totalAmount = getInvoiceTotalAmount(invoice);
    const paidAmount = getInvoicePaidAmount(invoice);
    const invoiceId = invoice._?.soul?.split('/').at(-1) ?? 'N/A';
    const issuedOn = invoice.issuedAt
      ? format(new Date(invoice.issuedAt), 'MMM dd, yyyy')
      : 'N/A';
    const displayName = party?.name || customer?.name || 'Unknown party';

    return (
      <div
        key={invoice._?.soul}
        className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              {getTransactionTypeIcon(invoice.type)}
            </div>
            <div>
              <h3 className="font-semibold text-sm capitalize">
                {invoice.type}
              </h3>
              <Badge
                variant={getTransactionTypeBadgeVariant(invoice.type)}
                className="mt-1 text-xs"
              >
                {invoice.type}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-xs text-gray-500">{issuedOn}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Party:</span>
            <span>{displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Invoice:</span>
            <span>#{invoiceId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Paid:</span>
            <span>{formatCurrency(paidAmount)}</span>
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
                  {invoices.length}
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
                  {
                    invoices.filter((invoice) => invoice.type === 'purchase')
                      .length
                  }
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
                  {invoices.filter((invoice) => invoice.type === 'sale').length}
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
          placeholder="Search transactions by party, invoice, or type..."
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
          <AutoTable schema="invoice" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvoices.map((invoice) => renderTransactionCard(invoice))}
          </div>
          {filteredInvoices.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No transactions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new transaction
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
                      <span className="font-medium">
                        {
                          invoices.filter(
                            (invoice) => invoice.type === 'purchase',
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipts</span>
                      <span className="font-medium">
                        {
                          invoices.filter((invoice) => invoice.type === 'sale')
                            .length
                        }
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
