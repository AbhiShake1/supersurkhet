# 038 - BYOAIA Plugin Agent Step 1 (Business Creation)

## Task
Design and implement step 1 of BYOAIA inside business creation: an AI chat experience above the plugin browser that can authenticate against model providers, understand the user’s business intent through natural conversation, suggest existing plugins, and scaffold new plugin proposals when no suitable plugin exists.

## Why This Is Isolated
This plan establishes the first production slice for AI-assisted onboarding without coupling it to broader platform-wide agent actions.

## Explicit Boundary
- **In scope:** model-provider auth (BYOAIA), AI chat UX in create-business Step 2, conversational requirement collection, recommendation/scaffold proposal loop, plugin pick/search/try flow integration.
- **Out of scope:** app login/session auth changes, global agent rollout across admin/editor surfaces, non-onboarding plugin lifecycle refactors.

## Architecture Guardrails
1. **Keep auth systems decoupled:**
   - App auth (user identity/session) remains unchanged.
   - BYOAIA auth handles provider key/token/model account linkage as a separate subsystem.
2. **Preserve current create-business contracts:**
   - Step 2 still requires at least one plugin selection before submission.
   - Existing plugin browser and "try it out" flows remain primary interaction surfaces.
3. **Use additive integration:**
   - AI layer proposes and guides.
   - User retains explicit final control over selected plugins and create action.
4. **No rigid onboarding forms for AI intake:**
   - Agent gathers requirements conversationally instead of requiring structured intake forms.
   - Structured fields are derived from the conversation as internal state, not forced user form steps.

## Proposed UX (Step 2)
Use **shadcn AI components (already in `src/components`)** as the base conversation UI primitives.

1. **Top strip: compact todo/progress rail (Codex-desktop style)**
   - A subtle, always-visible mini title appears above the chat textarea when there is an active plan/todo.
   - Includes an expand/collapse action.
   - Expanded state shows full todo list, active step, and completion/progress indicators.
   - Collapsed state still shows current step/status so users can track long-running operations.
2. **Main panel: AI onboarding composer (Lovable/V0-style, web-native)**
   - Prompt input + model/provider picker + auth status indicator.
   - Agent asks short guided questions to begin (not form fields), with quick-reply options.
   - Codex-like response mode: 3 suggested options + a 4th "Something else" free-text path.
3. **Rich in-chat components**
   - Agent can render interactive components inside the chat thread.
   - Supports file-input components with direct drag/drop where useful for AI-assisted context collection.
   - Supports recommendation cards, scaffold proposal cards, and action buttons inline.
4. **Recommendation output groups**
   - `Must-have`, `Strong-fit`, `Optional` groupings.
   - Each card shows reasoning, confidence, and compatibility notes.
   - For missing capability: `Proposed Plugin` card with scaffold summary.
5. **Bottom panel: Existing plugin browser (current marketplace UI)**
   - Search/filter/sort continue to work.
   - AI cards can deep-link into browser list and open "try it out" dialog.
6. **User control loop**
   - User can request refinements ("cheaper", "fewer plugins", "offline first", etc.).
   - Agent updates recommendations while preserving prior context and selected items.

## Data Contracts (First Slice)
1. **Model session contract**
   - `providerId`, `modelId`, `authMode`, `authStatus`, `lastValidatedAt`.
2. **Conversation turn contract (replaces form-based request intake)**
   - `messageId`, `role`, `content`, `attachments[]`, `quickReplySelection?`, `timestamp`.
   - `derivedIntent`: normalized intent extracted from free-form conversation (internal state).
   - `openQuestions[]`: unresolved requirement gaps the agent should ask next.
3. **Guided-question option contract (Codex-style)**
   - `questionId`, `prompt`.
   - `options[3]`: recommended short choices.
   - `otherOption`: always-available free-text route.
4. **Recommendation response contract**
   - `existingRecommendations[]`: plugin release ids + rationale + confidence + category.
   - `missingCapabilities[]`: capability gap + generated plugin scaffold proposal + effort/complexity hint.
   - `actions[]`: `select`, `openTryDialog`, `search`, `regenerate`, `askFollowup`.
5. **Chat component payload contract**
   - Component types supported in-thread (e.g., recommendation card, file input dropzone, todo summary, scaffold card).
   - Component payload must be serializable and replay-safe.
6. **Draft scaffold contract**
   - Name, purpose, core entities, key actions, permissions, estimated implementation complexity, and generated spec stub.

## Implementation Plan
1. **Foundation and dependency decision**
   - Adopt the existing shadcn-based AI primitives already present in the codebase for message list/input/loading/actions and composable in-chat UI blocks.
   - Add a thin local adapter to avoid hard-coupling UI to provider SDK internals.
