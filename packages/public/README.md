# Public packages

This folder contains npm-shippable packages extracted from app code.

## Packages

- `@supersurkhet/core`: schema + typed CRUD hooks from user-maintained `schema.ts`.
- `@supersurkhet/zod-typegen-vite`: optional Vite plugin that emits `db.d.ts` from `schema.ts`.
- `@supersurkhet/registry`: shadcn-registry compatible metadata + installer flow.

## Schema model

The split between "core" and "feature" schema is removed for package consumers.
Everything is a single app-owned schema that can be extended/merged as needed.
