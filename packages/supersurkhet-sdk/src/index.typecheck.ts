import {
  createSchemaSyncStore,
  defineZodSchemaDoc,
  generateSchemaTypes,
  type InferSchemaType,
  z,
} from './index';

const userSchema = defineZodSchemaDoc({
  schemaId: 'user',
  schema: ({ z }) =>
    z
      .object({
        name: z.string(),
        age: z.number().int().min(0),
        role: z.enum(['admin', 'staff']),
        tags: z.array(z.string()).optional(),
      })
      .withDerivation('isAdult', z.boolean()),
});

const store = createSchemaSyncStore({ initialSchemas: [userSchema] });

if (userSchema.fields[0]?.dataType !== 'string') {
  throw new Error('expected zod conversion to populate dataType');
}
if (userSchema.fields[0]?.fieldType !== 'string') {
  throw new Error('expected zod conversion to populate fieldType');
}
store.upsert(userSchema, 'cli');

const generated = generateSchemaTypes(store.list());
if (!generated.includes('"user"')) {
  throw new Error('expected generated type output to include schema id');
}

type UserType = InferSchemaType<{
  schemaId: 'user';
  schema: () => z.ZodObject<{
    name: z.ZodString;
    age: z.ZodNumber;
    role: z.ZodEnum<['admin', 'staff']>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
  }>;
}>;

const validUser: UserType = {
  name: 'A',
  age: 12,
  role: 'admin',
};

void validUser;
