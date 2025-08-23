# SuperSurkhet Site - Project Context

## Project Overview

**SuperSurkhet** is a full-stack monorepo project designed to build a "Super-App as a Service" platform for Surkhet, Nepal. The mission is to digitally empower local businesses, organizations, and residents by providing powerful, self-service digital tools.

The platform moves beyond being a single application and instead provides building blocks for users to create their own digital solutions, from simple online storefronts to complete ERP systems.

### Core Principles:
- **Decentralization & Data Sovereignty:** Built on GunDB, ensuring business owners retain full control of their data
- **Self-Service & Scalability:** Users can dynamically generate admin panels and client UIs by selecting pre-configured Business Blueprints
- **Mobile-First:** All interfaces optimized for mobile devices
- **Community Empowerment:** Designed as digital infrastructure for Surkhet's tech ecosystem

## Technology Stack

- **Framework:** TanStack Router with React Start
- **Build Tool:** Vinxi (Vite-based)
- **Language:** TypeScript
- **UI Library:** Tailwind CSS with shadcn/ui components
- **State Management:** TanStack Query
- **Database:** GunDB (decentralized)
- **Deployment:** Cloudflare Pages
- **Authentication:** Google OAuth integration
- **Error Monitoring:** Sentry
- **Code Quality:** Biome (formatter and linter)

## Project Structure

```
src/
├── app/                 # Global application files
├── components/          # UI components (shadcn/ui and custom)
├── config/              # Configuration files
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
├── lib/                 # Core utilities and libraries
├── routes/              # Application routes
├── types/               # TypeScript type definitions
├── client.tsx           # Client entry point
├── router.tsx           # Router configuration
├── ssr.tsx              # Server-side rendering
└── styles.css           # Global styles
```

## Core Features

### Schema-Driven UI System (`auto*` components)
The technical heart of the platform, enabling automatic generation of CRUD interfaces from Zod schemas:
- `AutoAdmin`: Main admin panel component
- `AutoTable`: Data table with sorting, filtering, pagination
- `AutoForm`: Data entry forms with validation
- `AutoKanban`: Drag-and-drop Kanban boards
- Custom builders for specialized views (calendar, maps, etc.)

### Business Modules
1. **Retail & eCommerce** - Inventory, POS, online storefronts
2. **Food & Hospitality** - Digital menus, kitchen order tickets, reservations
3. **Logistics** - Ride-sharing, delivery, rental management
4. **ERP** - Unified business dashboard with accounting and CRM
5. **Co-operatives** - Member management and financial operations
6. **Healthcare** - Appointment scheduling and patient records
7. **Education** - Student/teacher management and communication

## Development Commands

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Code formatting
pnpm format

# Code linting
pnpm lint

# Code quality checks
pnpm check
```

## Environment Variables

Located in `.env.local`:
- `VITE_SENTRY_DSN` - Sentry error monitoring
- `VITE_GOOGLE_OAUTH_CLIENT_ID` - Google authentication
- `VITE_GOOGLE_LOGIN_BACKDOOR` - Google login backdoor
- Cloudinary credentials for image handling

## Deployment

Deployed to Cloudflare Pages with configuration in `wrangler.toml`.

## Development Conventions

- **Mobile-first design** for all UI components
- **Strict TypeScript** with comprehensive type definitions
- **Component-driven development** using shadcn/ui patterns
- **Zod schema validation** for all data models
- **Biome formatting** for code consistency
- **Decentralized data architecture** with GunDB
- **Unified ID system** for cross-platform authentication

## Routing Structure

Main routes:
- `/` - Homepage with hero section, features, and pricing
- `/_auth` - Authentication routes
- `/_business` - Business management
- `/$businessName` - Individual business pages
- `/api` - API endpoints
- `/admin` - Administrative interfaces

## Key Dependencies

- `@tanstack/*` - Router, Query, and related tools
- `@radix-ui/*` - Accessible UI primitives
- `gun` - Decentralized database
- `zod` - Schema validation
- `react-hook-form` - Form handling
- `tailwindcss` - Styling framework
- `@sentry/*` - Error monitoring
- `@autoform/*` - Schema-driven forms
- `@dnd-kit/*` - Drag and drop functionality