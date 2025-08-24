import type { z } from "zod";
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
import { appSchema, transformSchema } from "./schema";

const schema = transformSchema(appSchema);

function createApi<const TSchema extends z.ZodObject<any>>(schema: TSchema) {
	return Object.keys(schema.shape)
		.map((k) => {
			const key = k as SchemaKeys;
			return {
				[key]: {
					useGet: (opts?: UseGetBuilder<typeof key> & { keys?: string[] }) =>
						useGet({ key, ...opts }, ...(opts?.keys ?? [])),
					useUpdate: (opts?: UseUpdateOptionsShort) =>
						useUpdate({ ...opts, keys: [key, ...(opts?.keys ?? [])] }),
					useCreate: (opts?: UseCreateOptionsShort) =>
						useCreate({ ...opts, keys: [key, ...(opts?.keys ?? [])] }),
					useDelete: (opts?: UseDeleteOptionsShort) =>
						useDelete({ ...opts, keys: [key, ...(opts?.keys ?? [])] }),
				},
			} as const;
		})
		.reduce((acc, curr) => ({ ...acc, ...curr }), {}) as {
		[K in SchemaKeys]: {
			useGet: (
				opts?: UseGetBuilder<K> & { keys?: string[] },
			) => ReturnType<typeof useGet<K>>;
			useUpdate: (
				opts?: UseUpdateOptionsShort,
			) => ReturnType<typeof useUpdate<K>>;
			useCreate: (
				opts?: UseCreateOptionsShort,
			) => ReturnType<typeof useCreate<K>>;
			useDelete: (
				opts?: UseDeleteOptionsShort,
			) => ReturnType<typeof useDelete<K>>;
		};
	};
}

export const api = createApi(schema);
