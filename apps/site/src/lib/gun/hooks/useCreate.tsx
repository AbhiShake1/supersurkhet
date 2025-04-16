import { type NestedSchemaType, type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook } from "./useGunHook";

export const useCreate = createGunHook((messenger) => {
    return function <T extends SchemaKeys>(key: T, ...restKeys: string[]) {
        const options = messenger._options
        const set = async (value: Omit<NestedSchemaType<T>, "_">) => {
            const keys = mergeKeys(key, ...restKeys) as SchemaKeys
            options.gun.get(keys).set(parseNestedZodType(keys, value, options.schema))
        };
        return set
    }
})