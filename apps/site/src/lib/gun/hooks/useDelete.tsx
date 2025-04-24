import type { SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { createGunHook } from "./useGunHook";

export const useDelete = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		return async (id: string) => {
			const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
			options.gun.get(keys).get(id).put(null);
		};
	};
});
