import { useEffect, useState } from "react";
import { type NestedSchemaType, type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodShape } from "../utils/parser";
import { createGunHook } from "./useGunHook";

export const useGet = createGunHook((messenger) => {
    return function <T extends SchemaKeys>(key: T, ...restKeys: string[]) {
        const [data, setData] = useState<NestedSchemaType<T>[]>([]);

        const options = messenger._options;

        useEffect(() => {
            const keys = mergeKeys(key, ...restKeys) as T
            const chatRoom = options.gun.get(keys).map();

            chatRoom.on((data, key: string) => {
                if (!data) return setData(p => p.filter((msg) => msg._?.soul !== key));

                setData((p) => {
                    console.log(p)
                    if (!p.find((msg) => msg._?.soul === key)) {
                        return [...p, /* parseNestedZodShape(keys, */ { ...data, _: { soul: key } }/* , options.schema) */];
                    }
                    return p.map(p => p._?.soul === key ? /* parseNestedZodShape(keys, */ {...data, _: { soul: key } }/*, options.schema) */ : p);
                });
            });

            return () => {
                chatRoom.off();
            };
        }, [options])

        return data;
    }
})
