# @supersurkhet/zod-typegen

A Vite plugin that generates global TypeScript interfaces from Zod schemas.

## Overview

This plugin addresses the common "Circular Dependency" and "Boilerplate" issues when working with large-scale Zod schemas in a TypeScript project. Instead of importing inferred types using `z.infer`, this plugin emits a global declaration file (`.d.ts`) containing flattened, structural interfaces for all your exported schemas.

## Features

- **Zero Runtime Overhead**: Generates `.d.ts` files that exist only at compile-time.
- **Circular Dependency Prevention**: By emitting types as global interfaces, you can avoid the `import type` cycles often caused by `z.infer`.
- **Recursive Type Support**: Correcty handles recursive schemas (e.g., UI layers, folders) by generating recursive TypeScript interfaces.
- **Cross-Schema References**: Intelligently identifies when a schema references another exported schema and preserves that relationship in the generated types.
- **HMR Integration**: Automatically regenerates types whenever your schema file changes.
- **Structural resolution**: Uses `ts-morph` and the TypeScript Type Checker to resolve even complex `.extend()`, `.merge()`, and refined schemas into clean TS structures.

## Installation

The plugin is used internally in the `supersurkhet` monorepo.

## Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import { zodTypegen } from '@supersurkhet/zod-typegen';

export default defineConfig({
  plugins: [
    zodTypegen({
      // Path to your Zod schema entry file
      entry: 'src/lib/schema.ts',
      // Path where the global types should be emitted
      output: 'src/types/db.d.ts',
    }),
  ],
});
```

## Usage

Once configured, the plugin will watch your `entry` file. Any `export const ...Schema = z.object(...)` will result in a globally available interface.

### Example

**In `src/lib/schema.ts`:**
```typescript
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});
```

**In any component (No imports required!):**
```typescript
function Profile(props: { user: UserSchema }) {
  // UserSchema is globally available
  return <div>{props.user.name}</div>;
}
```

## How it Works

1. **Extraction**: Uses `ts-morph` to find all exported variables that look like Zod schemas in the entry file.
2. **Type Resolution**: Leverages the TypeScript Type Checker to resolve the "output" type of each schema. This handles complex Zod transformations and refinements.
3. **Identity Matching**: Compares underlying compiler types to detect when one schema references another, allowing the generator to use named references (e.g., `UserSchema`) rather than inlining everything.
4. **Emission**: Writes a `declare global` block to the specified output file, making the types accessible across the entire project.
