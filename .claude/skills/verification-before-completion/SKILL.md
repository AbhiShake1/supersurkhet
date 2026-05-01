---
name: verification-before-completion
description: >-
  Mandatory pre-completion checks for this repo: production build must pass and
  Biome must report no new lint issues. Use whenever the task edits source code,
  configs, or scripts. This project uses Biome for lint/format; do not substitute
  ESLint unless the user or repo docs explicitly require it.
---

# Verification before completion

## When this applies

Use on any task that **changes code** (application code, tests, or tooling configs that affect build/lint).

## Mandatory before you mark the task done

1. **Biome (not ESLint)**  
   This monorepo’s site app (`supersurkhet`) uses **Biome** (`biome check`, `biome lint`, `biome format` via `package.json` scripts). Run Biome from the repository root with the workspace filter, unless the user specifies another scope:

   ```bash
   pnpm --filter supersurkhet check
   ```

   Fix all Biome diagnostics you introduced. Do not switch to ESLint for this repo without explicit user instruction.

2. **Build must pass**  
   From the same repository root:

   ```bash
   pnpm --filter supersurkhet build
   ```

   If the change touches shared packages consumed by the app, run the full turbo build when the user or CI expects it:

   ```bash
   pnpm build
   ```

3. **No regressions**  
   Do not leave the branch with new Biome errors or a failing build compared to what CI and Cloudflare expect for the touched packages.

## If checks fail

Iterate until `pnpm --filter supersurkhet check` and the chosen build command succeed, then finish the task.

## Reference

Skill layout aligns with Anthropic’s skill creator guidance: https://skills.sh/anthropics/skills/skill-creator
