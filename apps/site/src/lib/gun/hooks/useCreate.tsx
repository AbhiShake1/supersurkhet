import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook } from "./useGunHook";
import { encrypt } from "../utils/sea";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { GunMessagePut } from "gun/types";

export const useCreate = createGunHook((messenger) => {
	const fn = <T extends SchemaKeys>(key: T, ...restKeys: string[]) => {
		const options = messenger._options;
		const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
		return async (value: Omit<NestedSchemaType<T>, "_">) => {
			return new Promise<GunMessagePut>(async (resolve, reject) => {
				options.gun
					.get(keys)
					.get(Date.now().toString())
					.put(
						await encrypt(parseNestedZodType(keys, value, options.schema)),
						(ack) => {
							if ("err" in ack && !!ack.err) {
								reject(ack.err);
							} else {
								resolve(ack);
							}
						},
					);
			});
		};
	};

	return <const T extends SchemaKeys>(opts: UseCreateOptions<T>) => {
		const [key, ...keys] = opts.keys;
		return useMutation({
			...opts,
			mutationFn: fn(key, ...keys),
		});
	};
});

type Options<T extends SchemaKeys> = UseMutationOptions<
	GunMessagePut,
	Error,
	Omit<NestedSchemaType<T>, "_">,
	unknown
>;

export type UseCreateOptions<T extends SchemaKeys> = Omit<
	Options<T>,
	"mutationFn"
> & { keys: [T, ...string[]] };

export type UseCreateOptionsShort = Omit<
	UseCreateOptions<SchemaKeys>,
	"keys"
> & { keys?: string[] };
