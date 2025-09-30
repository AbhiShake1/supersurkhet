import { z } from "zod";
import { table, withLabel } from "./listings";

// Schema for node configuration
const nodeConfigSchema = z.record(z.string(), z.any());

// Schema for a single node
export const customNodeSchema = z.object({
	id: z.string(),
	type: z.string(),
	position: z.object({
		x: z.number(),
		y: z.number(),
	}),
	data: z.object({
		label: z.string(),
		description: z.string().optional(),
		status: z.string().optional(),
		config: nodeConfigSchema.optional(),
		stats: z
			.object({
				started: z.number().optional(),
				running: z.number().optional(),
				completed: z.number().optional(),
				error: z.number().optional(),
				progress: z.number().optional(),
			})
			.optional(),
	}),
});

// Schema for an edge
const edgeSchema = z.object({
	id: z.string(),
	source: z.string(),
	target: z.string(),
	sourceHandle: z.string().optional(),
	targetHandle: z.string().optional(),
	type: z.string().optional(),
	data: z.record(z.string(), z.any()).optional(),
});

// Schema for node library order item
const nodeLibraryOrderItemSchema = z.object({
	type: z.string(),
	label: z.string(),
	color: z.string(),
	order: z.number().optional(),
});

// Main schema for QR flow config
export const qrFlowConfigSchema = z
	.object({
		id: withLabel(z.string(), "Configuration ID"),
		title: withLabel(z.string(), "Title"),
		description: z.string().optional(),
		nodes: z.array(customNodeSchema),
		edges: z.array(edgeSchema),
		nodeLibraryOrder: z.array(nodeLibraryOrderItemSchema),
		createdAt: z.number(),
		updatedAt: z.number(),
		revision: z.number(),
	})
	.extend(table);