2. **BYOAIA auth/model selection surface**
   - Build provider+model selector and provider-auth action states in Step 2 header area.
   - Persist temporary onboarding-scoped AI session state.
3. **Conversational intake orchestration**
   - Implement guided-question orchestration with three quick options + free-text fallback.
   - Store free-form conversation and derive structured intent incrementally (no mandatory forms).
4. **Rich component renderer in chat**
   - Add support for component messages, including file drop/input components and suggestion cards.
   - Ensure drag/drop file interactions are keyboard-accessible and degrade gracefully.
5. **Recommendation orchestration (read-write loop)**
   - Introduce server endpoint/function for recommendation + missing-capability proposals based on conversation context.
   - Start with deterministic ranking heuristics and optional model-assisted refinement.
6. **Create-business integration**
   - Render AI panel above current plugin browser.
   - Add "Apply suggestion" behavior that mutates `selectedPluginReleaseIds` safely/idempotently.
7. **Plugin gap proposal flow**
   - Display proposed plugin scaffold cards in chat and recommendation list.
   - Support "accept proposal" (queue scaffold for creation on business submit) and "revise proposal" prompts.
8. **Todo/progress rail behavior**
   - Add compact title row above textarea with expand/collapse.
   - Wire to real task/progress states so users can monitor long-running agent work.
9. **Submit contract extension**
   - Ensure business submit can carry both selected existing plugin releases and accepted scaffold drafts.
   - Preserve current plugin install behavior for existing releases.

## Verification Strategy
1. **Unit tests**
   - Guided-question contract (3 options + free-text fallback) and conversation state transitions.
   - Recommendation ranking/grouping logic.
   - Idempotent application of AI-selected plugin ids.
   - Gap-detection to scaffold proposal mapping.
2. **Contract tests**
   - Step 2 contract includes authenticated BYOAIA session wiring and conversational request payloads.
   - Chat component payloads (including file input/dropzone metadata) validate and deserialize safely.
   - Submit payload includes accepted scaffold drafts when present.
3. **UI tests**
   - Chat question -> quick option select/free-text -> recommendation render -> apply selection -> try dialog open.
   - Todo rail collapsed/expanded behavior and progress updates during long-running operations.
   - File drop/input component render and attach flow in chat.
4. **Manual checks**
   - Mobile and desktop responsive behavior.
   - Keyboard navigation and focus behavior across todo rail + chat + browser panels.

## Rollout Milestones
1. **M1 (Foundational UX)**
   - AI chat shell + provider/model/auth status UI + todo/progress rail in Step 2.
2. **M2 (Conversational Intake)**
   - Guided question flow with 3-option suggestions + free-text path and derived intent state.
3. **M3 (Recommendation Core)**
   - Existing plugin suggestions with rationale/confidence and apply actions.
4. **M4 (Gap to Scaffold + Submission Integration)**
   - Missing capability detection, scaffold proposal cards, and accepted scaffold inclusion in business-create flow.

## Definition Of Done
- Step 2 shows AI chat onboarding panel above plugin browser using AI Elements components.
- BYOAIA provider/model auth is functional and isolated from app login auth.
- Agent intake is conversational (no mandatory structured forms) with guided 3-option + free-text interaction support.
- Chat can render interactive components, including file input/drop where applicable.
- Todo/progress mini title above the textarea supports expand/collapse and shows meaningful progress state.
- Agent suggests existing plugins and can emit scaffold proposals when no match exists.
- Users can iteratively refine recommendations and apply choices before create.
- Contracts and tests prevent regression for selection/submit behavior.

## Risks And Mitigations
1. **Provider auth complexity:** start with a minimal provider set + adapter abstraction and expand.
2. **Hallucinated plugin suggestions:** enforce catalog-grounded retrieval before presenting "existing" recommendations.
3. **Conversation ambiguity:** maintain explicit unresolved-question state and ask focused follow-ups.
4. **Rich component complexity:** keep component payload schema strict and versioned for safety.
5. **Submission coupling risk:** keep scaffold acceptance explicit and auditable in payload.

## Verification
- `pnpm --dir apps/site test src/components/create-business-plugin-bootstrap.test.ts`
- `pnpm --dir apps/site test src/routes/-admin-empty-plugins-onboarding-contract.test.ts`
- `pnpm --dir apps/site biome check src/components/create-business.tsx src/components/business-creation-form.tsx`

## Parallelization Notes
- This plan intentionally avoids assigning concrete write scopes yet because implementation will touch both onboarding UI and server contracts.
- Before execution, split into dedicated implementation tickets with explicit exclusive file scopes.
