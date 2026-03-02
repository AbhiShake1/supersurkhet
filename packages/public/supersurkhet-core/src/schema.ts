import type z from 'zod';

export type AppSchemaDefinition = Record<string, { schema: z.ZodTypeAny }>;

export type CreatedSchema<TSchema extends AppSchemaDefinition> = TSchema & {
  rawShape: TSchema;
  schemaShape: z.ZodObject<{ [K in keyof TSchema]: TSchema[K]['schema'] }>;
  extend<const TOtherSchema extends AppSchemaDefinition>(
    otherSchema: TOtherSchema,
  ): CreatedSchema<TSchema & TOtherSchema>;
  merge<const TOtherSchema extends AppSchemaDefinition>(
    otherSchema: CreatedSchema<TOtherSchema>,
  ): CreatedSchema<TSchema & TOtherSchema>;
};

export function createSchema<const TSchema extends AppSchemaDefinition>(
  schema: TSchema,
): CreatedSchema<TSchema> {
  const result = schema as CreatedSchema<TSchema>;

  result.rawShape = schema;
  result.schemaShape = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, value.schema]),
  ) as CreatedSchema<TSchema>['schemaShape'];

  result.extend = function extend<const TOtherSchema extends AppSchemaDefinition>(
    otherSchema: TOtherSchema,
  ) {
    return createSchema({ ...schema, ...otherSchema });
  };

  result.merge = function merge<const TOtherSchema extends AppSchemaDefinition>(
    otherSchema: CreatedSchema<TOtherSchema>,
  ) {
    return createSchema({ ...schema, ...otherSchema.rawShape });
  };

  return result;
}
