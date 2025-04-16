import { type SchemaKeys } from "..";
import { mergeKeys } from "../utils";
import { createGunHook } from "./useGunHook";

export const useDelete = createGunHook((messenger) => {
  return function <T extends SchemaKeys>(key: T, ...restKeys: string[]) {
    const options = messenger._options;
    return async (id: string) => {
      const keys = mergeKeys(key, ...restKeys, id) as SchemaKeys;
      options.gun.get(id).map().once(console.log)
      options.gun.get(keys).put(null);
    };
  };
});