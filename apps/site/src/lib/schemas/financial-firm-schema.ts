import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { baseListingSchema, table } from "./listings";
import { CreditCard, type LucideIcon } from "lucide-react";

// Financial Firm schema
export const financialFirmSchema = baseListingSchema
  .extend({
    services: z
      .record(z.string(), z.string())
      .optional()
      .describe("Financial services and descriptions")
      .superRefine(fieldConfig({ fieldType: "record" })),
    products: z
      .record(z.string(), z.string())
      .optional()
      .describe("Financial products and details")
      .superRefine(fieldConfig({ fieldType: "record" })),
    advisors: z
      .record(z.string(), z.string())
      .optional()
      .describe("Advisors and specializations")
      .superRefine(fieldConfig({ fieldType: "record" })),
    officeHours: z.string().optional().describe("Office hours"),
    appointmentRequired: z
      .boolean()
      .default(true)
      .optional()
      .describe("Whether appointments are required"),
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
    licensingInfo: z
      .object({
        licenseNumber: z.string().optional().describe("License number"),
        issuingAuthority: z.string().optional().describe("Issuing authority"),
        expiryDate: z.string().optional().describe("License expiry date"),
      })
      .optional()
      .describe("Business licensing information"),
    acceptedPaymentMethods: z
      .record(z.string(), z.boolean())
      .optional()
      .describe("Accepted payment methods")
      .superRefine(fieldConfig({ fieldType: "record" })),
  })
  .extend(table);

export const financialFirmIcon = CreditCard;
export type FinancialFirmIconType = LucideIcon;
