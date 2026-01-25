import type { NestedSchemaType, SchemaKeys } from "..";
import { createGunHook } from "./useGunHook";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { GunMessagePut } from "gun/types";
import { create } from "../ssr/create";

export const useCreate = createGunHook(() => {
  return <const T extends SchemaKeys>(opts: UseCreateOptions<T>) => {
    const [key, ...keys] = opts.keys;
    return useMutation({
      ...opts,
      mutationFn: create(key, ...keys),
    });
  };
});

type Options<T extends SchemaKeys> = UseMutationOptions<
  GunMessagePut,
  Error,
  Omit<NestedSchemaType<T>, "_">,
  unknown
>;

export type UseCreateOptions<T extends SchemaKeys> = Omit<
  Options<T>,
  "mutationFn"
> & { keys: [T, ...string[]] };

export type UseCreateOptionsShort = Omit<
  UseCreateOptions<SchemaKeys>,
  "keys"
> & { keys?: string[] };
