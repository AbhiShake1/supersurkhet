import type { SchemaKeys, UseGetBuilder } from '@gta/react-hooks';
import type z from 'zod';
import { create as ssrCreate } from '../gun/ssr/create';
import { remove as ssrDelete } from '../gun/ssr/delete';
import { get as ssrGet } from '../gun/ssr/get';
import { update as ssrUpdate } from '../gun/ssr/update';
import { appSchema, transformSchema } from '../schema';

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function createDb<const T extends z.AnyZodObject>(schema: T) {
  return (
    Object.keys(schema.shape)
      .map((k) => {
        const key = k as SchemaKeys;
        return {
          [key]: {
            get: (
              opts?: UseGetBuilder<typeof key> & {
                keys?: string[];
              },
            ) =>
              ssrGet<typeof key>(
                { key, ...opts },
                ...(opts?.keys ?? []),
              ),
            create: (...keys: string[]) => ssrCreate(key, ...keys),
            update: (...keys: string[]) => ssrUpdate(key, ...keys),
            remove: (...keys: string[]) => ssrDelete(key, ...keys),
          },
        };
      })
      // biome-ignore lint/performance/noAccumulatingSpread: lint debt cleanup
      .reduce((acc, curr) => ({ ...acc, ...curr }), {}) as unknown as {
      [K in SchemaKeys]: {
        get: (
          opts?: UseGetBuilder<K> & { keys?: string[] },
        ) => ReturnType<typeof ssrGet<K>>;
        create: (...keys: string[]) => ReturnType<typeof ssrCreate<K>>;
        update: (...keys: string[]) => ReturnType<typeof ssrUpdate<K>>;
        remove: (...keys: string[]) => ReturnType<typeof ssrDelete<K>>;
      };
    }
  );
}

export const db = createDb(transformSchema(appSchema) as unknown as z.AnyZodObject);
