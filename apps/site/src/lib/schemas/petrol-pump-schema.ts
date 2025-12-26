import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";
import { Fuel } from "lucide-react";

// Petrol Pump schema
export const petrolPumpSchema = baseListingSchema
  .extend({
    fuelTypes: z
      .record(z.string(), z.number({ coerce: true }).positive())
      .optional()
      .describe("Available fuel types and prices")
      .superRefine(fieldConfig({ fieldType: "record" })),
    services: z
      .record(z.string(), z.boolean())
      .optional()
      .describe("Additional services offered")
      .superRefine(fieldConfig({ fieldType: "record" })),
    openingHours: z.string().optional().describe("Opening hours"),
    hasRestroom: z
      .boolean()
      .default(false)
      .optional()
      .describe("Restroom availability"),
    hasFoodCourt: z
      .boolean()
      .default(false)
      .optional()
      .describe("Food court availability"),
    atmAvailable: z
      .boolean()
      .default(false)
      .optional()
      .describe("ATM availability"),
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

export const petrolPumpIcon = Fuel;
