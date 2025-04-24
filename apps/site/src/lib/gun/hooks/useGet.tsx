import { useEffect, useState } from "react";
import type { NestedSchemaType, SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { decrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";

export const useGet = createGunHook((messenger) => {
	return <T extends SchemaKeys,>(key: T, ...restKeys: string[]) => {
		const [data, setData] = useState<NestedSchemaType<T>[]>([]);

		const options = messenger._options;

		useEffect(() => {
			const keys = mergeKeys(key, ...restKeys) as T;
			const chatRoom = options.gun.get(keys).map();

			chatRoom.on(async (_data, key: string) => {
				// @ts-ignore
				if (!_data)
					// @ts-expect-error
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
