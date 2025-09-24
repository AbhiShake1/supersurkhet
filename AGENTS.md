# Agent Development Guidelines

## Build/Lint/Test Commands

- Site (web): `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check`
- Mobile app: `pnpm dev`, `pnpm android`, `pnpm ios`, `pnpm lint`
- Single test: `pnpm test <file-path>`

## Code Style

- Use TypeScript with strict typing
- Follow existing import patterns and aliases (@/components, @/lib, etc.)
- Format with Biome using tabs and double quotes
- Use Shadcn components when possible: `pnpx shadcn@latest add <component>`
- Instrument server functions with Sentry spans
- Component naming follows PascalCase
- File names use kebab-case
- Prefer functional components with hooks
- Use Tailwind for styling with utility classes
- Error handling should leverage Sentry for monitoring
- Keep components modular and reusable
- Follow existing patterns for data fetching and state management
- Use Zod for schema validation
- Maintain consistent file structure per app conventions
