# COMPONENTS KNOWLEDGE BASE

**Generated:** 2026-01-16
**Score:** 25 (732 files, 100 dirs, high complexity)

## OVERVIEW

UI component library combining shadcn/ui (Radix + Tailwind) and animate-ui, with schema-driven auto-\* components.

## STRUCTURE

```
components/
├── animate-ui/
│   └── icons/         # 260 icon components (high concentration)
├── ui/                # 115 shadcn/ui components
├── auto-admin/        # Schema-driven admin interface
├── auto-table/        # Schema-driven data table
├── auto-form/         # Schema-driven form generator
└── [feature]/         # Feature-specific component groups
```

## WHERE TO LOOK

| Task              | Location                     | Notes                          |
| ----------------- | ---------------------------- | ------------------------------ |
| shadcn components | components/ui/               | Radix UI primitives + Tailwind |
| Icons             | components/animate-ui/icons/ | 260 components                 |
| Admin UI          | components/auto-admin/       | Schema-driven CRUD             |
| Tables            | components/auto-table/       | Schema-driven data grid        |
| Forms             | components/auto-form/        | Schema-driven validation       |

## CONVENTIONS

- **Installation**: Use `pnpx shadcn@latest add component` (NEVER manual)
- **Styling**: Tailwind utility-first, Radix accessibility primitives
- **Icons**: animate-ui pattern, consistent SVG exports
- **Auto-\* components**: Zod schema-driven, generate from data models

## ANTI-PATTERNS

- Manual shadcn component installation (use CLI)
- Hard-coded styles instead of Tailwind utilities
- Mixing component library patterns (stick to shadcn/animate-ui conventions)
