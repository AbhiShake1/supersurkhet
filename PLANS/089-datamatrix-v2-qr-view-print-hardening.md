# 089 - DataMatrix V2 QR View Print Hardening

## Task
Harden QR/DataMatrix preview, print, and export flows to target explicit code elements and avoid multi-canvas ambiguity.

## Requirements Covered
- Ref-scoped print/export target
- Stable preview for QR/DataMatrix formats
- Share/download UX resilience

## Why This Is Isolated
Print/export hardening is independent and can ship without scanner/scheduler dependencies.

## Prerequisites
- Plan 081 payload shape
- Plan 082 builder compile behavior

## Exclusive Write Scope
- `apps/site/src/components/ui/datamatrix-code.tsx`
- `apps/site/src/components/qr/visual-flow-builder.tsx` (print/export handlers only)
- `apps/site/src/components/qr-code-page/index.tsx`
- `apps/site/src/components/ui/datamatrix-code.test.tsx` (new if required)

## Read-only Context
- `apps/site/src/components/ui/datamatrix-scanner.tsx`

## Integration Communication (Mandatory)
1. Publish new print/export target contract.
2. Log any browser-specific print caveats.
3. Confirm compatibility with v2 payload references.
4. Record accessibility handling.
5. End with `ready-for-integration` and tests.

## Implementation Checklist
1. Replace global canvas lookup with explicit ref targeting.
2. Ensure QR and DataMatrix rendering lifecycle is deterministic.
3. Keep download/share actions functional.
4. Add regression tests for multi-canvas pages.
5. Document print behavior in artifact.

## Definition Of Done
- Print/export always uses intended code element.
- QR/DataMatrix preview remains correct after multiple renders.
- Existing builder interactions remain intact.
- No new `useEffect` for orchestration logic.

## Verification
- `cd apps/site && pnpm vitest run src/components/qr/visual-flow-builder*.test.tsx src/components/ui/datamatrix-code*.test.tsx`
- `cd apps/site && pnpm biome check src/components/ui/datamatrix-code.tsx src/components/qr/visual-flow-builder.tsx src/components/qr-code-page/index.tsx`

## Parallelization Notes
- Depends on: 081, 082
- Validated by: 092
