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
- **Authentication:** Google OAuth integration with multi-context support
- **Authorization:** Hierarchical role-based access control (RBAC)
- **Error Monitoring:** Sentry
- **Code Quality:** Biome (formatter and linter)

## Authentication and Permission System

The SuperSurkhet platform implements a robust, hierarchical authentication and permission management system:

### User Roles
1. **Super Admin** - Full system access and business management capabilities
2. **Business Owner** - Full control over a specific business and its employees
3. **Employee** - Permissions determined by business owner within business context
4. **Read-Only User** - Basic access through sign-up, limited to viewing public features

### Key Features
- Multi-context authentication supporting both global and business-specific sessions
- Granular, feature-specific permissions within business contexts
- Business data isolation to ensure data sovereignty
- Custom role creation capability for business owners
- Context-aware permission validation at the API layer
- Audit trail for permission-related actions

### Permission Hierarchy
- Super Admins have global platform access
- Business Owners control permissions within their specific business
- Employees' access is limited to assigned business contexts and permissions
- Read-Only users have limited access to public features only

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

### Authentication and Authorization System
A comprehensive security layer supporting multiple user types with context-aware permissions:
- Multi-context authentication (platform-wide and business-specific sessions)
- Hierarchical role system (Super Admin, Business Owner, Employee, Read-Only User)
- Granular, feature-level permissions within business contexts
- Business data isolation and sovereignty
- Custom role creation for business owners
- Context-aware permission validation

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

## Hard Rules for Data Flow Implementation

When implementing new features or modifying existing ones, you MUST follow these hard rules for data flow:

1. **Always use the custom GunDB hooks**: Use `api.{schema}.useGet()`, `api.{schema}.useCreate()`, `api.{schema}.useUpdate()`, and `api.{schema}.useDelete()` for all data operations
   - Never directly access GunDB instance in components
   - Always go through the `api` layer for consistency

2. **Never use `createServerFn` for real-time UI updates**: Server functions are for server-side operations only
   - Use GunDB hooks for real-time client-side data
   - Server functions should only be used for operations that don't require real-time sync

3. **Always use the existing schema definitions**: When creating new data types, extend from the base schemas in `src/lib/schema.ts`
   - Use existing Zod schemas or create new ones following the same patterns
   - Never create duplicate schema definitions

4. **Use business-specific keys when needed**: When fetching data specific to a business, always pass the business slug as a key
   - Example: `api.menuItem.useGet({ keys: [slug] })` for restaurant menu items
   - This ensures data isolation between different businesses

5. **Leverage context providers for complex state**: For features like folders or recently used apps, use the existing context providers
   - These providers properly encapsulate the GunDB hooks with business logic
   - Don't reimplement the same logic in multiple places

6. **Maintain real-time synchronization**: All data operations should support real-time updates
   - The GunDB hooks automatically handle real-time sync
   - Don't implement custom polling or manual refresh logic

7. **Follow security patterns**: All data is encrypted at the GunDB level
   - Trust the encryption provided by the hooks
   - Don't implement additional client-side encryption for data at rest

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