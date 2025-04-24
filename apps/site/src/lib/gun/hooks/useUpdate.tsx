import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { encrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";

export const useUpdate = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		return async (
			id: string,
			value: Partial<Omit<NestedSchemaType<T>, "_" | "id">>,
		) => {
			const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
			options.gun
				.get(keys)
				.get(id)
				.put(await encrypt(value));
			// options.gun.get(keys).get(id).put(parseNestedZodType(keys, value, options.schema, { isPartial: true }));
		};
	};
});
