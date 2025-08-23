import {
	useCreate,
	useDelete,
	useGet,
	useUpdate,
	type SchemaKeys,
	type UseCreateOptionsShort,
	type UseDeleteOptionsShort,
	type UseGetBuilder,
	type UseUpdateOptionsShort,
} from "@gta/react-hooks";
import { appSchema, transformSchema } from "../schema";
import { toast } from "sonner";

const schema = transformSchema(appSchema);

// Enhanced API hook with better error handling and loading states
export function useApi<const K extends SchemaKeys>(key: K) {
	return {
		useGet: (opts?: UseGetBuilder<K> & { keys?: string[] }) => {
			const result = useGet({ key, ...opts }, ...(opts?.keys ?? []));

			return {
				...result,
				refetch: result.refetch,
				isLoading: result.isLoading,
				isError: result.isError,
				error: result.error,
				data: result.data,
			};
		},

		useCreate: (opts?: UseCreateOptionsShort) => {
			return useCreate({
				...opts,
				keys: [key, ...(opts?.keys ?? [])],
				onSuccess: (data) => {
					toast.success(`${key} created successfully`);
					if (opts?.onSuccess) {
						// @ts-expect-error - Type mismatch in the library
						opts.onSuccess(data);
					}
				},
				onError: (error) => {
					toast.error(`Failed to create ${key}: ${error.message}`);
					if (opts?.onError) {
						// @ts-expect-error - Type mismatch in the library
						opts.onError(error);
					}
				},
			});
		},

		useUpdate: (opts?: UseUpdateOptionsShort) => {
			return useUpdate({
				...opts,
				keys: [key, ...(opts?.keys ?? [])],
				onSuccess: (data) => {
					toast.success(`${key} updated successfully`);
					if (opts?.onSuccess) {
						// @ts-expect-error - Type mismatch in the library
						opts.onSuccess(data);
					}
				},
				onError: (error) => {
					toast.error(`Failed to update ${key}: ${error.message}`);
					if (opts?.onError) {
						// @ts-expect-error - Type mismatch in the library
						opts.onError(error);
					}
				},
			});
		},

		useDelete: (opts?: UseDeleteOptionsShort) => {
			return useDelete({
				...opts,
				keys: [key, ...(opts?.keys ?? [])],
				onSuccess: (data) => {
					toast.success(`${key} deleted successfully`);
					if (opts?.onSuccess) {
						// @ts-expect-error - Type mismatch in the library
						opts.onSuccess(data);
					}
				},
				onError: (error) => {
					toast.error(`Failed to delete ${key}: ${error.message}`);
					if (opts?.onError) {
						// @ts-expect-error - Type mismatch in the library
						opts.onError(error);
					}
				},
			});
		},
	};
}

// Create individual API hooks for each schema
export const api = Object.fromEntries(
	Object.keys(schema.shape).map((k) => {
		const key = k as SchemaKeys;
		return [key, useApi(key)];
	}),
) as {
	[K in SchemaKeys]: ReturnType<typeof useApi<K>>;
};

// Export the original API for backward compatibility
export { api as legacyApi } from "../api";

// Type exports
export type { SchemaKeys } from "@gta/react-hooks";
