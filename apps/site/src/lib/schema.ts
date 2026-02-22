import { IconMoneybag } from '@tabler/icons-react';
import {
  Building,
  Car,
  Clock,
  DollarSign,
  Folder,
  List,
  Lock,
  LucideUser,
  MapIcon,
  Package,
  QrCode,
  ShoppingCart,
  Users,
  Users2,
} from 'lucide-react';
import { z } from 'zod';
import { fieldConfig } from '@/components/ui/autoform';
import { dataMatrixActionSchema } from './datamatrix';
import {
  businessPluginDraftInstallSchema,
  businessPluginInstallSchema,
  pluginProjectInviteSchema,
  pluginProjectMemberSchema,
  pluginProjectSchema,
  pluginActionCapabilityEnvelopeSchema,
  pluginActionManifestDocStorageSchema,
  pluginDraftRevisionSchema,
  pluginDraftSchema,
  pluginPublishReviewSchema,
  pluginRecordSchema,
  pluginReleaseSchema,
  pluginRoutesTabsConfigSchema,
  pluginSchemaDocStorageSchema,
  pluginUserReviewSchema,
  pluginV2DiagnosticsSchema,
  pluginWorkflowDocStorageSchema,
} from './schema/plugins';
import type {
  AppSchemaType,
  CreatedSchema,
  GTAAppConfig as GTAAppConfigShape,
  InferredTable,
  SchemaShape,
} from './schemas/core/types';
import { folderSchema } from './schemas/folder-schema';
import {
  menuItemSchema,
  productSchema,
  table,
  withLabel,
} from './schemas/listings';
import { qrFlowConfigSchema } from './schemas/qr-flow-config-schema';
import {
  customerSchema,
  invoiceSchema,
  orderSchema,
  partySchema,
  saleSchema,
  stockImportSchema,
  tripSchema,
} from './schemas/retail';
import { uiBuilderSchema } from './schemas/ui-builder-schema';
import React from 'react';


const OrderKanban = React.lazy(() => import('@/components/ui/admin/order-kanban'));
const MenuManagement = React.lazy(() => import('@/components/ui/admin/menu-management'));
const TripManagement = React.lazy(() => import('@/components/ui/admin/trip-management'));
const PartyManagement = React.lazy(() => import('@/components/ui/admin/party-management'));
const InvoiceManagement = React.lazy(() => import('@/components/ui/admin/invoice-management'));


function getPermissions() {
  return ['product'] as readonly [string, ...string[]];
}

export type Permission = keyof ReturnType<typeof getPermissions>;
const permissionEnum = z.string();

export const permissionSchema = withLabel(
  z.record(permissionEnum, z.boolean()),
  'Permissions',
).describe('Record of permissions enabled for this role');

export const roleSchema = z
  .object({
    name: withLabel(z.string(), 'Role Name'),
    permissions: permissionSchema,
  })
  .extend(table);
// #endregion

// #region Core Platform Schemas (User, Business)

export const userSchema = z
  .object({
    email: z.string().email().describe("User's email address (login)"),
    password: z.string().describe('Hashed password for the user'),
    name: z.string().optional().describe('Full name of the user'),
    avatar: z
      .string()
      .url()
      .optional()
      .describe("URL to user's avatar image")
      .superRefine(fieldConfig({ fieldType: 'image' })),
    phone: z.string().optional().describe("User's contact phone number"),
    isActive: z
      .boolean()
      .default(true)
      .describe('Whether the user account is active')
      .optional(),
    role: z
      .enum(['user', 'internal-staff', 'admin'])
      .default('user')
      .optional(),
    // isVerified: z.boolean().default(false).optional(),
  })
  .extend(table);

export const otpSchema = z
  .object({
    otp: z.string().length(6).describe('OTP'),
  })
  .extend(table);

export type OTP = InferredTable<'otp'>;

export const businessMemberSchema = z.object({
  role: z.enum(['owner', 'staff']),
  permissions: permissionSchema.optional(),
  userId: z.string(),
  joinedAt: z.number().optional(),
});

