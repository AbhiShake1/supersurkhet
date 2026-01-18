# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-16
**Commit:** 53340e9
**Branch:** main

## OVERVIEW

SuperSurkhet: Super-App as a Service for Surkhet Valley. Monorepo with pnpm/Turbo, React 19 + TanStack Start, GunDB decentralized storage, schema-driven UI (AutoAdmin/AutoTable/AutoForm).

## STRUCTURE

```
supersurkhet/
├── apps/
│   ├── site/         # Main web app (TanStack Start + Vinxi)
│   ├── surkhet/      # Core business logic
│   ├── relay/        # ???
│   └── electron/     # Desktop app
├── packages/
│   ├── typescript-config/  # Shared TS configs
│   └── payment/             # ???
└── turbo.json       # Monorepo build orchestrator
```

## WHERE TO LOOK

| Task             | Location                          | Notes                        |
| ---------------- | --------------------------------- | ---------------------------- |
| Web app entry    | apps/site/src/routes/\_\_root.tsx | Auth, theme, provider chain  |
| Routing          | apps/site/src/routes/             | TanStack Router              |
| Components       | apps/site/src/components/         | shadcn/ui, animate-ui        |
| Core logic       | apps/surkhet/src/                 | Business domain              |
| Schema-driven UI | apps/site/src/components/auto-\*  | AutoAdmin/AutoTable/AutoForm |
| Data layer       | apps/site/src/lib/                | GunDB, API, utils            |
| Hooks            | apps/site/src/hooks/              | Shared React hooks           |
| Shared configs   | packages/typescript-config/       | TS configs                   |

## CONVENTIONS

- **UI components**: Use `pnpx shadcn@latest add component` (NOT manual install)
- **Error tracking**: Instrument server functions with `Sentry.startSpan`
- **Linting**: Biome (tabs for indentation, double quotes, organizeImports enabled)
- **Theme**: Critical CSS FOUC prevention in \_\_root.tsx
- **Providers**: I18n → Theme → GoogleLogin → Auth → Tooltip → Dialog → Drawer → OneTap → Confetti → LoginPrompt

## ANTI-PATTERNS (THIS PROJECT)

- Manual shadcn component installation (use CLI)
- Missing Sentry instrumentation on server functions
- Disrupting provider nesting order in \_\_root.tsx
- Non-tab indentation (Biome enforces)

## UNIQUE STYLES

- GunDB for decentralized storage (client-side replication)
- QR code ecosystem with Expo app communication
- DataMatrix actions for cross-app communication
- Schema-driven UI generation (AutoAdmin/Table/Form)
- View transitions enabled in router

## COMMANDS

```bash
pnpm dev          # Start dev server (Vinxi)
pnpm build        # Turbo build all apps
pnpm lint         # Biome check
pnpm lint:fix     # Biome fix (includes organizeImports)
pnpx shadcn@latest add <component>  # Add UI component
```

## NOTES

- Project uses pnpm workspaces + Turborepo
- TanStack Start v1.117.2 (React 19 + file-based routing)
- GunDB handles decentralized data (no traditional backend)
- Sentry integration for error tracking
- i18n, theme switching, QR scanning all in \_\_root.tsx
