import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { List, LucideUser, type LucideIcon, Hotel, Fuel, Dumbbell, Film, CreditCard, Car, GraduationCap, HeartPulse, Home, Users, Building, Lock, Calendar, DollarSign, MessageCircle, Clock, ShoppingCart, Folder, QrCode, Package, Users2, MapIcon } from "lucide-react";
import type { AdminComponent } from "@/components/ui/admin";
import { educationSchema } from "./schemas/education-schema";
import { healthcareSchema } from "./schemas/healthcare-schema";
import { realEstateSchema } from "./schemas/real-estate-schema";
import { cooperativeSchema } from "./schemas/cooperative-schema";
import { paymentTransactionSchema } from "./schemas/payment-transaction-schema";
import { hotelSchema } from "./schemas/hotel-schema";
import { petrolPumpSchema } from "./schemas/petrol-pump-schema";
import { gymSchema } from "./schemas/gym-schema";
import { cinemaSchema } from "./schemas/cinema-schema";
import { financialFirmSchema } from "./schemas/financial-firm-schema";
import { rideSharingSchema } from "./schemas/ride-sharing-schema";
import { serviceSchema } from "./schemas/service-schema";
import {
  baseListingSchema,
  productSchema,
  menuItemSchema,
  propertyListingSchema,
  withLabel,
  table,
} from "./schemas/listings";
import { dataMatrixActionSchema } from "./datamatrix";
import { folderSchema } from "./schemas/folder-schema";
import { qrFlowConfigSchema } from "./schemas/qr-flow-config-schema";
import type { ReactNode } from "@tanstack/react-router";
import { uiBuilderSchema } from "./schemas/ui-builder-schema";
import { IconMoneybag } from "@tabler/icons-react";
import { saleSchema, salesItemSchema, stockImportSchema } from "./schemas/sales";

function getPermissions() {
  return ["product"] as readonly [string, ...string[]];
}

export type Permission = keyof ReturnType<typeof getPermissions>;
const permissionEnum = z.string()
// const permissionEnum = z.lazy(() => z.enum(getPermissions()));

export interface GTAAppConfig {
  schema: {
    [table: string]: {
      schema: NonNullable<z.ZodObject<any> | z.ZodEffects<any>>;
      icon?: ReactNode,
      group?: string,
      components?: () => Promise<
        Array<{
          name: string;
          icon?: LucideIcon;
          component: AdminComponent;
        }>
      >;
    };
  };
}

export const permissionSchema = withLabel(
  z.record(permissionEnum, z.boolean()),
  "Permissions",
).describe("Record of permissions enabled for this role")

export const roleSchema = z
  .object({
    name: withLabel(z.string(), "Role Name"),
    permissions: permissionSchema,
  })
  .extend(table);
// #endregion

// #region Core Platform Schemas (User, Business)

export const userSchema = z
  .object({
    email: z.string().email().describe("User's email address (login)"),
    password: z.string().describe("Hashed password for the user"),
    name: z.string().optional().describe("Full name of the user"),
    avatar: z
      .string()
      .url()
      .optional()
      .describe("URL to user's avatar image")
      .superRefine(fieldConfig({ fieldType: "image" })),
    phone: z.string().optional().describe("User's contact phone number"),
    isActive: z
      .boolean()
      .default(true)
      .describe("Whether the user account is active")
      .optional(),
    role: z.enum(["user", "internal-staff", "admin"]).default("user").optional(),
    // isVerified: z.boolean().default(false).optional(),
  })
  .extend(table);

export const otpSchema = z.object({
  otp: z.string().length(6).describe("OTP"),
}).extend(table)

export type OTP = z.infer<typeof otpSchema>

export const businessMemberSchema = z.object({
  role: z.enum(["owner", "staff"]),
  permissions: permissionSchema.optional(),
  userId: z.string(),
  joinedAt: z.number().optional()
})

export const businessInvitationSchema = z.object({
  role: z.enum(["owner", "staff"]),
  permissions: permissionSchema.optional(),
  email: z.string(),
  invitedAt: z.number().optional(),
  token: z.string(),
  expiresAt: z.number().optional()
})


export type BusinessInvitation = z.infer<typeof businessInvitationSchema>;

