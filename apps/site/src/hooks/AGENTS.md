# HOOKS KNOWLEDGE BASE

**Generated:** 2026-01-16
**Score:** 8 (17 files, medium complexity, distinct domain)

## OVERVIEW

Shared React hooks integrating TanStack Query with GunDB data layer.

## WHERE TO LOOK

| Task           | Location            | Notes                  |
| -------------- | ------------------- | ---------------------- |
| Data fetching  | hooks/use-\*.ts     | TanStack Query + GunDB |
| Auth state     | hooks/use-auth.ts   | GunDB auth integration |
| Server actions | hooks/use-action.ts | RPC-style mutations    |

## CONVENTIONS

- **Naming**: `use*` pattern for all hooks
- **TanStack Query**: Wrap GunDB operations in useQuery/useMutation
- **Error handling**: Sentry instrumentation in mutation hooks
- **Cache keys**: Stable, hierarchical (e.g., `['users', id]`)

## ANTI-PATTERNS

- Direct GunDB calls outside hooks
- Bypassing TanStack Query cache
- Unstable cache keys causing unnecessary refetches
