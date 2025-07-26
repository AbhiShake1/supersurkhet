import { fieldConfig } from "@/components/ui/autoform";
import { z } from "zod";

// #region Core Helpers
const withMeta = <T extends z.ZodTypeAny>(
  schema: T,
  meta: Record<string, unknown>,
) => {
  schema._def.meta = { ...schema._def.meta, ...meta };
  return schema;
};

const withLabel = <T extends z.ZodTypeAny>(
  schema: T,
  label: string,
  description?: string,
) => {
  return withMeta(schema, { label, description });
};
// #endregion

// #region Base Schema
export const table = {
  created_by: z.string().optional().describe("User ID of the creator").optional(),
  timestamp: z.number().describe("Unix timestamp of the last update").optional(),
  _: z.object({ soul: z.string().optional() }).optional(),
};
// #endregion

// #region Permissions & Roles
export const permissions = {
  // ... (permissions remain the same)
} as const;
export type Permission = keyof typeof permissions;
const permissionEnum = z.nativeEnum(permissions);

export const roleSchema = z
  .object({
    name: withLabel(z.string(), "Role Name"),
    permissions: withLabel(
      z.record(permissionEnum, z.boolean()),
      "Permissions",
    ).describe("Record of permissions enabled for this role"),
  })
  .extend(table);
// #endregion

// #region Core Platform Schemas (User, Business)

export const userSchema = z
  .object({
    email: z.string().email().describe("User's email address (login)"),
    password: z.string().describe("Hashed password for the user"),
    name: z.string().optional().describe("Full name of the user"),
    avatar: z.string().url().optional().describe("URL to user's avatar image"),
    phone: z.string().optional().describe("User's contact phone number"),
    isActive: z.boolean().default(true).describe("Whether the user account is active"),
  })
  .extend(table);

export const businessSchema = z
  .object({
    name: z.string().describe("Official name of the business"),
    location: z.string().describe("Physical address or area of the business").optional(),
    basePath: z.string().describe("Unique URL path for the business (e.g., /my-shop)").optional(),
    businessType: z.enum([
      "retail", "food", "service", "education", "healthcare",
      "logistics", "real_estate", "cooperative", "other",
    ]).describe("The primary category of the business"),
    features: z.record(z.string(), z.boolean()).optional().describe("A map of enabled features for this business").superRefine(fieldConfig({ fieldType: "record" })),
    isActive: z.boolean().default(true).describe("Whether the business is currently active"),
  })
  .extend(table);

export const membershipSchema = z
  .object({
    userId: withLabel(z.string(), "User ID"),
    businessId: withLabel(z.string(), "Business ID"),
    roleId: withLabel(z.string(), "Role ID"),
  })
  .extend(table);

// #endregion

// #region Generalized Listing Schemas (The "Things")

export const baseListingSchema = z
  .object({
    businessId: z.string().describe("The business this listing belongs to"),
    title: z.string().min(1).describe("Title or name of the listing"),
    description: z.string().optional().describe("Detailed description"),
    price: z.number().positive().describe("Price of the item/service"),
    currency: z.string().length(3).default("NPR"),
    category: z.string().optional(),
    tags: z.record(z.string(), z.boolean()).optional(),
    imageUrl: z.string().url().superRefine(fieldConfig({ fieldType: "image" })).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().default(true),
  })
  .extend(table);

export const productSchema = baseListingSchema.extend({
  sku: z.string().optional().describe("Stock Keeping Unit"),
  quantityAvailable: z.number().int().nonnegative().describe("Current quantity in stock"),
  unitOfMeasure: z.string().optional().describe("e.g., 'piece', 'kg'"),
  imageUrl: z.string().url().superRefine(fieldConfig({ fieldType: "image" })).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().default(true),
  price: z.number().positive().describe("Price of the item/service"),
  name: z.string().optional().describe("Name of the item/service"),
});

export const menuItemSchema = productSchema.extend({
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  preparationTime: z.number().int().positive().optional(),
  isSpecial: z.boolean().optional(),
});

export const propertyListingSchema = baseListingSchema.extend({
  listingType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["land", "house", "apartment", "commercial"]),
  size: z.string().describe("e.g., '1200 sq. ft.' or '5 aana'"),
  amenities: z.record(z.string(), z.boolean()).optional(),
});

export const serviceSchema = baseListingSchema.extend({
  duration: z.number().int().positive().optional().describe("Duration of the service in minutes"),
});

// #endregion

// #region Role-Based Profile Schemas (The "People")

export const driverProfileSchema = z
  .object({
    userId: z.string().describe("Link to the user schema for this driver"),
    vehicleDetails: z.string().describe("e.g., 'Blue Pulsar 220F'"),
    licensePlate: z.string().describe("Vehicle license plate number"),
    verificationStatus: z.enum(["pending", "verified", "rejected"]),
  })
  .extend(table);

export const studentProfileSchema = z
  .object({
    userId: z.string().describe("Link to the user schema for this student"),
    classId: z.string(),
    rollNumber: z.string(),
  })
  .extend(table);

export const coOpMemberProfileSchema = z
  .object({
    userId: z.string().describe("Link to the user schema for this member"),
    membershipNumber: z.string().describe("Official membership number"),
    joinDate: z.number(),
  })
  .extend(table);

// #endregion

// #region Transactional Schemas

export const orderSchema = z
  .object({
    // ... (order schema remains largely the same, but items would reference a listing ID)
  })
  .extend(table);

export const appointmentSchema = z
  .object({
    customerId: z.string(),
    employeeId: z.string().optional(),
    serviceId: z.string().describe("ID of the service (from serviceSchema)"),
    startTime: z.number(),
    endTime: z.number(),
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
  })
  .extend(table);

export const tripSchema = z
  .object({
    driverId: z.string(),
    customerId: z.string(),
    startTime: z.number(),
    endTime: z.number().optional(),
    startLocation: z.string(),
    endLocation: z.string(),
    fare: z.number().positive(),
    status: z.enum(["requested", "accepted", "in_progress", "completed", "cancelled"]),
  })
  .extend(table);

// ... other transactional schemas like expenseSchema, chatMessageSchema
export const expenseSchema = z.object({}).extend(table); // Placeholder
export const chatMessageSchema = z.object({}).extend(table); // Placeholder

// #endregion

// #region App Schema

export const coreSchema = z.object({
  user: userSchema,
  business: businessSchema,
  role: roleSchema,
  membership: membershipSchema,
});

export const featureSchema = z.object({
  // Profiles (linked to User)
  driverProfile: driverProfileSchema,
  studentProfile: studentProfileSchema,
  coOpMemberProfile: coOpMemberProfileSchema,

  // Listings (extending baseListingSchema)
  baseListing: baseListingSchema,
  product: productSchema,
  menuItem: menuItemSchema,
  propertyListing: propertyListingSchema,
  service: serviceSchema,

  // Transactional
  order: orderSchema,
  appointment: appointmentSchema,
  trip: tripSchema,
  expense: expenseSchema,
  chat: chatMessageSchema,
});

// A composite schema that brings together all the individual schemas.
// This is useful for type inference and for providing a single entry point to all data models.
export const appSchema = coreSchema.extend(featureSchema.shape);
export type AppSchema = z.infer<typeof appSchema>;
export type AppSchemaType = typeof appSchema;

declare global {
  interface GTAAppSchema extends AppSchemaType { }
}
// #endregion

// #region Type Exports
export type User = z.infer<typeof userSchema>;
export type Business = z.infer<typeof businessSchema>;
// ... all other types
// #endregion
