import {
	useQuery,
	useQueryClient,
	type UseQueryOptions,
} from "@tanstack/react-query";
import type { NestedSchemaType, SchemaKeys } from "..";
import { getGunRef, mergeKeys } from "../utils";
import { decrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";
import type { GunCallbackMap } from "gun/types";

function attachSouls(obj: any, currentPath: string): any {
	if (typeof obj !== "object" || obj === null) return obj;

	const withSoul = { ...obj, "#": currentPath };

	for (const [k, v] of Object.entries(obj)) {
		if (typeof v === "object" && v !== null) {
			withSoul[k] = attachSouls(v, `${currentPath}/${k}`);
		}
	}

	return withSoul;
}

export type UseGetBuilder<T extends SchemaKeys> = {
	separator?: string;
	mapper?: GunCallbackMap<NestedSchemaType<T>, string, any>;
};

export const useGet = createGunHook((messenger) => {
	return <const T extends SchemaKeys>(
		key:
			| T
			| (UseGetBuilder<T> & {
				key: T;
			}),
		...restKeys: string[]
	) => {
		function getMapper() {
			if (typeof key !== "string") {
				return key.mapper
			}
			return undefined
		}
		const queryClient = useQueryClient();
		const k = typeof key === "string" ? key : key.key;
		const queryKey = ["get", key, ...restKeys];
		return useQuery({
			queryKey,
			queryFn: async () => {
				// await new Promise(r => {
				//   setTimeout(r, 1000)
				// })
				const _keys = mergeKeys(k, ...restKeys) as T;
				const keys =
					typeof key !== "string" && key.separator?.length
						? _keys.replaceAll("/", key.separator)
						: _keys;

				const node = getGunRef(keys);

				node.open(async (fullData) => {
					if (!fullData || typeof fullData !== "object") return;

					const entries = Object.entries(fullData) as [string, any][];
					const newList: NestedSchemaType<T>[] = [];

					for (const [soul, val] of entries) {
						if (soul === "_" || val === null) continue;

						const decrypted = await decrypt<NestedSchemaType<T>>({
							...val,
							_: { soul },
						});

						if (decrypted) {
							const item = attachSouls(decrypted, `${keys}/${soul}`);
							// if (newList.every(i => i._?.soul !== decrypted._?.soul))
							newList.push(item);
						}
					}

					queryClient.setQueryData(queryKey, newList.filter(Boolean));
				});

				return new Promise<NestedSchemaType<T>[]>((res) => {
					const timeout = setTimeout(() => {
						res([]);
					}, 1000);
					// @ts-expect-error
					node.map(getMapper()).once(async () => {
						clearTimeout(timeout);
						// res([]);
					});
				});
			},
		});
	};
});

type Options<T extends SchemaKeys> = UseQueryOptions<
	NestedSchemaType<T>[],
	Error,
	UseGetBuilder<T>
>;

export type UseGetOptions<T extends SchemaKeys> = Omit<
	Options<T>,
	"queryFn"
> & {
	key: T;
};

export type UseGetOptionsShort = Omit<UseGetOptions<SchemaKeys>, "key"> & {
	key?: string;
};
