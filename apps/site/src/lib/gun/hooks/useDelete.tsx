import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { createGunHook } from "./useGunHook";
import type { GunMessagePut } from "gun/types";

export const useDelete = createGunHook((messenger) => {
	const fn = <T extends SchemaKeys>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		return async (id: string) => {
			const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
			options.gun.get(keys).get(id).put(null);
		};
	};

	return <const T extends SchemaKeys>(opts: UseDeleteOptions<T>) => {
		const [key, ...keys] = opts.keys;
		return useMutation({
			mutationFn: fn(key, ...keys),
		});
	};
});

type Options = UseMutationOptions<GunMessagePut, Error, string, unknown>;

export type UseDeleteOptions<T extends SchemaKeys> = Omit<
	Options,
	"mutationFn"
> & { keys: [T, ...string[]] };

export type UseDeleteOptionsShort = Omit<
	UseDeleteOptions<SchemaKeys>,
	"keys"
> & { keys?: string[] };
