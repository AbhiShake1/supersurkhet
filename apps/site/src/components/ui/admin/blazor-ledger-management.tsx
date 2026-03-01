'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { AlertCircle, BookText, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/intl';
import {
  getInvoicePayments,
  getInvoiceTotalAmount,
} from '@/lib/invoice-payments';
import type { AdminComponent } from '.';

type LedgerEntry = {
  date: string;
  particulars: string;
  voucher: string;
  debit: number;
  credit: number;
  balance: number;
};

type PartyLedger = {
  id: string;
  name: string;
  phone?: string;
  panNumber?: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: LedgerEntry[];
};

export const BlazorLedgerManagement: AdminComponent = ({ slug }) => {
  return <_BlazorLedgerManagement slug={slug} />;
};

export default BlazorLedgerManagement;

function _BlazorLedgerManagement({ slug }: { slug: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const {
    data: invoices = [],
    isLoading,
    error,
  } = api.invoice.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });

  const partyLedgers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const identities = new Map<
      string,
      { name: string; phone?: string; panNumber?: string }
    >();

    for (const party of parties) {
      if (!party._?.soul) continue;
      identities.set(party._.soul, {
        name: party.name || 'Unnamed Party',
        phone: party.phone || undefined,
        panNumber: party.panNumber || undefined,
      });
    }

    for (const customer of customers) {
      if (!customer._?.soul || identities.has(customer._.soul)) continue;
      identities.set(customer._.soul, {
        name: customer.name || 'Unnamed Customer',
        phone: customer.phone || undefined,
      });
    }

    const rawByParty = new Map<string, Array<Omit<LedgerEntry, 'balance'>>>();

    for (const invoice of invoices) {
      if (!invoice.partyId) continue;
      const partyId = invoice.partyId;
      const invoiceCode = invoice._?.soul?.split('/').at(-1) || 'N/A';
      const invoiceTotal = getInvoiceTotalAmount(invoice);
      const invoiceDate = invoice.issuedAt || new Date().toISOString();
      const rows = rawByParty.get(partyId) || [];

      if (invoice.type === 'sale') {
        rows.push({
          date: invoiceDate,
          particulars: `Sale Invoice #${invoiceCode}`,
          voucher: `INV-${invoiceCode}`,
          debit: invoiceTotal,
          credit: 0,
        });
      } else {
        rows.push({
          date: invoiceDate,
          particulars: `Purchase Invoice #${invoiceCode}`,
          voucher: `PINV-${invoiceCode}`,
          debit: 0,
          credit: invoiceTotal,
        });
      }

      const payments = getInvoicePayments(invoice).filter(
        (payment) => (payment.paidAmount ?? 0) > 0,
      );
      for (const payment of payments) {
        const amount = Number(payment.paidAmount ?? 0);
        const paymentDate = payment.paidAt || invoiceDate;
        const method = payment.paymentMethod || 'payment';
        const voucher =
          payment.bankVoucherNumber?.trim() || `PAY-${invoiceCode}`;

        if (invoice.type === 'sale') {
          rows.push({
            date: paymentDate,
            particulars: `Receipt (${method}) against sale #${invoiceCode}`,
            voucher,
            debit: 0,
            credit: amount,
          });
        } else {
          rows.push({
            date: paymentDate,
            particulars: `Payment (${method}) against purchase #${invoiceCode}`,
            voucher,
            debit: amount,
            credit: 0,
          });
        }
      }

      rawByParty.set(partyId, rows);
    }

    return Array.from(rawByParty.entries())
      .map(([partyId, rows]) => {
        const identity = identities.get(partyId) || { name: 'Unknown Party' };

        if (search) {
          const haystack = [identity.name, identity.phone, identity.panNumber]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) return null;
        }

        const sorted = [...rows].sort((a, b) => {
          const at = a.date ? new Date(a.date).getTime() : 0;
          const bt = b.date ? new Date(b.date).getTime() : 0;
          return at - bt;
        });

        let running = 0;
        const entries: LedgerEntry[] = sorted.map((row) => {
          running += row.debit - row.credit;
          return {
            ...row,
            balance: running,
          };
        });

        const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
        const totalCredit = entries.reduce(
          (sum, entry) => sum + entry.credit,
          0,
        );

        return {
          id: partyId,
          name: identity.name,
          phone: identity.phone,
          panNumber: identity.panNumber,
          totalDebit,
          totalCredit,
          closingBalance: totalDebit - totalCredit,
          entries,
        } satisfies PartyLedger;
      })
      .filter((ledger): ledger is PartyLedger => Boolean(ledger))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, invoices, parties, searchQuery]);

  const activeLedger =
    partyLedgers.find((ledger) => ledger.id === selectedPartyId) ||
    partyLedgers[0] ||
    null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-1 text-lg font-medium text-gray-900">
          Error loading ledger
        </h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (!partyLedgers.length) {
    return (
      <div className="space-y-4">
        <Input
          placeholder="Search party/customer by name, phone or PAN"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <div className="py-12 text-center">
          <BookText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-semibold">No ledger entries found</h3>
          <p className="text-sm text-muted-foreground">
            Create sales/purchases and update payments to generate party
            ledgers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Input
        placeholder="Search party/customer by name, phone or PAN"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leadingIcon={<Search className="h-4 w-4" />}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parties</CardTitle>
            <CardDescription>
              Select a party to view full ledger
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[min(65vh,42rem)] space-y-2 overflow-y-auto pr-1">
            {partyLedgers.map((ledger) => {
              const isActive = activeLedger?.id === ledger.id;
              return (
                <button
                  key={ledger.id}
                  type="button"
                  onClick={() => setSelectedPartyId(ledger.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <p className="font-medium">{ledger.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ledger.phone || ledger.panNumber || 'No contact details'}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Closing</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(ledger.closingBalance)}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {activeLedger && (
          <Card className="min-h-0 min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{activeLedger.name}</CardTitle>
                  <CardDescription>
                    {[activeLedger.phone, activeLedger.panNumber]
                      .filter(Boolean)
                      .join(' • ') || 'No contact details'}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {activeLedger.closingBalance > 0
                    ? 'Receivable'
                    : activeLedger.closingBalance < 0
                      ? 'Payable'
                      : 'Settled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Debit</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.totalDebit)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Credit</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.totalCredit)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Closing Balance
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(activeLedger.closingBalance)}
                  </p>
                </div>
              </div>

              <div className="max-h-[min(65vh,42rem)] overflow-auto rounded-md border">
                <table className="min-w-[1020px] w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Particulars</th>
                      <th className="px-3 py-2 text-left">Voucher</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right">
                        Days Ago
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLedger.entries.map((entry) => (
                      <tr
                        key={`${entry.date}-${entry.voucher}-${entry.debit}-${entry.credit}`}
                        className="border-t"
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-3 py-2">{entry.particulars}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {entry.voucher}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(entry.debit)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(entry.credit)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(entry.balance)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatDaysAgo(entry.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM yyyy');
}

function formatDaysAgo(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const days = differenceInCalendarDays(new Date(), date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 0) return `${days}D`;
  return `In ${Math.abs(days)}D`;
}
