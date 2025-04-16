import type { IGunChain } from "gun/types";
import { type NestedSchemaType, type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook, type GunHookMessenger } from "./useGunHook";

function getGunChain(
    keys: string[],
    gun: GunHookMessenger["_options"]["gun"],
    chain: IGunChain<any> | null = null,
) {
    const [head, ...tail] = keys
    if (!tail.length) return gun.get(head)
    return getGunChain(tail, gun, chain?.get(head) ?? gun.get(head))
}

export const useCreate = createGunHook((messenger) => {
    return function <T extends SchemaKeys>(key: T, ...restKeys: string[]) {
        const options = messenger._options
        const keys = mergeKeys(key, ...restKeys) as SchemaKeys
        // getGunChain(keys.split("."), options.gun)
        return async (value: Omit<NestedSchemaType<T>, "_">) => {
            options.gun.get(keys).get(Date.now().toString()).put(parseNestedZodType(keys, value, options.schema))
        };
    }
})