import { z } from "zod";

const table = {
	created_by: z.string().optional(),
	timestamp: z.number().optional(),
	_: z
		.object({
			soul: z.string().optional(),
		})
		.optional(),
};

const chatMessageSchema = z
	.object({
		content: z.string(),
		sender_id: z.string(),
		sender_name: z.string(),
		timestamp: z.number(),
		read: z.boolean().default(false),
		delivered: z.boolean().default(false),
	})
	.extend(table);

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const businessSchema = z
	.object({
		name: z.string().describe("Business name"),
		location: z
			.string()
			.describe("Physical address of the business")
			.optional(),
		basePath: z.string().describe("URL path for the business").optional(),
		isActive: z
			.boolean()
			.describe("Whether the business is currently active")
			.default(true)
			.optional(),
	})
	.extend(table);

export const appSchema = z.object({
	user: z
		.object({
			name: z.string(),
			email: z.string(),
			password: z.string(),
		})
		.extend(table),
	business: businessSchema,
	inventory: z
		.object({
			id: z
				.string()
				.uuid()
				.describe("Unique identifier for the inventory item"),
			name: z.string().min(1).describe("Name of the inventory item"),
			description: z
				.string()
				.optional()
				.describe("Optional description of the item"),
			sku: z
				.string()
				.optional()
				.describe("Stock Keeping Unit (optional identifier)"),
			category: z
				.string()
				.optional()
				.describe(
					"Category of the item (e.g., 'Electronics', 'Produce', 'Appetizers')",
				),
			tags: z
				.array(z.string())
				.optional()
				.describe("Optional tags for filtering and searching"),
			unitPrice: z.number().positive().describe("Price per unit of the item"),
			currency: z
				.string()
				.length(3)
				.default("USD")
				.describe("Currency code (e.g., USD, EUR, NPR)"),
			quantityAvailable: z
				.number()
				.int()
				.nonnegative()
				.describe("Current quantity available in stock"),
			unitOfMeasure: z
				.string()
				.optional()
				.describe("Unit of measure (e.g., 'piece', 'kg', 'ml', 'serving')"),
			reorderPoint: z
				.number()
				.int()
				.nonnegative()
				.optional()
				.describe("Minimum quantity before reordering is suggested"),
			supplier: z.string().optional().describe("Name of the supplier"),
			supplierCode: z.string().optional().describe("Supplier's item code"),
			costPrice: z
				.number()
				.positive()
				.optional()
				.describe("Cost price per unit (for internal tracking)"),
			// Timestamps
			createdAt: z
				.date()
				.default(() => new Date())
				.describe("Date and time when the item was created"),
			updatedAt: z
				.date()
				.default(() => new Date())
				.describe("Date and time when the item was last updated"),

			// Application-specific fields (can be extended or ignored as needed)
			imageUrl: z
				.string()
				.url()
				.optional()
				.describe("Optional URL to an image of the item"),
			attributes: z
				.record(z.string(), z.any())
				.optional()
				.describe(
					"Optional key-value pairs for additional attributes (e.g., size, color, ingredients)",
				),
			variants: z
				.record(
					z.string().uuid(),
					z.object({
						// Changed from array to record
						name: z.string(),
						sku: z.string().optional(),
						unitPrice: z.number().positive(),
						quantityAvailable: z.number().int().nonnegative(),
						attributes: z.record(z.string(), z.any()).optional(),
						// Add other variant-specific properties as needed
					}),
				)
				.optional()
				.describe(
					"Optional record of variants, where the key is the variant ID",
				),
			isFeatured: z
				.boolean()
				.optional()
				.describe("Optional flag to indicate if the item is featured"),
			isActive: z
				.boolean()
				.default(true)
				.describe(
					"Optional flag to indicate if the item is currently active/available",
				),
			// Add more application-specific fields as required
		})
		.extend(table),
	menuItem: z.object({
		name: z.string().describe("Name of the menu item"),
		description: z.string().optional().describe("Detailed description of the item"),
		price: z.number().positive().describe("Regular price of the item"),
		discountedPrice: z.number().positive().optional().describe("Special or discounted price"),
		imageUrl: z.string().url().optional().describe("Image URL of the item"),
		category: z.string().describe("Category of the item (e.g., Starters, Main Course)"),
		isVegetarian: z.boolean().default(false).describe("Whether the item is vegetarian"),
		isSpicy: z.boolean().default(false).describe("Whether the item is spicy"),
		isAvailable: z.boolean().default(true).describe("Whether the item is currently available"),
		isSpecial: z.boolean().default(false).describe("Whether the item is chef's special"),
		preparationTime: z.number().int().positive().describe("Estimated preparation time in minutes"),
		portionSize: z.string().describe("Portion size (e.g., Small, Regular, Large)"),
		nutritionalInfo: z.record(z.string(), z.string()).optional().describe("Nutritional information"),
		customizations: z.record(
			z.string().uuid(),
			z.object({
				name: z.string(),
				price: z.number().nonnegative(),
				isAvailable: z.boolean().default(true)
			})
		).optional().describe("Available customization options")
	}).extend(table),
	order: z.object({
		customerId: z.string().optional().describe("ID of the customer who placed the order"),
		items: z.record(
			z.string(),
			z.object({
				menuItemId: z.string(),
				quantity: z.number({coerce: true}).int().positive(),
				unitPrice: z.number({coerce: true}).positive(),
				customizations: z.record(z.string(), z.boolean()).optional(),
				specialInstructions: z.string().optional()
			})
		).describe("Ordered items with their details"),
		subTotal: z.number().positive(),
		taxes: z.number({coerce: true}).nonnegative(),
		deliveryFee: z.number({coerce: true}).nonnegative(),
		totalAmount: z.number({coerce: true}).positive(),
		orderStatus: z.enum([
			"pending",
			"confirmed",
			"preparing",
			"ready",
			"served",
			"cancelled"
		]),
		paymentStatus: z.enum(["pending", "paid", "failed"]),
		paymentMethod: z.enum(["cash", "card", "online"]),
		estimatedDeliveryTime: z.number({coerce: true}).optional()
	}).extend(table),
	// customer: z.object({
	// 	name: z.string(),
	// 	email: z.string().email(),
	// 	phone: z.string(),
	// 	addresses: z.record(
	// 		z.string().uuid(),
	// 		z.object({
	// 			type: z.enum(["home", "work", "other"]),
	// 			street: z.string(),
	// 			city: z.string(),
	// 			state: z.string(),
	// 			postalCode: z.string(),
	// 			landmark: z.string().optional(),
	// 			isDefault: z.boolean().default(false)
	// 		})
	// 	),
	// 	preferences: z.object({
	// 		isVegetarian: z.boolean().default(false),
	// 		allergies: z.array(z.string()).optional(),
	// 		favoriteItems: z.record(z.string().uuid(), z.boolean()).optional()
	// 	}).optional()
	// }).extend(table),
	chat: z.object({
		message: chatMessageSchema,
		room: z
			.object({
				name: z.string(),
				participants: z.array(z.string()),
				last_message: chatMessageSchema.nullable(),
				created_at: z.number(),
				updated_at: z.number(),
			})
			.extend(table),
	}),
	school: z
		.object({
			name: z.string(),
			address: z.string(),
			city: z.string(),
			fee: z.bigint(),
		})
		.extend(table),
	restaurant: z
		.object({
			name: z.string(),
			address: z.string(),
			city: z.string(),
		})
		.extend(table),
	ride: z.object({
		vehicleType: z
			.object({
				name: z.string(),
				description: z.string().optional(),
				basePrice: z.number().positive().default(50),
				pricePerKm: z.number().positive(),
				pricePerMinute: z.number().positive(),
				capacity: z.number().int().positive(),
				imageUrl: z.string().url().optional(),
				isActive: z.boolean().default(true),
			})
			.extend(table),
		serviceArea: z
			.object({
				name: z.string(),
				description: z.string().optional(),
				coordinates: z.object({
					start: z.object({
						lat: z.number(),
						lng: z.number(),
					}),
					end: z.object({
						lat: z.number(),
						lng: z.number(),
					}),
				}),
				isActive: z.boolean().default(true),
			})
			.extend(table),
		settings: z
			.object({
				minimumFare: z.number().positive().optional(),
				cancellationFee: z.number().nonnegative().optional(),
				maxWaitingTime: z.number().positive().default(5), // in minutes
				surgeMultiplier: z.number().positive().default(1).optional(),
				currency: z.string().default("NPR").optional(),
			})
			.extend(table),
	}),
});
export type AppSchemaShape = typeof appSchema;
export type AppSchema = z.infer<AppSchemaShape>;

declare global {
	interface GTAAppSchema extends AppSchemaShape { }
}
