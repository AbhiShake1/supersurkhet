import { type NestedSchemaType, type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook, type UseGunHook } from "./useGunHook";

type UseSetFn = <T extends SchemaKeys>(key: T, ...restKeys: string[]) => NestedSchemaType<T>[];

export type UseSet = UseGunHook<UseSetFn>

export const useSet = createGunHook((messenger) => {
    return function useSet<T extends SchemaKeys>(key: T, ...restKeys: string[]) {
        const options = messenger._options
        const set = async (value: Omit<NestedSchemaType<T>, "_">) => {
            const keys = mergeKeys(key, ...restKeys) as SchemaKeys
            options.gun.get(keys).set(parseNestedZodType(keys, value, options.schema))
        };
        return set
    }
})