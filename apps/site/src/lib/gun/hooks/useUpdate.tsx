import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { encrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";

export const useUpdate = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		return async (
			{ id, ...value }: { id: string } & Partial<Omit<NestedSchemaType<T>, "_" | "id">>,
		) => {
			const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
			return new Promise(async (resolve, reject) => {
				options.gun
					.get(keys)
					.get(id)
					.put(await encrypt(value), (ack) => {
						if ("err" in ack && !!ack.err) {
							reject(ack.err);
						} else {
							resolve(ack);
						}
					})
			})
		};
	};
});