export const businessInvitationSchema = z.object({
  role: z.enum(['owner', 'staff']),
  permissions: permissionSchema.optional(),
  email: z.string(),
  invitedAt: z.number().optional(),
  token: z.string(),
  expiresAt: z.number().optional(),
});

export type BusinessInvitation = NonNullable<Business['invitations']>[string];

export const businessSchema = z
  .object({
    name: z.string().describe('Official name of the business'),
    id: z.string().describe('Unique ID for the business'),
    basePath: z
      .string()
      .describe('Unique URL path for the business (e.g., /my-shop)')
      .optional(),
    features: z
      .record(z.string(), z.boolean())
      .optional()
      .describe('A map of enabled features for this business')
      .superRefine(fieldConfig({ fieldType: 'record' })),
    isActive: z
      .boolean()
      .default(true)
      .describe('Whether the business is currently active'),
    icon: z.string().base64().describe('Business icon').optional(),
    locationCoordinates: z
      .string()
      .describe(
        'GPS coordinates for the business location [latitude, longitude]',
      )
      .optional()
      .superRefine(fieldConfig({ fieldType: 'map' })),
    members: z.record(z.string(), businessMemberSchema).optional(),
    invitations: z.record(z.string(), businessInvitationSchema).optional(),
    uiBuilder: uiBuilderSchema.optional(),
  })
  .extend(table);

export type Party = InferredTable<'party'>;

export type Customer = InferredTable<'customer'>;

export type Invoice = InferredTable<'invoice'>;

export type Trip = InferredTable<'trip'>;

export const membershipSchema = z
  .object({
    userId: withLabel(z.string(), 'User ID'),
    businessId: withLabel(z.string(), 'Business ID'),
    roleId: withLabel(z.string(), 'Role ID'),
  })
  .extend(table);

// #endregion

export const recentlyUsedAppSchema = z
  .object({
    appId: withLabel(z.string(), 'App ID'),
    timestamp: z
      .number({ coerce: true })
      .describe('Created at')
      .default(() => Math.floor(Date.now() / 1000)),
    usageCount: z
      .number({ coerce: true })
      .describe('Number of times this app has been accessed')
      .default(1),
  })
  .extend(table);

// #region App Schema
function createSchema<const TSchema extends GTAAppConfigShape['schema']>(
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
    extend<const TOtherSchema extends GTAAppConfigShape['schema']>(
      otherSchema: TOtherSchema,
    ) {
      return createSchema({ ...schema, ...otherSchema });
    },
    merge<
      const TOtherSchema extends CreatedSchema<GTAAppConfigShape['schema']>,
    >(this, otherSchema: TOtherSchema) {
      return createSchema({
        ...this.rawShape,
        ...otherSchema.rawShape,
      }) as CreatedSchema<TSchema & TOtherSchema['rawShape']>;
    },
  };
}

