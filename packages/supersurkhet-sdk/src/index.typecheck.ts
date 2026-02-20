import {
  createSchemaSyncStore,
  defineZodSchemaDoc,
  generateSchemaTypes,
  type InferSchemaType,
  type ZodLikeObjectSchema,
} from './index';

const userZodLikeSchema: ZodLikeObjectSchema & {
  _output: {
    name: string;
    age: number;
    role: 'admin' | 'staff';
    tags?: string[];
  };
} = {
  _output: undefined as unknown as {
    name: string;
    age: number;
    role: "admin" | "staff";
    tags?: string[];
  },
  _def: {
    typeName: 'ZodObject',
    shape: {
      name: { _def: { typeName: 'ZodString' }, isOptional: () => false },
      age: {
        _def: {
          typeName: 'ZodNumber',
          checks: [
            { kind: 'int' },
            { kind: 'min', value: 0 },
          ],
        },
        isOptional: () => false,
      },
      role: {
        _def: {
          typeName: 'ZodEnum',
          values: new Set(['admin', 'staff']),
        },
        isOptional: () => false,
      },
      tags: {
        _def: {
          typeName: 'ZodOptional',
          innerType: {
            _def: {
              typeName: 'ZodArray',
            },
            element: { _def: { typeName: 'ZodString' }, isOptional: () => false },
          },
        },
        isOptional: () => true,
      },
    },
  },
};

const userSchema = defineZodSchemaDoc({
  schemaId: 'user',
  schema: userZodLikeSchema,
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
  schema: typeof userZodLikeSchema;
}>;

const validUser: UserType = {
  name: 'A',
  age: 12,
  role: 'admin',
};

void validUser;
