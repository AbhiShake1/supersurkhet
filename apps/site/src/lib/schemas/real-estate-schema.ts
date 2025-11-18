import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";
import { Home, LucideIcon } from "lucide-react";

// Real Estate schema
export const realEstateSchema = baseListingSchema
	.extend({
		propertyType: z
			.enum(["residential", "commercial", "industrial", "land"])
			.optional()
			.describe("Type of property")
			.superRefine(fieldConfig({ fieldType: "select" })),
		propertyStatus: z
			.enum(["available", "sold", "leased", "under_contract"])
			.optional()
			.describe("Current status of the property")
			.superRefine(fieldConfig({ fieldType: "select" })),
		price: z
			.number({ coerce: true })
			.positive()
			.optional()
			.describe("List price of the property"),
		area: z
			.number({ coerce: true })
			.positive()
			.optional()
			.describe("Area of the property in square feet"),
		bedrooms: z
			.number({ coerce: true })
			.int()
			.nonnegative()
			.optional()
			.describe("Number of bedrooms"),
		bathrooms: z
			.number({ coerce: true })
			.int()
			.nonnegative()
			.optional()
			.describe("Number of bathrooms"),
		parkingSpaces: z
			.number({ coerce: true })
			.int()
			.nonnegative()
			.optional()
			.describe("Number of parking spaces"),
		yearBuilt: z
			.number({ coerce: true })
			.int()
			.positive()
			.optional()
			.describe("Year the property was built"),
		features: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Property features and amenities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		location: z
			.object({
				address: z.string().optional().describe("Street address"),
				city: z.string().optional().describe("City"),
				state: z.string().optional().describe("State or province"),
				zipCode: z.string().optional().describe("ZIP or postal code"),
				country: z.string().optional().describe("Country"),
				coordinates: z
					.object({
						lat: z.number().optional(),
						lng: z.number().optional(),
					})
					.optional()
					.describe("Geographic coordinates"),
			})
			.optional()
			.describe("Property location details"),
		agentId: z
			.string()
			.optional()
			.describe("ID of the agent responsible for this property"),
	})
	.extend(table);

export const realEstateIcon = Home;
export type RealEstateIconType = LucideIcon;
