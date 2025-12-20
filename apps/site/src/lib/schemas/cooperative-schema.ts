import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";
import { Users, type LucideIcon } from "lucide-react";

// Cooperative schema
export const cooperativeSchema = baseListingSchema
  .extend({
    memberCount: z
      .number({ coerce: true })
      .int()
      .nonnegative()
      .optional()
      .describe("Total number of cooperative members"),
    shareValue: z
      .number({ coerce: true })
      .positive()
      .optional()
      .describe("Current value of each share"),
    totalShares: z
      .number({ coerce: true })
      .int()
      .nonnegative()
      .optional()
      .describe("Total number of shares issued"),
    dividendRate: z
      .number({ coerce: true })
      .nonnegative()
      .optional()
      .describe("Annual dividend rate percentage"),
    meetingSchedule: z
      .string()
      .optional()
      .describe("Regular meeting schedule information"),
    bylaws: z
      .string()
      .optional()
      .describe("Cooperative bylaws and regulations"),
    boardMembers: z
      .record(z.string(), z.string())
      .optional()
      .describe("Board member names and positions")
      .superRefine(fieldConfig({ fieldType: "record" })),
    committees: z
      .record(z.string(), z.string())
      .optional()
      .describe("Committee names and descriptions")
      .superRefine(fieldConfig({ fieldType: "record" })),
    financialYearEnd: z
      .string()
      .optional()
      .describe("End date of the financial year"),
    registrationNumber: z
      .string()
      .optional()
      .describe("Official registration number"),
    governingBody: z
      .string()
      .optional()
      .describe("Governing body or authority"),
  })
  .extend(table);

export const cooperativeIcon = Users;
export type CooperativeIconType = LucideIcon;
