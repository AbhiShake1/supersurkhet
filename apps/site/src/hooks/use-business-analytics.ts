import { useMemo } from "react";
import { api } from "@/lib/api";
import NepaliDate from "nepali-datetime";
import type { Sale, StockImport } from "@/lib/schemas/sales";

const saleTotal = (sale: Sale) =>
  sale.items?.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) ?? 0

const importTotal = (imp: StockImport) =>
  imp.items?.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) ?? 0

export function useBusinessAnalytics(slug: string, period: string = 'all') {
  const { data: sales = [] } = api.sale.useGet({ keys: [slug] });
  const { data: stockImports = [] } = api.stockImport.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  // const { data: invoices = [] } = api.invoice.useGet({ keys: [slug] });

  const productsBySoul = useMemo(() => new Map(products.map(p => [p._!.soul!, p])), [products]);
  const partiesBySoul = useMemo(() => new Map(parties.map(p => [p._!.soul!, p])), [parties]);

  // Filter data by time period
  const filteredSales = filterByPeriod(sales, period);
  const filteredStockImports = filterByPeriod(stockImports, period);
  // const filteredInvoices = filterByPeriod(invoices, period);

  // Financial Overview
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0),
    [filteredSales]
  );

  const totalCosts = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (s, item) => s + (productsBySoul.get(item.product)?.costPrice || 0) * item.quantity,
            0
          ),
        0
      ),
    [filteredSales]
  );

  const netProfit = useMemo(
    () => totalRevenue - totalCosts,
    [totalRevenue, totalCosts]
  );

  // Accounts Receivable/Payable
  const accountsReceivable = useMemo(
    () =>
      filteredSales.reduce((sum, sale) => {
        const total = saleTotal(sale);
        const due = total - (sale.paidAmount ?? 0);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredSales]
  );

  const accountsPayable = useMemo(
    () =>
      filteredStockImports.reduce((sum, imp) => {
        const total = importTotal(imp);
        const due = total - (imp.paidAmount ?? 0);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredStockImports]
  );

  // Top Suppliers
  const supplierTotals = useMemo(() => {
    const totals = filteredStockImports.reduce((acc, imp) => {
      acc[imp.party] = (acc[imp.party] || 0) + importTotal(imp);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([partyId, total]) => {
        const party = partiesBySoul.get(partyId);
        return { name: party?.name || partyId, total };
      });
  }, [filteredStockImports, parties]);

  // Top Products
  const productRevenue = useMemo(() => {
    const revenue = filteredSales.reduce((acc, sale) => {
      sale.items?.forEach(item => {
        acc[item.product] = (acc[item.product] || 0) + (item.quantity * item.unitPrice);
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, revenue]) => {
        const product = products.find(p => p._?.soul === productId);
        return { name: product?.title || productId, revenue };
      });
  }, [filteredSales, products]);

  return {
    totalRevenue,
    totalCosts,
    netProfit,
    accountsReceivable,
    accountsPayable,
    topSuppliers: supplierTotals,
    topProducts: productRevenue,
  } as const;
}

function filterByPeriod<T>(
  data: T[],
  period: string
): T[] {
  const now = new Date();
  let startDate = new Date(0);

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return data.filter(item => {
    const dateField = item.issuedAt || item.saleDate || item.importDate || item.timestamp;
    return dateField ? new Date(dateField) >= startDate : true;
  });
}

export function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`;
}
