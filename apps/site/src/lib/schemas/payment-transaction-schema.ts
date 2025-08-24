import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";

// Payment Transaction schema
export const paymentTransactionSchema = baseListingSchema
	.extend({
		orderId: z
			.string()
			.optional()
			.describe("ID of the associated order")
			.superRefine(fieldConfig({ fieldType: "string" })),
		customerId: z
			.string()
			.optional()
			.describe("ID of the customer who made the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
		businessId: z
			.string()
			.describe("ID of the business receiving the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
		amount: z
			.number({ coerce: true })
			.positive()
			.describe(
				"Payment amount in the smallest currency unit (e.g., paisa for NPR)",
			)
			.superRefine(fieldConfig({ fieldType: "number" })),
		currency: z
			.string()
			.default("NPR")
			.describe("Three-letter currency code")
			.superRefine(fieldConfig({ fieldType: "string" })),
		paymentMethod: z
			.enum(["cash", "card", "online", "bank_transfer", "mobile_wallet"])
			.describe("Payment method used")
			.superRefine(fieldConfig({ fieldType: "enum" })),
		paymentProvider: z
			.string()
			.optional()
			.describe("Payment provider (e.g., Khalti, eSewa, Stripe)")
			.superRefine(fieldConfig({ fieldType: "string" })),
		transactionId: z
			.string()
			.optional()
			.describe("External transaction ID from payment provider")
			.superRefine(fieldConfig({ fieldType: "string" })),
		status: z
			.enum([
				"pending",
				"processing",
				"completed",
				"failed",
				"refunded",
				"cancelled",
			])
			.default("pending")
			.describe("Current status of the payment")
			.superRefine(fieldConfig({ fieldType: "enum" })),
		gatewayResponse: z
			.string()
			.optional()
			.describe("Raw response from payment gateway")
			.superRefine(fieldConfig({ fieldType: "string" })),
		refundedAmount: z
			.number({ coerce: true })
			.nonnegative()
			.default(0)
			.describe("Amount refunded (if any)")
			.superRefine(fieldConfig({ fieldType: "number" })),
		refundReason: z
			.string()
			.optional()
			.describe("Reason for refund")
			.superRefine(fieldConfig({ fieldType: "string" })),
		metadata: z
			.record(z.string(), z.string())
			.optional()
			.describe("Additional metadata about the payment")
			.superRefine(fieldConfig({ fieldType: "record" })),
		processedAt: z
			.string()
			.datetime()
			.optional()
			.describe("Timestamp when payment was processed")
			.superRefine(fieldConfig({ fieldType: "datetime" })),
		completedAt: z
			.string()
			.datetime()
			.optional()
			.describe("Timestamp when payment was completed")
			.superRefine(fieldConfig({ fieldType: "datetime" })),
		cancelledAt: z
			.string()
			.datetime()
			.optional()
			.describe("Timestamp when payment was cancelled")
			.superRefine(fieldConfig({ fieldType: "datetime" })),
		refundedAt: z
			.string()
			.datetime()
			.optional()
			.describe("Timestamp when payment was refunded")
			.superRefine(fieldConfig({ fieldType: "datetime" })),
		failureReason: z
			.string()
			.optional()
			.describe("Reason for payment failure")
			.superRefine(fieldConfig({ fieldType: "string" })),
		ipAddress: z
			.string()
			.optional()
			.describe("IP address of the customer making the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
		userAgent: z
			.string()
			.optional()
			.describe("User agent of the customer making the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
		billingAddress: z
			.object({
				name: z.string().optional().describe("Customer name"),
				email: z.string().optional().describe("Customer email"),
				phone: z.string().optional().describe("Customer phone"),
				addressLine1: z.string().optional().describe("Address line 1"),
				addressLine2: z.string().optional().describe("Address line 2"),
				city: z.string().optional().describe("City"),
				state: z.string().optional().describe("State or province"),
				postalCode: z.string().optional().describe("Postal or ZIP code"),
				country: z.string().optional().describe("Country"),
			})
			.optional()
			.describe("Billing address information")
			.superRefine(fieldConfig({ fieldType: "object" })),
		shippingAddress: z
			.object({
				name: z.string().optional().describe("Recipient name"),
				email: z.string().optional().describe("Recipient email"),
				phone: z.string().optional().describe("Recipient phone"),
				addressLine1: z.string().optional().describe("Address line 1"),
				addressLine2: z.string().optional().describe("Address line 2"),
				city: z.string().optional().describe("City"),
				state: z.string().optional().describe("State or province"),
				postalCode: z.string().optional().describe("Postal or ZIP code"),
				country: z.string().optional().describe("Country"),
			})
			.optional()
			.describe("Shipping address information")
			.superRefine(fieldConfig({ fieldType: "object" })),
		receiptUrl: z
			.string()
			.url()
			.optional()
			.describe("URL to the payment receipt")
			.superRefine(fieldConfig({ fieldType: "url" })),
		invoiceId: z
			.string()
			.optional()
			.describe("ID of the associated invoice")
			.superRefine(fieldConfig({ fieldType: "string" })),
		subscriptionId: z
			.string()
			.optional()
			.describe("ID of the associated subscription")
			.superRefine(fieldConfig({ fieldType: "string" })),
		description: z
			.string()
			.optional()
			.describe("Description of the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
		notes: z
			.string()
			.optional()
			.describe("Internal notes about the payment")
			.superRefine(fieldConfig({ fieldType: "string" })),
	})
	.extend(table);
