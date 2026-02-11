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
  Calendar,
  ArrowUpDown,
  DollarSign,
  Loader2,
  AlertCircle,
  Users,
  ShoppingCart,
  Package,
} from 'lucide-react';
import type { AdminComponent } from '.';
import { api } from '@/lib/api';
import _ from 'lodash';
import { format } from 'date-fns';
import type { Invoice } from '@/lib/schema';

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
      (sum, inv) => sum + (inv.subTotal || 0),
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
      (sum, inv) => sum + (inv.subTotal || 0),
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
    invoice: Invoice & { _?: { soul: string } };
  }) => {
    // Determine if this is a party or customer invoice
    const party = parties.find((p) => p._?.soul === invoice.partyId);
    const customer = customers.find((c) => c._?.soul === invoice.customerId);

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-accent/50 hover:scale-[1.02]">
        <CardHeader className="">
          <div className="flex items-start justify-start gap-2 flex-col">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  #{invoice._?.soul?.split('/').at(-1)}
                </h3>
                <Badge
                  variant={getInvoiceTypeBadgeVariant(invoice.type)}
                  className="mt-1 text-xs"
                >
                  {invoice.type}
                </Badge>
              </div>
            </div>
            <div className="">
              <div className="font-bold text-lg text-primary">
                Rs. {invoice.subTotal?.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {invoice.issuedAt &&
                  format(new Date(invoice.issuedAt), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {party && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{party.name}</span>
              </div>
            )}
            {customer && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{customer.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              {invoice.issuedAt && (
                <span>
                  {format(new Date(invoice.issuedAt), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Subtotal
                </span>
                <div className="font-medium">
                  Rs. {invoice.subTotal?.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Tax
                </span>
                <div className="font-medium">Rs. {invoice.tax?.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                Rs. {invoice.subTotal?.toFixed(2)}
              </span>
            </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              Rs.{' '}
              {invoices
                .reduce((sum, inv) => sum + (inv.subTotal || 0), 0)
                .toFixed(2)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
