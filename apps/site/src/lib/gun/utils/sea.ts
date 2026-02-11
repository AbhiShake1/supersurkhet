import {
  applyTransformerRequestParsers,
  applyTransformerResponseParsers,
  getSchema,
} from './parser';
import type { z } from 'zod';

// const secret = "#supersekret";

// const isServer = typeof window === "undefined";

export async function encrypt<
  T extends Record<string, any>,
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
  TSchema extends z.ZodObject<any> | z.ZodEffects<any> =
    | z.ZodObject<any>
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