export const businessTypeSchema = z
  .enum([
    "retail",
    "food",
    "service",
    "education",
    "healthcare",
    "logistics",
    "real_estate",
    "cooperative",
    "other",
    "hotel",
    "petrol_pump",
    "gym",
    "cinema",
    "financial_firm",
    "ride_sharing",
  ])
  .describe("The primary category of the business")

export type BusinessType = z.infer<typeof businessTypeSchema>

export const businessSchema = z
  .object({
    name: z.string().describe("Official name of the business"),
    id: z.string().describe("Unique ID for the business"),
    location: z
      .string()
      .describe("Physical address or area of the business")
      .optional(),
    basePath: z
      .string()
      .describe("Unique URL path for the business (e.g., /my-shop)")
      .optional(),
    businessType: businessTypeSchema,
    features: z
      .record(z.string(), z.boolean())
      .optional()
      .describe("A map of enabled features for this business")
      .superRefine(fieldConfig({ fieldType: "record" })),
    isActive: z
      .boolean()
      .default(true)
      .describe("Whether the business is currently active"),
    icon: z.string()
      .base64()
      .describe("Business icon")
      .optional(),
    members: z.record(z.string(), businessMemberSchema).optional(),
    invitations: z.record(z.string(), businessInvitationSchema).optional(),
    uiBuilder: uiBuilderSchema.optional(),
  })
  .extend(table);

export const partySchema = z.object({
  name: z.string().min(1).describe("Name of the party"),
  address: z.string().optional().describe("Address of the party"),
  panNumber: z.string().optional().describe("PAN number of the party"),
  phone: z.string().optional().describe("Phone number of the party"),
  creditLimit: z.number({ coerce: true }).int().positive().optional().describe("Credit limit of the party"),
  paymentTerms: z.string().optional().describe("Payment terms of the party"),
  notes: z.string().optional().describe("Notes for the party").superRefine(fieldConfig({ fieldType: "richText" })),
}).extend(table);

export type Party = z.infer<typeof partySchema>

export const customerSchema = partySchema.extend({})

export type Customer = z.infer<typeof customerSchema>

export const invoiceSchema = z.object({
  type: z.enum(["purchase", "sale"]),

  partyId: z.string().describe("Party").optional(),
  issuedAt: z.string()
    .datetime({ offset: true })
    .describe("Issued At").optional(),
  dueDate: z.string()
    .datetime({ offset: true })
    .describe("Due Date").optional(),

  items: z.array(
    z.object({
      product: z.string().describe("Product"),
      quantity: z.number({ coerce: true }).positive(),
      rate: z.number({ coerce: true }).int().nonnegative(), // paisa
      total: z.number({ coerce: true }).int().nonnegative(),
    })
  ),

  subTotal: z.number({ coerce: true }).int().nonnegative(),
  tax: z.number({ coerce: true }).int().nonnegative().default(0),
  paidAmount: z.number({ coerce: true }).nonnegative().default(0).describe("Amount Paid"),
  paymentStatus: z.string().default("pending").describe("Payment Status")
    .superRefine(fieldConfig({
      inputProps: {
        className: "border-none",
        disabled: true,
      }
    })),
  fiscalYear: z.string().describe("Fiscal Year"),
})
  .extend(table)
// .transform(invoice => ({
//   ...invoice,
//   total: invoice.subTotal + invoice.tax,
//   balance: (invoice.subTotal + invoice.tax) - (invoice.paidAmount || 0),
//   fiscalYear: (() => {
//     const year = new NepaliDate().getYear()
//     return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`
//   })()
// }))
//
// .superRefine((invoice, ctx) => {
//   const computedSubTotal = Object.values(invoice.items).reduce(
//     (sum, item) => sum + item.total,
//     0
//   );
//
//   if (computedSubTotal !== invoice.subTotal) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "Invoice subTotal must equal sum of item totals",
//       path: ["subTotal"],
//     });
//   }
//
//   if (invoice.subTotal + invoice.tax !== invoice.total) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "Invoice total must equal subTotal + tax",
//       path: ["total"],
//     });
//   }
// });

export type Invoice = z.infer<typeof invoiceSchema>

export const transactionSchema = z.object({
  // party: partySchema,
  // invoice: invoiceSchema,

  type: z.enum(["payment", "receipt", "deposit"]).default("payment"),
  amount: z.number({ coerce: true }).int().positive(),
}).extend(table)

export type Transaction = z.infer<typeof transactionSchema>

