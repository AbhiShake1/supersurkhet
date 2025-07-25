import { useEffect, useState } from "react";
import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { decrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";

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

export const useGet = createGunHook((messenger) => {
	return <T extends SchemaKeys>(
		key:
			| T
			| {
				key: T;
				separator?: string;
				mapper?: (d: NestedSchemaType<T>) => boolean;
			},
		...restKeys: string[]
	) => {
		const [data, setData] = useState<NestedSchemaType<T>[]>([]);

		const options = messenger._options;
		const k = typeof key === "string" ? key : key.key;

		useEffect(() => {
			const _keys = mergeKeys(k, ...restKeys) as T;
			const keys =
				typeof key !== "string" && key.separator?.length
					? _keys.replaceAll(".", key.separator)
					: _keys;

			const node = options.gun.get(keys);

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
						const item = attachSouls(decrypted, `${keys}/${soul}`)
						// if (newList.every(i => i._?.soul !== decrypted._?.soul))
						newList.push(item);
					}
				}

				setData(newList);
			});
		}, [key, ...restKeys]);

		return data;
	};
});