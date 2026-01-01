import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";

export const salesItemSchema = z.object({
  product: z.string().describe("Product"),
  unit: z.string().optional().describe("Unit").superRefine(fieldConfig({
    fieldType: "string",
    inputProps: {
      disabled: true,
      className: "border-none",
      placeholder: "Select product to view unit"
    }
  })),
  quantity: z.number({ coerce: true }).int().positive().describe("Quantity"),
  unitPrice: z.number({ coerce: true }).positive().describe("Unit Price"),
})

export const saleSchema = z.object({
  saleDate: z.string().datetime()
    .default(() => new Date().toISOString()).describe("Sale Date")
    .superRefine(fieldConfig({ fieldType: "datetime" })),
  items: salesItemSchema.array()
    .min(1, { message: "Please add at least one item." })
    .describe("Items Sold"),
  paidAmount: z.number({ coerce: true }).positive().describe("Paid Amount"),
  paymentStatus: z.string().default("pending").describe("Payment Status")
    .superRefine(fieldConfig({
      inputProps: {
        className: "border-none",
        disabled: true,
      }
    })),
  paymentMethod: z.enum(["cash", "card", "bankTransfer", "credit"]).optional().describe("Payment Method"),
  customerName: z.string().optional().describe("Customer Name"),
  customerEmail: z.string().email().optional().describe("Customer Email"),
  phone: z.string().optional().describe("Customer Phone"),
  notes: z.string().optional().describe("Notes").superRefine(fieldConfig({ fieldType: "richText" })),
})

export type Sale = z.infer<typeof saleSchema>;

export const stockImportSchema = z.object({
  party: z.string().describe("Party"),
  importDate: z.string().datetime().default(() => new Date().toISOString()).describe("Import Date").superRefine(fieldConfig({ fieldType: "datetime" })),
  items: salesItemSchema.array().min(1, { message: "Please add at least one item." }).describe("Items"),
  paidAmount: z.number({ coerce: true }).positive().describe("Paid Amount"),
  paymentStatus: z.string().default("pending").describe("Payment Status")
    .superRefine(fieldConfig({
      inputProps: {
        className: "border-none",
        disabled: true,
      }
    })),
  notes: z.string().optional().describe("Notes").superRefine(fieldConfig({ fieldType: "richText" })),
}).describe("Stock Import");

export type StockImport = z.infer<typeof stockImportSchema>;
