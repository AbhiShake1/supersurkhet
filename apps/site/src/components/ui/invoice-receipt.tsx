"use client";

import { formatCurrency } from "@/lib/intl";
import type { Invoice, Party } from "@/lib/schema";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	DollarSign,
	TrendingDown,
} from "lucide-react";
import type { Product } from "../supersurkhet/products";

interface ReceiptProps {
	invoice: Invoice;
	party: Party;
	productsById: Map<string, Product>;
}

export function InvoiceReceipt({
	invoice,
	productsById,
	party: { name: companyName },
}: ReceiptProps) {
	const totalAmount = invoice.subTotal + invoice.tax;
	const totalPaid = invoice.paidAmounts.reduce(
		(sum, p) => sum + p.paidAmount,
		0,
	);
	const outstandingAmount = totalAmount - totalPaid;

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return "N/A";
		return new Date(dateStr).toLocaleDateString("en-IN", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const paymentStatusConfig = {
		paid: {
			color:
				"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
			icon: CheckCircle,
			label: "Paid",
		},
		partial: {
			color:
				"bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
			icon: AlertCircle,
			label: "Partially Paid",
		},
		pending: {
			color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
			icon: AlertCircle,
			label: "Pending",
		},
	};

	// omit out (partial rs.xyz)
	const statusConfig =
		paymentStatusConfig[
			invoice.paymentStatus.split(" ")[0] as keyof typeof paymentStatusConfig
		] ?? paymentStatusConfig.pending;
	const StatusIcon = statusConfig.icon;

	return (
		<>
			{/* Receipt Content */}
			<div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden print:shadow-none">
				{/* Top Section */}
				<div className="border-b p-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{/* Company Info */}
						<div>
							<h2 className="text-lg font-bold">{companyName}</h2>
						</div>

						{/* Status Badge */}
						<div className="flex items-start justify-end">
							<div
								className={`flex items-center gap-1 px-3 py-2 rounded-lg ${statusConfig.color} font-semibold text-xs`}
							>
								<StatusIcon className="w-4 h-4" />
								{statusConfig.label}
							</div>
						</div>
					</div>

					{/* Key Info */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
						<div>
							<p className="text-muted-foreground mb-0.5">Document Type</p>
							<p className="font-semibold capitalize">{invoice.type}</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-0.5 flex items-center gap-0.5">
								<Calendar className="w-3 h-3" />
								Issued
							</p>
							<p className="font-semibold">{formatDate(invoice.issuedAt)}</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-0.5 flex items-center gap-0.5">
								<Calendar className="w-3 h-3" />
								Due
							</p>
							<p className="font-semibold">{formatDate(invoice.dueDate)}</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-0.5">Fiscal Year</p>
							<p className="font-semibold">{invoice.fiscalYear}</p>
						</div>
					</div>
				</div>

				{/* Party & Items Section */}
				<div className="p-4">
					{invoice.partyId && (
						<div className="mb-4 pb-4 border-b">
							<p className="text-muted-foreground text-xs mb-1">
								Bill To / Party
							</p>
							<p className="text-base font-semibold">{companyName}</p>
						</div>
					)}

					{/* Items Table */}
					<div className="overflow-x-auto mb-4">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b">
									<th className="px-2 py-2 text-left font-semibold">Product</th>
									<th className="px-2 py-2 text-right font-semibold">Qty</th>
									<th className="px-2 py-2 text-right font-semibold">Rate</th>
									<th className="px-2 py-2 text-right font-semibold">Total</th>
								</tr>
							</thead>
							<tbody>
								{invoice.items.map((item, idx) => (
									<tr
										key={idx}
										className="border-b hover:bg-muted/50 transition-colors"
									>
										<td className="px-2 py-2">
											{productsById.get(item.product)?.title}
										</td>
										<td className="px-2 py-2 text-right">{item.quantity}</td>
										<td className="px-2 py-2 text-right">
											{formatCurrency(item.rate)}
										</td>
										<td className="px-2 py-2 text-right font-semibold">
											{formatCurrency(item.total)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Totals Section */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Left - Notes */}
						<div className="md:col-span-1">
							{invoice.created_by && (
								<div>
									<p className="text-muted-foreground text-xs mb-0.5">
										Created By
									</p>
									<p className="font-medium">{invoice.created_by}</p>
								</div>
							)}
						</div>

						{/* Right - Totals */}
						<div className="md:col-span-2 space-y-2">
							<div className="flex justify-between items-center pb-1 border-b text-sm">
								<span className="text-muted-foreground">Subtotal</span>
								<span className="font-semibold">
									{formatCurrency(invoice.subTotal)}
								</span>
							</div>
							<div className="flex justify-between items-center pb-1 border-b text-sm">
								<span className="text-muted-foreground">Tax</span>
								<span className="font-semibold">
									{formatCurrency(invoice.tax)}
								</span>
							</div>
							<div className="flex justify-between items-center pb-2 border-b-2 mb-2 text-sm">
								<span className="text-muted-foreground">Total Amount</span>
								<span className="font-bold">
									{formatCurrency(invoice.subTotal + invoice.tax)}
								</span>
							</div>

							{/* Payment Details */}
							<div className="rounded-lg p-3 space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-muted-foreground text-xs flex items-center gap-1">
										<DollarSign className="w-3 h-3" />
										Amount Paid
									</span>
									<span className="font-semibold">
										{formatCurrency(totalPaid)}
									</span>
								</div>
								<div className="flex justify-between items-center pt-2 border-t">
									<span className="text-muted-foreground font-medium flex items-center gap-1 text-sm">
										{outstandingAmount > 0 ? (
											<>
												<TrendingDown className="w-3 h-3" />
												Outstanding
											</>
										) : (
											<>
												<CheckCircle className="w-3 h-3" />
												Fully Paid
											</>
										)}
									</span>
									<span
										className={`font-bold text-sm ${outstandingAmount > 0 ? "text-destructive" : "text-success"}`}
									>
										{formatCurrency(outstandingAmount)}{" "}
										{outstandingAmount <= 0 && (
											<sub className="text-xs text-muted-foreground">
												To Pay
											</sub>
										)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
					<p>Thank you for your business</p>
					<p className="mt-0.5">This is a digitally generated document</p>
				</div>
			</div>
		</>
	);
}
