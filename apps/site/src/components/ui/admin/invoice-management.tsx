"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileText,
  Calendar,
  ArrowUpDown,
  Plus,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { AdminComponent } from ".";
import { api } from "@/lib/api";
import _ from "lodash";
import { format } from "date-fns";
import { AutoTable } from "@/components/auto-table";
import type { Invoice } from "@/lib/schema";

interface InvoiceManagementProps {
  slug: string;
}

export const InvoiceManagement: AdminComponent = ({ slug }) => {
  return <_InvoiceManagement slug={slug} />;
};

function _InvoiceManagement({ slug }: InvoiceManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: invoices = [], isLoading, error } = api.invoice.useGet({
    keys: [slug],
  });
  const { data: parties = [] } = api.party.useGet({
    keys: [slug],
  });

  const createMutation = api.invoice.useCreate();
  const updateMutation = api.invoice.useUpdate();
  const deleteMutation = api.invoice.useDelete();

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
        <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading invoices</h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const party = parties.find((p) => p._?.soul === invoice.partyId);
    const matchesSearch =
      invoice._?.soul?.includes(searchQuery.toLowerCase()) ||
      party?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.fiscalYear?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getInvoiceTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "purchase":
        return "secondary";
      case "sale":
        return "default";
      default:
        return "outline";
    }
  };

  const InvoiceCard = ({ invoice }: { invoice: Invoice & { _?: { soul: string } } }) => {
    const party = parties.find((p) => p._?.soul === invoice.partyId);

    return (
      <div className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">#{invoice._?.soul?.split("/").at(-1)}</h3>
              <Badge
                variant={getInvoiceTypeBadgeVariant(invoice.type)}
                className="mt-1 text-xs"
              >
                {invoice.type}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">Rs. {invoice.subTotal?.toFixed(2)}</div>
            <div className="text-xs text-gray-500">
              {invoice.issuedAt && format(new Date(invoice.issuedAt), "MMM dd, yyyy")}
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
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            {
              invoice.issuedAt &&
              <span>{format(new Date(invoice.issuedAt), "MMM dd, yyyy")}</span>
            }
          </div>
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>Rs. {invoice.subTotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>Rs. {invoice.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Total:</span>
            <span>Rs. {invoice.subTotal?.toFixed(2)}</span>
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
            Invoice Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage purchase and sales invoices
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            // Create invoice functionality would go here
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {invoices.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sales
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {invoices.filter((i) => i.type === "sale").length}
                </p>
              </div>
              <ArrowUpDown className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Purchases
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {invoices.filter((i) => i.type === "purchase").length}
                </p>
              </div>
              <ArrowUpDown className="w-8 h-8 text-blue-500" />
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
                  Rs. {invoices.reduce((sum, inv) => sum + (inv.subTotal || 0), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search invoices by number, party, or fiscal year..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leadingIcon={<Search className="h-4 w-4" />}
      />

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
            {filteredInvoices.map((invoice) => (
              <InvoiceCard key={invoice._?.soul} invoice={invoice} />
            ))}
          </div>
          {filteredInvoices.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No invoices found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or create a new invoice
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Invoice
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
              <CardDescription>
                Overview of invoices and financial metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Invoice Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales</span>
                      <span className="font-medium">
                        {invoices.filter((i) => i.type === "sale").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Purchases</span>
                      <span className="font-medium">
                        {invoices.filter((i) => i.type === "purchase").length}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Financial Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Sales</span>
                      <span className="font-medium">
                        Rs. {invoices
                          .filter((i) => i.type === "sale")
                          .reduce((sum, inv) => sum + (inv.subTotal || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Purchases</span>
                      <span className="font-medium">
                        Rs. {invoices
                          .filter((i) => i.type === "purchase")
                          .reduce((sum, inv) => sum + (inv.subTotal || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net</span>
                      <span>
                        Rs. {(
                          invoices
                            .filter((i) => i.type === "sale")
                            .reduce((sum, inv) => sum + (inv.subTotal || 0), 0) -
                          invoices
                            .filter((i) => i.type === "purchase")
                            .reduce((sum, inv) => sum + (inv.subTotal || 0), 0)
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