export const inventoryLedgerSchema = z.object({
  product: productSchema,
  invoice: invoiceSchema,

  quantityIn: z.number({ coerce: true }).nonnegative(),
  quantityOut: z.number({ coerce: true }).nonnegative(),
  date: z.string()
    // .datetime()
    .datetime({ offset: true }),
})
  .extend(table)
// .superRefine((entry, ctx) => {
//   const inQty = entry.quantityIn;
//   const outQty = entry.quantityOut;
//
//   if (inQty === 0 && outQty === 0) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "Either quantityIn or quantityOut must be greater than zero",
//     });
//   }
//
//   if (inQty > 0 && outQty > 0) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "Only one of quantityIn or quantityOut can be greater than zero",
//     });
//   }
// })

export type InventoryLedger = z.infer<typeof inventoryLedgerSchema>

export const membershipSchema = z
  .object({
    userId: withLabel(z.string(), "User ID"),
    businessId: withLabel(z.string(), "Business ID"),
    roleId: withLabel(z.string(), "Role ID"),
  })
  .extend(table);

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
    joinDate: z.date(),
  })
  .extend(table);

// #endregion

// #region Transactional Schemas

export const orderSchema = z
  .object({
    customerId: z.string().describe("Customer"),
    items: salesItemSchema.array()
      .min(1, { message: "Please add at least one item." })
      .describe("Items Ordered"),
    paidAmount: z.number({ coerce: true }).positive().describe("Paid Amount"),
    paymentStatus: z.string().default("pending").describe("Payment Status")
      .superRefine(fieldConfig({
        inputProps: {
          className: "border-none",
          disabled: true,
        }
      })),
    orderStatus: z.enum(["pending", "done", "cancelled"]).default("pending").describe("Order Status"),
    paymentMethod: z.enum(["cash", "card", "bankTransfer", "credit"]).optional().describe("Payment Method"),
    notes: z.string().optional().describe("Notes").superRefine(fieldConfig({ fieldType: "richText" })),
  })
  .extend(table);

export const appointmentSchema = z
  .object({
    customerId: z.string(),
    employeeId: z.string().optional(),
    serviceId: z.string().describe("ID of the service (from serviceSchema)"),
    startTime: z.string(),
    endTime: z.string(),
    status: z.enum([
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
    ]),
  })
  .extend(table);

export const tripSchema = z
  .object({
    driverId: z.string(),
    customerId: z.string(),
    startTime: z.string(),
    endTime: z.string().optional(),
    startLocation: z.string(),
    endLocation: z.string(),
    fare: z.number({ coerce: true }).positive(),
    status: z.enum([
      "requested",
      "accepted",
      "in_progress",
      "completed",
      "cancelled",
    ]),
  })
  .extend(table);

// ... other transactional schemas like expenseSchema, chatMessageSchema
export const expenseSchema = z.object({}).extend(table); // Placeholder
export const chatMessageSchema = z
  .object({
    created_by: z.string().describe("User ID of the creator").optional(),
    content: z.string().describe("Message content"),
    sender_id: z.string().describe("User ID of the sender"),
    sender_name: z.string().describe("Name of the sender"),
    timestamp: z
      .number({ coerce: true })
      .int(),
    delivered: z.boolean().default(false),
    read: z.boolean().default(false),
  })
  .extend(table); // Placeholder

export const recentlyUsedAppSchema = z
  .object({
    appId: withLabel(z.string(), "App ID"),
    timestamp: z
      .number({ coerce: true })
      .describe("Created at")
      .default(() => Math.floor(Date.now() / 1000)),
    usageCount: z
      .number({ coerce: true })
      .describe("Number of times this app has been accessed")
      .default(1),
  })
  .extend(table);

// #endregion

// #region App Schema
export type SchemaShape<T extends GTAAppConfig["schema"]> = {
  [key in keyof T]: T[key]["schema"];
};