export const coreSchema = createSchema({
  user: {
    schema: userSchema,
    title: 'Users',
    icon: LucideUser,
    group: 'User Management',
  },
  business: {
    schema: businessSchema,
    title: 'Businesses',
    icon: Building,
    group: 'System Configuration',
  },
  role: {
    schema: roleSchema,
    title: 'Roles',
    icon: List,
    group: 'User Management',
  },
  membership: {
    schema: membershipSchema,
    title: 'Memberships',
    icon: Users,
    group: 'User Management',
  },
  otp: {
    schema: otpSchema,
    title: 'OTPs',
    icon: Lock,
    group: 'System Configuration',
  },
  pluginRelease: {
    schema: pluginReleaseSchema,
    title: 'Plugin Releases',
    icon: Package,
    group: 'Plugin Platform',
  },
  businessPluginInstall: {
    schema: businessPluginInstallSchema,
    title: 'Business Plugin Installs',
    icon: Building,
    group: 'Plugin Platform',
  },
  pluginProject: {
    schema: pluginProjectSchema,
    title: 'Plugin Projects',
    icon: Folder,
    group: 'Plugin Platform',
  },
  pluginProjectMember: {
    schema: pluginProjectMemberSchema,
    title: 'Plugin Project Members',
    icon: Users,
    group: 'Plugin Platform',
  },
  pluginProjectInvite: {
    schema: pluginProjectInviteSchema,
    title: 'Plugin Project Invites',
    icon: Clock,
    group: 'Plugin Platform',
  },
  pluginDraft: {
    schema: pluginDraftSchema,
    title: 'Plugin Drafts',
    icon: Package,
    group: 'Plugin Platform',
  },
  pluginDraftRevision: {
    schema: pluginDraftRevisionSchema,
    title: 'Plugin Draft Revisions',
    icon: List,
    group: 'Plugin Platform',
  },
  businessPluginDraftInstall: {
    schema: businessPluginDraftInstallSchema,
    title: 'Business Plugin Draft Installs',
    icon: Building,
    group: 'Plugin Platform',
  },
  pluginRecord: {
    schema: pluginRecordSchema,
    title: 'Plugin Runtime Records',
    icon: Folder,
    group: 'Plugin Platform',
  },
  pluginV2Diagnostics: {
    schema: pluginV2DiagnosticsSchema,
    title: 'Plugin V2 Diagnostics',
    icon: List,
    group: 'Plugin Platform',
  },
  pluginPublishReview: {
    schema: pluginPublishReviewSchema,
    title: 'Plugin Publish Reviews',
    icon: Clock,
    group: 'Plugin Platform',
  },
  pluginUserReview: {
    schema: pluginUserReviewSchema,
    title: 'Plugin User Reviews',
    icon: List,
    group: 'Plugin Platform',
  },
  pluginActionCapabilityEnvelope: {
    schema: pluginActionCapabilityEnvelopeSchema,
    title: 'Plugin Capability Envelopes',
    icon: Lock,
    group: 'Plugin Platform',
  },
  pluginRoutesTabsConfig: {
    schema: pluginRoutesTabsConfigSchema,
    title: 'Plugin Routes Tabs Config',
    icon: MapIcon,
    group: 'Plugin Platform',
  },
  pluginSchemaDoc: {
    schema: pluginSchemaDocStorageSchema,
    title: 'Plugin Schema Docs',
    icon: List,
    group: 'Plugin Platform',
  },
  pluginWorkflowDoc: {
    schema: pluginWorkflowDocStorageSchema,
    title: 'Plugin Workflow Docs',
    icon: MapIcon,
    group: 'Plugin Platform',
  },
  pluginActionManifestDoc: {
    schema: pluginActionManifestDocStorageSchema,
    title: 'Plugin Action Manifest Docs',
    icon: List,
    group: 'Plugin Platform',
  },
});

