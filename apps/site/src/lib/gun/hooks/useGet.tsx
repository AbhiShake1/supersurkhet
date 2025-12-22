import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { NestedSchemaType, SchemaKeys } from "..";
import { getGunRef, getNestedZodShape, mergeKeys } from "../utils";
import { decrypt } from "../utils/sea";
import { createGunHook } from "./useGunHook";
import { appSchema, transformSchema } from "@/lib/schema";
import { attachSouls, type GetBuilder as UseGetBuilder } from "../ssr/get";

export type { UseGetBuilder }

export const useGet = createGunHook((messenger) => {
  return <const T extends SchemaKeys>(
    key:
      | T
      | (UseGetBuilder<T> & {
        key: T;
      }),
    ...restKeys: string[]
  ) => {
    // function getMapper() {
    //   if (typeof key !== "string" && key.filter) {
    //     return (data: NestedSchemaType<T>) => {
    //       if (key.filter?.(data)) {
    //         return data;
    //       }
    //       return undefined
    //     };
    //   }
    //   return undefined
    // }
    const queryClient = useQueryClient();
    const isSingle = typeof key !== "string" && key.single || false
    const k = typeof key === "string" ? key : key.key;
    const queryKey = ["get", key, ...restKeys];
    const schema = getNestedZodShape(k, messenger._options.schema)
    let timeout: NodeJS.Timeout
    return useQuery({
      queryKey,
      queryFn: async () => {
        // await new Promise(r => {
        //   setTimeout(r, 1000)
        // })
        const _keys = mergeKeys(k, ...restKeys) as T;
        const keys =
          typeof key !== "string" && key.separator?.length
            ? _keys.replaceAll("/", key.separator)
            : _keys;

        const node = getGunRef(keys);

        node.open(async (fullData) => {
          if (!fullData || typeof fullData !== "object") return;

          if (timeout) clearTimeout(timeout)

          const entries = Object.entries(fullData) as [string, any][];
          const newList: NestedSchemaType<T>[] = [];

          if (isSingle) {
            const decrypted = await decrypt<NestedSchemaType<T>>(fullData, schema);
            if (decrypted) {
              const item = attachSouls(decrypted, keys);
              newList.push(item);
            }
          } else {
            for (const [soul, val] of entries) {
              if (soul === "_" || val === null) continue;

              const decrypted = await decrypt<NestedSchemaType<T>>({
                ...val,
                _: { soul },
              }, schema);

              if (decrypted) {
                const item = attachSouls(decrypted, `${keys}/${soul}`);
                // if (newList.every(i => i._?.soul !== decrypted._?.soul))
                newList.push(item);
              }
            }
          }

          queryClient.setQueryData(queryKey, newList.filter(Boolean));
        });

        return new Promise<NestedSchemaType<T>[]>((res) => {
          timeout = setTimeout(() => {
            res([])
          }, 3000)
          node.not(() => {
            res([]);
            clearTimeout(timeout)
          })
        });
      },
    });
  };
});

type Options<T extends SchemaKeys> = UseQueryOptions<
  NestedSchemaType<T>[],
  Error,
  UseGetBuilder<T>
>;

export type UseGetOptions<T extends SchemaKeys> = Omit<
  Options<T>,
  "queryFn"
> & {
  key: T;
};

export type UseGetOptionsShort = Omit<UseGetOptions<SchemaKeys>, "key"> & {
  key?: string;
};
