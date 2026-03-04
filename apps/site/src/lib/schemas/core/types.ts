import type { SchemaKeys } from '@gta/react-hooks';
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type z from 'zod';
import type { AdminComponent } from '@/components/ui/admin';

export type DefaultSchemaType = z.ZodTypeAny;

export interface GTAAppConfig {
  schema: {
    [table: string]: {
      schema: DefaultSchemaType;
      title?: string;
      icon?: ForwardRefExoticComponent<
        Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
      >;
      group?: string;
      components?: () => Array<{
        name: string;
        icon?: LucideIcon;
        component: AdminComponent;
      }>;
    };
  };
}

type SchemaContainer = {
  rawShape: Record<string, { schema: z.ZodTypeAny }>;
};

export type ExtractZodSchema<T extends SchemaContainer> =
  z.ZodObject<
    {
      -readonly [K in keyof T['rawShape']]: T['rawShape'][K]['schema'];
    },
    'strip',
    z.ZodTypeAny
  >;

export type SchemaShape<T extends GTAAppConfig['schema']> = {
  [key in keyof T]: T[key]['schema'];
};

export type CreatedSchema<T extends GTAAppConfig['schema']> = T & {
  rawShape: T;
  schemaShape: z.ZodObject<SchemaShape<T>, 'strip', z.ZodTypeAny>;
  extend<const TOtherSchema extends GTAAppConfig['schema']>(
    otherSchema: TOtherSchema,
  ): CreatedSchema<T & TOtherSchema>;
  merge<const TOtherSchema extends GTAAppConfig['schema']>(
    otherSchema: CreatedSchema<TOtherSchema>,
  ): CreatedSchema<T & TOtherSchema>;
};

export type AppSchemaType = ExtractZodSchema<BaseAppSchemaType>;

export type InferredTable<K extends SchemaKeys> = z.infer<AppSchemaType>[K];
