import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook } from "./useGunHook";
import { encrypt } from "../utils/sea";

export const useCreate = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
		return async (value: Omit<NestedSchemaType<T>, "_">) => {
			return new Promise(async (resolve, reject) => {
				options.gun
					.get(keys)
					.get(Date.now().toString())
					.put(await encrypt(parseNestedZodType(keys, value, options.schema)), (ack) => {
						if ("err" in ack && !!ack.err) {
							reject(ack.err);
						} else {
							resolve(ack);
						}
					});
			})
		};
	};
});
