import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";

// Ride Sharing schema
export const rideSharingSchema = baseListingSchema
	.extend({
		vehicleTypes: z
			.record(z.string(), z.number({ coerce: true }).int().nonnegative())
			.optional()
			.describe("Vehicle types and availability")
			.superRefine(fieldConfig({ fieldType: "record" })),
		pricing: z
			.record(z.string(), z.number({ coerce: true }).positive())
			.optional()
			.describe("Distance ranges and prices")
			.superRefine(fieldConfig({ fieldType: "record" })),
		driverProfiles: z
			.record(z.string(), z.string())
			.optional()
			.describe("Driver IDs and details")
			.superRefine(fieldConfig({ fieldType: "record" })),
		serviceAreas: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Service areas coverage")
			.superRefine(fieldConfig({ fieldType: "record" })),
		estimatedWaitTime: z
			.number({ coerce: true })
			.int()
			.positive()
			.optional()
			.describe("Estimated wait time in minutes"),
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
		operatingHours: z
			.object({
				monday: z.string().optional().describe("Monday operating hours"),
				tuesday: z.string().optional().describe("Tuesday operating hours"),
				wednesday: z.string().optional().describe("Wednesday operating hours"),
				thursday: z.string().optional().describe("Thursday operating hours"),
				friday: z.string().optional().describe("Friday operating hours"),
				saturday: z.string().optional().describe("Saturday operating hours"),
				sunday: z.string().optional().describe("Sunday operating hours"),
			})
			.optional()
			.describe("Operating hours by day"),
		cancellationPolicy: z
			.string()
			.optional()
			.describe("Cancellation policy details"),
		safetyFeatures: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Safety features offered")
			.superRefine(fieldConfig({ fieldType: "record" })),
	})
	.extend(table);
