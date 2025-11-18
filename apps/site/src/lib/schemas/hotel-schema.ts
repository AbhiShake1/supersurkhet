import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";
import { Hotel, LucideIcon } from "lucide-react";

// Hotel schema
export const hotelSchema = baseListingSchema
	.extend({
		roomTypes: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Available room types")
			.superRefine(fieldConfig({ fieldType: "record" })),
		amenities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Hotel amenities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		checkInTime: z.string().optional().describe("Standard check-in time"),
		checkOutTime: z.string().optional().describe("Standard check-out time"),
		cancellationPolicy: z
			.string()
			.optional()
			.describe("Cancellation policy details"),
		starRating: z
			.number()
			.int()
			.min(1)
			.max(5)
			.optional()
			.describe("Hotel star rating (1-5)"),
		numberOfRooms: z
			.number({ coerce: true })
			.int()
			.positive()
			.optional()
			.describe("Total number of rooms in the hotel"),
		address: z
			.object({
				street: z.string().optional().describe("Street address"),
				city: z.string().optional().describe("City"),
				state: z.string().optional().describe("State or province"),
				zipCode: z.string().optional().describe("ZIP or postal code"),
				country: z.string().optional().describe("Country"),
			})
			.optional()
			.describe("Hotel address details"),
		contactInfo: z
			.object({
				phone: z.string().optional().describe("Primary phone number"),
				email: z.string().email().optional().describe("Contact email"),
				website: z.string().url().optional().describe("Hotel website"),
			})
			.optional()
			.describe("Hotel contact information"),
		facilities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Hotel facilities and services")
			.superRefine(fieldConfig({ fieldType: "record" })),
	})
	.extend(table);

export const hotelIcon = Hotel;
export type HotelIconType = LucideIcon;
