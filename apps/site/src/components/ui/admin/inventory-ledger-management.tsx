'use client';

import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Box,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
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
import type { SalesItem } from '@/lib/schemas/retail';
import type { AdminComponent } from '.';

interface InventoryLedgerManagementProps {
  slug: string;
}

function isSalesItem(value: unknown): value is SalesItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.product === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity)
  );
}

function getSalesItems(items: unknown): SalesItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(isSalesItem);
}

export const InventoryLedgerManagement: AdminComponent = ({ slug }) => {
  return <_InventoryLedgerManagement slug={slug} />;
};

function _InventoryLedgerManagement({ slug }: InventoryLedgerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: stockImports = [],
    isLoading,
    error,
  } = api.stockImport.useGet({
    keys: [slug],
  });
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  });
  const { data: invoices = [] } = api.invoice.useGet({
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
          Error loading inventory ledger
        </h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  const inboundMovements = stockImports.flatMap((stockImport) =>
    getSalesItems(stockImport.items).map((item, index) => ({
      id: `${stockImport._?.soul ?? 'stock-import'}:in:${index}`,
      productId: item.product,
      quantity: item.quantity,
      date: stockImport.importDate,
      type: 'in' as const,
      referenceSoul: stockImport._?.soul,
    })),
  );
  const outboundMovements = invoices
    .filter((invoice) => invoice.type === 'sale')
    .flatMap((invoice) =>
      getSalesItems(invoice.items).map((item, index) => ({
        id: `${invoice._?.soul ?? 'invoice'}:out:${index}`,
        productId: item.product,
        quantity: item.quantity,
        date: invoice.issuedAt,
        type: 'out' as const,
        referenceSoul: invoice._?.soul,
      })),
    );
  const movements = [...inboundMovements, ...outboundMovements].sort((a, b) => {
    const aTimestamp = a.date ? new Date(a.date).getTime() : 0;
    const bTimestamp = b.date ? new Date(b.date).getTime() : 0;
    return bTimestamp - aTimestamp;
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredMovements = movements.filter((movement) => {
    if (!normalizedSearchQuery) return true;
    const product = products.find((row) => row._?.soul === movement.productId);
    const referenceId = movement.referenceSoul?.split('/').at(-1);
    const matchesSearch =
      product?.title?.toLowerCase().includes(normalizedSearchQuery) ||
      movement.type?.toLowerCase().includes(normalizedSearchQuery) ||
      referenceId?.toLowerCase().includes(normalizedSearchQuery) ||
      movement.quantity.toString().includes(normalizedSearchQuery);
    return matchesSearch;
  });

  const getTransactionTypeIcon = (
    type: (typeof movements)[number]['type'] | undefined,
  ) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="w-4 h-4" />;
      case 'out':
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <Box className="w-4 h-4" />;
    }
  };

  const getTransactionTypeBadgeVariant = (
    type: (typeof movements)[number]['type'] | undefined,
  ) => {
    switch (type) {
      case 'in':
        return 'default';
      case 'out':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const totalQuantityIn = movements
    .filter((movement) => movement.type === 'in')
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const totalQuantityOut = movements
    .filter((movement) => movement.type === 'out')
    .reduce((sum, movement) => sum + movement.quantity, 0);

  const renderMovementCard = (movement: (typeof filteredMovements)[number]) => {
    const product = products.find((row) => row._?.soul === movement.productId);
    const occurredAt = movement.date
      ? format(new Date(movement.date), 'MMM dd, yyyy')
      : 'N/A';
    const referenceId = movement.referenceSoul?.split('/').at(-1) ?? 'N/A';

    return (
      <div
        key={movement.id}
        className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              {getTransactionTypeIcon(movement.type)}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {product?.title || 'Product'}
              </h3>
              <Badge
                variant={getTransactionTypeBadgeVariant(movement.type)}
                className="mt-1 text-xs"
              >
                {movement.type === 'in' ? 'Inbound' : 'Outbound'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">
              {movement.type === 'in' ? '+' : '-'}
              {movement.quantity}
            </div>
            <div className="text-xs text-gray-500">{occurredAt}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Reference:</span>
            <span>#{referenceId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              Quantity {movement.type === 'in' ? 'In' : 'Out'}:
            </span>
            <span>{movement.quantity}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Date:</span>
            <span>{occurredAt}</span>
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
            Inventory Ledger Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track inventory movements and transactions
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            // Add entry functionality would go here
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Entries
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {movements.length}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Inbound
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    movements.filter((movement) => movement.type === 'in')
                      .length
                  }
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
                  Outbound
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    movements.filter((movement) => movement.type === 'out')
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
                  Net Movement
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalQuantityIn - totalQuantityOut}
                </p>
              </div>
              <Box className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search inventory entries by product, reference, or quantity..."
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
          <AutoTable schema="stockImport" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMovements.map((movement) => renderMovementCard(movement))}
          </div>
          {filteredMovements.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No inventory entries found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new entry
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>
                Overview of inventory movements and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Movement Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Inbound</span>
                      <span className="font-medium">
                        {
                          movements.filter((movement) => movement.type === 'in')
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outbound</span>
                      <span className="font-medium">
                        {
                          movements.filter(
                            (movement) => movement.type === 'out',
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Quantities</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total In</span>
                      <span className="font-medium">{totalQuantityIn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Out</span>
                      <span className="font-medium">{totalQuantityOut}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net</span>
                      <span>{totalQuantityIn - totalQuantityOut}</span>
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
