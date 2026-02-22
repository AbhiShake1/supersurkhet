---
description: Converts a component with schemas and registers it to the UI builder registry with proper Zod validation and form field overrides. Supports file path completion for easy selection.
---

---
description: Convert a component with schemas and register it to the UI builder registry
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

{{args}}

Goal: Register a React component with Zod schema to the UI builder registry at complexComponent-definitions.ts

Execution steps:

1. Parse the component file path provided in {{args}} (e.g., /path/to/component.tsx)
2. If no path provided, prompt user to select from available component files in src/components/**
3. Analyze the component structure and extract:
   - Component name (should be PascalCase, derived from filename if not specified)
   - Zod schema(s) defined in the file (look for patterns like ComponentNameSchema = z.object(...))
   - TypeScript type definitions using z.infer (look for patterns like type ComponentNameProps = z.infer<typeof ComponentNameSchema>)
   - Default props for the component
   - Any icon prop (for iconNameFieldOverrides)
   - Any className/children props (for commonFieldOverrides)
   - Any compound components (nested structures like Accordion/AccordionItem pattern)

4. If no schema exists in the component file:
   - Generate proper TypeScript Zod schema based on the component's TypeScript interface/props
   - Add the schema definition to the component file
   - Create corresponding TypeScript type using z.infer

5. If both component and schema exist, proceed to registration

6. Add import statement to the imports section of complex-component-definitions.ts:
   - For components with schema: import ComponentName, { ComponentNameSchema } from "path/to/component"
   - For components without additional schema: import { ComponentName } from "path/to/component"

7. Add the component registration to the complexComponentDefinitions object in complex-component-definitions.ts:
```
ComponentName: {
  component: ComponentName,
  schema: ComponentNameSchema,  // only if schema exists
  from: "@/path/to/component",
  fieldOverrides: commonFieldOverrides() // or specific overrides based on props
}
```

8. For field overrides, follow these rules:
   - For components with className and/or children props: use commonFieldOverrides()
   - For components with iconName prop: use iconNameFieldOverrides in specific field override
   - For components with both className/children and other special props: create specific override object
   - For compound/nested components: register each part separately (e.g., Accordion and AccordionItem as separate entries)

9. Use proper import paths based on the component location and update the import statement in complex-component-definitions.ts

10. Validate the changes by ensuring:
    - The component is properly imported in the definitions file
    - Schema exists and is properly referenced (if applicable)
    - Field overrides are correctly applied based on component props
    - Import path is correct using @/ alias format
    - No duplicate registration exists
    - The component follows the expected patterns (with Zod schema and TypeScript types)

Additional context:
- Check if the component is a single component or a compound component with multiple parts
- For compound components like Carousel/CarouselItem, register each separately
- Apply field overrides appropriately based on the props available in the component
- The from path should always use the @/ alias followed by the relative path from the src directory

File to modify: apps/site/src/lib/ui-builder/registry/complex-component-definitions.ts

