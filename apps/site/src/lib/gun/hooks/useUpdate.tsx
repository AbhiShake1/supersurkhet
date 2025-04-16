import { type NestedSchemaType, type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { parseNestedZodType } from "../utils/parser";
import { createGunHook } from "./useGunHook";

export const useUpdate = createGunHook((messenger) => {
  return function useUpdate<T extends SchemaKeys>(key: T, ...restKeys: string[]) {
    const options = messenger._options;
    const update = async (id: string, value: Partial<Omit<NestedSchemaType<T>, "_" | "id">>) => {
      const keys = mergeKeys(key, id, ...restKeys) as SchemaKeys; // Assuming your data has an 'id' property for updates
      options.gun.get(keys).put(parseNestedZodType(keys, value, options.schema));
    };
    return update;
  };
});