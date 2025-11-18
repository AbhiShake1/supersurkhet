import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";
import { Building, LucideIcon } from "lucide-react";

// Service schema
export const serviceSchema = baseListingSchema
	.extend({
		serviceCategories: z
			.record(z.string(), z.string())
			.optional()
			.describe("Service categories and descriptions")
			.superRefine(fieldConfig({ fieldType: "record" })),
		appointmentSystem: z
			.record(z.string(), z.string())
			.optional()
			.describe("Appointment slots and availability")
			.superRefine(fieldConfig({ fieldType: "record" })),
		walkInManagement: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Walk-in service options")
			.superRefine(fieldConfig({ fieldType: "record" })),
		serviceAreas: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Service area coverage")
			.superRefine(fieldConfig({ fieldType: "record" })),
		pricing: z
			.record(z.string(), z.number({ coerce: true }).positive())
			.optional()
			.describe("Service names and prices")
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
		serviceStaff: z
			.record(z.string(), z.string())
			.optional()
			.describe("Staff members and their specializations")
			.superRefine(fieldConfig({ fieldType: "record" })),
		cancellationPolicy: z
			.string()
			.optional()
			.describe("Cancellation policy details"),
		serviceGuarantee: z
			.string()
			.optional()
			.describe("Service guarantee or warranty information"),
	})
	.extend(table);

export const serviceIcon = Building;
export type ServiceIconType = LucideIcon;
