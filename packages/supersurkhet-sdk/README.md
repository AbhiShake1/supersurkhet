# @supersurkhet/sdk

## Developer experience (today)

This is the current flow (without auth/project selection yet):

1. Scaffold a project:

```bash
supersurkhet new my-plugin
cd my-plugin
```

2. Define schema docs in `supersurkhet.config.mjs`.

3. Generate local TS types from schema docs:

```bash
supersurkhet types --config supersurkhet.config.mjs --out supersurkhet/schema.types.ts
```

4. Link your local directory to a remote project:

```bash
supersurkhet link --project <project-id> --endpoint <api-url> --token <api-token>
```

5. Push local schema snapshot to remote project:

```bash
supersurkhet sync-up --config supersurkhet.config.mjs
```

6. Pull latest snapshot back down:

```bash
supersurkhet sync-down --config supersurkhet.config.mjs --out supersurkhet/schema.synced.json
```

---

## SDK authoring APIs

### Define actions + plugin

```ts
import { createActionRegistry, definePlugin, defineSchemaDoc } from '@supersurkhet/sdk';

const actions = createActionRegistry().defineAction({
  id: 'product.create',
  handler: async (input: { name: string }) => ({ ok: true, input }),
});

const productSchema = defineSchemaDoc({
  schemaId: 'product',
  fields: [
    {
      key: 'name',
      type: 'string',
      dataType: 'string',
      fieldType: 'string',
    },
    {
      key: 'price',
      type: 'number',
      dataType: 'number',
      fieldType: 'currency',
    },
  ],
});

export default definePlugin({
  pluginId: 'my.plugin',
  version: '0.0.1',
  actions,
  schemaDocs: [productSchema],
});
```

### Zod schema conversion (SDK-patched Zod)

```ts
import { defineZodSchemaDoc } from '@supersurkhet/sdk';

const schema = defineZodSchemaDoc({
  schemaId: 'product',
  schema: ({ z }) =>
    z
      .object({
        name: z.string(),
        price: z.number().min(0),
      })
      .withDerivation('isPremium', z.boolean()),
});
```

### Realtime-ready schema sync store

```ts
import { createSchemaSyncStore } from '@supersurkhet/sdk';

const store = createSchemaSyncStore();
store.subscribe((envelope) => {
  console.log(envelope.source, envelope.operations);
});
store.upsert(mySchema, 'cli');
```
