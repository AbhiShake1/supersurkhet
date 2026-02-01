import type { AdminComponent } from "@/components/ui/admin";
import { fieldConfig } from "@/components/ui/autoform";
import { IconMoneybag } from "@tabler/icons-react";
import { Building, Car, Clock, DollarSign, Folder, List, Lock, LucideUser, MapIcon, Package, QrCode, ShoppingCart, Users, Users2, type LucideIcon, type LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { z } from "zod";
import { dataMatrixActionSchema } from "./datamatrix";
import { folderSchema } from "./schemas/folder-schema";
import {
  menuItemSchema,
  productSchema,
  table,
  withLabel,
} from "./schemas/listings";
import { qrFlowConfigSchema } from "./schemas/qr-flow-config-schema";
import { saleSchema, salesItemSchema, stockImportSchema } from "./schemas/sales";
import { uiBuilderSchema } from "./schemas/ui-builder-schema";

function getPermissions() {
  return ["product"] as readonly [string, ...string[]];
}

export type Permission = keyof ReturnType<typeof getPermissions>;
const permissionEnum = z.string()

export interface GTAAppConfig {
  schema: {
    [table: string]: {
      schema: NonNullable<z.ZodObject<any> | z.ZodEffects<any>>;
      icon?: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
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
  vehicleId: z.string().describe("Vehicle").optional(),
  tripId: z.string().describe("Trip").optional(),
  description: z.string().optional().superRefine(fieldConfig({ fieldType: "richText" })),
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

export const vehicleIdSchema: z.ZodEffects<z.ZodString> = z.string().describe("Vehicle").superRefine(fieldConfig({
  fieldType: "select",
  customData: {
    sources: [{
      table: "vehicle",
      displayKeys: ["name", "licensePlate"],
      separator: " (",
      suffix: ")"
    }],
  },
}))

export const tripSchema = z.object({
  vehicleId: vehicleIdSchema,
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
}).extend(table)

export type Trip = z.infer<typeof tripSchema>

export const membershipSchema = z
  .object({
    userId: withLabel(z.string(), "User ID"),
    businessId: withLabel(z.string(), "Business ID"),
    roleId: withLabel(z.string(), "Role ID"),
  })
  .extend(table);

// #endregion

export const customerIdSchema: z.ZodEffects<z.ZodString> = z.string().describe("Customer").superRefine(fieldConfig({
  fieldType: "select",
  customData: {
    sources: [{
      table: "customer",
      displayKey: "name"
    }]
  }
}))

// #region Transactional Schemas
export const orderSchema = z
  .object({
    customerId: customerIdSchema,
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
    }).extend(table),
    icon: Car,
    group: "Logistics",
  },

  // Trip schema
  trip: {
    schema: tripSchema,
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
