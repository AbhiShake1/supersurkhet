import { useCreate, useDelete, useGet, useUpdate } from "@/lib/gun/hooks";
import type { businessSchema } from "@/lib/schema";
import type { z } from "zod";

type Business = z.infer<typeof businessSchema>;

export function useBusiness() {
	const businesses = useGet("business", "root1");
	const createBusiness = useCreate("business", "root1");
	const updateBusiness = useUpdate("business", "root1");
	const deleteBusiness = useDelete("business", "root1");

	const handleCreate = async (data: Business) => {
		await createBusiness(data);
	};

	const handleUpdate = async (data: Business) => {
		if (!data._?.soul) return;
		await updateBusiness(data._?.soul, data);
	};

	const handleDelete = async (data: Business) => {
		if (!data._?.soul) return;
		await deleteBusiness(data._?.soul);
	};

	return {
		businesses: businesses as Business[],
		createBusiness: handleCreate,
		updateBusiness: handleUpdate,
		deleteBusiness: handleDelete,
	};
}
