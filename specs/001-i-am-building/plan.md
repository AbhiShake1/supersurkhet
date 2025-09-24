# Implementation Plan: SuperSurkhet Super-Dapp/Super-Network Platform

**Branch**: `001-i-am-building` | **Date**: 2025-07-16 | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature implements a super-dapp/super-network platform using TanStack Start and GunDB for real-time, decentralized data. The platform enables business owners to create digital presences with minimal effort, featuring schema-driven UI generation using the existing schema system at @apps/site/src/lib/schema.ts, Data Matrix code integration, and responsive design across all screen sizes. No separate API layer is needed as all data operations happen directly with GunDB using useCreate/useGet/useUpdate/useDelete hooks.

## Technical Context
**Language/Version**: TypeScript with React 19  
**Primary Dependencies**: TanStack Start, TanStack Router, TanStack Query, GunDB, Zod, shadcn/ui v4, AutoForm/AutoAdmin components  
**Storage**: GunDB (decentralized peer-to-peer database)  
**Schema System**: @apps/site/src/lib/schema.ts and @apps/site/src/lib/schemas/* for all data models and validation  
**Testing**: Vitest, React Testing Library  
**Target Platform**: Web application with mobile-first responsive design (mobile, tablet, desktop)  
**Project Type**: web (frontend with backend functionality via TanStack Start)  
**Performance Goals**: Real-time data synchronization, Core Web Vitals optimized, sub-2-second load times  
**Constraints**: Offline-first architecture, mobile-responsive, schema-driven development, real-time updates via WebSockets, direct GunDB interactions (no API layer)  
**Scale/Scope**: Multi-tenant platform supporting various business types through schema system, unified views by category and individual business views

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on the constitution, this implementation plan:

1. **Decentralization & Data Sovereignty**: Uses GunDB as the primary data store ensuring users retain full ownership and control of their data. All components are designed for peer-to-peer environment with eventual consistency.
2. **Schema-Driven Architecture**: All data models are defined with Zod schemas in the existing schema system (@apps/site/src/lib/schema.ts). UI components are generated from these schemas to ensure consistency.
3. **Mobile-First Design**: The design is mobile-first with responsive design across all screen sizes.
4. **Self-Service & Empowerment**: The platform enables users to create and manage their digital solutions without technical expertise through auto-generated admin interfaces.
5. **Interconnected Ecosystem**: Business modules are designed to interconnect seamlessly with Data Matrix code functionality.
6. **Framework & State Management**: Uses TanStack Router, TanStack Query, and TanStack Start as required.
7. **Database & Storage**: GunDB is the primary data store with versioned schemas and offline-first architecture.
8. **UI & Components**: Uses shadcn/ui v4 components with accessibility and theme support.
9. **Schema-Driven UI System**: Implements AutoAdmin, AutoTable, AutoForm, and AutoKanban as part of the schema-driven system using the existing schema definitions.
10. **Schema-Based Access Control**: Implements access control through the schema system that allows business owners and admins to have appropriate access while restricting users to their authorized actions.
11. **Client-Side Security**: Implements client-side permission validation to enhance security and performance.
12. **Business Context Security**: Ensures permissions are properly scoped to specific business contexts to prevent cross-business data access.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (when "frontend" + "backend" detected)
apps/site/
├── src/
│   ├── components/
│   ├── pages/
│   ├── lib/              # Contains schema.ts and schemas/ directory
│   ├── hooks/            # Contains useCreate/useGet/useUpdate/useDelete hooks
│   └── routes/
└── tests/
```

**Structure Decision**: Option 2 - Web application structure to accommodate TanStack Start's full-stack capabilities with schema-driven architecture

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate data contracts** from functional requirements:
   - For each user action → GunDB interaction pattern
   - Use useCreate/useGet/useUpdate/useDelete patterns
   - Reference schemas from @apps/site/src/lib/schema.ts
   - Define relationships using GunDB references and nested schemas
   - Leverage automatic _.soul property for unique identification
   - Output schema definitions to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per schema interaction
   - Assert schema validation and GunDB operations
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh qwen`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → schema implementation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Schemas before hooks before UI components
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*