export const featureSchema = createSchema({
  product: {
    schema: productSchema,
    title: 'Products',
    icon: Package,
    group: 'Products & Inventory',
    components: () => {
      return [
        {
          name: 'Cards',
          component: MenuManagement,
        },
      ];
    },
  },
  party: {
    schema: partySchema,
    title: 'Purchase Parties',
    icon: Users,
    group: 'Financial',
    components: () => {
      return [
        {
          name: 'Suppliers & Customers',
          component: PartyManagement,
        },
      ];
    },
  },
  customer: {
    schema: customerSchema,
    title: 'Customers',
    icon: Users2,
    group: 'Financial',
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
    title: 'Invoices',
    icon: IconMoneybag,
    group: 'Financial',
    components: () => {
      return [
        {
          name: 'Invoices By Parties',
          component: InvoiceManagement,
        },
      ];
    },
  },
  sale: {
    schema: saleSchema,
    title: 'Sales',
    icon: DollarSign,
    group: 'Financial',
  },
  stockImport: {
    schema: stockImportSchema,
    title: 'Stock Imports',
    icon: ShoppingCart,
    group: 'Financial',
  },
  order: {
    schema: orderSchema,
    title: 'Orders',
    icon: DollarSign,
    group: 'Business Operations',
    components: () => {
      return [
        {
          name: 'Board',
          component: OrderKanban,
        },
      ];
    },
  },
  menuItem: {
    schema: menuItemSchema,
    title: 'Menu Items',
    icon: Package,
    group: 'Products & Inventory',
    components: () => {
      return [
        {
          name: 'Menu Items',
          component: MenuManagement,
        },
      ];
    },
  },
  dataMatrixAction: {
    schema: dataMatrixActionSchema,
    title: 'Data Matrix Actions',
    icon: QrCode,
    group: 'System Configuration',
    components: () => {
      return [];
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
    title: 'Recently Used Apps',
    icon: Clock,
    group: 'System Configuration',
  },
  // Folder schema
  folder: {
    schema: folderSchema,
    title: 'Folders',
    icon: Folder,
    group: 'System Configuration',
  },
  // QR Flow Config schema
  qrFlowConfig: {
    schema: qrFlowConfigSchema,
    title: 'QR Flow Config',
    icon: QrCode,
    group: 'System Configuration',
  },

  // Vehicle schema
  vehicle: {
    schema: z
      .object({
        name: z.string().describe('Vehicle Name'),
        licensePlate: z.string().describe('License Plate Number'),
        description: z
          .string()
          .optional()
          .describe('Vehicle Description')
          .superRefine(fieldConfig({ fieldType: 'richText' })),
      })
      .extend(table),
    title: 'Vehicles',
    icon: Car,
    group: 'Logistics',
  },

  // Trip schema
  trip: {
    schema: tripSchema,
    title: 'Trips',
    icon: MapIcon,
    group: 'Logistics',
    components: () => {
      return [
        {
          name: 'Trip Tracking',
          component: TripManagement,
        },
      ];
    },
  },
});

// A composite schema that brings together all the individual schemas.
// This is useful for type inference and for providing a single entry point to all data models.
export const appSchema = coreSchema.merge(featureSchema);

declare global {
  interface GTAAppConfig {
    schema: AppSchemaType;
  }
}
// #endregion

// #region Type Exports
export type User = InferredTable<'user'>;
export type Business = InferredTable<'business'>;
export type Order = InferredTable<'order'>;
export type PluginRelease = InferredTable<'pluginRelease'>;
export type BusinessPluginInstall = InferredTable<'businessPluginInstall'>;
export type PluginDraft = InferredTable<'pluginDraft'>;
export type PluginDraftRevision = InferredTable<'pluginDraftRevision'>;
export type BusinessPluginDraftInstall =
  InferredTable<'businessPluginDraftInstall'>;
export type PluginRecord = InferredTable<'pluginRecord'>;
export type PluginV2Diagnostics = InferredTable<'pluginV2Diagnostics'>;
export type PluginPublishReview = InferredTable<'pluginPublishReview'>;
export type PluginUserReview = InferredTable<'pluginUserReview'>;
export type PluginActionCapabilityEnvelope =
  InferredTable<'pluginActionCapabilityEnvelope'>;
export type PluginRoutesTabsConfig = InferredTable<'pluginRoutesTabsConfig'>;
// #endregion

export {
  businessPluginDraftInstallSchema,
  businessPluginInstallSchema,
  compilePluginSchemasFromDocs,
  pluginActionCapabilityEnvelopeSchema,
  pluginActionManifestDocStorageSchema,
  pluginDraftRevisionSchema,
  pluginDraftSchema,
  pluginPublishReviewSchema,
  pluginRecordSchema,
  pluginReleaseSchema,
  pluginRoutesTabsConfigSchema,
  pluginSchemaDocStorageSchema,
  pluginUserReviewSchema,
  pluginV2DiagnosticsSchema,
  pluginWorkflowDocStorageSchema,
} from './schema/plugins';

export function transformSchema<const TSchema extends BaseAppSchemaType>(
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

export default appSchema;
