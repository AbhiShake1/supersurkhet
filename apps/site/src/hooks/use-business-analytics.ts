import { api } from "@/lib/api";
import type { saleSchema, stockImportSchema } from "@/lib/schemas/sales";
import NepaliDate from "nepali-datetime";
import { useMemo } from "react";
import type { z } from "zod";

type Sale = z.infer<typeof saleSchema>;
type StockImport = z.infer<typeof stockImportSchema>;

const sumPaidAmounts = (payments: Sale["paidAmounts"]) =>
	payments?.reduce((s, p) => s + p.paidAmount, 0) ?? 0;

const saleTotal = (sale: Sale) =>
	sale.items?.reduce((s, i) => s + i.unitPrice * i.quantity, 0) ?? 0;

const importTotal = (imp: StockImport) =>
	imp.items?.reduce((s, i) => s + i.unitPrice * i.quantity, 0) ?? 0;

export function useBusinessAnalytics(slug: string, period = "all") {
	type ReceivableBreakdown = {
		id: string;
		customer: string;
		totalAmount: number;
		paidAmount: number;
		dueAmount: number;
		date: string;
		items: Array<{
			product: string;
			quantity: number;
			unitPrice: number;
			total: number;
		}>;
	};

	type PayableBreakdown = {
		id: string;
		supplier: string;
		totalAmount: number;
		paidAmount: number;
		dueAmount: number;
		date: string;
		items: Array<{
			product: string;
			quantity: number;
			unitPrice: number;
			total: number;
		}>;
	};

	type RevenueBreakdown = {
		id: string;
		customer: string;
		totalAmount: number;
		paidAmount: number;
		dueAmount: number;
		date: string;
		items: Array<{
			product: string;
			quantity: number;
			unitPrice: number;
			total: number;
		}>;
	};

	type CostBreakdown = {
		id: string;
		supplier: string;
		totalAmount: number;
		date: string;
		items: Array<{
			product: string;
			quantity: number;
			unitPrice: number;
			total: number;
		}>;
	};

	const { data: sales = [] } = api.sale.useGet({ keys: [slug] });
	const { data: stockImports = [] } = api.stockImport.useGet({ keys: [slug] });
	const { data: parties = [] } = api.party.useGet({ keys: [slug] });
	const { data: products = [] } = api.product.useGet({ keys: [slug] });

	const productsBySoul = useMemo(
		() => new Map(products.map((p) => [p._!.soul!, p])),
		[products],
	);
	const partiesBySoul = useMemo(
		() => new Map(parties.map((p) => [p._!.soul!, p])),
		[parties],
	);

	const filteredSales = filterByPeriod(sales, period);
	const filteredStockImports = filterByPeriod(stockImports, period);

	const totalRevenue = useMemo(
		() => filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0),
		[filteredSales],
	);

	const totalCosts = useMemo(
		() => filteredStockImports.reduce((sum, imp) => sum + importTotal(imp), 0),
		[filteredStockImports],
	);

	const netProfit = useMemo(
		() => totalRevenue - totalCosts,
		[totalRevenue, totalCosts],
	);

	const accountsReceivable = useMemo(
		() =>
			filteredSales.reduce((sum, sale) => {
				const total = saleTotal(sale);
				const due = total - sumPaidAmounts(sale.paidAmounts);
				return due > 0 ? sum + due : sum;
			}, 0),
		[filteredSales],
	);

	const accountsPayable = useMemo(
		() =>
			filteredStockImports.reduce((sum, imp) => {
				const total = importTotal(imp);
				const due = total - sumPaidAmounts(imp.paidAmounts);
				return due > 0 ? sum + due : sum;
			}, 0),
		[filteredStockImports],
	);

	const accountsReceivableBreakdown = useMemo(() => {
		return filteredSales
			.filter((sale) => {
				const total = saleTotal(sale);
				const due = total - sumPaidAmounts(sale.paidAmounts);
				return due > 0;
			})
			.map((sale) => {
				const total = saleTotal(sale);
				const due = total - sumPaidAmounts(sale.paidAmounts);
				return {
					id: sale._?.soul ?? "",
					customer: sale.customerId
						? (partiesBySoul.get(sale.customerId)?.name ?? sale.customerId)
						: "Walk-in Customer",
					totalAmount: total,
					paidAmount: sumPaidAmounts(sale.paidAmounts),
					dueAmount: due,
					date: sale.saleDate ?? "",
					items:
						sale.items?.map((item) => ({
							product: productsBySoul.get(item.product)?.title ?? item.product,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							total: item.quantity * item.unitPrice,
						})) ?? [],
				} satisfies ReceivableBreakdown;
			});
	}, [filteredSales, productsBySoul, partiesBySoul]);

	const accountsPayableBreakdown = useMemo(() => {
		return filteredStockImports
			.filter((imp) => {
				const total = importTotal(imp);
				const due = total - sumPaidAmounts(imp.paidAmounts);
				return due > 0;
			})
			.map((imp) => {
				const total = importTotal(imp);
				const due = total - sumPaidAmounts(imp.paidAmounts);
				const party = partiesBySoul.get(imp.party);
				return {
					id: imp._?.soul ?? "",
					supplier: party?.name ?? imp.party,
					totalAmount: total,
					paidAmount: sumPaidAmounts(imp.paidAmounts),
					dueAmount: due,
					date: imp.importDate ?? "",
					items:
						imp.items?.map((item) => ({
							...item,
							product: productsBySoul.get(item.product)?.title ?? item.product,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							total: item.quantity * item.unitPrice,
						})) ?? [],
				} satisfies PayableBreakdown;
			});
	}, [filteredStockImports, partiesBySoul, productsBySoul]);

	const supplierTotals = useMemo(() => {
		const totals = filteredStockImports.reduce(
			(acc, imp) => {
				acc[imp.party] = (acc[imp.party] ?? 0) + importTotal(imp);
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(totals)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([partyId, total]) => {
				const party = partiesBySoul.get(partyId);
				return { name: party?.name ?? partyId, total };
			});
	}, [filteredStockImports, parties]);

	const productRevenue = useMemo(() => {
		const revenue = filteredSales.reduce(
			(acc, sale) => {
				sale.items?.forEach((item) => {
					acc[item.product] =
						(acc[item.product] ?? 0) + item.quantity * item.unitPrice;
				});
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(revenue)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([productId, revenue]) => {
				const product = products.find((p) => p._?.soul === productId);
				return { name: product?.title ?? productId, revenue };
			});
	}, [filteredSales, products]);

	const salesTrends = useMemo(() => {
		const trends = filteredSales.reduce(
			(acc, sale) => {
				const date = new Date(
					sale.saleDate ?? sale.timestamp ?? 0,
				).toDateString();
				acc[date] = (acc[date] ?? 0) + saleTotal(sale);
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(trends)
			.map(([date, revenue]) => ({ date, revenue }))
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [filteredSales]);

	const paymentMethods = useMemo(() => {
		const methods = filteredSales.reduce(
			(acc, sale) => {
				const method = sale.paymentMethod ?? "cash";
				acc[method] = (acc[method] ?? 0) + saleTotal(sale);
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(methods).map(([method, amount]) => ({
			method,
			amount,
		}));
	}, [filteredSales]);

	const currentInventory = useMemo(() => {
		const inventory = new Map<
			string,
			{ product: (typeof products)[0]; currentStock: number }
		>();

		products.forEach((product) => {
			if (product._?.soul) {
				inventory.set(product._.soul, {
					product,
					currentStock: product.stockQuantity ?? 0,
				});
			}
		});

		return Array.from(inventory.values());
	}, [products, filteredSales, filteredStockImports]);

	const lowStockItems = useMemo(() => {
		return currentInventory
			.filter(
				(item) =>
					item.currentStock <= (item.product.reorderLevel ?? 5) &&
					item.currentStock > 0,
			)
			.slice(0, 10);
	}, [currentInventory]);

	const outOfStockItems = useMemo(() => {
		return currentInventory
			.filter((item) => item.currentStock <= 0)
			.slice(0, 10);
	}, [currentInventory]);

	const customerPurchaseHistory = useMemo(() => {
		const customerSales = filteredSales.reduce(
			(acc, sale) => {
				const customerName = sale.customerId
					? (partiesBySoul.get(sale.customerId)?.name ?? sale.customerId)
					: "Walk-in Customer";
				if (!acc[customerName]) {
					acc[customerName] = {
						name: customerName,
						totalSpent: 0,
						purchaseCount: 0,
						lastPurchase: sale.saleDate ?? "",
					};
				}
				acc[customerName].totalSpent += saleTotal(sale);
				acc[customerName].purchaseCount += 1;
				if (
					sale.saleDate &&
					new Date(sale.saleDate) > new Date(acc[customerName].lastPurchase)
				) {
					acc[customerName].lastPurchase = sale.saleDate;
				}
				return acc;
			},
			{} as Record<
				string,
				{
					name: string;
					totalSpent: number;
					purchaseCount: number;
					lastPurchase: string;
				}
			>,
		);

		return Object.values(customerSales)
			.sort((a, b) => b.totalSpent - a.totalSpent)
			.slice(0, 10);
	}, [filteredSales, partiesBySoul]);

	const revenueBreakdown = useMemo(() => {
		return filteredSales.map((sale) => {
			const total = saleTotal(sale);
			return {
				id: sale._?.soul ?? "",
				customer: sale.customerId
					? (partiesBySoul.get(sale.customerId)?.name ?? sale.customerId)
					: "Walk-in Customer",
				totalAmount: total,
				paidAmount: sumPaidAmounts(sale.paidAmounts),
				dueAmount: total - sumPaidAmounts(sale.paidAmounts),
				date: sale.saleDate ?? "",
				items:
					sale.items?.map((item) => ({
						product: productsBySoul.get(item.product)?.title ?? item.product,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						total: item.quantity * item.unitPrice,
					})) ?? [],
			} satisfies RevenueBreakdown;
		});
	}, [filteredSales, productsBySoul, partiesBySoul]);

	const costBreakdown = useMemo(() => {
		return filteredStockImports
			.map((imp) => {
				const party = partiesBySoul.get(imp.party);

				const items =
					imp.items?.map((item) => ({
						product: productsBySoul.get(item.product)?.title ?? item.product,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						total: item.quantity * item.unitPrice,
					})) ?? [];

				const totalAmount = items.reduce((s, i) => s + i.total, 0);

				return {
					id: imp._?.soul ?? "",
					supplier: party?.name ?? "Unknown Supplier",
					totalAmount,
					date: imp.importDate ?? "",
					items,
				} satisfies CostBreakdown;
			})
			.filter((c) => c.totalAmount > 0);
	}, [filteredStockImports, partiesBySoul, productsBySoul]);

	return {
		totalRevenue,
		totalCosts,
		netProfit,
		accountsReceivable,
		accountsPayable,
		accountsReceivableBreakdown,
		accountsPayableBreakdown,
		revenueBreakdown,
		costBreakdown,
		topSuppliers: supplierTotals,
		topProducts: productRevenue,
		salesTrends,
		paymentMethods,
		currentInventory,
		lowStockItems,
		outOfStockItems,
		customerPurchaseHistory,
	} as const;
}

function filterByPeriod<
	T extends {
		saleDate?: string | null | undefined;
		importDate?: string | null | undefined;
		timestamp?: number | null | undefined;
		issuedAt?: string | null | undefined;
	},
>(data: T[], period: string): T[] {
	const now = new Date();
	let startDate = new Date(0);

	switch (period) {
		case "month":
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			break;
		case "quarter":
			const quarter = Math.floor(now.getMonth() / 3);
			startDate = new Date(now.getFullYear(), quarter * 3, 1);
			break;
		case "year":
			startDate = new Date(now.getFullYear(), 0, 1);
			break;
	}

	return data.filter((item) => {
		const dateField =
			item.issuedAt ?? item.saleDate ?? item.importDate ?? item.timestamp;
		return dateField ? new Date(dateField) >= startDate : true;
	});
}

export function calculateFiscalYear() {
	const year = new NepaliDate().getYear();
	return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`;
}
