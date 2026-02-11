import {
  applyTransformerRequestParsers,
  applyTransformerResponseParsers,
  getSchema,
} from './parser';
import type { z } from 'zod';

// const secret = "#supersekret";

// const isServer = typeof window === "undefined";

export async function encrypt<
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  T extends Record<string, any>,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TSchema extends z.ZodObject<any> | z.ZodEffects<any>,
>(_obj: T, schema: TSchema) {
  return applyTransformerRequestParsers(_obj, getSchema(schema));
  // if (isServer) return;
  // const obj = structuredClone(_obj)
  // for (const [key, value] of Object.entries(obj)) {
  //     if (typeof value === "object") {
  //         // @ts-expect-error
  //         obj[key] = await entrypt(value)
  //     } else {
  //         // @ts-expect-error
  //         obj[key] = await SEA.encrypt(value, secret)
  //     }
  // }
  // console.log('enc', obj)
  // return obj
}

export async function decrypt<
  T,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TSchema extends z.ZodObject<any> | z.ZodEffects<any> =
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    | z.ZodObject<any>
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    | z.ZodEffects<any>,
>(o: T, schema: TSchema) {
  return applyTransformerResponseParsers(o, getSchema(schema));
  // if (isServer) return;
  // const obj = structuredClone(o)
  // for (const [key, value] of Object.entries(obj)) {
  //     if (typeof value === "object") {
  //         obj[key] = await decrypt(value)
  //     } else {
  //         obj[key] = await SEA.decrypt(value, secret)
  //     }
  // }
  // console.log('dec', obj)
  // return obj as T
}
