import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import type { LucideIcon } from "lucide-react";
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

// #region Permissions & Roles
export const permissions = {
	// ... (permissions remain the same)
} as const;
export type Permission = keyof typeof permissions;
const permissionEnum = z.nativeEnum(permissions);

export interface GTAAppConfig {
	schema: {
		[table: string]: {
			schema: NonNullable<z.ZodObject<any>>;
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
		role: z.string().default("user").optional(),
	})
	.extend(table);

export const businessSchema = z
	.object({
		name: z.string().describe("Official name of the business"),
		location: z
			.string()
			.describe("Physical address or area of the business")
			.optional(),
		basePath: z
			.string()
			.describe("Unique URL path for the business (e.g., /my-shop)")
			.optional(),
		businessType: z
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
			.describe("The primary category of the business"),
		features: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("A map of enabled features for this business")
			.superRefine(fieldConfig({ fieldType: "record" })),
		isActive: z
			.boolean()
			.default(true)
			.describe("Whether the business is currently active"),
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
		customerId: z
			.string()
			.optional()
			.describe("ID of the customer who placed the order"),
		items: z
			.record(
				z.string(),
				z.object({
					quantity: z.number({ coerce: true }).int().positive(),
					unitPrice: z.number({ coerce: true }).positive(),
					customizations: z.record(z.string(), z.boolean()).optional(),
					specialInstructions: z.string().optional(),
				}),
			)
			.describe("Ordered items with their details")
			.superRefine(fieldConfig({ fieldType: "record" })),
		subTotal: z.number({ coerce: true }).positive(),
		taxes: z.number({ coerce: true }).nonnegative(),
		deliveryFee: z.number({ coerce: true }).nonnegative(),
		totalAmount: z.number({ coerce: true }).positive(),
		orderStatus: z.enum([
			"pending",
			"confirmed",
			"preparing",
			"ready",
			"served",
			"cancelled",
		]),
		paymentStatus: z.enum(["pending", "paid", "failed"]),
		paymentMethod: z.enum(["cash", "card", "online"]).optional(),
		estimatedDeliveryTime: z.number({ coerce: true }).optional(),
		// listing: baseListingSchema.superRefine(fieldConfig({ fieldType: "record" })).optional(),
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
			.int()
			.describe("Unix timestamp of the message"),
		delivered: z.boolean().default(false),
		read: z.boolean().default(false),
	})
	.extend(table); // Placeholder

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
	},
	business: {
		schema: businessSchema,
	},
	role: {
		schema: roleSchema,
	},
	membership: {
		schema: membershipSchema,
	},
});

export const featureSchema = createSchema({
	driverProfile: {
		schema: driverProfileSchema,
	},
	studentProfile: {
		schema: studentProfileSchema,
	},
	coOpMemberProfile: {
		schema: coOpMemberProfileSchema,
	},

	baseListing: {
		schema: baseListingSchema,
	},
	product: {
		schema: productSchema,
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
	menuItem: {
		schema: menuItemSchema,
		components: async () => {
			const { MenuManagement } = await import(
				"@/components/ui/admin/menu-management"
			)

			return [
				{
					name: "Menu Items",
					component: MenuManagement,
				}
			]
		},
	},
	dataMatrixAction: {
		schema: dataMatrixActionSchema,
		components: async () => {
			const { DataMatrixFlowBuilder } = await import(
				"@/components/ui/admin/datamatrix-flow-builder"
			);
			return [
				{
					name: "Flow Builder",
					component: DataMatrixFlowBuilder,
				},
			];
		},
	},
	propertyListing: {
		schema: propertyListingSchema,
	},
	service: {
		schema: serviceSchema,
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
	},
	trip: {
		schema: tripSchema,
	},
	expense: {
		schema: expenseSchema,
	},
	chat: {
		schema: chatMessageSchema,
	},

	// Hotel schema
	hotel: {
		schema: hotelSchema,
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
