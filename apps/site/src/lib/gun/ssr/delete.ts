import type { SchemaKeys } from "..";
import { getGunRef, mergeKeys } from "../utils";

export function remove<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  // const options = messenger._options;
  return async (id: string) => {
    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    getGunRef(keys).get(id).put(null);

    return { deleted: true, id }
  };
}

