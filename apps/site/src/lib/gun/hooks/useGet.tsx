import { useEffect, useState } from "react";
import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { decrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";

export const useGet = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T | { key: T, separator?: string, mapper?: (d: NestedSchemaType<T>) => boolean }, ...restKeys: string[]) => {
		const [data, setData] = useState<NestedSchemaType<T>[]>([]);

		const options = messenger._options;
		const k = typeof key === "string" ? key : key.key;

		useEffect(() => {
			const _keys = mergeKeys(k, ...restKeys) as T;
			const keys = typeof key !== "string" && key.separator?.length ? _keys.replaceAll('.', key.separator) : _keys

			const node = options.gun.get(keys)
			node.on(async (_data, key: string) => {
				if (!_data)
					// @ts-ignore
					return setData((p) => p.filter((msg) => msg._?.soul !== key));

				const newData = await decrypt<(typeof data)[number]>(
					/* parseNestedZodShape(keys, */ {
						..._data,
						_: { soul: key },
					} /* , options.schema) */,
				);

				if (!newData) return;

				setData((p) => {
					// @ts-ignore
					if (!p.find((msg) => msg._?.soul === key)) {
						return [...p, newData];
					}
					// @ts-ignore
					return p.map((p) => (p._?.soul === key ? newData : p));
				});
			});

			// return () => {
			//     chatRoom.off();
			// };
		}, [key, ...restKeys]);

		return data;
	};
});
