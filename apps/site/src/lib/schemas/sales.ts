import { fieldConfig } from "@/components/ui/autoform";
import { z } from "zod";
import { table } from "./listings";

export const salesItemSchema = z.object({
	product: z.string().describe("Product"),
	quantity: z.number({ coerce: true }).int().positive().describe("Quantity"),
	unitPrice: z
		.number({ coerce: true })
		.int()
		.nonnegative()
		.describe("Unit Price"),
	unit: z.string().optional().describe("Unit"),
	total: z.number({ coerce: true }).int().nonnegative().describe("Total"),
});

export const saleSchema = z
	.object({
		customerId: z.string().describe("Customer"),
		saleDate: z.string().describe("Sale Date"),
		items: salesItemSchema
			.array()
			.min(1, { message: "Please add at least one item." })
			.describe("Items Sold"),
		paidAmounts: z
			.array(
				z.object({
					paidAmount: z.number({ coerce: true }).positive(),
					paidOn: z.string().datetime({ offset: true }),
				}),
			)
			.default([])
			.describe("Payment History"),
		paymentStatus: z.string().default("pending").describe("Payment Status"),
		orderStatus: z
			.enum(["pending", "done", "cancelled"])
			.default("pending")
			.describe("Order Status"),
		paymentMethod: z
			.enum(["cash", "card", "bankTransfer", "credit"])
			.optional()
			.describe("Payment Method"),
		notes: z.string().optional().describe("Notes"),
	})
	.extend(table);

export const stockImportSchema = z
	.object({
		party: z.string().describe("Party"),
		importDate: z.string().describe("Import Date"),
		items: salesItemSchema
			.extend({
				unit: z.string().optional().describe("Unit"),
			})
			.array()
			.min(1, { message: "Please add at least one item." })
			.describe("Items Imported"),
		paidAmounts: z
			.array(
				z.object({
					paidAmount: z.number({ coerce: true }).positive(),
					paidOn: z.string().datetime({ offset: true }),
				}),
			)
			.default([])
			.describe("Payment History"),
		paymentStatus: z.string().default("pending").describe("Payment Status"),
	})
	.extend(table);

export type Sale = z.infer<typeof saleSchema>;
export type SalesItem = z.infer<typeof salesItemSchema>;
export type StockImport = z.infer<typeof stockImportSchema>;