export type CreatedSchema<T extends GTAAppConfig["schema"]> = T & {
  rawShape: T;
  schemaShape: z.ZodObject<SchemaShape<T>>;
  extend<const TOtherSchema extends GTAAppConfig["schema"]>(
    otherSchema: TOtherSchema,
  ): CreatedSchema<T & TOtherSchema>;
  merge<const TOtherSchema extends GTAAppConfig["schema"]>(
    otherSchema: CreatedSchema<TOtherSchema>,
  ): CreatedSchema<T & TOtherSchema>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtractZodSchema<T extends CreatedSchema<SchemaShape<any>>> =
  z.ZodObject<{
    -readonly [K in keyof T["rawShape"]]: T["rawShape"][K]["schema"];
  }>;

function createSchema<const TSchema extends GTAAppConfig["schema"]>(
  schema: TSchema,
): CreatedSchema<TSchema> {
  return {
    ...schema,
    rawShape: schema,
    get schemaShape() {
      const o = Object.fromEntries(
        Object.entries(schema).map(([key, value]) => [key, value.schema]),
      ) as SchemaShape<TSchema>;
      return z.object(o);
    },
    extend<const TOtherSchema extends GTAAppConfig["schema"]>(
      otherSchema: TOtherSchema,
    ) {
      return createSchema({ ...schema, ...otherSchema });
    },
    merge<const TOtherSchema extends CreatedSchema<GTAAppConfig["schema"]>>(
      this,
      otherSchema: TOtherSchema,
    ) {
      return createSchema({
        ...this.rawShape,
        ...otherSchema.rawShape,
      }) as CreatedSchema<TSchema & TOtherSchema["rawShape"]>;
    },
  };
}

export const coreSchema = createSchema({
  user: {
    schema: userSchema,
    icon: LucideUser,
    group: "User Management",
  },
  business: {
    schema: businessSchema,
    icon: Building,
    group: "System Configuration",
  },
  role: {
    schema: roleSchema,
    icon: List,
    group: "User Management",
  },
  membership: {
    schema: membershipSchema,
    icon: Users,
    group: "User Management",
  },
  otp: {
    schema: otpSchema,
    icon: Lock,
    group: "System Configuration",
  },
});

export const featureSchema = createSchema({
  driverProfile: {
    icon: Car,
    group: "User Management",
    schema: driverProfileSchema,
  },
  studentProfile: {
    icon: GraduationCap,
    group: "User Management",
    schema: studentProfileSchema,
  },
  coOpMemberProfile: {
    icon: Users,
    group: "User Management",
    schema: coOpMemberProfileSchema,
  },

  baseListing: {
    icon: Package,
    group: "Products & Inventory",
    schema: baseListingSchema,
  },
  product: {
    schema: productSchema,
    icon: Package,
    group: "Products & Inventory",
    components: async () => {
      const { MenuManagement } = await import(
        "@/components/ui/admin/menu-management"
      );
      return [
        {
          name: "Cards",
          component: MenuManagement,
        },
      ];
    },
  },
  party: {
    schema: partySchema,
    icon: Users,
    group: "Financial",
    components: async () => {
      const { PartyManagement } = await import(
        "@/components/ui/admin/party-management"
      );
      return [
        {
          name: "Suppliers & Customers",
          component: PartyManagement,
        },
      ];
    },
  },
  customer: {
    schema: customerSchema,
    icon: Users2,
    group: "Financial",
    // components: async () => {
    //   const { CustomerManagement } = await import(
    //     "@/components/ui/admin/customer-management"
    //   );
    //   return [
    //     {
    //       name: "Suppliers & Customers",
    //       component: CustomerManagement,
    //     },
    //   ];
    // },
  },
  invoice: {
    schema: invoiceSchema,
    icon: IconMoneybag,
    group: "Financial",
    components: async () => {
      const { InvoiceManagement } = await import(
        "@/components/ui/admin/invoice-management"
      );
      return [
        {
          name: "Invoices By Parties",
          component: InvoiceManagement,
        },
      ];
    },
  },
  sale: {
    schema: saleSchema,
    icon: DollarSign,
    group: "Financial",
  },
  stockImport: {
    schema: stockImportSchema,
    icon: ShoppingCart,
    group: "Financial",
  },
  transaction: {
    schema: transactionSchema,
    icon: IconMoneybag,
    group: "Financial",
    components: async () => {
      const { TransactionManagement } = await import(
        "@/components/ui/admin/transaction-management"
      );
      return [
        {
          name: "Transactions",
          component: TransactionManagement,
        },
      ];
    },
  },
  inventoryLedger: {
    schema: inventoryLedgerSchema,
    icon: IconMoneybag,
    group: "Financial",
    components: async () => {
      const { InventoryLedgerManagement } = await import(
        "@/components/ui/admin/inventory-ledger-management"
      );
      return [
        {
          name: "Inventory Ledger",
          component: InventoryLedgerManagement,
        },
      ];
    },
  },
  menuItem: {
    schema: menuItemSchema,
    icon: Package,
    group: "Products & Inventory",
    components: async () => {
      const { MenuManagement } = await import(
        "@/components/ui/admin/menu-management"
      );

      return [
        {
          name: "Menu Items",
          component: MenuManagement,
        },
      ];
    },
  },
  dataMatrixAction: {
    schema: dataMatrixActionSchema,
    icon: QrCode,
    group: "System Configuration",
    components: async () => {
      return []
      // const { DataMatrixFlowBuilder } = await import(
      // 	"@/components/ui/admin/datamatrix-flow-builder"
      // );
      // return [
      // 	{
      // 		name: "Flow Builder",
      // 		component: DataMatrixFlowBuilder,
      // 	},
      // ];
    },
  },
  propertyListing: {
    schema: propertyListingSchema,
    icon: Home,
    group: "Products & Inventory",
  },
  service: {
    schema: serviceSchema,
    icon: Building,
    components: async () => {
      const { ServiceManagement } = await import(
        "@/components/ui/admin/service-management"
      );
      return [
        {
          name: "Services & Appointments",
          component: ServiceManagement,
        },
      ];
    },
  },

  order: {
    schema: orderSchema,
    icon: DollarSign,
    group: "Business Operations",
    components: async () => {
      const { OrderKanban } = await import(
        "@/components/ui/admin/order-kanban"
      );
      return [
        {
          name: "Board",
          component: OrderKanban,
        },
      ];
    },
  },
  appointment: {
    schema: appointmentSchema,
    icon: Calendar,
    group: "Business Operations",
  },
  // trip: {
  //   schema: tripSchema,
  //   icon: CarIcon,
  //   group: "Business Operations",
  // },
  expense: {
    schema: expenseSchema,
    icon: DollarSign,
    group: "Financial",
  },
  chat: {
    schema: chatMessageSchema,
    icon: MessageCircle,
    group: "System Configuration",
  },

  // Hotel schema
  hotel: {
    schema: hotelSchema,
    icon: Hotel,
    components: async () => {
      const { HotelManagement } = await import(
        "@/components/ui/admin/hotel-management"
      );
      return [
        {
          name: "Rooms",
          component: HotelManagement,
        },
      ];
    },
  },

  // Petrol Pump schema
  petrolPump: {
    schema: petrolPumpSchema,
    icon: Fuel,
    components: async () => {
      const { PetrolPumpManagement } = await import(
        "@/components/ui/admin/petrol-pump-management"
      );
      return [
        {
          name: "Fuels & Services",
          component: PetrolPumpManagement,
        },
      ];
    },
  },

  // Gym schema
  gym: {
    schema: gymSchema,
    icon: Dumbbell,
    components: async () => {
      const { GymManagement } = await import(
        "@/components/ui/admin/gym-management"
      );
      return [
        {
          name: "Equipment & Memberships",
          component: GymManagement,
        },
      ];
    },
  },

  // Cinema schema
  cinema: {
    schema: cinemaSchema,
    icon: Film,
    components: async () => {
      const { CinemaManagement } = await import(
        "@/components/ui/admin/cinema-management"
      );
      return [
        {
          name: "Movies & Showtimes",
          component: CinemaManagement,
        },
      ];
    },
  },

  // Financial Firm schema
  financialFirm: {
    schema: financialFirmSchema,
    icon: CreditCard,
    components: async () => {
      const { FinancialFirmManagement } = await import(
        "@/components/ui/admin/financial-firm-management"
      );
      return [
        {
          name: "Services & Advisors",
          component: FinancialFirmManagement,
        },
      ];
    },
  },

  // Ride Sharing schema
  rideSharing: {
    schema: rideSharingSchema,
    icon: Car,
    components: async () => {
      const { RideSharingManagement } = await import(
        "@/components/ui/admin/ride-sharing-management"
      );
      return [
        {
          name: "Vehicles & Drivers",
          component: RideSharingManagement,
        },
      ];
    },
  },

  // Education schema
  education: {
    schema: educationSchema,
    icon: GraduationCap,
    components: async () => {
      const { EducationManagement } = await import(
        "@/components/ui/admin/education-management"
      );
      return [
        {
          name: "Courses & Students",
          component: EducationManagement,
        },
      ];
    },
  },

  // Healthcare schema
  healthcare: {
    schema: healthcareSchema,
    icon: HeartPulse,
    components: async () => {
      const { HealthcareManagement } = await import(
        "@/components/ui/admin/healthcare-management"
      );
      return [
        {
          name: "Patients & Doctors",
          component: HealthcareManagement,
        },
      ];
    },
  },

  // Real Estate schema
  realEstate: {
    schema: realEstateSchema,
    icon: Home,
    components: async () => {
      const { RealEstateManagement } = await import(
        "@/components/ui/admin/real-estate-management"
      );
      return [
        {
          name: "Properties & Listings",
          component: RealEstateManagement,
        },
      ];
    },
  },

  // Cooperative schema
  cooperative: {
    schema: cooperativeSchema,
    icon: Users,
    components: async () => {
      const { CooperativeManagement } = await import(
        "@/components/ui/admin/cooperative-management"
      );
      return [
        {
          name: "Members & Shares",
          component: CooperativeManagement,
        },
      ];
    },
  },

  // Payment Transaction schema
  paymentTransaction: {
    schema: paymentTransactionSchema,
    icon: DollarSign,
    components: async () => {
      const { PaymentManagement } = await import(
        "@/components/ui/admin/payment-management"
      );
      return [
        {
          name: "Payments & Transactions",
          component: PaymentManagement,
        },
      ];
    },
  },

  // Recently used apps schema
  recentlyUsedApp: {
    schema: recentlyUsedAppSchema,
    icon: Clock,
    group: "System Configuration",
  },
  // Folder schema
  folder: {
    schema: folderSchema,
    icon: Folder,
    group: "System Configuration",
  },
  // QR Flow Config schema
  qrFlowConfig: {
    schema: qrFlowConfigSchema,
    icon: QrCode,
    group: "System Configuration",
  },

  // Vehicle schema
  vehicle: {
    schema: z.object({
      name: z.string().describe("Vehicle Name"),
      licensePlate: z.string().describe("License Plate Number"),
      description: z.string().optional().describe("Vehicle Description")
        .superRefine(fieldConfig({ fieldType: "richText" })),
    }),
    icon: Car,
    group: "Logistics",
  },

  // Trip schema
  trip: {
    schema: z.object({
      vehicleId: z.string().describe("Vehicle ID"),
      dispatchTime: z.string()
        .datetime({ offset: true })
        // .datetime()
        .describe("Dispatch Time")
        .default(() => new Date().toISOString())
        .superRefine(fieldConfig({ fieldType: "datetime" })),
      returnTime: z.string()
        .datetime({ offset: true })
        .describe("Return Time")
        .superRefine(fieldConfig({ fieldType: "datetime" }))
        .optional(),
      destination: z.string().optional().describe("Destination"),
      products: salesItemSchema
        .array()
        .describe("Products Sent on Trip"),
      returnedProducts: salesItemSchema
        .array()
        .optional()
        .describe("Products Returned from Trip"),
    }),
    icon: MapIcon,
    group: "Logistics",
    components: async () => {
      const { TripManagement } = await import(
        "@/components/ui/admin/trip-management"
      );
      return [
        {
          name: "Trip Tracking",
          component: TripManagement,
        },
      ];
    },
  },
});

// A composite schema that brings together all the individual schemas.
// This is useful for type inference and for providing a single entry point to all data models.
export const appSchema = coreSchema.merge(featureSchema);
export type AppSchema = z.infer<AppSchemaType>;
export type AppSchemaType = ExtractZodSchema<typeof appSchema>;

declare global {
  interface GTAAppConfig {
    schema: AppSchemaType;
  }
}
// #endregion

// #region Type Exports
export type User = z.infer<typeof userSchema>;
export type Business = z.infer<typeof businessSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Order = z.infer<typeof orderSchema>;
// #endregion

export function transformSchema<const TSchema extends typeof appSchema>(
  schema: TSchema,
) {
  return z.object(
    Object.fromEntries(
      Object.entries(schema.rawShape).map(([key, value]) => [
        key,
        value.schema,
      ]),
    ),
  ) as AppSchemaType;
}
