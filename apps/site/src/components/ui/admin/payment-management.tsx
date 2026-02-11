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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import type { AdminComponent } from '.';
import { api } from '@/lib/api';
import _ from 'lodash';
import { format } from 'date-fns';
import { AutoKanban } from '@/components/auto-admin';
import { AutoTable } from '@/components/auto-table';

interface PaymentManagementProps {
  slug: string;
}

export const PaymentManagement: AdminComponent = ({ slug }) => {
  return <_PaymentManagement slug={slug} />;
};

function _PaymentManagement({ slug }: PaymentManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: payments = [] } = api.paymentTransaction.useGet({
    keys: [slug],
  });
  // const { mutate: update } = api.paymentTransaction.useUpdate({ keys: [slug] })

  const _filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.transactionId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      payment.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'secondary';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <RotateCcw className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'refunded':
        return <RotateCcw className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const PaymentCard = ({ payment }: { payment: any }) => {
    return (
      <div className="rounded-md border bg-card p-3 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">
            {payment.description || 'Payment'}
          </span>
          <Badge
            variant={getStatusBadgeVariant(payment.status)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(payment.status)}
            <span className="capitalize">{payment.status}</span>
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">
            {payment.currency} {payment.amount?.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">
            {payment.processedAt
              ? format(new Date(payment.processedAt), 'MMM dd, yyyy')
              : 'N/A'}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          ID: {payment.transactionId || 'N/A'}
        </div>
        {payment.customerId && (
          <div className="text-xs text-gray-500 truncate">
            Customer: {payment.customerId}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Payment Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage payment transactions and view financial data
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Payments
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {payments.length}
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
                  {payments.filter((p) => p.status === 'completed').length}
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
                  {payments.filter((p) => p.status === 'pending').length}
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
                  Failed
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {payments.filter((p) => p.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search payments by ID, customer, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <AutoTable schema="paymentTransaction" slug={slug} />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <AutoKanban
            slug={slug}
            cardBuilder={(payment) => <PaymentCard payment={payment} />}
            groupKey="status"
            schema="paymentTransaction"
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>
                Overview of payment transactions and financial metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Payment Methods</h3>
                  <div className="space-y-2">
                    {_.uniqBy(payments, 'paymentMethod').map((method) => (
                      <div
                        key={method.paymentMethod}
                        className="flex justify-between"
                      >
                        <span className="capitalize">
                          {method.paymentMethod || 'N/A'}
                        </span>
                        <span>
                          {
                            payments.filter(
                              (p) => p.paymentMethod === method.paymentMethod,
                            ).length
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {[...payments]
                      .sort(
                        (a, b) =>
                          new Date(b.processedAt || '').getTime() -
                          new Date(a.processedAt || '').getTime(),
                      )
                      .slice(0, 5)
                      .map((payment) => (
                        <div
                          key={payment._?.soul}
                          className="flex justify-between text-sm"
                        >
                          <span className="truncate max-w-[120px]">
                            {payment.description || 'Payment'}
                          </span>
                          <span className="font-medium">
                            {payment.currency} {payment.amount?.toFixed(2)}
                          </span>
                        </div>
                      ))}
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
