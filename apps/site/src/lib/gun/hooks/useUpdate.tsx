import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { encrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";
import type { GunMessagePut } from "gun/types";

export type UpdaterParams<T extends SchemaKeys> = { id: string } & Partial<Omit<NestedSchemaType<T>, "_" | "id">>

export const useUpdate = createGunHook((messenger) => {
	const fn = <T extends SchemaKeys>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		return async ({
			id,
			...value
		}: UpdaterParams<T>) => {
			const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
			return new Promise<GunMessagePut>(async (resolve, reject) => {
				options.gun
					.get(keys)
					.get(id)
					.put(await encrypt(value), (ack) => {
						if ("err" in ack && !!ack.err) {
							reject(ack.err);
						} else {
							resolve(ack);
						}
					});
			});
		};
	};

	return <const T extends SchemaKeys>(opts: UseUpdateOptions<T>) => {
		const [key, ...keys] = opts.keys
		return useMutation({
			...opts,
			mutationFn: fn(key, ...keys),
		})
	}
});

type Options<T extends SchemaKeys> = UseMutationOptions<GunMessagePut, Error, UpdaterParams<T>, unknown>

export type UseUpdateOptions<T extends SchemaKeys> = Omit<Options<T>, "mutationFn"> & { keys: [T, ...string[]] }

export type UseUpdateOptionsShort = Omit<UseUpdateOptions<SchemaKeys>, "keys"> & { keys?: string[] }