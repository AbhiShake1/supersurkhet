import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";

// Cinema schema
export const cinemaSchema = baseListingSchema
	.extend({
		screens: z
			.record(z.string(), z.number({ coerce: true }).int().positive())
			.optional()
			.describe("Screen names and capacities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		movies: z
			.record(z.string(), z.string())
			.optional()
			.describe("Movie titles and showtimes")
			.superRefine(fieldConfig({ fieldType: "record" })),
		snacks: z
			.record(z.string(), z.number({ coerce: true }).positive())
			.optional()
			.describe("Snack names and prices")
			.superRefine(fieldConfig({ fieldType: "record" })),
		showtimes: z
			.record(z.string(), z.string())
			.optional()
			.describe("Showtimes and movies")
			.superRefine(fieldConfig({ fieldType: "record" })),
		amenities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Cinema amenities")
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
