import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";
import { HeartPulse, LucideIcon } from "lucide-react";

// Healthcare schema
export const healthcareSchema = baseListingSchema
	.extend({
		services: z
			.record(z.string(), z.string())
			.optional()
			.describe("Medical services and descriptions")
			.superRefine(fieldConfig({ fieldType: "record" })),
		doctors: z
			.record(z.string(), z.string())
			.optional()
			.describe("Doctor names and specializations")
			.superRefine(fieldConfig({ fieldType: "record" })),
		departments: z
			.record(z.string(), z.string())
			.optional()
			.describe("Department names and descriptions")
			.superRefine(fieldConfig({ fieldType: "record" })),
		facilities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Medical facilities and amenities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		appointmentRequired: z
			.boolean()
			.default(true)
			.optional()
			.describe("Whether appointments are required"),
		officeHours: z.string().optional().describe("Office hours"),
		emergencyContact: z
			.string()
			.optional()
			.describe("Emergency contact number"),
		insuranceAccepted: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Accepted insurance providers")
			.superRefine(fieldConfig({ fieldType: "record" })),
	})
	.extend(table);

export const healthcareIcon = HeartPulse;
export type HealthcareIconType = LucideIcon;
