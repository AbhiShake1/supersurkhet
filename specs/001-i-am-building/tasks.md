# Tasks: SuperSurkhet Super-Dapp/Super-Network Platform

**Input**: Design documents from `/specs/001-i-am-building/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan for web application
- [ ] T002 Install and configure TypeScript 5.6, React 19, Node.js 20.x
- [ ] T003 [P] Install primary dependencies: TanStack Start, TanStack Router, TanStack Query, GunDB, Zod, shadcn/ui v4, React Hook Form, Tailwind CSS
- [ ] T004 [P] Configure linting and formatting tools (Biome)
- [ ] T005 [P] Configure testing framework (Vitest, React Testing Library, Playwright)
- [ ] T006 [P] Set up GunDB configuration and connection in apps/site/src/lib/gun.ts
- [ ] T007 [P] Integrate schema validation with Zod for all data models

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T008 [P] Contract test for business creation using useCreate('business') hook in apps/site/src/__tests__/contract/test_business_create.tsx
- [ ] T009 [P] Contract test for business retrieval using useGet('business') hook in apps/site/src/__tests__/contract/test_business_get.tsx
- [ ] T010 [P] Contract test for business update using useUpdate('business') hook in apps/site/src/__tests__/contract/test_business_update.tsx
- [ ] T011 [P] Contract test for business listing using useGet('business') with filters in apps/site/src/__tests__/contract/test_business_list.tsx
- [ ] T012 [P] Contract test for membership operations using useCreate/useGet('membership') hooks in apps/site/src/__tests__/contract/test_membership.tsx
- [ ] T013 [P] Contract test for user operations using useCreate/useGet('user') hooks in apps/site/src/__tests__/contract/test_user.tsx
- [ ] T014 [P] Integration test for business creation flow in apps/site/src/__tests__/integration/test_business_creation.tsx
- [ ] T015 [P] Integration test for user authentication flow in apps/site/src/__tests__/integration/test_auth.tsx
- [ ] T016 [P] Integration test for QR/DMX code generation flow in apps/site/src/__tests__/integration/test_qr_generation.tsx

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T017 [P] Business model/schema in apps/site/src/lib/schema.ts (businessSchema)
- [ ] T018 [P] User model/schema in apps/site/src/lib/schema.ts (userSchema)
- [ ] T019 [P] BusinessConfig model/schema in apps/site/src/lib/schema.ts (businessConfigSchema)
- [ ] T020 [P] Membership model/schema in apps/site/src/lib/schema.ts (membershipSchema)
- [ ] T021 [P] Role model/schema in apps/site/src/lib/schema.ts (roleSchema)
- [ ] T022 [P] EmployeePermission model/schema in apps/site/src/lib/schema.ts (employeePermissionSchema)
- [ ] T023 [P] QR Code/DMX model/schema in apps/site/src/lib/schema.ts with imports from apps/site/src/lib/schemas/datamatrix.ts
- [ ] T024 [P] Business Offering model/schema in apps/site/src/lib/schema.ts with imports from apps/site/src/lib/schemas/listings.ts
- [ ] T025 [P] Transaction model/schema in apps/site/src/lib/schema.ts with imports from apps/site/src/lib/schemas/payment-transaction-schema.ts
- [ ] T026 [P] Notification model/schema in apps/site/src/lib/schema.ts
- [ ] T027 [P] Analytics Data model/schema in apps/site/src/lib/schema.ts
- [ ] T028 [P] EmployeeBusinessRole model/schema in apps/site/src/lib/schema.ts
- [ ] T029 Create and configure GunDB hooks: useGet, useCreate, useUpdate, useDelete in apps/site/src/lib/hooks/gundb-hooks.ts
- [ ] T030 Implement business creation functionality with useCreate('business') hook in apps/site/src/lib/api/business.ts
- [ ] T031 Implement business retrieval functionality with useGet('business') hook in apps/site/src/lib/api/business.ts
- [ ] T032 Implement business update functionality with useUpdate('business') hook in apps/site/src/lib/api/business.ts
- [ ] T033 Create unified business type page component in apps/site/src/routes/$businessType/index.tsx
- [ ] T034 Create individual business page component in apps/site/src/routes/$businessName/index.tsx
- [ ] T035 Create business admin panel component using schema-driven approach in apps/site/src/components/ui/admin/business-admin.tsx
- [ ] T036 Implement membership functionality with useCreate/useGet/useUpdate hooks in apps/site/src/lib/api/membership.ts
- [ ] T037 Create user authentication system with Google OAuth integration in apps/site/src/components/auth-provider.tsx
- [ ] T038 Implement role-based access control system in apps/site/src/lib/auth.ts
- [ ] T039 Create QR/DMX code generation component in apps/site/src/components/ui/qr-generator.tsx
- [ ] T040 Create schema-driven UI components (AutoAdmin, AutoTable, AutoForm, AutoKanban) in apps/site/src/components/ui/autoform/

## Phase 3.4: Integration
- [ ] T041 Connect business API to GunDB with proper error handling in apps/site/src/lib/api/business.ts
- [ ] T042 Implement multi-context authentication (global & business-specific) in apps/site/src/lib/auth.ts
- [ ] T043 Integrate Fonepay payment gateway with transaction handling in apps/site/src/lib/api/transactions.ts
- [ ] T044 Implement business data isolation to ensure proper permissions in apps/site/src/lib/auth.ts
- [ ] T045 Connect schema-driven UI components to actual data models in apps/site/src/components/ui/autoform/
- [ ] T046 Integrate Expo app for native mobile functionality and QR code scanning in apps/site/src/integrations/expo.ts
- [ ] T047 Implement offline-first capability with GunDB sync in apps/site/src/lib/gun.ts
- [ ] T048 Add location-based notifications for users who have visited businesses in apps/site/src/lib/api/notifications.ts

## Phase 3.5: Polish
- [ ] T049 [P] Unit tests for business model validation in apps/site/src/__tests__/unit/test_business_model.ts
- [ ] T050 [P] Unit tests for user authentication in apps/site/src/__tests__/unit/test_auth.ts
- [ ] T051 [P] Unit tests for GunDB hooks in apps/site/src/__tests__/unit/test_gundb_hooks.ts
- [ ] T052 [P] Unit tests for schema validation in apps/site/src/__tests__/unit/test_schemas.ts
- [ ] T053 Performance tests for real-time sync (<200ms) in apps/site/src/__tests__/performance/
- [ ] T054 [P] Update documentation in docs/business-management.md
- [ ] T055 [P] Update documentation in docs/schema-driven-ui.md
- [ ] T056 [P] Update documentation in docs/qr-dmx-integration.md
- [ ] T057 [P] Update documentation in docs/auth-permissions.md
- [ ] T058 Add mobile-first responsive design to all components in apps/site/src/components/
- [ ] T059 Implement tangerine-themed UI following design system in apps/site/src/styles.css
- [ ] T060 Run manual testing scenarios from quickstart.md

## Dependencies
- Tests (T008-T016) before implementation (T017-T040)
- T006 and T007 blocks T029, T030, T031, T032
- T017 blocks T030, T031, T032, T033, T034, T035
- T018 blocks T036, T037, T038
- T021 blocks T036, T038
- T029 blocks T030, T031, T032, T036
- Implementation before polish (T049-T060)

## Parallel Example
```
# Launch T008-T016 together:
Task: "Contract test for business creation using useCreate('business') hook in apps/site/src/__tests__/contract/test_business_create.tsx"
Task: "Contract test for business retrieval using useGet('business') hook in apps/site/src/__tests__/contract/test_business_get.tsx"
Task: "Contract test for business update using useUpdate('business') hook in apps/site/src/__tests__/contract/test_business_update.tsx"
Task: "Contract test for business listing using useGet('business') with filters in apps/site/src/__tests__/contract/test_business_list.tsx"
Task: "Contract test for membership operations using useCreate/useGet('membership') hooks in apps/site/src/__tests__/contract/test_membership.tsx"
Task: "Contract test for user operations using useCreate/useGet('user') hooks in apps/site/src/__tests__/contract/test_user.tsx"
Task: "Integration test for business creation flow in apps/site/src/__tests__/integration/test_business_creation.tsx"
Task: "Integration test for user authentication flow in apps/site/src/__tests__/integration/test_auth.tsx"
Task: "Integration test for QR/DMX code generation flow in apps/site/src/__tests__/integration/test_qr_generation.tsx"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task