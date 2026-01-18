# ROUTES KNOWLEDGE BASE

**Generated:** 2026-01-16
**Score:** 6 (15 files, critical domain)

## OVERVIEW

TanStack Router file-based routing with React 19, view transitions, and provider chain orchestration.

## WHERE TO LOOK

| Task          | Location              | Notes                         |
| ------------- | --------------------- | ----------------------------- |
| Root layout   | routes/\_\_root.tsx   | Provider chain, theme, auth   |
| Router config | src/router.tsx        | TanStack Query + router setup |
| Page routes   | routes/[slug].tsx     | File-based routing            |
| Loaders       | routes/\*\*/loader.ts | Server-side data fetching     |

## CONVENTIONS

- **File-based**: TanStack Router, auto-discovery from routes/ directory
- **Provider order** (CRITICAL): I18n → Theme → GoogleLogin → Auth → Tooltip → Dialog → Drawer → OneTap → Confetti → LoginPrompt
- **Loaders**: Server functions, instrument with `Sentry.startSpan`
- **View transitions**: Enabled in router config for smooth navigation

## ANTI-PATTERNS

- Disrupting provider nesting order
- Missing Sentry instrumentation in loaders
- Direct state management instead of loaders
