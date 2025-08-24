import { z } from "zod";
import { baseListingSchema, table } from "./listings";
import { fieldConfig } from "@/components/ui/autoform";

// Education schema
export const educationSchema = baseListingSchema
	.extend({
		courses: z
			.record(z.string(), z.string())
			.optional()
			.describe("Course names and descriptions")
			.superRefine(fieldConfig({ fieldType: "record" })),
		classSchedule: z
			.record(z.string(), z.string())
			.optional()
			.describe("Class names and schedules")
			.superRefine(fieldConfig({ fieldType: "record" })),
		instructors: z
			.record(z.string(), z.string())
			.optional()
			.describe("Instructor names and specializations")
			.superRefine(fieldConfig({ fieldType: "record" })),
		facilities: z
			.record(z.string(), z.boolean())
			.optional()
			.describe("Facilities and amenities")
			.superRefine(fieldConfig({ fieldType: "record" })),
		enrollmentCapacity: z
			.number({ coerce: true })
			.int()
			.nonnegative()
			.optional()
			.describe("Maximum number of students that can be enrolled"),
		academicYear: z
			.string()
			.optional()
			.describe("Academic year or term information"),
		admissionRequirements: z
			.string()
			.optional()
			.describe("Admission requirements and criteria"),
	})
	.extend(table);
