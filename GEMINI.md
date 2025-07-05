# Project Gemini: SuperSurkhet

This document provides a comprehensive overview of the SuperSurkhet project, its architecture, technology stack, and core philosophies. It is intended to be used as a foundational context for LLM-based development, ensuring consistency and high-quality contributions.

## 1. Project Overview & Vision

SuperSurkhet is a full-stack monorepo building a "superapp" platform designed to digitally empower businesses in Surkhet, Nepal. The project's mission is to transform Surkhet into a local tech hub by providing powerful, enterprise-grade digital tools.

The first flagship product is a **scan-to-order and Point of Sale (POS) system** for restaurants. This system is designed to be a complete replacement for traditional POS hardware and software.

The core technical differentiator is its **decentralized, peer-to-peer data model** powered by GunDB, which ensures that business owners retain full sovereignty over their own data.

## 2. Core Philosophy

To contribute effectively, it is crucial to understand the following principles:

*   **Decentralization & Data Sovereignty:** This is the project's cornerstone. Unlike traditional SaaS, business data is not stored on a central server. It is managed in a peer-to-peer network using GunDB. The `relay` app acts as a stable peer, but the data belongs to and is stored by the users.
*   **Mobile-First:** The primary users are business owners and staff who will operate the system from their personal mobile phones. All UI/UX must be designed and implemented with a mobile-first approach.
*   **Free POS as a Service:** The business model is to provide a powerful, feature-rich POS system for free. This removes the primary barrier to adoption for small businesses and is the main market entry strategy.
*   **Community Empowerment:** The project's ultimate goal is to foster a digital ecosystem in Surkhet. Development should prioritize features that provide immediate, tangible value to local businesses.

## 3. Technology Stack

The project is a TypeScript monorepo managed with **pnpm workspaces** and **Turborepo**.

### `apps/site` (Frontend & Admin Panel)

*   **Framework:** React 19
*   **Build Tool:** Vinxi
*   **Routing:** TanStack Router
*   **Data Fetching/State Management:** TanStack Query
*   **Component Library:** shadcn/ui, built on Radix UI primitives.
*   **Styling:** Tailwind CSS with `clsx` / `cn()` for utility-first styling.
*   **Schema & Validation:** Zod is used extensively as the single source of truth for data models and validation.
*   **Tables:** TanStack Table
*   **Animations:** Framer Motion
*   **Forms:** The custom `auto*` component suite, built on `react-hook-form`.

### `apps/relay` (Backend)

*   **Environment:** Cloudflare Workers
*   **Core Technology:** GunDB for the real-time, decentralized database.
*   **Deployment:** Wrangler CLI

### Tooling & Conventions

*   **Linting & Formatting:** **BiomeJS** is the exclusive tool for this. All code MUST be formatted and linted with Biome before committing.
*   **Package Manager:** pnpm

## 4. Monorepo & Commands

The project uses Turborepo to manage the pnpm workspace.

*   `apps/`: Contains the individual applications (`site`, `relay`).
*   `packages/`: Contains shared code, such as TypeScript configurations.

### Key Commands

These commands should be run from the project root:

*   `pnpm dev`: Starts the development servers for all applications.
*   `pnpm build`: Creates production builds for all applications.
*   `pnpm start`: Starts the production servers.
*   `pnpm lint`: Lints all code using Biome.
*   `pnpm check`: Checks for linting, formatting, and safety errors with Biome. **This should be run after making changes.**

## 5. Architectural Deep Dive: The `auto*` System

The project's scalability and development speed come from its schema-driven UI architecture. This is the most important concept to understand.

### Core Principle

A **Zod schema** is defined for a data model (e.g., `order`, `menuItem`). This schema represents a table in the database and is used by the `auto*` components to automatically generate a complete CRUD (Create, Read, Update, Delete) interface. These schemas are designed to be generic; a single schema can be reused for multiple restaurants if they do not require special customizations.

### Key Components

1.  **`AutoAdmin` (`@/components/auto-admin/index.tsx`)**:
    *   **Role:** The main orchestrator for an admin page.
    *   **Function:** It takes a `tabs` configuration. Each tab can render either a custom component or, more powerfully, an `AutoTable` or `AutoKanban` view by simply passing the schema.

2.  **`AutoTable` (`@/components/auto-table/index.tsx`)**:
    *   **Role:** The primary data display component.
    *   **Function:**
        *   Accepts a `schema` and a `slug` (for the data endpoint).
        *   **Dynamically generates columns** by introspecting the Zod schema.
        *   Provides sorting, filtering, and pagination out of the box.
        *   Features **inline editing**: each cell uses `<Editable.Root>` to switch between a data preview (`AutoPreview`) and an inline form (`AutoForm`).

3.  **`AutoKanban` (within `AutoAdmin`)**:
    *   **Role:** A specialized view for data with a status field.
    *   **Function:** When configured with a `groupKey` (e.g., `orderStatus`), it renders a fully interactive drag-and-drop Kanban board. Moving a card from one column to another automatically triggers an update call to change its status.

4.  **`AutoForm` (`@/components/ui/autoform/AutoForm.tsx`)**:
    *   **Role:** The data creation and editing component.
    *   **Function:** Generates a complete form based on the Zod schema, including input fields, labels, and validation. It is used both for the "Add New" dialog and for the inline editing in `AutoTable`.

5.  **`AutoPreview` (`@/components/auto-preview/index.tsx`)**:
    *   **Role:** Intelligently renders data within `AutoTable` cells.
    *   **Function:** It maps field types to specific preview components (e.g., renders an `<img>` tag for an `image` URL). Its `RecordPreview` is notable for handling nested/relational data by opening a modal with another `AutoTable`.

### Development Workflow with `auto*`

The typical workflow to create a new admin interface is:

1.  Define a Zod schema in `@/lib/schema.ts`.
2.  Add a new entry to the `tabs` configuration in the relevant `AutoAdmin` instance, passing the new schema.
3.  The system automatically generates the entire CRUD UI. This reduces the time to create a new admin panel from weeks to minutes.
