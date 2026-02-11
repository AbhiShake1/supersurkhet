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
  Box,
  ArrowUp,
  ArrowDown,
  Plus,
  ShoppingCart,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { AdminComponent } from '.';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { AutoTable } from '@/components/auto-table';
import type { InventoryLedger, } from '@/lib/schema';

interface InventoryLedgerManagementProps {
  slug: string;
}

export const InventoryLedgerManagement: AdminComponent = ({ slug }) => {
  return <_InventoryLedgerManagement slug={slug} />;
};

function _InventoryLedgerManagement({ slug }: InventoryLedgerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: inventoryLedgers = [],
    isLoading,
    error,
  } = api.inventoryLedger.useGet({
    keys: [slug],
  });
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  });
  const { data: invoices = [] } = api.invoice.useGet({
    keys: [slug],
  });

  const _createMutation = api.inventoryLedger.useCreate();
  const _updateMutation = api.inventoryLedger.useUpdate();
  const _deleteMutation = api.inventoryLedger.useDelete();

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

  const filteredInventoryLedgers = inventoryLedgers.filter((ledger) => {
    const product = products.find((p) => p._?.soul === ledger.productId);
    const invoice = invoices.find((i) => i._?.soul === ledger.invoiceId);
    const matchesSearch =
      product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice?.invoiceNumber
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      ledger.quantityIn?.toString().includes(searchQuery.toLowerCase()) ||
      ledger.quantityOut?.toString().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getTransactionType = (ledger: InventoryLedger) => {
    return ledger.quantityIn > 0 ? 'in' : 'out';
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="w-4 h-4" />;
      case 'out':
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <Box className="w-4 h-4" />;
    }
  };

  const getTransactionTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'in':
        return 'default';
      case 'out':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const InventoryLedgerCard = ({
    ledger,
  }: {
    ledger: InventoryLedger & { _?: { soul: string } };
  }) => {
    const product = products.find((p) => p._?.soul === ledger.productId);
    const invoice = invoices.find((i) => i._?.soul === ledger.invoiceId);
    const type = getTransactionType(ledger);

    return (
      <div className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              {getTransactionTypeIcon(type)}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {product?.name || 'Product'}
              </h3>
              <Badge
                variant={getTransactionTypeBadgeVariant(type)}
                className="mt-1 text-xs"
              >
                {type === 'in' ? 'Inbound' : 'Outbound'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">
              {type === 'in' ? '+' : '-'}
              {type === 'in' ? ledger.quantityIn : ledger.quantityOut}
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(ledger.date), 'MMM dd, yyyy')}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {invoice && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Invoice:</span>
              <span>#{invoice.invoiceNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              Quantity {type === 'in' ? 'In' : 'Out'}:
            </span>
            <span>
              {type === 'in' ? ledger.quantityIn : ledger.quantityOut}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Date:</span>
            <span>{format(new Date(ledger.date), 'MMM dd, yyyy')}</span>
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
                  {inventoryLedgers.length}
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
                  {inventoryLedgers.filter((l) => l.quantityIn > 0).length}
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
                  {inventoryLedgers.filter((l) => l.quantityOut > 0).length}
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
                  {inventoryLedgers.reduce(
                    (sum, l) =>
                      sum + (l.quantityIn || 0) - (l.quantityOut || 0),
                    0,
                  )}
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
          placeholder="Search inventory entries by product, invoice, or quantity..."
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
          <AutoTable schema="inventoryLedger" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventoryLedgers.map((ledger) => (
              <InventoryLedgerCard key={ledger._?.soul} ledger={ledger} />
            ))}
          </div>
          {filteredInventoryLedgers.length === 0 && !isLoading && (
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
                          inventoryLedgers.filter((l) => l.quantityIn > 0)
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outbound</span>
                      <span className="font-medium">
                        {
                          inventoryLedgers.filter((l) => l.quantityOut > 0)
                            .length
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
                      <span className="font-medium">
                        {inventoryLedgers.reduce(
                          (sum, l) => sum + (l.quantityIn || 0),
                          0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Out</span>
                      <span className="font-medium">
                        {inventoryLedgers.reduce(
                          (sum, l) => sum + (l.quantityOut || 0),
                          0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net</span>
                      <span>
                        {inventoryLedgers.reduce(
                          (sum, l) =>
                            sum + (l.quantityIn || 0) - (l.quantityOut || 0),
                          0,
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
