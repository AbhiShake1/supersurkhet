"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Calendar,
  ArrowUpDown,
  DollarSign,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import type { AdminComponent } from ".";
import { api } from "@/lib/api";
import _ from "lodash";
import { format } from "date-fns";
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

  // Group invoices by party
  const groupedInvoices = _.groupBy(invoices, 'partyId');

  // Filter parties based on search query
  const filteredParties = parties.filter(party => {
    if (!searchQuery) return true;
    return party.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.panNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.phone?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate stats for each party
  const partyStats = filteredParties.map(party => {
    const partyInvoices = groupedInvoices[party._?.soul || ''] || [];
    const totalAmount = partyInvoices.reduce((sum, inv) => sum + (inv.subTotal || 0), 0);
    const salesCount = partyInvoices.filter(inv => inv.type === 'sale').length;
    const purchaseCount = partyInvoices.filter(inv => inv.type === 'purchase').length;

    return {
      party,
      invoices: partyInvoices,
      totalAmount,
      salesCount,
      purchaseCount,
    };
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
            View invoices grouped by parties
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
                  Total Parties
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {parties.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

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
        placeholder="Search parties by name, phone, or PAN..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leadingIcon={<Search className="h-4 w-4" />}
      />

      {/* Grouped Invoices by Party */}
      <div className="space-y-6">
        {partyStats.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No parties found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search
            </p>
          </div>
        ) : (
          partyStats.map(({ party, invoices, totalAmount, salesCount, purchaseCount }) => (
            <Card key={party._?.soul} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {party.name}
                    </CardTitle>
                    <CardDescription>
                      {party.phone} • {party.panNumber}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">Rs. {totalAmount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      {salesCount} sales • {purchaseCount} purchases
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
                    No invoices for this party
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
