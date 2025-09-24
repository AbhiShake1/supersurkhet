# SuperSurkhet Constitution

## Core Principles

### I. Decentralization & Data Sovereignty
All data must be stored on GunDB, ensuring users retain full ownership and control of their data. No centralized data storage is allowed for core application data. All components must be designed to work in a peer-to-peer environment with eventual consistency.

### II. Schema-Driven Architecture
Every data model must be defined with Zod schemas before implementation. All UI components must be generated from these schemas to ensure consistency and validation. Schema-first development is mandatory for all new features.

### III. Mobile-First Design
All interfaces must be designed with mobile devices as the primary platform. Desktop interfaces should be progressive enhancements. Touch-first interactions and responsive design are mandatory for all components.

### IV. Self-Service & Empowerment
The platform must enable users to create and manage their own digital solutions without technical expertise. Every feature should have a zero-code configuration option alongside developer APIs.

### V. Interconnected Ecosystem
All business modules must be designed to interconnect seamlessly. QR codes, APIs, and data sharing mechanisms must be built into every feature to enable cross-service functionality.

## Technology Standards

### Framework & State Management
- Use TanStack Router for routing with nested route conventions
- Implement TanStack Query for server state management
- Use TanStack Start for full-stack application architecture
- All state management must follow unidirectional data flow principles

### Database & Storage
- GunDB must be the primary data store for all application data
- All data schemas must be versioned and support migration
- Offline-first architecture is mandatory - applications must work without network connectivity
- Implement real-time sync protocols for collaborative features

### UI & Components
- Use shadcn/ui v4 components as the base component library
- All components must be accessible and follow ARIA standards
- Implement dark/light theme support with next-themes
- Maintain consistent design system across all modules

### Security & Authentication
- Implement Google OAuth as the primary authentication mechanism
- All data must be encrypted in transit and at rest
- Follow OAuth 2.0 and OpenID Connect best practices
- Implement proper session management and token refresh mechanisms

## Development Workflow

### Architecture Requirements
- All business logic must be schema-driven using Zod
- Component-driven development with strict separation of concerns
- Mobile-first responsive design with progressive enhancement
- Zero-code configuration for business owners alongside developer APIs

### Code Quality
- Strict TypeScript usage with comprehensive type definitions
- All code must pass Biome linting and formatting
- Test-driven development required for critical paths
- Documentation required for all public APIs and components

### Performance Standards
- Implement code splitting for optimal bundle sizes
- Use virtualization for large data sets (AutoTable, AutoList)
- Optimize for Core Web Vitals scores
- Implement lazy loading for non-critical resources

### Integration Standards
- All external service integrations must be modular
- Implement fallback mechanisms for third-party service failures
- Maintain offline capability when external services are unavailable
- Provide consistent error handling across all integrations

## Innovation Requirements

### Schema-Driven UI System
- AutoAdmin: Dynamic admin panel generation from Zod schemas
- AutoTable: Data table with sorting, filtering, pagination from schema definitions
- AutoForm: Data entry forms with validation derived from schemas
- AutoKanban: Drag-and-drop Kanban boards from schema relationships
- Custom builders for specialized views (calendar, maps, etc.) from schemas

### Decentralized Features
- Implement peer-to-peer data sharing
- Support for device-local AI processing
- Decentralized identity and authentication
- Local-first architecture with sync capabilities

### Business Module Standards
- All business modules must be configurable without code changes
- Support dynamic creation of admin panels and client UIs
- Interoperability between different business types
- QR-based multi-step action execution

## Governance

All development must comply with these constitutional principles. Changes to this constitution require explicit approval and documentation of the impact on existing systems. New features must demonstrate compliance with all principles before implementation. Code reviews must verify constitutional compliance as a mandatory quality gate.

**Version**: 2.0.0 | **Ratified**: 2025-07-16 | **Last Amended**: 2025-07-16