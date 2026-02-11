'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Currency,
  Calendar,
  ArrowDown,
  ArrowUp,
  Plus,
  Wallet,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { AdminComponent } from '.';
import { api } from '@/lib/api';
import _ from 'lodash';
import { format } from 'date-fns';
import { AutoTable } from '@/components/auto-table';
import type { Transaction, Party, Invoice } from '@/lib/schema';

interface TransactionManagementProps {
  slug: string;
}

export const TransactionManagement: AdminComponent = ({ slug }) => {
  return <_TransactionManagement slug={slug} />;
};

function _TransactionManagement({ slug }: TransactionManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: transactions = [],
    isLoading,
    error,
  } = api.transaction.useGet({
    keys: [slug],
  });
  const { data: parties = [] } = api.party.useGet({
    keys: [slug],
  });
  const { data: invoices = [] } = api.invoice.useGet({
    keys: [slug],
  });

  const createMutation = api.transaction.useCreate();
  const updateMutation = api.transaction.useUpdate();
  const deleteMutation = api.transaction.useDelete();

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

  const filteredTransactions = transactions.filter((transaction) => {
    const party = parties.find((p) => p._?.soul === transaction.partyId);
    const invoice = invoices.find((i) => i._?.soul === transaction.invoiceId);
    const matchesSearch =
      party?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice?.invoiceNumber
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowDown className="w-4 h-4" />;
      case 'receipt':
        return <ArrowUp className="w-4 h-4" />;
      case 'deposit':
        return <Wallet className="w-4 h-4" />;
      default:
        return <Currency className="w-4 h-4" />;
    }
  };

  const getTransactionTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'payment':
        return 'destructive';
      case 'receipt':
        return 'default';
      case 'deposit':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const TransactionCard = ({
    transaction,
  }: {
    transaction: Transaction & { _?: { soul: string } };
  }) => {
    const party = parties.find((p) => p._?.soul === transaction.partyId);
    const invoice = invoices.find((i) => i._?.soul === transaction.invoiceId);

    return (
      <div className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3">
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
              Rs. {transaction.amount?.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(transaction.date), 'MMM dd, yyyy')}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {party && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Party:</span>
              <span>{party.name}</span>
            </div>
          )}
          {invoice && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Invoice:</span>
              <span>#{invoice.invoiceNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
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
            Manage payments, receipts, and deposits
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
                  {transactions.length}
                </p>
              </div>
              <Currency className="w-8 h-8 text-gray-400" />
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
                  {transactions.filter((t) => t.type === 'payment').length}
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
                  {transactions.filter((t) => t.type === 'receipt').length}
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
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  Rs.{' '}
                  {transactions
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                    .toFixed(2)}
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
          <AutoTable schema="transaction" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction._?.soul}
                transaction={transaction}
              />
            ))}
          </div>
          {filteredTransactions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Currency className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                          transactions.filter((t) => t.type === 'payment')
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipts</span>
                      <span className="font-medium">
                        {
                          transactions.filter((t) => t.type === 'receipt')
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deposits</span>
                      <span className="font-medium">
                        {
                          transactions.filter((t) => t.type === 'deposit')
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
                        Rs.{' '}
                        {transactions
                          .filter((t) => t.type === 'payment')
                          .reduce((sum, trans) => sum + (trans.amount || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Receipts</span>
                      <span className="font-medium">
                        Rs.{' '}
                        {transactions
                          .filter((t) => t.type === 'receipt')
                          .reduce((sum, trans) => sum + (trans.amount || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net</span>
                      <span>
                        Rs.{' '}
                        {(
                          transactions
                            .filter((t) => t.type === 'receipt')
                            .reduce(
                              (sum, trans) => sum + (trans.amount || 0),
                              0,
                            ) -
                          transactions
                            .filter((t) => t.type === 'payment')
                            .reduce(
                              (sum, trans) => sum + (trans.amount || 0),
                              0,
                            )
                        ).toFixed(2)}
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
