# LIB KNOWLEDGE BASE

**Generated:** 2026-01-16
**Score:** 17 (100 files, 22 dirs, medium-high complexity)

## OVERVIEW

Data layer integrating GunDB decentralized storage, TanStack Query data fetching, and utility functions.

## WHERE TO LOOK

| Task          | Location     | Notes                              |
| ------------- | ------------ | ---------------------------------- |
| GunDB client  | lib/gun/     | Decentralized storage setup        |
| Data fetching | lib/api/     | TanStack Query wrappers            |
| Utilities     | lib/utils.ts | Shared helpers (cn, etc.)          |
| Validation    | lib/schemas/ | Zod schemas for auto-\* components |

## CONVENTIONS

- **GunDB**: Client-side replication, no traditional backend
- **Data fetching**: Wrap GunDB in TanStack Query (useQuery/useMutation)
- **Server functions**: Instrument with `Sentry.startSpan`
- **Schemas**: Zod-driven, used by auto-\* components for validation

## ANTI-PATTERNS

- Bypassing TanStack Query for data fetching
- Direct GunDB operations without Query wrapper
- Missing Sentry instrumentation on server functions
