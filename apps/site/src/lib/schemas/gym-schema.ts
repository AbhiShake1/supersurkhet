import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";

// Gym schema
export const gymSchema = baseListingSchema
	.extend({
		equipment: z
			.record(z.string(), z.number({ coerce: true }).int().nonnegative())
			.optional()
			.describe("Gym equipment and quantities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		membershipPlans: z
			.record(z.string(), z.string())
			.optional()
			.describe("Membership plan names and descriptions")
			.superRefine(fieldConfig({ fieldType: "record" })),
		classSchedule: z
			.record(z.string(), z.string())
			.optional()
			.describe("Class names and schedules")
			.superRefine(fieldConfig({ fieldType: "record" })),
		trainers: z
			.record(z.string(), z.string())
			.optional()
			.describe("Trainer names and specializations")
			.superRefine(fieldConfig({ fieldType: "record" })),
		amenities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Gym amenities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		contactInfo: z
			.object({
				phone: z.string().optional().describe("Primary phone number"),
				email: z.string().email().optional().describe("Contact email"),
				website: z.string().url().optional().describe("Business website"),
			})
			.optional()
			.describe("Business contact information"),
		address: z
			.object({
				street: z.string().optional().describe("Street address"),
				city: z.string().optional().describe("City"),
				state: z.string().optional().describe("State or province"),
				zipCode: z.string().optional().describe("ZIP or postal code"),
				country: z.string().optional().describe("Country"),
			})
			.optional()
			.describe("Business address details"),
	})
	.extend(table);
